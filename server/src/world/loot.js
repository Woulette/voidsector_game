import { GROUND_LOOT_TTL_MS, LOOT_OWNER_TIMEOUT_MS, PORTAL_DROP_RULES, WORLD_MAPS } from "./definitions.js";
import { addInventoryItemAmount } from "../economy/inventoryStacks.js";
import { findServerQuestItemDrop } from "../quests/questItemDrops.js";
import { rollResourceDrops } from "./resourceDrops.js";
import { createLootCollectionManager } from "./lootCollection.js";

const PORTAL_ANCHOR_KEY_DROP = {
  itemId:"portal_anchor_key",
  name:"Clé du portail Deadly",
  img:"assets/quest_items/portal_anchor_key.png",
  amount:1,
  dropChance:0.001
};

function isPortalAnchorKeyDropZone(mapId){
  const mapName = WORLD_MAPS[String(mapId)]?.name || String(mapId || "");
  return /^(Helion|Nereid|Aureon|Sylva)-0[1-5]$/i.test(mapName);
}

export function rollPortalAnchorKeyDrop(mapId, {random = Math.random} = {}){
  if(!isPortalAnchorKeyDropZone(mapId)) return null;
  if(Number(random()) > PORTAL_ANCHOR_KEY_DROP.dropChance) return null;
  return {...PORTAL_ANCHOR_KEY_DROP};
}

export function portalRuleMatchesMap(rule, map){
  if((rule.dropZones || []).includes(map?.name)) return true;
  if(rule.includeCore && (String(map?.id || "") === "50" || String(map?.name || "").toUpperCase() === "CORE")){
    return true;
  }
  const mapNumber = Number(String(map?.name || "").match(/-(\d{2})$/)?.[1] || 0);
  if(mapNumber > 0 && (rule.dropMapNumbers || []).includes(mapNumber)) return true;
  const dropLevelRange = Array.isArray(rule.dropLevelRange) ? rule.dropLevelRange : null;
  const mapLevelRange = Array.isArray(map?.level) ? map.level : null;
  if(!dropLevelRange || !mapLevelRange) return false;
  const dropMin = Number(dropLevelRange[0]);
  const dropMax = Number(dropLevelRange[1]);
  const mapMin = Number(mapLevelRange[0]);
  const mapMax = Number(mapLevelRange[1]);
  if(![dropMin, dropMax, mapMin, mapMax].every(Number.isFinite)) return false;
  return mapMax >= dropMin && mapMin <= dropMax;
}

export function rollPortalPieceDrop(mapId, {random = Math.random} = {}){
  const map = WORLD_MAPS[String(mapId)] || null;
  if(!map) return null;
  const eligibleRules = PORTAL_DROP_RULES.filter(rule=>Number(rule.dropChance) > 0 && portalRuleMatchesMap(rule, map));
  const roll = Number(random());
  if(!Number.isFinite(roll) || roll < 0 || roll > 1) return null;
  let cumulativeChance = 0;
  for(const rule of eligibleRules){
    cumulativeChance += Number(rule.dropChance);
    if(roll <= cumulativeChance) return {...rule};
  }
  return null;
}

