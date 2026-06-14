function pushFirmEvent(multiplayer, event){
  if(!Array.isArray(multiplayer.firmEvents)) multiplayer.firmEvents = [];
  multiplayer.firmEvents.push({...event, receivedAt:performance.now()});
  if(multiplayer.firmEvents.length > 40) multiplayer.firmEvents.splice(0, multiplayer.firmEvents.length - 40);
}

function profileMapFrom(snapshot){
  const rows = Array.isArray(snapshot?.individualRanking) ? snapshot.individualRanking : [];
  const profiles = new Map();
  for(const row of rows){
    if(!row?.publicProfile) continue;
    const keys = [row.key, row.name, row.publicProfile.key, row.publicProfile.name]
      .map(value=>String(value || "").trim().toLowerCase())
      .filter(Boolean);
    for(const key of keys) profiles.set(key, row.publicProfile);
  }
  return profiles;
}

function mergeFirmProfiles(previous, payload){
  if(!payload || !Array.isArray(payload.individualRanking)) return payload || null;
  const profiles = profileMapFrom(previous);
  return {
    ...payload,
    individualRanking:payload.individualRanking.map(row=>{
      if(row.publicProfile) return row;
      const byKey = String(row.key || "").trim().toLowerCase();
      const byName = String(row.name || "").trim().toLowerCase();
      const publicProfile = profiles.get(byKey) || profiles.get(byName) || null;
      return publicProfile ? {...row, publicProfile} : row;
    })
  };
}

function mergeFirmSnapshot(previous, payload){
  const next = mergeFirmProfiles(previous, payload);
  if(!previous || !next) return next;
  return {
    ...previous,
    ...next,
    personal:{...(previous.personal || {}), ...(next.personal || {})},
    shop:Array.isArray(next.shop) ? next.shop : previous.shop
  };
}

export function installFirmSocketListeners({socket, multiplayer, emitChange, toast}){
  socket.on("firm:snapshot", payload=>{
    const merged = mergeFirmProfiles(multiplayer.firmSnapshot, payload);
    multiplayer.firmSnapshot = merged || null;
    multiplayer.firmRanking = merged || null;
    emitChange("firm:snapshot", merged);
  });
  socket.on("firm:ranking", payload=>{
    const merged = mergeFirmSnapshot(multiplayer.firmSnapshot || multiplayer.firmRanking, payload);
    multiplayer.firmRanking = merged || null;
    if(multiplayer.firmSnapshot || merged?.personal?.key) multiplayer.firmSnapshot = merged || null;
    emitChange("firm:ranking", merged);
  });
  socket.on("firm:updated", event=>{
    pushFirmEvent(multiplayer, event || {});
    const messages = {
      "shop-buy":"Achat de firme valide.",
      "box-open":`Coffre ouvert : ${event?.reward?.label || "recompense obtenue"}.`,
      "reward-claim":"Recompenses de firme recuperees.",
      "quest-claim":"Prime de quete de firme recuperee.",
      "quest-accept":"Quete de firme acceptee."
    };
    if(messages[event?.action]) toast(messages[event.action]);
    emitChange("firm:updated", event);
  });
  socket.on("firm:error", payload=>{
    toast(payload?.message || "Action de firme impossible.");
    emitChange("firm:error", payload);
  });
}
