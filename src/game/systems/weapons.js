import { createProjectile, rollBetween } from "./projectiles.js";

export function createWeaponSystem(deps){
  let rocketSide = -1;
  let missileSalvoSeq = 1;

  function getRocketDamageMultiplier(){
    const player = deps.getPlayer();
    return (1 + Number(player.extraBonus?.rocketDamageBonus || 0)) * Number(player.extraBonus?.rocketDamageMultiplier || 1);
  }

  function getUpgradeLevel(id){
    return Math.max(0, Number(deps.getEquipmentUpgradeLevel?.(id) || 0));
  }

  function rollLaserPoolDamage(lasers, bonus){
    if(!lasers.length) return 0;
    const range = lasers.reduce((acc, item)=>{
      const upgradeBonus = getUpgradeLevel(item.id) * 10 + bonus;
      const min = Number(item.weapon.minDamage ?? item.weapon.damage ?? 0) + upgradeBonus;
      const max = Number(item.weapon.maxDamage ?? item.weapon.damage ?? min) + upgradeBonus;
      const multiplier = Math.max(1, Number(item.droneDamageMultiplier || 1));
      acc.min += min * multiplier;
      acc.max += max * multiplier;
      return acc;
    }, {min:0, max:0});
    return rollBetween(range.min, range.max);
  }

  function getLaserVolley(){
    const player = deps.getPlayer();
    const shipLasers = deps.getEquippedLasers(deps.getActiveShip()).filter(item=>item?.weapon);
    const droneLasers = deps.getEquippedDroneLasers().filter(item=>item?.weapon);
    const lasers = [...shipLasers, ...droneLasers];
    const bonus = player.damageBonus || 0;
    const multiplier = Math.max(0.1, Number(player.damageMultiplier || 1));
    return {
      lasers,
      shipCount:shipLasers.length,
      droneCount:droneLasers.length,
      count:lasers.length,
      range:lasers.reduce((max, item)=>Math.max(max, item.weapon.range || 0), 0),
      speed:lasers.reduce((max, item)=>Math.max(max, item.weapon.speed || 0), 0) || 900,
      rollDamage(){
        const laserBoost = lasers.length > 0 ? (deps.consumeCombatBoostCharges?.("laser", lasers.length) || 0) : 0;
        const droneBoost = droneLasers.length > 0 ? (deps.consumeCombatBoostCharges?.("drone", droneLasers.length) || 0) : 0;
        const shipRaw = rollLaserPoolDamage(shipLasers, bonus);
        const droneRaw = rollLaserPoolDamage(droneLasers, bonus);
        const raw = shipRaw * (1 + laserBoost) + droneRaw * (1 + laserBoost + droneBoost);
        return raw * multiplier;
      }
    };
  }

  function shootAt(enemy, ammo, slotIndex){
    if(!enemy || !ammo) return false;
    if(enemy.isPlayerTarget && enemy.canAttack === false){
      deps.showToast(enemy.attackBlockedReason || "Cible joueur non attaquable.");
      return false;
    }
    const serverPlayerTarget = Boolean(enemy.isPlayerTarget);
    const player = deps.getPlayer();
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx,dy) || 1;
    const a = Math.atan2(dy, dx);
    const bullets = deps.getBullets();
    const particles = deps.getParticles();
    const networkTargetId = deps.getNetworkTargetId?.(enemy) || enemy.id;

    if(ammo.weaponClass === "rocket"){
      const launcher = deps.getEquippedLauncher?.("rocket");
      if(!launcher){
        deps.showToast("Aucun lance roquette equipe.");
        return false;
      }
      if(dist > (launcher.effect?.rocketRange || ammo.range || 800)) return false;
      if(serverPlayerTarget && deps.getAmmoCount(ammo.id) <= 0){
        deps.showToast(`${ammo.name} epuisee.`);
        deps.refreshActionBar();
        deps.refreshQuickPanel();
        return false;
      }
      if(!serverPlayerTarget && !deps.consumeAmmo(ammo.id, 1)){
        deps.showToast(`${ammo.name} epuisee.`);
        deps.refreshActionBar();
        deps.refreshQuickPanel();
        return false;
      }
      if(!serverPlayerTarget) deps.recordWeaponUse?.("rocket", 1);
      deps.markCombatActivity("outgoing");
      enemy.aggro = true;
      rocketSide *= -1;
      const forwardX = Math.cos(a);
      const forwardY = Math.sin(a);
      const sideX = -forwardY;
      const sideY = forwardX;
      const startX = player.x + forwardX * 42 + sideX * rocketSide * 28;
      const startY = player.y + forwardY * 42 + sideY * rocketSide * 28;
      const rocketBoost = serverPlayerTarget ? 0 : deps.consumeCombatBoostCharges?.("rocket", 1) || 0;
      bullets.push(createProjectile({
        owner:"player",
        startX,
        startY,
        kind:"rocket",
        sprite:ammo.projectileImg || ammo.img || "assets/equipment/rocket_projectile.png",
        curveSide:rocketSide,
        curveStrength:42,
        damage:serverPlayerTarget ? 1 : (rollBetween(ammo.damageMin, ammo.damageMax) + getUpgradeLevel(ammo.id) * 80) * (launcher.effect?.rocketDamageMultiplier || 1) * getRocketDamageMultiplier() * (1 + rocketBoost),
        travelTime:Math.max(.22, Math.min(1.55, dist/(ammo.speed || 620) + .14)),
        radius:10,
        color:ammo.color,
        particle:ammo.particle,
        slotIndex,
        targetId:enemy.id,
        ammoId:ammo.id,
        serverFireCount:1,
        hitChance:deps.playerHitChance
      }));
      deps.sendPlayerWeaponEffect?.({
        kind:"rocket",
        ammoId:ammo.id,
        targetId:networkTargetId,
        starts:[{x:startX, y:startY, curveSide:rocketSide, curveStrength:42}],
        toX:enemy.x,
        toY:enemy.y,
        travelTime:Math.max(.22, Math.min(1.55, dist/(ammo.speed || 620) + .14))
      });
      particles.push({x:startX,y:startY,life:.24,max:.24,size:26,color:ammo.particle});
      if(!serverPlayerTarget) deps.saveState();
      deps.refreshActionBar();
      deps.refreshQuickPanel();
      return true;
    }

    const volley = getLaserVolley();
    if(volley.count <= 0) return false;
    if(dist > volley.range) return false;
    if(serverPlayerTarget && deps.getAmmoCount(ammo.id) < volley.count){
      deps.showToast(`${ammo.name} insuffisante : il faut ${volley.count} munition(s) par tir.`);
      if(deps.getActiveLaserSlot() === slotIndex) deps.setActiveLaserSlot(null);
      deps.refreshActionBar();
      deps.refreshQuickPanel();
      return false;
    }
    if(!serverPlayerTarget && !deps.consumeAmmo(ammo.id, volley.count)){
      deps.showToast(`${ammo.name} insuffisante : il faut ${volley.count} munition(s) par tir.`);
      if(deps.getActiveLaserSlot() === slotIndex) deps.setActiveLaserSlot(null);
      deps.refreshActionBar();
      deps.refreshQuickPanel();
      return false;
    }
    if(!serverPlayerTarget) deps.recordWeaponUse?.("laser", volley.count);
    deps.markCombatActivity("outgoing");
    enemy.aggro = true;
    const damage = serverPlayerTarget ? 1 : volley.rollDamage() * (ammo.multiplier || 1);
    const startX = player.x + Math.cos(a)*45;
    const startY = player.y + Math.sin(a)*45;
    deps.addLaserBeam?.({
      ammoId:ammo.id,
      fromX:startX,
      fromY:startY,
      toX:enemy.x,
      toY:enemy.y,
      targetId:enemy.id,
      blueLaser:Boolean(player.blueLaserBeams && ammo.id !== "ammo_x4")
    });
    deps.sendPlayerWeaponEffect?.({
      kind:"laser",
      ammoId:ammo.id,
      targetId:networkTargetId,
      starts:[{x:startX, y:startY}],
      fromX:startX,
      fromY:startY,
      toX:enemy.x,
      toY:enemy.y,
      blueLaser:Boolean(player.blueLaserBeams && ammo.id !== "ammo_x4"),
      life:.20
    });
    deps.resolveLaserHit?.(enemy, damage, deps.playerHitChance, ammo);
    particles.push({x:startX,y:startY,life:.16,max:.16,size:14,color:player.blueLaserBeams && ammo.id !== "ammo_x4" ? "rgba(56,189,248,.65)" : ammo.id === "ammo_x4" ? "rgba(255,132,24,.65)" : "rgba(255,218,72,.62)"});
    if(!serverPlayerTarget) deps.saveState();
    deps.refreshActionBar();
    deps.refreshQuickPanel();
    return true;
  }

  function fireManualRocket(index, ammo){
    const enemy = deps.getSelectedEnemy();
    if(!enemy) return deps.showToast("Sélectionne une cible avant de lancer une roquette.");
    if(deps.getAmmoCooldown(ammo) > 0) return;
    const fired = shootAt(enemy, ammo, index);
    if(fired) deps.setAmmoCooldown(ammo, deps.getEffectiveAmmoCooldown(ammo));
  }

  function fireManualMissile(ammo, count = 3){
    const enemy = deps.getSelectedEnemy();
    if(!enemy) return deps.showToast("Selectionne une cible avant de lancer les missiles.");
    if(enemy.isPlayerTarget && enemy.canAttack === false) return deps.showToast(enemy.attackBlockedReason || "Cible joueur non attaquable.");
    const launcher = deps.getEquippedLauncher?.("missile");
    if(!launcher) return deps.showToast("Aucun lance-missile equipe.");
    if(!ammo || ammo.weaponClass !== "missile") return false;
    const player = deps.getPlayer();
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    if(dist > (launcher.effect?.missileRange || ammo.range || 500)) return false;
    const needed = Math.max(1, Number(count || launcher.effect?.missileCapacity || 3));
    const serverPlayerTarget = Boolean(enemy.isPlayerTarget);
    if(serverPlayerTarget && deps.getAmmoCount(ammo.id) < needed){
      deps.showToast(`${ammo.name} insuffisant : il faut ${needed} missile(s).`);
      deps.refreshActionBar();
      deps.refreshQuickPanel();
      return false;
    }
    if(!serverPlayerTarget && !deps.consumeAmmo(ammo.id, needed)){
      deps.showToast(`${ammo.name} insuffisant : il faut ${needed} missile(s).`);
      deps.refreshActionBar();
      deps.refreshQuickPanel();
      return false;
    }
    if(!serverPlayerTarget) deps.recordWeaponUse?.("missile", needed);
    deps.markCombatActivity("outgoing");
    enemy.aggro = true;
    const a = Math.atan2(dy, dx);
    const forwardX = Math.cos(a);
    const forwardY = Math.sin(a);
    const sideX = -forwardY;
    const sideY = forwardX;
    const bullets = deps.getBullets();
    const particles = deps.getParticles();
    const networkTargetId = deps.getNetworkTargetId?.(enemy) || enemy.id;
    const minDamage = Number(ammo.damageMin ?? ammo.damage ?? 0);
    const maxDamage = Number(ammo.damageMax ?? ammo.damage ?? minDamage);
    const damageMultiplier = (launcher.effect?.missileDamageMultiplier || 1) * Number(player.extraBonus?.missileDamageMultiplier || 1);
    const travelTime = Math.max(.28, Math.min(1.65, dist / (ammo.speed || 520) + .18));
    const salvoId = `missile-${missileSalvoSeq++}`;
    const starts = [];
    for(let i = 0; i < needed; i++){
      const spread = (i - (needed - 1) / 2) * 30;
      const curveSide = i % 2 === 0 ? 1 : -1;
      const startX = player.x + forwardX * 44 + sideX * spread;
      const startY = player.y + forwardY * 44 + sideY * spread;
      starts.push({x:startX, y:startY, curveSide, curveStrength:46 + i * 8});
      bullets.push(createProjectile({
        owner:"player",
        startX,
        startY,
        kind:"missile",
        sprite:ammo.projectileImg || ammo.img || null,
        curveSide,
        curveStrength:46 + i * 8,
        damage:serverPlayerTarget ? 1 : rollBetween(minDamage, maxDamage) * damageMultiplier,
        visualOnly:false,
        salvoId,
        salvoSize:needed,
        travelTime,
        radius:7,
        color:ammo.color,
        particle:ammo.particle,
        targetId:enemy.id,
        ammoId:ammo.id,
        serverFireCount:needed,
        hitChance:deps.playerHitChance
      }));
      particles.push({x:startX, y:startY, life:.24, max:.24, size:22, color:ammo.particle});
    }
    deps.sendPlayerWeaponEffect?.({
      kind:"missile",
      ammoId:ammo.id,
      targetId:networkTargetId,
      starts,
      toX:enemy.x,
      toY:enemy.y,
      travelTime
    });
    if(!serverPlayerTarget) deps.saveState();
    deps.refreshActionBar();
    deps.refreshQuickPanel();
    return true;
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
    const ammo = deps.getCombatAmmo(index);
    const fired = shootAt(enemy, ammo, index);
    if(fired) deps.setAmmoCooldown(ammo, deps.getEffectiveAmmoCooldown(ammo));
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
    if(deps.getAmmoCooldown(ammo) <= 0){
      const fired = shootAt(enemy, ammo, activeLaserSlot);
      if(fired) deps.setAmmoCooldown(ammo, deps.getEffectiveAmmoCooldown(ammo));
    }
  }

  return {getLaserVolley, shootAt, fireManualRocket, fireManualMissile, fireAutomaticRocket, updateWeapons};
}
