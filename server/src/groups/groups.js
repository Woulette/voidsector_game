import { COOP_ENEMY_TYPES } from "../world/definitions.js";

export function createGroupManager({io, players, publicPlayer, publicEnemy, emitPlayers}){
  const groups = new Map();
  let groupSeq = 1;
  let instanceSeq = 1;

  function publicGroup(group){
    if(!group) return null;
    return {
      id:group.id,
      leaderId:group.leaderId,
      members:group.members.map(id=>publicPlayer(players.get(id))).filter(Boolean)
    };
  }

  function emitInstance(group){
    if(!group?.instance) return;
    io.to(group.id).emit("coop:enemies", {
      instanceId:group.instance.id,
      spawn:group.instance.spawn,
      portal:group.instance.portal || null,
      wave:group.instance.wave || 0,
      completed:Boolean(group.instance.completed),
      enemies:group.instance.enemies.filter(enemy=>enemy.hp > 0).map(publicEnemy)
    });
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

  function leaveCurrentGroup(socket){
    const player = players.get(socket.id);
    if(!player?.groupId) return;
    const group = groups.get(player.groupId);
    if(!group){
      player.groupId = null;
      return;
    }
    group.members = group.members.filter(id=>id !== socket.id);
    player.groupId = null;
    socket.leave(group.id);
    if(group.members.length === 0){
      groups.delete(group.id);
      return;
    }
    if(group.leaderId === socket.id) group.leaderId = group.members[0];
    emitGroup(group.id);
  }

  function createGroup(socket){
    leaveCurrentGroup(socket);
    const player = players.get(socket.id);
    if(!player) return null;
    const group = {
      id:`G-${String(groupSeq++).padStart(4, "0")}`,
      leaderId:socket.id,
      members:[socket.id],
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
    if(!group || !player) return;
    leaveCurrentGroup(socket);
    group.members.push(socket.id);
    player.groupId = group.id;
    socket.join(group.id);
    emitGroup(group.id);
    emitPlayers();
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
    emitGroup,
    emitInstance,
    groups,
    leaveCurrentGroup
  };
}
