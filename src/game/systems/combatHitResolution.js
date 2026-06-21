import { PLAYER_HIT_CHANCE } from "../combatData.js";

function makeImpactSparks({count, color, speedMin, speedMax, lengthMin, lengthMax, width = 1.2, arc = Math.PI * 2, angle = 0}){
  return Array.from({length:count}, (_, index)=>{
    const spread = count <= 1 ? 0 : (index / count) * arc;
    const jitter = (Math.random() - .5) * (arc / Math.max(2, count)) * .9;
    return {
      angle:angle - arc / 2 + spread + jitter,
      speed:speedMin + Math.random() * (speedMax - speedMin),
      length:lengthMin + Math.random() * (lengthMax - lengthMin),
      width:width * (.75 + Math.random() * .55),
      alpha:.55 + Math.random() * .4,
      color
    };
  });
}

function markEnemyAttacked(enemy){
  if(!enemy) return;
  enemy.aggro = true;
  enemy.attackedByPlayer = true;
  enemy.targetOutOfRangeT = 0;
}

function makeImpactSmoke(count){
  return Array.from({length:count}, ()=>({
    angle:Math.random() * Math.PI * 2,
    speed:14 + Math.random() * 34,
    size:12 + Math.random() * 22,
    alpha:.24 + Math.random() * .18
  }));
}

