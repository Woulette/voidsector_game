import { GROUND_LOOT_TTL_MS, LOOT_OWNER_TIMEOUT_MS, PORTAL_DROP_RULES, WORLD_MAPS } from "./definitions.js";

export function createWorldLootManager({io, players, profileManager}){
  const activeLootDrops = new Map();

  function updateLootOwner(enemy, attackerId){
    if(!enemy || !attackerId) return;
    const now = Date.now();
    if(!enemy.lootOwnerId || enemy.lootOwnerId === attackerId || now - Number(enemy.lootOwnerAt || 0) >= LOOT_OWNER_TIMEOUT_MS){
      enemy.lootOwnerId = attackerId;
      enemy.lootOwnerAt = now;
    }
  }

  function rollPortalPieceDrop(mapId){
    const mapName = WORLD_MAPS[String(mapId)]?.name || String(mapId);
    for(const rule of PORTAL_DROP_RULES){
      if(!rule.dropChance || !(rule.dropZones || []).includes(mapName)) continue;
      if(Math.random() <= rule.dropChance) return rule;
    }
    return null;
  }

  function emitPrivatePortalPieceDrop({enemy, mapId, ownerId}){
    const owner = players.get(ownerId);
    if(!enemy || enemy.portalPieceDropRolled || !owner || String(owner.mapId) !== String(mapId)) return;
    enemy.portalPieceDropRolled = true;
    const drop = rollPortalPieceDrop(mapId);
    if(!drop) return;
    const x = Number(enemy.x || 0) + (Math.random() - .5) * 70;
    const y = Number(enemy.y || 0) + (Math.random() - .5) * 70;
    const id = `loot_${drop.id}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const expiresAt = Date.now() + GROUND_LOOT_TTL_MS;
    activeLootDrops.set(id, {
      id,
      ownerId:owner.id,
      kind:"portalPiece",
      portalId:drop.id,
      portalName:drop.name,
      mapId:String(mapId),
      x,
      y,
      expiresAt
    });
    io.to(owner.id).emit("loot:drop", {
      id,
      kind:"portalPiece",
      portalId:drop.id,
      portalName:drop.name,
      img:drop.img,
      mapId,
      x,
      y,
      expiresAt,
      serverControlled:true,
      at:Date.now()
    });
  }

  function pickupLoot(socket, payload){
    const player = players.get(socket.id);
    const id = String(payload?.id || "");
    const drop = activeLootDrops.get(id);
    if(!player || !drop){
      socket.emit("loot:error", {message:"Butin introuvable."});
      return;
    }
    if(drop.ownerId !== socket.id){
      socket.emit("loot:error", {message:"Ce butin ne t'appartient pas."});
      return;
    }
    if(Date.now() >= Number(drop.expiresAt || 0)){
      activeLootDrops.delete(id);
      socket.emit("loot:error", {message:"Butin expire."});
      return;
    }
    if(String(player.mapId || "") !== String(drop.mapId || "")){
      socket.emit("loot:error", {message:"Butin sur une autre map."});
      return;
    }
    const state = player.state;
    const distance = state ? Math.hypot(Number(state.x || 0) - Number(drop.x || 0), Number(state.y || 0) - Number(drop.y || 0)) : Infinity;
    if(distance > 220){
      socket.emit("loot:error", {message:"Trop loin du butin."});
      return;
    }
    activeLootDrops.delete(id);
    const result = profileManager.updateProfileForPlayer({
      player,
      update:profile=>{
        if(drop.kind === "portalPiece"){
          if(!profile.portalPieces || typeof profile.portalPieces !== "object") profile.portalPieces = {};
          profile.portalPieces[drop.portalId] = Math.max(0, Number(profile.portalPieces[drop.portalId] || 0)) + 1;
          return {ok:true};
        }
        if(drop.kind === "material"){
          if(!profile.cargoHold || typeof profile.cargoHold !== "object") profile.cargoHold = {};
          profile.cargoHold[drop.materialId] = Math.max(0, Number(profile.cargoHold[drop.materialId] || 0)) + Math.max(1, Math.round(Number(drop.amount || 1)));
          return {ok:true};
        }
        if(drop.kind === "ammo"){
          if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
          profile.ammoInventory[drop.ammoId] = Math.max(0, Number(profile.ammoInventory[drop.ammoId] || 0)) + Math.max(1, Math.round(Number(drop.amount || 1)));
          return {ok:true};
        }
        if(drop.kind === "item"){
          if(!Array.isArray(profile.inventoryItems)) profile.inventoryItems = [];
          const amount = Math.max(1, Math.min(20, Math.round(Number(drop.amount || 1))));
          let nextUid = Math.max(1, Math.floor(Number(profile.nextInventoryUid || 1)));
          for(let i = 0; i < amount; i += 1){
            profile.inventoryItems.push({uid:`inv_${drop.itemId}_${nextUid}`, itemId:drop.itemId});
            nextUid += 1;
          }
          profile.nextInventoryUid = nextUid;
          return {ok:true};
        }
        return {ok:false, reason:"Type de butin invalide."};
      }
    });
    if(!result.ok){
      activeLootDrops.set(id, drop);
      socket.emit("loot:error", {message:result.reason || "Ramassage impossible."});
      return;
    }
    socket.emit("loot:picked", {
      id,
      kind:drop.kind,
      portalId:drop.portalId,
      portalName:drop.portalName,
      materialId:drop.materialId,
      ammoId:drop.ammoId,
      itemId:drop.itemId,
      name:drop.name,
      amount:drop.amount,
      at:Date.now()
    });
    if(result.profile) socket.emit("profile:sync", result.profile);
  }

  function cleanupExpiredLootDrops(now = Date.now()){
    for(const [id, drop] of activeLootDrops.entries()){
      if(now >= Number(drop.expiresAt || 0)) activeLootDrops.delete(id);
    }
  }

  return {
    cleanupExpiredLootDrops,
    emitPrivatePortalPieceDrop,
    pickupLoot,
    updateLootOwner
  };
}
