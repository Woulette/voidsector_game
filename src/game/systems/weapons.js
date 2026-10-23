export function createWeaponSystem(deps){
  let rocketSide = -1;
  let shotSequence = 1;
  const pendingWeaponClasses = new Set();
  const pendingShotsById = new Map();
  const rejectedUntilByWeaponClass = new Map();

  function isServerTarget(enemy){
    return Boolean(enemy?.isPlayerTarget || deps.isServerControlledEnemy?.(enemy));
  }

  function getLaserVolley(){
    const shipLasers = deps.getEquippedLasers(deps.getActiveShip()).filter(item=>item?.weapon);
    const droneLasers = deps.getEquippedDroneLasers().filter(item=>item?.weapon);
    const lasers = [...shipLasers, ...droneLasers];
    const shortestRange = entries=>entries.reduce((range, item)=>{
      const itemRange = Math.max(0, Number(item.weapon.range || 0));
      if(itemRange <= 0) return range;
      return range > 0 ? Math.min(range, itemRange) : itemRange;
    }, 0);
    return {
      lasers,
      shipCount:shipLasers.length,
      droneCount:droneLasers.length,
      count:lasers.length,
      range:shipLasers.length > 0 ? shortestRange(shipLasers) : shortestRange(droneLasers),
      speed:lasers.reduce((max, item)=>Math.max(max, item.weapon.speed || 0), 0) || 900
    };
  }

  function nextShotId(weaponClass){
    const playerId = String(deps.getPlayerId?.() || "player")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 40) || "player";
    return `${playerId}:${weaponClass}:${Date.now().toString(36)}:${(shotSequence++).toString(36)}`;
  }

  function rejectResponse(reasonCode, reason){
    return {accepted:false, outcome:"rejected", reasonCode, reason};
  }

  function acceptedCooldownSeconds(response, fallbackSeconds){
    const fallbackMs = Math.max(1, Number(fallbackSeconds || 0) * 1000);
    const authoritativeMs = Math.max(0, Number(response?.cooldownMs || 0));
    const elapsedMs = Math.max(0, Number(response?.requestElapsedMs || 0));
    return Math.max(.001, (authoritativeMs > 0 ? authoritativeMs - elapsedMs : fallbackMs) / 1000);
  }

  function requestAuthoritativeShot(enemy, context, callbacks = {}){
    const weaponClass = String(context.weaponClass || "laser");
    if(pendingWeaponClasses.has(weaponClass)) return false;
    if(Date.now() < Number(rejectedUntilByWeaponClass.get(weaponClass) || 0)) return false;
    const send = enemy?.isPlayerTarget ? deps.sendServerPlayerHit : deps.sendServerEnemyHit;
    const targetId = enemy?.isPlayerTarget
      ? String(enemy.playerId || "")
      : String(deps.getNetworkTargetId?.(enemy) || enemy?.serverId || enemy?.id || "");
    if(typeof send !== "function" || !targetId){
      callbacks.onRejected?.(rejectResponse("target-missing", "Cible serveur introuvable."));
      return false;
    }

    pendingWeaponClasses.add(weaponClass);
    const shotId = String(context.shotId || "");
    const requestedAt = Date.now();
    let callbackRan = false;
    const acknowledge = response=>{
      if(callbackRan) return;
      callbackRan = true;
      pendingWeaponClasses.delete(weaponClass);
      if(shotId) pendingShotsById.delete(shotId);
      if(response?.accepted === true){
        rejectedUntilByWeaponClass.delete(weaponClass);
        deps.markCombatActivity?.("outgoing");
        if(enemy) enemy.aggro = true;
        callbacks.onAccepted?.({
          ...response,
          requestElapsedMs:Math.max(0, Date.now() - requestedAt)
        });
        return;
      }
      const retryAfterMs = Math.max(0, Math.min(5000, Number(response?.retryAfterMs || 0)));
      rejectedUntilByWeaponClass.set(weaponClass, Date.now() + Math.max(150, retryAfterMs));
      callbacks.onRejected?.(response || rejectResponse("invalid-ack", "Tir non confirme."));
    };
    if(shotId) pendingShotsById.set(shotId, acknowledge);
    const sent = send(targetId, context, acknowledge);
    if(sent !== true){
      pendingWeaponClasses.delete(weaponClass);
      if(!callbackRan) acknowledge(rejectResponse("not-sent", "Tir non envoye."));
      return false;
    }
    return true;
  }

  function confirmAuthoritativeShot(event = {}){
    if(event?.accepted !== true) return false;
    const shotId = String(event?.shotId || "");
    const acknowledge = pendingShotsById.get(shotId);
    if(!acknowledge) return false;
    acknowledge({
      accepted:true,
      shotId,
      ammoRemaining:event.ammoRemaining,
      consumed:event.consumed,
      cooldownReadyAt:event.cooldownReadyAt,
      cooldownMs:event.cooldownMs
    });
    return true;
  }

  function rejectAuthoritativeShot(event = {}){
    if(event?.accepted === true) return false;
    const shotId = String(event?.shotId || "");
    const acknowledge = pendingShotsById.get(shotId);
    if(!acknowledge) return false;
    acknowledge({
      accepted:false,
      outcome:"rejected",
      shotId,
      reasonCode:event.reasonCode || "COMBAT_REJECTED",
      reason:event.reason || "Tir refuse par le serveur.",
      retryAfterMs:event.retryAfterMs
    });
    return true;
  }

  function baseShotContext({enemy, ammo, weaponClass, count, travelTime, starts, targetId, blueLaser = false}){
    const first = starts[0] || {};
    return {
      shotId:nextShotId(weaponClass),
      weaponClass,
      ammoId:ammo.id,
      count,
      travelTimeMs:Math.round(Math.max(0, Number(travelTime || 0)) * 1000),
      starts,
      fromX:Number(first.x || 0),
      fromY:Number(first.y || 0),
      toX:Number(enemy.x || 0),
      toY:Number(enemy.y || 0),
      clientAimX:Number(enemy.x || 0),
      clientAimY:Number(enemy.y || 0),
      targetRadius:Number(enemy.radius || 0),
      targetId,
      blueLaser
    };
  }

  function shootAt(enemy, ammo, slotIndex, callbacks = {}){
    if(!enemy || !ammo) return false;
    if(enemy.isPlayerTarget && enemy.canAttack === false){
      deps.showToast(enemy.attackBlockedReason || "Cible joueur non attaquable.");
      return false;
    }
    if(enemy.damageImmune) return false;
    if(!isServerTarget(enemy)){
      deps.showToast("Cible serveur indisponible.");
      return false;
    }

    const player = deps.getPlayer();
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    const angle = Math.atan2(dy, dx);
    const targetId = deps.getNetworkTargetId?.(enemy) || enemy.id;

    if(ammo.weaponClass === "rocket"){
      const launcher = deps.getEquippedLauncher?.("rocket");
      if(!launcher){
        deps.showToast("Aucun lance roquette equipe.");
        return false;
      }
      if(dist > (launcher.effect?.rocketRange || 550)) return false;
      if(deps.getAmmoCount(ammo.id) <= 0){
        deps.showToast(`${ammo.name} epuisee.`);
        deps.refreshActionBar();
        deps.refreshQuickPanel();
        return false;
      }
      rocketSide *= -1;
      const forwardX = Math.cos(angle);
      const forwardY = Math.sin(angle);
      const sideX = -forwardY;
      const sideY = forwardX;
      const startX = player.x + forwardX * 42 + sideX * rocketSide * 28;
      const startY = player.y + forwardY * 42 + sideY * rocketSide * 28;
      const travelTime = Math.max(.22, Math.min(1.55, dist / (ammo.speed || 620) + .14));
      return requestAuthoritativeShot(
        enemy,
        baseShotContext({
          enemy,
          ammo,
          weaponClass:"rocket",
          count:1,
          travelTime,
          starts:[{x:startX, y:startY, curveSide:rocketSide, curveStrength:42}],
          targetId
        }),
        {
          onAccepted:response=>{
            deps.setAmmoCooldown?.(
              ammo,
              acceptedCooldownSeconds(response, deps.getEffectiveAmmoCooldown?.(ammo))
            );
            callbacks.onAccepted?.(response);
          },
          onRejected:callbacks.onRejected
        }
      );
    }

    const volley = getLaserVolley();
    if(volley.count <= 0) return false;
    if(dist > volley.range) return false;
    if(deps.getAmmoCount(ammo.id) < volley.count){
      deps.showToast(`${ammo.name} insuffisante : il faut ${volley.count} munition(s) par tir.`);
      if(deps.getActiveLaserSlot() === slotIndex) deps.setActiveLaserSlot(null);
      deps.refreshActionBar();
      deps.refreshQuickPanel();
      return false;
    }
    const startX = player.x + Math.cos(angle) * 45;
    const startY = player.y + Math.sin(angle) * 45;
    return requestAuthoritativeShot(
      enemy,
      baseShotContext({
        enemy,
        ammo,
        weaponClass:"laser",
        count:1,
        travelTime:0,
        starts:[{x:startX, y:startY}],
        targetId,
        blueLaser:Boolean(player.blueLaserBeams && ammo.id !== "ammo_x4")
      }),
      {
        onAccepted:response=>{
          deps.setAmmoCooldown?.(
            ammo,
            acceptedCooldownSeconds(response, deps.getEffectiveAmmoCooldown?.(ammo))
          );
          callbacks.onAccepted?.(response);
        },
        onRejected:callbacks.onRejected
      }
    );
  }

  function fireManualRocket(index, ammo){
    const enemy = deps.getSelectedEnemy();
    if(!enemy) return deps.showToast("Sélectionne une cible avant de lancer une roquette.");
    if(deps.getAmmoCooldown(ammo) > 0) return false;
    return shootAt(enemy, ammo, index);
  }

  function fireManualMissile(ammo, count = 3, callbacks = {}){
    const enemy = deps.getSelectedEnemy();
    if(!enemy) return deps.showToast("Selectionne une cible avant de lancer les missiles.");
    if(enemy.isPlayerTarget && enemy.canAttack === false){
      return deps.showToast(enemy.attackBlockedReason || "Cible joueur non attaquable.");
    }
    if(enemy.damageImmune) return false;
    if(!isServerTarget(enemy)){
      deps.showToast("Cible serveur indisponible.");
      return false;
    }
    const launcher = deps.getEquippedLauncher?.("missile");
    if(!launcher) return deps.showToast("Aucun lance-missile equipe.");
    if(!ammo || ammo.weaponClass !== "missile") return false;
    const player = deps.getPlayer();
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    if(dist > (launcher.effect?.missileRange || 600)) return false;
    const needed = Math.max(1, Number(count || launcher.effect?.missileCapacity || 3));
    if(deps.getAmmoCount(ammo.id) < needed){
      deps.showToast(`${ammo.name} insuffisant : il faut ${needed} missile(s).`);
      deps.refreshActionBar();
      deps.refreshQuickPanel();
      return false;
    }

    const angle = Math.atan2(dy, dx);
    const forwardX = Math.cos(angle);
    const forwardY = Math.sin(angle);
    const sideX = -forwardY;
    const sideY = forwardX;
    const targetId = deps.getNetworkTargetId?.(enemy) || enemy.id;
    const travelTime = Math.max(.28, Math.min(1.65, dist / (ammo.speed || 520) + .18));
    const starts = [];
    for(let index = 0; index < needed; index += 1){
      const spread = (index - (needed - 1) / 2) * 30;
      const curveSide = index % 2 === 0 ? 1 : -1;
      starts.push({
        x:player.x + forwardX * 44 + sideX * spread,
        y:player.y + forwardY * 44 + sideY * spread,
        curveSide,
        curveStrength:46 + index * 8
      });
    }
    return requestAuthoritativeShot(
      enemy,
      baseShotContext({
        enemy,
        ammo,
        weaponClass:"missile",
        count:needed,
        travelTime,
        starts,
        targetId
      }),
      callbacks
    );
  }

  function fireAutomaticRocket(enemy){
    const player = deps.getPlayer();
    if(!player.extraBonus?.autoRocket || !enemy) return;
    if(!deps.getEquippedLauncher?.("rocket")) return;
    const selectedRocket = deps.getSelectedRocketAmmo?.();
    const slots = deps.getActionSlots();
    const index = selectedRocket ? slots.findIndex(id=>{
      const ammo = deps.getAmmo(id);
      return ammo?.id === selectedRocket.id && deps.getAmmoCount(ammo.id) > 0 && deps.getAmmoCooldown(ammo) <= 0;
    }) : slots.findIndex(id=>{
      const ammo = deps.getAmmo(id);
      return ammo && ammo.weaponClass === "rocket" && deps.getAmmoCount(ammo.id) > 0 && deps.getAmmoCooldown(ammo) <= 0;
    });
    if(index < 0) return;
    shootAt(enemy, deps.getCombatAmmo(index), index);
  }

  function updateWeapons(dt){
    deps.tickAmmoCooldowns(dt);
    const enemy = deps.getSelectedEnemy();
    if(!enemy) return;

    const activeLaserSlot = deps.getActiveLaserSlot();
    if(activeLaserSlot === null) return;

    fireAutomaticRocket(enemy);
    deps.tryFireAutomaticMissile?.();

    const ammo = deps.getCombatAmmo(activeLaserSlot);
    if(!ammo || ammo.weaponClass === "rocket") return;
    if(getLaserVolley().count <= 0) return;
    if(deps.getAmmoCooldown(ammo) <= 0) shootAt(enemy, ammo, activeLaserSlot);
  }

  return {
    getLaserVolley,
    shootAt,
    fireManualRocket,
    fireManualMissile,
    fireAutomaticRocket,
    updateWeapons,
    confirmAuthoritativeShot,
    rejectAuthoritativeShot,
    hasPendingShot:weaponClass=>pendingWeaponClasses.has(String(weaponClass || ""))
  };
}
