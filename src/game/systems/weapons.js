import { createProjectile, rollBetween } from "./projectiles.js";

export function createWeaponSystem(deps){
  function getRocketDamageMultiplier(){
    const player = deps.getPlayer();
    return 1 + Math.max(0, player.extraBonus?.rocketDamageBonus || 0);
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
        const raw = lasers.reduce((sum, item)=>sum + rollBetween(item.weapon.minDamage ?? item.weapon.damage, item.weapon.maxDamage ?? item.weapon.damage) + bonus, 0);
        return raw * multiplier;
      }
    };
  }

  function shootAt(enemy, ammo, slotIndex){
    if(!enemy || !ammo) return false;
    const player = deps.getPlayer();
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx,dy) || 1;
    const a = Math.atan2(dy, dx);
    const bullets = deps.getBullets();
    const particles = deps.getParticles();

    if(ammo.weaponClass === "rocket"){
      if(dist > (ammo.range || 800)) return false;
      if(!deps.consumeAmmo(ammo.id, 1)){
        deps.showToast(`${ammo.name} épuisée.`);
        deps.refreshActionBar();
        deps.refreshQuickPanel();
        return false;
      }
      deps.markCombatActivity("outgoing");
      enemy.aggro = true;
      const startX = player.x + Math.cos(a)*48;
      const startY = player.y + Math.sin(a)*48;
      bullets.push(createProjectile({
        owner:"player",
        startX,
        startY,
        damage:rollBetween(ammo.damageMin, ammo.damageMax) * getRocketDamageMultiplier(),
        travelTime:Math.max(.14, Math.min(1.25, dist/(ammo.speed || 620) + .08)),
        radius:10,
        color:ammo.color,
        particle:ammo.particle,
        slotIndex,
        targetId:enemy.id,
        hitChance:deps.playerHitChance
      }));
      particles.push({x:startX,y:startY,life:.24,max:.24,size:26,color:ammo.particle});
      deps.saveState();
      deps.refreshActionBar();
      deps.refreshQuickPanel();
      return true;
    }

    const volley = getLaserVolley();
    if(volley.count <= 0) return false;
    if(dist > volley.range) return false;
    if(!deps.consumeAmmo(ammo.id, volley.count)){
      deps.showToast(`${ammo.name} insuffisante : il faut ${volley.count} munition(s) par tir.`);
      if(deps.getActiveLaserSlot() === slotIndex) deps.setActiveLaserSlot(null);
      deps.refreshActionBar();
      deps.refreshQuickPanel();
      return false;
    }
    deps.markCombatActivity("outgoing");
    enemy.aggro = true;
    const damage = volley.rollDamage() * (ammo.multiplier || 1);
    const startX = player.x + Math.cos(a)*45;
    const startY = player.y + Math.sin(a)*45;
    bullets.push(createProjectile({
      owner:"player",
      startX,
      startY,
      damage,
      travelTime:Math.max(.09, Math.min(1.1, dist/volley.speed + .04)),
      radius:5 + Math.min(5, volley.count),
      color:ammo.color,
      particle:ammo.particle,
      slotIndex,
      targetId:enemy.id,
      hitChance:deps.playerHitChance
    }));
    particles.push({x:startX,y:startY,life:.18,max:.18,size:18 + volley.count*2,color:ammo.particle});
    deps.saveState();
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

  function fireAutomaticRocket(enemy){
    const player = deps.getPlayer();
    if(!player.extraBonus?.autoRocket || !enemy) return;
    const index = deps.getActionSlots().findIndex(id=>{
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

    fireAutomaticRocket(enemy);

    const activeLaserSlot = deps.getActiveLaserSlot();
    if(activeLaserSlot === null) return;
    const ammo = deps.getCombatAmmo(activeLaserSlot);
    if(!ammo || ammo.weaponClass === "rocket") return;
    if(getLaserVolley().count <= 0) return;
    if(deps.getAmmoCooldown(ammo) <= 0){
      const fired = shootAt(enemy, ammo, activeLaserSlot);
      if(fired) deps.setAmmoCooldown(ammo, deps.getEffectiveAmmoCooldown(ammo));
    }
  }

  return {getLaserVolley, shootAt, fireManualRocket, fireAutomaticRocket, updateWeapons};
}