export function createCombatHitResolutionSystem({
  getState,
  setState,
  isServerControlledEnemy,
  damageEnemy,
  damagePlayer,
  rewardEnemy,
  applyPlayerPoison
}){
  function pushDamageText({x, y, value, color, shadowColor, life = .82}){
    const {damageTexts} = getState();
    const isMiss = value === "MISS";
    damageTexts.push({
      x,
      y,
      value,
        life,
        max:life,
      vx:(Math.random() - .5) * (isMiss ? 18 : 34),
      vy:isMiss ? -30 : -48 - Math.random() * 18,
      wobble:Math.random() * Math.PI * 2,
      color,
      shadowColor
    });
  }

  function rollBetween(min, max){
    const low = Number(min ?? max ?? 0);
    const high = Number(max ?? min ?? low);
    if(high <= low) return low;
    return low + Math.random() * (high - low);
  }

  function spawnImpactEffect(kind, {x, y, color, angle = 0, visualOnly = false, delay = 0} = {}){
    let {impactEffects} = getState();
    if(!impactEffects){
      impactEffects = [];
      setState({impactEffects});
    }
    const baseColor = color || (kind === "rocket" ? "rgba(251,146,60,.95)" : kind === "missile" ? "rgba(125,211,252,.95)" : "rgba(250,204,21,.92)");
    if(kind === "laser"){
      impactEffects.push({
        kind,
        x,
        y,
        color:baseColor,
        core:"rgba(255,255,255,.98)",
        life:.14,
        max:.14,
        delay,
        radius:16,
        rotation:Math.random() * Math.PI * 2,
        sparks:makeImpactSparks({count:3, color:baseColor, speedMin:18, speedMax:36, lengthMin:5, lengthMax:11, width:.9, arc:Math.PI * 1.15, angle:angle + Math.PI})
      });
      return;
    }
    if(kind === "missile"){
      impactEffects.push({
        kind,
        x,
        y,
        color:baseColor,
        core:"rgba(248,250,252,.98)",
        life:visualOnly ? .30 : .46,
        max:visualOnly ? .30 : .46,
        delay,
        radius:visualOnly ? 36 : 72,
        rotation:Math.random() * Math.PI * 2,
        sparks:makeImpactSparks({count:visualOnly ? 3 : 6, color:baseColor, speedMin:22, speedMax:visualOnly ? 58 : 92, lengthMin:7, lengthMax:visualOnly ? 16 : 26, width:1.15}),
        smoke:makeImpactSmoke(visualOnly ? 0 : 2)
      });
      return;
    }
    impactEffects.push({
      kind:"rocket",
      x,
      y,
      color:baseColor,
      core:"rgba(255,251,235,.98)",
      life:.46,
      max:.46,
      delay,
      radius:48,
      rotation:Math.random() * Math.PI * 2,
      sparks:makeImpactSparks({count:5, color:baseColor, speedMin:24, speedMax:76, lengthMin:7, lengthMax:20, width:1.15}),
      smoke:makeImpactSmoke(1)
    });
  }

  function resolvePlayerMissileDamage(bullet, target){
    const {enemies, missileSalvos} = getState();
    const enemy = target.entity;
    if(!enemy || enemy.hp <= 0 || bullet.visualOnly) return;
    if(isServerControlledEnemy?.(enemy) || enemy.isPlayerTarget){
      const salvoId = bullet.salvoId;
      const salvoSize = Math.max(1, Math.round(Number(bullet.salvoSize || 1)));
      if(salvoId && salvoSize > 1){
        const salvo = missileSalvos.get(salvoId) || {targetId:enemy.id, total:salvoSize, impacts:0};
        salvo.impacts += 1;
        missileSalvos.set(salvoId, salvo);
        if(salvo.impacts < salvo.total) return;
        missileSalvos.delete(salvoId);
      }
      damageEnemy(enemy, 1, {weaponClass:"missile", ammoId:bullet.ammoId, count:bullet.serverFireCount || salvoSize});
      return;
    }
    const hitChance = bullet.hitChance ?? PLAYER_HIT_CHANCE;
    const hit = Math.random() <= hitChance;
    const dealt = hit ? Math.round(bullet.damage) : 0;
    const salvoId = bullet.salvoId;
    const salvoSize = Math.max(1, Math.round(Number(bullet.salvoSize || 1)));

    if(salvoId && salvoSize > 1){
      const salvo = missileSalvos.get(salvoId) || {targetId:enemy.id, total:salvoSize, impacts:0, damage:0, hits:0, misses:0};
      salvo.impacts += 1;
      if(hit){
        salvo.damage += dealt;
        salvo.hits += 1;
      }else{
        salvo.misses += 1;
      }
      missileSalvos.set(salvoId, salvo);
      if(salvo.impacts < salvo.total) return;

      missileSalvos.delete(salvoId);
      const finalEnemy = enemies.find(e=>e.id === salvo.targetId && e.hp > 0) || enemy;
      if(!finalEnemy || finalEnemy.hp <= 0) return;
      markEnemyAttacked(finalEnemy);
      if(salvo.damage > 0){
        const applied = damageEnemy(finalEnemy, salvo.damage, {weaponClass:"missile", ammoId:bullet.ammoId, count:bullet.serverFireCount || salvo.total});
        if(applied !== false){
          pushDamageText({x:finalEnemy.x, y:finalEnemy.y-finalEnemy.radius-16, value:salvo.damage});
          if(finalEnemy.hp <= 0) rewardEnemy(finalEnemy);
        }
      }else{
        pushDamageText({x:finalEnemy.x, y:finalEnemy.y-finalEnemy.radius-16, value:"MISS", color:"rgba(191,219,254,", shadowColor:"rgba(96,165,250,.78)"});
      }
      return;
    }

    markEnemyAttacked(enemy);
    if(hit){
      const applied = damageEnemy(enemy, dealt, {weaponClass:"missile", ammoId:bullet.ammoId, count:bullet.serverFireCount || 1});
      if(applied !== false){
        pushDamageText({x:enemy.x, y:enemy.y-enemy.radius-16, value:dealt});
        if(enemy.hp <= 0) rewardEnemy(enemy);
      }
    }else{
      pushDamageText({x:enemy.x, y:enemy.y-enemy.radius-16, value:"MISS", color:"rgba(191,219,254,", shadowColor:"rgba(96,165,250,.78)"});
    }
  }

  function resolveBulletImpact(bullet, target){
    const {player, particles} = getState();
    if(!target) return;
    if(bullet.owner === "player" && bullet.kind === "missile"){
      const baseAngle = bullet.angle || Math.random() * Math.PI * 2;
      const count = bullet.visualOnly ? 1 : 2;
      for(let i = 0; i < count; i++){
        const angle = baseAngle + (i - 1) * 1.9 + (Math.random() - .5) * .55;
        const distance = (bullet.visualOnly ? 10 : 0) + i * 11 + Math.random() * 9;
        spawnImpactEffect("missile", {
          x:bullet.x + Math.cos(angle) * distance,
          y:bullet.y + Math.sin(angle) * distance,
          color:bullet.particle || bullet.color,
          visualOnly:bullet.visualOnly || i > 0,
          delay:i * .055 + (bullet.visualOnly ? .035 : 0)
        });
      }
      resolvePlayerMissileDamage(bullet, target);
      return;
    }else if(bullet.owner === "player" && bullet.kind === "rocket"){
      spawnImpactEffect("rocket", {x:bullet.x, y:bullet.y, color:bullet.particle || bullet.color, visualOnly:bullet.visualOnly});
    }else{
      particles.push({x:bullet.x, y:bullet.y, life:.22, max:.22, size:12, color:bullet.particle || "rgba(125,211,252,.8)"});
    }
    const hitChance = bullet.hitChance ?? (bullet.owner === "enemy" ? 0.88 : PLAYER_HIT_CHANCE);
    const hit = Math.random() <= hitChance;

    if(bullet.owner === "enemy"){
      if(hit){
        const dealt = Math.round(bullet.damage);
        damagePlayer(dealt);
        applyPlayerPoison(bullet.onHitEffect);
        pushDamageText({x:player.x, y:player.y-58, value:dealt, color:"rgba(248,113,113,", shadowColor:"rgba(248,113,113,.78)"});
      }else{
        pushDamageText({x:player.x, y:player.y-58, value:"MISS", color:"rgba(226,232,240,", shadowColor:"rgba(148,163,184,.78)"});
      }
      return;
    }

    const enemy = target.entity;
    if(!enemy || enemy.hp <= 0 || bullet.visualOnly) return;
    if(isServerControlledEnemy?.(enemy) || enemy.isPlayerTarget){
      damageEnemy(enemy, 1, {weaponClass:bullet.kind === "rocket" ? "rocket" : "laser", ammoId:bullet.ammoId, count:bullet.serverFireCount || 1});
      return;
    }
    markEnemyAttacked(enemy);
    if(hit){
      const dealt = Math.round(bullet.damage);
      const applied = damageEnemy(enemy, dealt, {weaponClass:bullet.kind === "rocket" ? "rocket" : "laser", ammoId:bullet.ammoId, count:bullet.serverFireCount || 1});
      if(applied !== false){
        pushDamageText({x:enemy.x, y:enemy.y-enemy.radius-16, value:dealt});
        if(enemy.hp <= 0) rewardEnemy(enemy);
      }
    }else{
      pushDamageText({x:enemy.x, y:enemy.y-enemy.radius-16, value:"MISS", color:"rgba(191,219,254,", shadowColor:"rgba(96,165,250,.78)"});
    }
  }

  function resolveLaserHit(enemy, damage, hitChance = PLAYER_HIT_CHANCE, ammo = null){
    const {player} = getState();
    if(!enemy || enemy.hp <= 0) return false;
    const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
    const laserColor = player.blueLaserBeams && ammo?.id !== "ammo_x4" ? "rgba(56,189,248,.9)" : ammo?.particle || ammo?.color || "rgba(250,204,21,.88)";
    if(isServerControlledEnemy?.(enemy) || enemy.isPlayerTarget){
      damageEnemy(enemy, Math.round(damage), {weaponClass:"laser", ammoId:ammo?.id || "ammo_x1", count:1});
      spawnImpactEffect("laser", {x:enemy.x, y:enemy.y, color:laserColor, angle});
      return true;
    }
    const hit = Math.random() <= hitChance;
    markEnemyAttacked(enemy);
    if(hit){
      const dealt = Math.round(damage);
      const applied = damageEnemy(enemy, dealt, {weaponClass:"laser", ammoId:ammo?.id || "ammo_x1", count:1});
      spawnImpactEffect("laser", {x:enemy.x, y:enemy.y, color:laserColor, angle});
      if(applied !== false){
        pushDamageText({x:enemy.x, y:enemy.y-enemy.radius-16, value:dealt});
        if(enemy.hp <= 0) rewardEnemy(enemy);
      }
      return true;
    }
    pushDamageText({x:enemy.x, y:enemy.y-enemy.radius-16, value:"MISS", color:"rgba(255,236,179,", shadowColor:"rgba(250,204,21,.78)"});
    return false;
  }

  return {
    pushDamageText,
    rollBetween,
    spawnImpactEffect,
    resolvePlayerMissileDamage,
    resolveBulletImpact,
    resolveLaserHit
  };
}
