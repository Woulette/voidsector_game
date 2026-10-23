function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function advanceServerPlayerStateTimeline(player, now = Date.now(), fallbackElapsedMs = 1, {motionChanged = true} = {}){
  if(!player?.state) return null;
  const fallbackElapsed = Math.max(1, Math.min(1000, finite(fallbackElapsedMs, 1)));
  const lastStreamAt = finite(
    player.lastStateStreamAt,
    finite(player.state.serverAt, now - fallbackElapsed)
  );
  const elapsed = Math.max(1, Math.min(1000, now - lastStreamAt));
  const nextSequence = Math.max(0, Math.floor(finite(player.stateStreamSeq))) + 1;
  player.stateStreamSeq = Number.isSafeInteger(nextSequence) ? nextSequence : 1;
  if(motionChanged) player.state.sourceAt = finite(player.state.sourceAt, now - elapsed) + elapsed;
  player.state.streamSeq = player.stateStreamSeq;
  player.state.serverAt = now;
  if(motionChanged){
    player.state.motionDiscontinuity = false;
    player.lastStateStreamAt = now;
  }
  return player.state;
}

export function emitAuthoritativePlayerStateToMapRoom({
  io,
  player,
  publicPlayer,
  profile,
  room = player?.mapRoom,
  now = Date.now()
} = {}){
  const mapRoom = String(room || "");
  if(!mapRoom || !player?.state || typeof publicPlayer !== "function" || typeof io?.to !== "function"){
    return false;
  }
  // Combat changed vitals, not the position's capture time.
  advanceServerPlayerStateTimeline(player, now, 1, {motionChanged:false});
  io.to(mapRoom).emit("player:state", publicPlayer(player, {profile}));
  player.lastReliableStateBroadcastAt = now;
  return true;
}
