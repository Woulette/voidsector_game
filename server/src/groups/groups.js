import { COOP_ENEMY_TYPES } from "../world/definitions.js";

export const MAX_GROUP_MEMBERS = 4;

export function createGroupManager({io, players, publicPlayer, publicEnemy, emitPlayers}){
  const groups = new Map();
  let groupSeq = 1;
  let instanceSeq = 1;

  function publicGroup(group){
    if(!group) return null;
    return {
      id:group.id,
      leaderId:group.leaderId,
      members:group.members.map(id=>players.get(id)).filter(Boolean).map(publicPlayer)
    };
  }

  function emitInstance(group){
    if(!group?.instance) return;
    const payload = {
      instanceId:group.instance.id,
      spawn:group.instance.spawn,
      portal:group.instance.portal || null,
      wave:group.instance.wave || 0,
      completed:Boolean(group.instance.completed),
      enemies:group.instance.enemies.filter(enemy=>enemy.hp > 0).map(publicEnemy),
      ally:publicInstanceAlly(group.instance),
      beacons:publicInstanceBeacons(group.instance),
      objective:publicInstanceObjective(group.instance)
    };
    if(group.instance.type === "portal" && Array.isArray(group.instance.joinedMemberIds)){
      for(const memberId of group.instance.joinedMemberIds){
        if(group.instance.abandonedMemberIds?.includes(memberId)) continue;
        io.to(memberId).emit("coop:enemies", payload);
      }
      return;
    }
    io.to(group.id).emit("coop:enemies", payload);
  }

  function publicInstanceAlly(instance){
    const ally = instance?.ally;
    if(!ally || ally.alive === false) return null;
    return {
      id:ally.id,
      name:ally.name,
      img:ally.img,
      x:ally.x,
      y:ally.y,
      vx:ally.vx || 0,
      vy:ally.vy || 0,
      angle:ally.angle || 0,
      hp:ally.hp,
      maxHp:ally.maxHp,
      shield:ally.shield,
      maxShield:ally.maxShield,
      radius:ally.radius,
      width:ally.width,
      height:ally.height,
      attackRange:ally.attackRange,
      healCooldown:Math.max(0, (Number(ally.healCooldownUntil || 0) - Date.now()) / 1000),
      healCooldownTotal:Math.max(1, Number(ally.healCooldownMs || 60000) / 1000),
      alive:true
    };
  }

  function publicInstanceBeacons(instance){
    const now = Date.now();
    return (Array.isArray(instance?.beacons) ? instance.beacons : [])
      .filter(beacon=>Number(beacon.expiresAt || 0) > now)
      .map(beacon=>({
        id:beacon.id,
        x:beacon.x,
        y:beacon.y,
        radius:beacon.radius,
        heal:beacon.heal,
        expiresAt:beacon.expiresAt
      }));
  }

  function publicInstanceObjective(instance){
    const objective = instance?.objective;
    if(!objective) return null;
    return {
      stage:objective.stage || "levers",
      breachOpen:Boolean(objective.breachOpen),
      cinematicPlayed:Boolean(objective.cinematicPlayed),
      bossSpawned:Boolean(objective.bossSpawned),
      cageSpawned:Boolean(objective.cageSpawned),
      finalWaveSpawned:Boolean(objective.finalWaveSpawned),
      finalWaveCleared:Boolean(objective.finalWaveCleared),
      completedAt:Number(objective.completedAt || 0),
      exitAt:Number(objective.exitAt || 0),
      routeWaves:(objective.routeWaves || []).map(wave=>({
        id:wave.id,
        number:wave.number,
        centerX:wave.centerX,
        centerY:wave.centerY,
        minX:wave.minX,
        maxX:wave.maxX,
        minY:wave.minY,
        maxY:wave.maxY,
        triggered:Boolean(wave.triggered),
        cleared:Boolean(wave.cleared)
      })),
      levers:(objective.levers || []).map(lever=>({
        id:lever.id,
        number:lever.number,
        label:lever.label,
        x:lever.x,
        y:lever.y,
        approached:Boolean(lever.approached),
        unlocked:Boolean(lever.unlocked),
        active:Boolean(lever.active),
        activationWaveSpawned:Boolean(lever.activationWaveSpawned),
        activationWaveCleared:Boolean(lever.activationWaveCleared),
        activatedAt:Number(lever.activatedAt || 0),
        activation:lever.activation ? {
          playerId:lever.activation.playerId,
          playerName:lever.activation.playerName,
          progress:Math.max(0, Math.min(1, Number(lever.activation.progress || 0))),
          blocked:Boolean(lever.activation.blocked),
          resetReason:lever.activation.resetReason || ""
        } : null
      }))
    };
  }

  function emitGroup(groupId){
    const group = groups.get(groupId);
    if(!group) return;
    const payload = publicGroup(group);
    for(const memberId of group.members){
      io.to(memberId).emit("group:update", payload);
    }
    emitInstance(group);
  }

  function resetGroupInstance(groupId, reason = ""){
    const group = groups.get(String(groupId || ""));
    if(!group?.instance) return false;
    const previousInstanceId = group.instance.id || null;
    group.instance = null;
    io.to(group.id).emit("coop:enemies", {
      instanceId:null,
      previousInstanceId,
      spawn:null,
      portal:null,
      wave:0,
      completed:false,
      enemies:[]
    });
    io.to(group.id).emit("group:instance-reset", {
      groupId:group.id,
      previousInstanceId,
      reason:String(reason || ""),
      at:Date.now()
    });
    emitGroup(group.id);
    return true;
  }

  function removePlayerFromGroup(playerId){
    const player = players.get(playerId);
    if(!player?.groupId) return;
    const group = groups.get(player.groupId);
    if(!group){
      player.groupId = null;
      return;
    }
    group.members = group.members.filter(id=>id !== playerId);
    player.groupId = null;
    io.sockets.sockets.get(playerId)?.leave(group.id);
    if(group.members.length === 0){
      groups.delete(group.id);
      return;
    }
    if(group.leaderId === playerId) group.leaderId = group.members[0];
    emitGroup(group.id);
  }

  function replaceGroupMemberId(oldId, nextId){
    for(const group of groups.values()){
      let changed = false;
      group.members = group.members.map(memberId=>{
        if(memberId !== oldId) return memberId;
        changed = true;
        return nextId;
      });
      group.members = [...new Set(group.members)];
      if(group.leaderId === oldId){
        group.leaderId = nextId;
        changed = true;
      }
      if(group.instance?.playerLives && Object.hasOwn(group.instance.playerLives, oldId)){
        group.instance.playerLives[nextId] = group.instance.playerLives[oldId];
        delete group.instance.playerLives[oldId];
        changed = true;
      }
      if(Array.isArray(group.instance?.joinedMemberIds)){
        const nextJoinedMemberIds = group.instance.joinedMemberIds.map(memberId=>memberId === oldId ? nextId : memberId);
        if(nextJoinedMemberIds.some((memberId, index)=>memberId !== group.instance.joinedMemberIds[index])){
          group.instance.joinedMemberIds = [...new Set(nextJoinedMemberIds)];
          changed = true;
        }
      }
      if(Array.isArray(group.instance?.abandonedMemberIds)){
        const nextAbandonedMemberIds = group.instance.abandonedMemberIds.map(memberId=>memberId === oldId ? nextId : memberId);
        if(nextAbandonedMemberIds.some((memberId, index)=>memberId !== group.instance.abandonedMemberIds[index])){
          group.instance.abandonedMemberIds = [...new Set(nextAbandonedMemberIds)];
          changed = true;
        }
      }
      if(changed) emitGroup(group.id);
    }
  }

  function leaveCurrentGroup(socket){
    removePlayerFromGroup(socket.id);
  }

  function createGroup(socket){
    leaveCurrentGroup(socket);
    const player = players.get(socket.id);
    if(!player) return null;
    const group = {
      id:`G-${String(groupSeq++).padStart(4, "0")}`,
      leaderId:socket.id,
      members:[socket.id],
      invites:new Map(),
      createdAt:Date.now()
    };
    groups.set(group.id, group);
    player.groupId = group.id;
    socket.join(group.id);
    emitGroup(group.id);
    emitPlayers();
    return group;
  }

  function acceptInvite(socket, groupId){
    const group = groups.get(groupId);
    const player = players.get(socket.id);
    const invite = group?.invites?.get(socket.id);
    if(!group || !player || !invite || invite.expiresAt < Date.now()) return false;
    if(group.members.length >= MAX_GROUP_MEMBERS){
      group.invites.delete(socket.id);
      socket.emit("group:error", {message:`Groupe complet (${MAX_GROUP_MEMBERS} joueurs maximum).`});
      io.to(group.leaderId).emit("group:invite-resolved", {playerId:socket.id, playerName:player.name, accepted:false});
      return false;
    }
    group.invites.delete(socket.id);
    leaveCurrentGroup(socket);
    group.members.push(socket.id);
    player.groupId = group.id;
    socket.join(group.id);
    io.to(group.leaderId).emit("group:invite-resolved", {playerId:socket.id, playerName:player.name, accepted:true});
    emitGroup(group.id);
    emitPlayers();
    return true;
  }

  function invitePlayer(socket, target){
    const inviter = players.get(socket.id);
    if(!inviter || !target || target.id === socket.id) return {ok:false, reason:"Joueur invalide."};
    if(target.groupId) return {ok:false, reason:"Ce joueur est deja dans un groupe."};
    let group = inviter.groupId ? groups.get(inviter.groupId) : null;
    if(!group) group = createGroup(socket);
    if(!group || group.leaderId !== socket.id) return {ok:false, reason:"Seul le chef peut inviter un joueur."};
    if(group.members.length >= MAX_GROUP_MEMBERS) return {ok:false, reason:`Groupe complet (${MAX_GROUP_MEMBERS} joueurs maximum).`};
    const expiresAt = Date.now() + 30000;
    group.invites.set(target.id, {fromId:socket.id, expiresAt});
    io.to(target.id).emit("group:invite", {
      groupId:group.id,
      fromId:socket.id,
      fromName:inviter.name,
      at:Date.now(),
      expiresAt
    });
    socket.emit("group:invite-sent", {playerId:target.id, playerName:target.name, expiresAt});
    return {ok:true};
  }

  function declineInvite(socket, groupId){
    const group = groups.get(groupId);
    const player = players.get(socket.id);
    if(!group?.invites?.has(socket.id) || !player) return false;
    group.invites.delete(socket.id);
    io.to(group.leaderId).emit("group:invite-resolved", {playerId:socket.id, playerName:player.name, accepted:false});
    return true;
  }

  function kickMember(socket, targetId){
    const leader = players.get(socket.id);
    const group = leader?.groupId ? groups.get(leader.groupId) : null;
    if(!group || group.leaderId !== socket.id || targetId === socket.id || !group.members.includes(targetId)) return false;
    const target = players.get(targetId);
    group.members = group.members.filter(id=>id !== targetId);
    if(target){
      target.groupId = null;
      io.sockets.sockets.get(targetId)?.leave(group.id);
      io.to(targetId).emit("group:update", null);
      io.to(targetId).emit("group:kicked", {byName:leader.name});
    }
    emitGroup(group.id);
    emitPlayers();
    return true;
  }

  function promoteLeader(socket, targetId){
    const leader = players.get(socket.id);
    const group = leader?.groupId ? groups.get(leader.groupId) : null;
    if(!group || group.leaderId !== socket.id || targetId === socket.id || !group.members.includes(targetId)) return false;
    group.leaderId = targetId;
    emitGroup(group.id);
    return true;
  }

  function createCoopInstance(socket){
    const player = players.get(socket.id);
    if(!player) return;
    let group = player.groupId ? groups.get(player.groupId) : null;
    if(!group) group = createGroup(socket);
    if(!group || group.leaderId !== socket.id) return;
    const originX = Number.isFinite(player.state?.x) ? player.state.x : 0;
    const originY = Number.isFinite(player.state?.y) ? player.state.y : 0;
    const layouts = [
      {kind:"shared_orb", x:-260, y:-260},
      {kind:"shared_rusher", x:0, y:-360},
      {kind:"shared_crystal", x:260, y:-260}
    ];
    group.instance = {
      id:`I-${String(instanceSeq++).padStart(4, "0")}`,
      spawn:{mapId:"coop-test", x:originX, y:originY},
      enemies:layouts.map((entry, index)=>{
        const base = COOP_ENEMY_TYPES[entry.kind];
        return {
          ...base,
          id:`${group.id}-E${index + 1}`,
          x:originX + entry.x,
          y:originY + entry.y,
          angle:Math.PI,
          hp:base.hp,
          maxHp:base.hp,
          shield:base.shield,
          maxShield:base.shield,
          shieldAbsorbRatio:.8
        };
      })
    };
    emitInstance(group);
  }

  return {
    acceptInvite,
    createCoopInstance,
    createGroup,
    declineInvite,
    emitGroup,
    emitInstance,
    groups,
    invitePlayer,
    kickMember,
    leaveCurrentGroup,
    removePlayerFromGroup,
    replaceGroupMemberId,
    resetGroupInstance,
    promoteLeader
  };
}