export function createWorldLootManager({io, players, profileManager, emitProfileSync, getGroups, now = Date.now}){
  const activeLootDrops = new Map();
  const collection = createLootCollectionManager({players, getDrop:id=>activeLootDrops.get(id), getMap:mapId=>WORLD_MAPS[String(mapId)], complete:applyLootReward, now});

  function getGroupQuestItemRecipients(owner, groupId = owner?.groupId){
    const group = groupId && owner?.groupId === groupId ? getGroups?.()?.get(groupId) : null;
    const ids = group?.members?.length ? group.members : [owner?.id];
    return [...new Set(ids)]
      .map(id=>players.get(id))
      .filter(Boolean);
  }

  function updateLootOwner(enemy, attackerId){
    if(!enemy || !attackerId) return;
    const now = Date.now();
    if(!enemy.lootOwnerId || enemy.lootOwnerId === attackerId || now - Number(enemy.lootOwnerAt || 0) >= LOOT_OWNER_TIMEOUT_MS){
      enemy.lootOwnerId = attackerId;
      enemy.lootOwnerAt = now;
    }
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
      name:drop.pieceName || `Fragment ${drop.name}`,
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
      name:drop.pieceName || `Fragment ${drop.name}`,
      img:drop.img,
      mapId,
      x,
      y,
      expiresAt,
      serverControlled:true,
      at:Date.now()
    });
  }

  function emitPrivateQuestItemDrop({enemy, mapId, ownerId}){
    const owner = players.get(ownerId);
    if(!enemy || enemy.questItemDropRolled || !owner || String(owner.mapId) !== String(mapId)) return;
    enemy.questItemDropRolled = true;
    const mapName = WORLD_MAPS[String(mapId)]?.name || String(mapId);
    const candidates = getGroupQuestItemRecipients(owner).map(player=>{
      const profile = profileManager.getProfileForPlayer?.(player);
      const itemDrop = findServerQuestItemDrop(profile, {
        enemyKind:enemy.kind || enemy.type,
        zoneName:mapName
      });
      return itemDrop ? {
        playerId:player.id,
        drop:itemDrop,
        runId:String(profile.questFailProgress?.[itemDrop.questId]?.runId || "")
      } : null;
    }).filter(Boolean);
    const drop = candidates[0]?.drop;
    if(!drop?.itemId || Math.random() > Number(drop.dropChance || 0)) return;
    const x = Number(enemy.x || 0) + (Math.random() - .5) * 70;
    const y = Number(enemy.y || 0) + (Math.random() - .5) * 70;
    const id = `loot_quest_${drop.itemId}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const expiresAt = Date.now() + GROUND_LOOT_TTL_MS;
    activeLootDrops.set(id, {
      id,
      ownerId:owner.id,
      kind:"questItem",
      questId:drop.questId,
      objectiveId:drop.objectiveId,
      questRuns:Object.fromEntries(candidates.filter(entry=>entry.drop.itemId === drop.itemId)
        .map(entry=>[entry.playerId, {questId:entry.drop.questId, runId:entry.runId}])),
      itemId:drop.itemId,
      name:drop.itemName,
      img:drop.itemImg,
      groupId:owner.groupId || null,
      mapId:String(mapId),
      x,
      y,
      expiresAt
    });
    io.to(owner.id).emit("loot:drop", {
      id,
      kind:"questItem",
      questId:drop.questId,
      objectiveId:drop.objectiveId,
      itemId:drop.itemId,
      name:drop.itemName,
      img:drop.itemImg,
      label:"QUETE",
      mapId,
      x,
      y,
      expiresAt,
      serverControlled:true,
      at:Date.now()
    });
  }

  function emitPrivateResourceDrops({enemy, mapId, ownerId}){
    const owner = players.get(ownerId);
    if(!enemy || enemy.resourceDropRolled || !owner || String(owner.mapId) !== String(mapId)) return;
    enemy.resourceDropRolled = true;
    const resourceDropBand = WORLD_MAPS[String(mapId)]?.resourceDropBand || "";
    const drops = rollResourceDrops(enemy.level, {resourceDropBand});
    for(const drop of drops){
      const x = Number(enemy.x || 0) + (Math.random() - .5) * 90;
      const y = Number(enemy.y || 0) + (Math.random() - .5) * 90;
      const id = `loot_material_${drop.materialId}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const expiresAt = Date.now() + GROUND_LOOT_TTL_MS;
      activeLootDrops.set(id, {
        id,
        ownerId:owner.id,
        kind:"material",
        rarity:drop.rarity,
        materialId:drop.materialId,
        name:drop.name,
        img:drop.img,
        amount:drop.amount,
        mapId:String(mapId),
        x,
        y,
        expiresAt
      });
      io.to(owner.id).emit("loot:drop", {
        id,
        kind:"material",
        rarity:drop.rarity,
        materialId:drop.materialId,
        name:drop.name,
        img:drop.img,
        amount:drop.amount,
        label:"RESSOURCE",
        mapId,
        x,
        y,
        expiresAt,
        serverControlled:true,
        at:Date.now()
      });
    }
  }

  function emitPrivatePortalAnchorKeyDrop({enemy, mapId, ownerId}){
    const owner = players.get(ownerId);
    if(!enemy || enemy.portalAnchorKeyDropRolled || !owner || String(owner.mapId) !== String(mapId)) return;
    enemy.portalAnchorKeyDropRolled = true;
    const drop = rollPortalAnchorKeyDrop(mapId);
    if(!drop) return;
    const x = Number(enemy.x || 0) + (Math.random() - .5) * 90;
    const y = Number(enemy.y || 0) + (Math.random() - .5) * 90;
    const id = `loot_item_${drop.itemId}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const expiresAt = Date.now() + GROUND_LOOT_TTL_MS;
    activeLootDrops.set(id, {
      id,
      ownerId:owner.id,
      kind:"item",
      itemId:drop.itemId,
      name:drop.name,
      img:drop.img,
      amount:drop.amount,
      mapId:String(mapId),
      x,
      y,
      expiresAt
    });
    io.to(owner.id).emit("loot:drop", {
      id,
      kind:"item",
      itemId:drop.itemId,
      name:drop.name,
      img:drop.img,
      amount:drop.amount,
      label:"CLE",
      rarity:"quest",
      mapId,
      x,
      y,
      expiresAt,
      serverControlled:true,
      at:Date.now()
    });
  }

  function pickupLoot(socket, payload){
    return collection.handle(socket, payload);
  }

  function applyLootReward(socket, player, drop, attemptId){
    const id = drop.id;
    const correlation = attemptId ? {attemptId} : {};
    if(drop.kind === "questItem"){
      activeLootDrops.delete(id);
      socket.emit("loot:picked", {
        id,
        ...correlation,
        kind:drop.kind,
        rarity:drop.rarity || "",
        itemId:drop.itemId,
        name:drop.name,
        amount:drop.amount,
        at:Date.now()
      });
      for(const recipient of getGroupQuestItemRecipients(player, drop.groupId)){
        const run = drop.questRuns?.[recipient.id];
        const profile = profileManager.getProfileForPlayer?.(recipient);
        // A ground item belongs to the attempts active when the monster died.
        // Abandon/reaccept (including within the same millisecond) gets a new ID.
        if(!run || !profile?.activeQuestIds?.includes(run.questId)
          || profile.completedQuestClaims?.[run.questId]
          || String(profile.questFailProgress?.[run.questId]?.runId || "") !== run.runId) continue;
        const questResult = profileManager.applyQuestAction({
          player:recipient,
          action:{kind:"progress", type:"quest_item_drop", itemId:drop.itemId, questId:run.questId}
        });
        if(!questResult.ok) continue;
        if(questResult.updates?.length){
          io.to(recipient.id).emit("quest:progress", {
            updates:questResult.updates,
            sharedByPlayerId:player.id,
            at:Date.now()
          });
        }
        if(questResult.claimedQuests?.length){
          for(const claim of questResult.claimedQuests){
            io.to(recipient.id).emit("quest:claimed", {
              id:claim.quest?.id,
              title:claim.quest?.title,
              reward:claim.reward || {},
              auto:true,
              at:Date.now()
            });
          }
        }
        if(questResult.updates?.length || questResult.claimedQuests?.length){
          emitProfileSync?.(recipient, questResult.profile);
        }
      }
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
          const amount = Math.max(1, Math.min(20, Math.round(Number(drop.amount || 1))));
          addInventoryItemAmount(profile, drop.itemId, amount);
          return {ok:true};
        }
        return {ok:false, reason:"Type de butin invalide."};
      }
    });
    if(!result.ok){
      activeLootDrops.set(id, drop);
      socket.emit("loot:error", {id, ...correlation, message:result.reason || "Ramassage impossible."});
      return;
    }
    socket.emit("loot:picked", {
      id,
      ...correlation,
      kind:drop.kind,
      portalId:drop.portalId,
      portalName:drop.portalName,
      rarity:drop.rarity || "",
      materialId:drop.materialId,
      ammoId:drop.ammoId,
      itemId:drop.itemId,
      name:drop.name,
      amount:drop.amount,
      at:Date.now()
    });
    emitProfileSync?.(player, result.profile);
  }

  function cleanupExpiredLootDrops(at = now()){
    collection.tick(at);
    for(const [id, drop] of activeLootDrops.entries()){
      if(at >= Number(drop.expiresAt || 0)) activeLootDrops.delete(id);
    }
  }

  return {
    cleanupExpiredLootDrops,
    emitPrivatePortalAnchorKeyDrop,
    emitPrivateQuestItemDrop,
    emitPrivatePortalPieceDrop,
    emitPrivateResourceDrops,
    pickupLoot,
    updateLootOwner
  };
}
