export function createGroupCommands({multiplayer, toast, emitChange}){
  function createMultiplayerGroup(){
    if(!multiplayer.connected) return toast("Connecte-toi au serveur multi d'abord.");
    multiplayer.socket.emit("group:create");
  }

  function inviteMultiplayerPlayer(targetId){
    if(!multiplayer.connected) return toast("Connecte-toi au serveur multi d'abord.");
    if(!targetId) return toast("Choisis un joueur a inviter.");
    multiplayer.socket.emit("group:invite", {targetId});
  }

  function inviteMultiplayerPlayerByName(targetName){
    if(!multiplayer.connected) return toast("Connecte-toi au serveur multi d'abord.");
    const name = String(targetName || "").trim();
    if(!name) return toast("Entre le nom du joueur a inviter.");
    multiplayer.socket.emit("group:invite", {targetName:name});
  }

  function acceptMultiplayerInvite(groupId){
    if(!multiplayer.connected || !groupId) return;
    multiplayer.socket.emit("group:accept", {groupId});
    multiplayer.invites = multiplayer.invites.filter(invite=>invite.groupId !== groupId);
    emitChange();
  }

  function declineMultiplayerInvite(groupId){
    if(!multiplayer.connected || !groupId) return;
    multiplayer.socket.emit("group:decline", {groupId});
    multiplayer.invites = multiplayer.invites.filter(invite=>invite.groupId !== groupId);
    emitChange();
  }

  function leaveMultiplayerGroup(){
    if(!multiplayer.connected) return;
    multiplayer.socket.emit("group:leave");
    multiplayer.serverEnemies.clear();
    multiplayer.serverEnemyScope = null;
    multiplayer.coopInstanceId = null;
    multiplayer.coopSpawn = null;
    emitChange();
  }

  function kickMultiplayerGroupMember(targetId){
    if(!multiplayer.connected || !targetId) return;
    multiplayer.socket.emit("group:kick", {targetId});
  }

  function promoteMultiplayerGroupMember(targetId){
    if(!multiplayer.connected || !targetId) return;
    multiplayer.socket.emit("group:promote", {targetId});
  }

  function pingMultiplayerGroupMember(targetId){
    if(!targetId) return;
    multiplayer.groupPing = {targetId, expiresAt:performance.now() + 5000};
    emitChange("group:ping", multiplayer.groupPing);
  }

  function startCoopTestInstance(){
    if(!multiplayer.connected) return toast("Connecte-toi au serveur multi d'abord.");
    if(!multiplayer.group) return toast("Cree ou rejoins un groupe d'abord.");
    multiplayer.socket.emit("coop:start-test");
  }

  function startServerPortal(portalId){
    if(!multiplayer.connected) return toast("Connecte-toi au serveur multi d'abord.");
    if(!multiplayer.group) return toast("Cree ou rejoins un groupe d'abord.");
    multiplayer.socket.emit("portal:start", {portalId});
  }

  function getGroupRemotePlayers(mapId = null){
    const memberIds = new Set((multiplayer.group?.members || []).map(member=>member?.id).filter(Boolean));
    const byId = new Map();
    for(const remote of multiplayer.remotePlayers.values()){
      if(!memberIds.has(remote.id)) continue;
      const state = remote.state;
      if(!state || (mapId !== null && String(state.mapId) !== String(mapId))) continue;
      byId.set(remote.id, remote);
    }
    for(const player of multiplayer.players || []){
      if(!player?.id || player.id === multiplayer.playerId || !memberIds.has(player.id) || byId.has(player.id)) continue;
      const state = player.state;
      if(!state || (mapId !== null && String(state.mapId) !== String(mapId))) continue;
      byId.set(player.id, player);
    }
    return [...byId.values()];
  }

  return {
    createMultiplayerGroup,
    inviteMultiplayerPlayer,
    inviteMultiplayerPlayerByName,
    acceptMultiplayerInvite,
    declineMultiplayerInvite,
    leaveMultiplayerGroup,
    kickMultiplayerGroupMember,
    promoteMultiplayerGroupMember,
    pingMultiplayerGroupMember,
    startCoopTestInstance,
    startServerPortal,
    getGroupRemotePlayers
  };
}
