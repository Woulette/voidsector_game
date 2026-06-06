import { applyProgressionReward } from "../players/progression.js";
import { PORTAL_CONFIGS, WORLD_ENEMY_TYPES } from "../world/definitions.js";

export function createPortalInstanceManager({io, players, groups, profileManager, createGroup, emitInstance, portalWaveTotal}){
  let instanceSeq = 1;

  function createPortalEnemy(kind, wave, index, x, y, boss = false){
    const base = WORLD_ENEMY_TYPES[kind] || WORLD_ENEMY_TYPES.drone_pirate;
    const level = Math.max(1, Math.round((boss ? 20 : 1) + wave * 0.75));
    const hp = Math.round(base.hp(level) * (boss ? 2.6 : 1 + wave * 0.035));
    const shield = Math.round(base.shield(level) * (boss ? 2.6 : 1 + wave * 0.025));
    return {
      id:`P-${wave}-${index}-${Date.now().toString(36)}`,
      serverControlled:true,
      kind:base.kind,
      type:boss ? `${base.type} Alpha` : base.type,
      img:base.img,
      level,
      x,
      y,
      homeX:x,
      homeY:y,
      angle:Math.PI,
      hp,
      maxHp:hp,
      shield,
      maxShield:shield,
      radius:Math.round(base.radius * (boss ? 1.2 : 1)),
      width:Math.round(base.width * (boss ? 1.22 : 1)),
      height:Math.round(base.height * (boss ? 1.22 : 1)),
      speed:base.speed(level),
      attackRange:base.attackRange,
      attackDamage:Math.round(base.attackDamage(level) * (boss ? 1.65 : 1)),
      attackCooldown:base.attackCooldown,
      reward:base.reward(level),
      color:base.color,
      shieldAbsorbRatio:base.shieldAbsorbRatio,
      vx:0,
      vy:0,
      moving:false,
      recentHitTimer:0
    };
  }

  function buildServerPortalWave(wave){
    if(wave >= portalWaveTotal){
      return [createPortalEnemy("chasseur_spectral", wave, 1, 0, -1040, true)];
    }
    const batch = Math.ceil(wave / 5);
    const count = Math.min(9, 3 + Math.floor((wave - 1) / 3));
    const kinds = batch <= 2 ? ["drone_pirate", "raider_astral"] : batch <= 4 ? ["raider_astral", "chasseur_spectral"] : ["chasseur_spectral", "boss_cuirasse_nebulaire"];
    return Array.from({length:count}, (_, i)=>{
      const side = i % 3;
      const x = side === 0 ? -1480 + i * 80 : side === 1 ? 1480 - i * 75 : -480 + i * 105;
      const y = -1040 - (i % 4) * 96;
      return createPortalEnemy(kinds[i % kinds.length], wave, i + 1, x, y, false);
    });
  }

  function startPortalInstance(socket, portalId){
    const player = players.get(socket.id);
    if(!player) return;
    let group = player.groupId ? groups.get(player.groupId) : null;
    if(!group) group = createGroup(socket);
    if(!group || group.leaderId !== socket.id) return;
    const portal = PORTAL_CONFIGS[String(portalId || "blue")] || PORTAL_CONFIGS.blue;
    group.instance = {
      id:`P-${String(instanceSeq++).padStart(4, "0")}`,
      type:"portal",
      portal:{id:portal.id, name:portal.name, totalWaves:portalWaveTotal},
      spawn:{mapId:`portal-${portal.id}`, x:0, y:0},
      wave:1,
      completed:false,
      enemies:buildServerPortalWave(1)
    };
    io.to(group.id).emit("portal:started", {
      instanceId:group.instance.id,
      portal:group.instance.portal,
      spawn:group.instance.spawn,
      wave:group.instance.wave
    });
    emitInstance(group);
  }

  function emitPortalComplete(group){
    const instance = group?.instance;
    if(!instance || instance.type !== "portal" || instance.rewardGranted) return;
    instance.rewardGranted = true;
    instance.rewardGrantedAt = Date.now();
    instance.completed = true;
    const portal = PORTAL_CONFIGS[instance.portal?.id] || PORTAL_CONFIGS.blue;
    const now = Date.now();
    for(const memberId of group.members || []){
      const player = players.get(memberId);
      if(!player) continue;
      const result = profileManager.updateProfileForPlayer({
        player,
        update:profile=>{
          profile.player = applyProgressionReward(profile.player || {}, portal.reward || {});
          if(!profile.completedPortals || typeof profile.completedPortals !== "object") profile.completedPortals = {};
          profile.completedPortals[portal.id] = Math.max(0, Number(profile.completedPortals[portal.id] || 0)) + 1;
          if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
          if(Number(portal.reward?.ammoX4 || 0) > 0){
            profile.ammoInventory.ammo_x4 = Math.max(0, Number(profile.ammoInventory.ammo_x4 || 0)) + Math.max(0, Math.round(Number(portal.reward.ammoX4 || 0)));
          }
          if(Number(portal.reward?.ammoX6 || 0) > 0){
            profile.ammoInventory.ammo_x6 = Math.max(0, Number(profile.ammoInventory.ammo_x6 || 0)) + Math.max(0, Math.round(Number(portal.reward.ammoX6 || 0)));
          }
          return {ok:true};
        }
      });
      io.to(memberId).emit("portal:complete", {
        instanceId:instance.id,
        portal:{id:portal.id, name:portal.name},
        reward:portal.reward,
        rewardAppliedByServer:true,
        at:now
      });
      if(result.profile) io.to(memberId).emit("profile:sync", result.profile);
    }
    emitInstance(group);
  }

  return {
    buildServerPortalWave,
    emitPortalComplete,
    portalWaveTotal,
    startPortalInstance
  };
}
