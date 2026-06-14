import { applyProgressionReward, getXpNextForLevel } from "../players/progression.js";
import { buildPublicPlayerProfile } from "../players/publicProfile.js";
import { appendProfileActivity } from "../players/activityLog.js";
import {
  findEquippedSlot,
  getServerAmmo,
  getServerDroneCatalog,
  getServerItem,
  getServerShip,
  makeEmptyLoadout,
  unequipInventoryUid
} from "../economy/equipment.js";
import { addInventoryItemAmount, getInventoryEntryQuantity, isStackableInventoryItem } from "../economy/inventoryStacks.js";
import { ENEMY_TYPES } from "../../../src/game/combatData.js";
import { droneFormations } from "../../../src/data/equipment.js";
import { portals, rawMaterialCatalog } from "../../../src/data/progression.js";

const ROLE_POWER = {
  player:0,
  moderator:1,
  admin:2,
  owner:3
};

const ADJUSTABLE_FIELDS = new Set(["credits", "premium", "xp"]);
const GRANT_TYPES = new Set(["item", "ammo", "resource", "ship", "drone", "formation", "portalPiece", "firmBox"]);
const FIRM_BOX_RARITIES = new Set(["common", "rare", "veryRare", "elite", "mythic"]);
const MAX_GRANT_AMOUNT = 1_000_000;
const MAX_NON_STACKABLE_GRANT_AMOUNT = 100;

function rolePower(role){
  return ROLE_POWER[String(role || "player").toLowerCase()] || 0;
}

function cleanReason(reason){
  return String(reason || "").trim().replace(/\s+/g, " ").slice(0, 240);
}

function publicAdminPlayer(player, profileManager, sessions = [player]){
  const profile = profileManager.getProfileForPlayer?.(player) || null;
  const state = player?.state || null;
  const account = player?.account || {};
  const connectedSessions = sessions.filter(session=>session?.connected !== false);
  const clientModes = [...new Set(connectedSessions.map(session=>session.clientMode || "launcher"))];
  const suspicion = profile ? analyzeProfileSuspicion(profile) : {score:0, level:"clear", suspicious:false, reasons:[]};
  return {
    id:player.id,
    socketIds:connectedSessions.map(session=>session.id).filter(Boolean),
    sessionCount:connectedSessions.length,
    accountId:player.accountId || null,
    name:profile?.player?.name || player.name || "Pilote",
    role:account.role || "player",
    bannedUntil:Math.max(0, Number(account.bannedUntil || 0)),
    banReason:String(account.banReason || ""),
    mutedUntil:Math.max(0, Number(account.mutedUntil || 0)),
    muteReason:String(account.muteReason || ""),
    clientMode:clientModes.includes("game") ? "game" : (player.clientMode || "launcher"),
    clientModes,
    connected:connectedSessions.length > 0,
    mapId:String(player.mapId ?? state?.mapId ?? "0"),
    groupId:player.groupId || null,
    hp:state ? Math.max(0, Math.round(Number(state.hp || 0))) : null,
    maxHp:state ? Math.max(0, Math.round(Number(state.maxHp || 0))) : null,
    level:Math.max(1, Math.floor(Number(profile?.player?.level || 1))),
    firmId:profile?.player?.firmId || player.account?.firmId || "astra",
    credits:Math.max(0, Math.round(Number(profile?.player?.credits || 0))),
    premium:Math.max(0, Math.round(Number(profile?.player?.premium || 0))),
    totalXp:Math.max(0, Math.round(Number(profile?.player?.totalXp || 0))),
    suspicion
  };
}

function playerIdentityKey(player){
  const accountId = String(player?.accountId || player?.account?.id || "");
  if(accountId) return `account:${accountId}`;
  const clientId = String(player?.clientId || "");
  return clientId ? `guest:${clientId}` : `socket:${String(player?.id || "")}`;
}

function groupOnlinePlayers(players){
  const groups = new Map();
  for(const player of players.values()){
    const key = playerIdentityKey(player);
    if(!groups.has(key)) groups.set(key, []);
    groups.get(key).push(player);
  }
  return [...groups.values()].map(sessions=>{
    const connected = sessions.filter(player=>player?.connected !== false);
    const candidates = connected.length ? connected : sessions;
    const representative = candidates.find(player=>player.clientMode === "game")
      || candidates.find(player=>player.clientMode === "launcher")
      || candidates[0];
    return {representative, sessions};
  }).filter(group=>group.representative);
}

function publicProfileEntry(entry){
  if(!entry?.profile) return null;
  const player = entry.profile.player || {};
  const suspicion = analyzeProfileSuspicion(entry.profile);
  return {
    key:String(entry.key || ""),
    accountId:String(entry.key || "").startsWith("account:") ? String(entry.key).slice("account:".length) : null,
    name:String(player.name || "Pilote"),
    firmId:String(player.firmId || "astra"),
    level:Math.max(1, Math.floor(Number(player.level || 1))),
    credits:Math.max(0, Math.round(Number(player.credits || 0))),
    premium:Math.max(0, Math.round(Number(player.premium || 0))),
    xp:Math.max(0, Math.round(Number(player.xp || 0))),
    xpNext:Math.max(1, Math.round(Number(player.xpNext || getXpNextForLevel(player.level || 1)))),
    totalXp:Math.max(0, Math.round(Number(player.totalXp || 0))),
    reputation:Math.max(0, Math.round(Number(player.reputation || 0))),
    totalKills:Math.max(0, Math.round(Number(player.totalKills || 0))),
    updatedAt:Math.max(0, Number(entry.profile.updatedAt || 0)),
    suspicion
  };
}

function enemyName(kind){
  const enemy = ENEMY_TYPES?.[kind];
  return enemy?.name || String(kind || "Monstre");
}

function topKillEntries(killStats = {}, limit = 12){
  return Object.entries(killStats || {})
    .map(([kind, count])=>({
      kind,
      name:enemyName(kind),
      count:Math.max(0, Math.round(Number(count || 0)))
    }))
    .filter(entry=>entry.count > 0)
    .sort((a, b)=>b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function sumObjectValues(value = {}){
  return Object.values(value || {}).reduce((sum, count)=>sum + Math.max(0, Number(count || 0)), 0);
}

function analyzeProfileSuspicion(profile = {}){
  const player = profile.player || {};
  const level = Math.max(1, Number(player.level || 1));
  const totalKills = Math.max(0, Number(player.totalKills || 0));
  const killStatsTotal = sumObjectValues(profile.killStats);
  const totalXp = Math.max(0, Number(player.totalXp || 0));
  const credits = Math.max(0, Number(player.credits || 0));
  const premium = Math.max(0, Number(player.premium || 0));
  const inventoryCount = Array.isArray(profile.inventoryItems) ? profile.inventoryItems.length : 0;
  const ownedShips = Array.isArray(profile.ownedShips) ? profile.ownedShips.length : 0;
  const playHours = Math.max(0, Number(player.totalPlaySeconds || 0)) / 3600;
  const reasons = [];
  if(killStatsTotal > totalKills + 10) reasons.push(`KillStats (${Math.round(killStatsTotal)}) superieur aux kills totaux (${Math.round(totalKills)}).`);
  if(level <= 5 && totalKills > 500) reasons.push(`Beaucoup de kills pour un niveau ${Math.round(level)}.`);
  if(level <= 10 && totalXp > 5000000) reasons.push(`XP totale tres elevee pour un niveau ${Math.round(level)}.`);
  if(level <= 10 && credits > 5000000) reasons.push(`Credits tres eleves pour un niveau ${Math.round(level)}.`);
  if(premium > 250000) reasons.push("NOVA tres elevee, a verifier.");
  if(inventoryCount > 180) reasons.push(`Inventaire inhabituellement rempli (${inventoryCount} objets).`);
  if(level <= 10 && ownedShips > 6) reasons.push(`Nombre de vaisseaux eleve pour le niveau (${ownedShips}).`);
  if(playHours > 0 && totalKills / playHours > 2500) reasons.push(`Rythme de kills tres haut (${Math.round(totalKills / playHours)}/h).`);
  if(Number(profile.updatedAt || 0) > Date.now() + 5 * 60 * 1000) reasons.push("Profil date dans le futur.");
  return {
    score:Math.min(100, reasons.length * 25),
    level:reasons.length >= 2 ? "high" : reasons.length === 1 ? "medium" : "clear",
    suspicious:reasons.length > 0,
    reasons
  };
}

function buildAdminInventory(profile = {}){
  const safeProfile = structuredClone(profile || {});
  const items = (Array.isArray(safeProfile.inventoryItems) ? safeProfile.inventoryItems : []).map(entry=>{
    const item = getServerItem(String(entry?.itemId || ""));
    const equipped = findEquippedSlot(safeProfile, String(entry?.uid || ""));
    return {
      uid:String(entry?.uid || ""),
      itemId:String(entry?.itemId || ""),
      quantity:getInventoryEntryQuantity(entry),
      name:item?.name || String(entry?.itemId || "Objet inconnu"),
      short:item?.short || item?.name || String(entry?.itemId || "Objet"),
      category:item?.category || "unknown",
      slotType:item?.slotType || "",
      rarity:item?.rarity || "",
      img:item?.img || "",
      stats:item?.stats || {},
      upgradeLevel:Math.max(0, Number(safeProfile.equipmentUpgrades?.[entry?.itemId] || 0)),
      equipped:equipped || null
    };
  });
  const knownResourceIds = new Set();
  const resources = rawMaterialCatalog
    .map(material=>{
      knownResourceIds.add(material.id);
      return {
      id:material.id,
      name:material.name,
      short:material.short || material.name,
      kind:material.kind || "resource",
      rarity:material.rarity || "",
      img:material.img || "",
      quantity:Math.max(0, Math.floor(Number(safeProfile.cargoHold?.[material.id] || 0)))
    };
    })
    .concat(Object.entries(safeProfile.cargoHold || {})
      .filter(([id, quantity])=>!knownResourceIds.has(id) && Math.max(0, Math.floor(Number(quantity || 0))) > 0)
      .map(([id, quantity])=>({
        id,
        name:id,
        short:id.slice(0, 4).toUpperCase(),
        kind:"resource",
        rarity:"",
        img:"",
        quantity:Math.max(0, Math.floor(Number(quantity || 0)))
      })))
    .filter(resource=>resource.quantity > 0);
  const activeShipId = String(safeProfile.activeShip || safeProfile.selectedShip || safeProfile.ownedShips?.[0] || "orion");
  const activeShip = getServerShip(activeShipId);
  return {
    activeShip:activeShip ? {
      id:activeShip.id,
      name:activeShip.name,
      className:activeShip.className || "",
      img:activeShip.img || "",
      stats:activeShip.stats || {}
    } : null,
    items,
    resources,
    totals:{
      items:items.reduce((sum, item)=>sum + item.quantity, 0),
      resources:resources.reduce((sum, resource)=>sum + resource.quantity, 0),
      equipped:items.filter(item=>item.equipped).length
    }
  };
}

function buildActivityLog(entry, auditEntries = []){
  const profile = entry?.profile || {};
  const player = profile.player || {};
  const logs = [];
  for(const activity of (Array.isArray(profile.activityLog) ? profile.activityLog : []).slice(-30).reverse()){
    logs.push({
      type:activity.type || "activity",
      severity:activity.severity || "info",
      label:activity.label || "Activite",
      detail:activity.detail || "",
      at:Number(activity.createdAt || 0)
    });
  }
  logs.push({type:"profile", severity:"info", label:"Profil sauvegarde", detail:`Derniere mise a jour ${new Date(Number(profile.updatedAt || 0)).toLocaleString("fr-FR")}.`, at:Number(profile.updatedAt || 0)});
  logs.push({type:"progression", severity:"info", label:"Progression", detail:`Niv. ${Math.max(1, Number(player.level || 1))} - ${Math.round(Number(player.totalXp || 0))} XP totale - ${Math.round(Number(player.reputation || 0))} reputation.`});
  logs.push({type:"economy", severity:"info", label:"Economie", detail:`${Math.round(Number(player.credits || 0))} credits - ${Math.round(Number(player.premium || 0))} NOVA.`});
  for(const kill of topKillEntries(profile.killStats, 8)){
    logs.push({type:"kill", severity:"info", label:`Mob tue : ${kill.name}`, detail:`${kill.count} kill(s).`});
  }
  const completedQuests = Object.keys(profile.completedQuestClaims || {}).length;
  if(completedQuests) logs.push({type:"quest", severity:"info", label:"Quetes terminees", detail:`${completedQuests} recompense(s) de quete reclamee(s).`});
  const portalClears = sumObjectValues(profile.completedPortals);
  if(portalClears) logs.push({type:"portal", severity:"info", label:"Portails termines", detail:`${Math.round(portalClears)} portail(s).`});
  const laserShots = Math.max(0, Number(player.laserShotsFired || 0));
  const rocketShots = Math.max(0, Number(player.rocketShotsFired || 0));
  const missileShots = Math.max(0, Number(player.missileShotsFired || 0));
  if(laserShots || rocketShots || missileShots){
    logs.push({type:"combat", severity:"info", label:"Tirs armes", detail:`Lasers ${Math.round(laserShots)} - Roquettes ${Math.round(rocketShots)} - Missiles ${Math.round(missileShots)}.`});
  }
  for(const audit of auditEntries.slice(0, 10)){
    logs.push({
      type:"audit",
      severity:String(audit.action || "").includes("ban") ? "danger" : "warning",
      label:audit.action || "Action admin",
      detail:`${audit.reason || "Sans raison"} - par ${audit.actor?.name || "admin"}.`,
      at:audit.createdAt || 0
    });
  }
  return logs;
}

function profileKeyFromTarget(target = {}, online, profileManager){
  const explicitKey = String(target.profileKey || "");
  if(explicitKey) return explicitKey;
  if(online) return profileManager.profileKeyForPlayer?.(online) || "";
  const accountId = String(target.accountId || "");
  return accountId ? `account:${accountId}` : "";
}

function findOnlinePlayer(players, target = {}){
  const targetId = String(target.playerId || target.targetId || "");
  if(targetId && players.has(targetId)) return players.get(targetId);
  const accountId = String(target.accountId || "");
  if(accountId) return [...players.values()].find(player=>String(player.accountId || "") === accountId) || null;
  return null;
}

function moderationFields(account){
  return {
    bannedUntil:Math.max(0, Number(account?.bannedUntil || 0)),
    banReason:String(account?.banReason || ""),
    mutedUntil:Math.max(0, Number(account?.mutedUntil || 0)),
    muteReason:String(account?.muteReason || "")
  };
}

function clampGrantAmount(amount, max = MAX_GRANT_AMOUNT){
  return Math.max(1, Math.min(max, Math.floor(Number(amount || 1))));
}

function ensureCargoHold(profile){
  if(!profile.cargoHold || typeof profile.cargoHold !== "object" || Array.isArray(profile.cargoHold)){
    profile.cargoHold = {};
  }
  return profile.cargoHold;
}

function ensureShipCargo(profile, shipId){
  const ship = getServerShip(shipId || profile.activeShip || profile.selectedShip || profile.ownedShips?.[0] || "orion");
  if(!ship) return null;
  if(!profile.shipCargo || typeof profile.shipCargo !== "object" || Array.isArray(profile.shipCargo)){
    profile.shipCargo = {};
  }
  if(!profile.shipCargo[ship.id] || typeof profile.shipCargo[ship.id] !== "object" || Array.isArray(profile.shipCargo[ship.id])){
    profile.shipCargo[ship.id] = {};
  }
  return {ship, cargo:profile.shipCargo[ship.id]};
}

function grantInventoryItem(profile, item, amount){
  const count = isStackableInventoryItem(item.id)
    ? clampGrantAmount(amount)
    : clampGrantAmount(amount, MAX_NON_STACKABLE_GRANT_AMOUNT);
  const entries = [];
  if(isStackableInventoryItem(item.id)){
    entries.push(addInventoryItemAmount(profile, item.id, count));
  }else{
    for(let index = 0; index < count; index += 1){
      entries.push(addInventoryItemAmount(profile, item.id, 1));
    }
  }
  return {
    type:"item",
    id:item.id,
    name:item.name || item.id,
    amount:count,
    destination:"inventory",
    uids:entries.map(entry=>entry?.uid).filter(Boolean)
  };
}

function applyGrantToProfile(profile, {type, id, amount, destination, shipId} = {}){
  const cleanType = String(type || "");
  const cleanId = String(id || "");
  if(!GRANT_TYPES.has(cleanType)) return {ok:false, reason:"Type de don inconnu."};
  if(!cleanId) return {ok:false, reason:"Objet a donner manquant."};

  if(cleanType === "item"){
    const item = getServerItem(cleanId);
    if(!item) return {ok:false, reason:"Objet introuvable."};
    return {ok:true, granted:grantInventoryItem(profile, item, amount)};
  }

  if(cleanType === "ammo"){
    const ammo = getServerAmmo(cleanId);
    if(!ammo) return {ok:false, reason:"Munition introuvable."};
    const count = clampGrantAmount(amount);
    if(!profile.ammoInventory || typeof profile.ammoInventory !== "object" || Array.isArray(profile.ammoInventory)){
      profile.ammoInventory = {};
    }
    profile.ammoInventory[ammo.id] = Math.max(0, Number(profile.ammoInventory[ammo.id] || 0)) + count;
    return {ok:true, granted:{type:"ammo", id:ammo.id, name:ammo.name || ammo.id, amount:count, destination:"ammoInventory"}};
  }

  if(cleanType === "resource"){
    const resource = rawMaterialCatalog.find(entry=>entry.id === cleanId);
    if(!resource) return {ok:false, reason:"Ressource introuvable."};
    const count = clampGrantAmount(amount);
    if(destination === "shipCargo"){
      const targetCargo = ensureShipCargo(profile, shipId);
      if(!targetCargo) return {ok:false, reason:"Vaisseau cible introuvable."};
      targetCargo.cargo[resource.id] = Math.max(0, Number(targetCargo.cargo[resource.id] || 0)) + count;
      return {ok:true, granted:{type:"resource", id:resource.id, name:resource.name || resource.id, amount:count, destination:"shipCargo", shipId:targetCargo.ship.id}};
    }
    const cargo = ensureCargoHold(profile);
    cargo[resource.id] = Math.max(0, Number(cargo[resource.id] || 0)) + count;
    return {ok:true, granted:{type:"resource", id:resource.id, name:resource.name || resource.id, amount:count, destination:"cargoHold"}};
  }

  if(cleanType === "ship"){
    const ship = getServerShip(cleanId);
    if(!ship) return {ok:false, reason:"Vaisseau introuvable."};
    if(!Array.isArray(profile.ownedShips)) profile.ownedShips = [];
    const alreadyOwned = profile.ownedShips.includes(ship.id);
    if(!alreadyOwned) profile.ownedShips.push(ship.id);
    if(!profile.shipLoadouts || typeof profile.shipLoadouts !== "object" || Array.isArray(profile.shipLoadouts)){
      profile.shipLoadouts = {};
    }
    if(!profile.shipLoadouts[ship.id]) profile.shipLoadouts[ship.id] = makeEmptyLoadout(ship.id);
    return {ok:true, granted:{type:"ship", id:ship.id, name:ship.name || ship.id, amount:alreadyOwned ? 0 : 1, destination:"ownedShips", alreadyOwned}};
  }

  if(cleanType === "drone"){
    const drone = getServerDroneCatalog();
    if(cleanId !== drone.id) return {ok:false, reason:"Drone introuvable."};
    const current = Math.max(0, Math.floor(Number(profile.ownedDroneCount || 0)));
    const maxOwned = Math.max(0, Math.floor(Number(drone.maxOwned || 0)));
    const count = clampGrantAmount(amount, Math.max(1, maxOwned));
    const nextCount = Math.min(maxOwned, current + count);
    const grantedCount = Math.max(0, nextCount - current);
    profile.ownedDroneCount = nextCount;
    if(!Array.isArray(profile.droneLoadout)) profile.droneLoadout = [];
    while(profile.droneLoadout.length < nextCount) profile.droneLoadout.push(null);
    if(profile.droneLoadout.length > nextCount) profile.droneLoadout.length = nextCount;
    return {ok:true, granted:{type:"drone", id:drone.id, name:drone.name || drone.id, amount:grantedCount, destination:"ownedDroneCount", maxOwned}};
  }

  if(cleanType === "formation"){
    const formation = droneFormations.find(entry=>entry.id === cleanId);
    if(!formation) return {ok:false, reason:"Formation introuvable."};
    if(!Array.isArray(profile.ownedDroneFormations)) profile.ownedDroneFormations = ["base"];
    if(!profile.ownedDroneFormations.includes("base")) profile.ownedDroneFormations.unshift("base");
    const alreadyOwned = profile.ownedDroneFormations.includes(formation.id);
    if(!alreadyOwned) profile.ownedDroneFormations.push(formation.id);
    return {ok:true, granted:{type:"formation", id:formation.id, name:formation.name || formation.id, amount:alreadyOwned ? 0 : 1, destination:"ownedDroneFormations", alreadyOwned}};
  }

  if(cleanType === "portalPiece"){
    const portal = portals.find(entry=>entry.id === cleanId);
    if(!portal) return {ok:false, reason:"Portail introuvable."};
    const count = clampGrantAmount(amount);
    if(!profile.portalPieces || typeof profile.portalPieces !== "object" || Array.isArray(profile.portalPieces)){
      profile.portalPieces = {};
    }
    profile.portalPieces[portal.id] = Math.max(0, Number(profile.portalPieces[portal.id] || 0)) + count;
    return {ok:true, granted:{type:"portalPiece", id:portal.id, name:`Piece ${portal.name || portal.id}`, amount:count, destination:"portalPieces"}};
  }

  if(cleanType === "firmBox"){
    if(!FIRM_BOX_RARITIES.has(cleanId)) return {ok:false, reason:"Coffre de firme introuvable."};
    const count = clampGrantAmount(amount);
    if(!profile.firmBoxes || typeof profile.firmBoxes !== "object" || Array.isArray(profile.firmBoxes)){
      profile.firmBoxes = {};
    }
    for(const rarity of FIRM_BOX_RARITIES){
      profile.firmBoxes[rarity] = Math.max(0, Math.floor(Number(profile.firmBoxes[rarity] || 0)));
    }
    profile.firmBoxes[cleanId] += count;
    return {ok:true, granted:{type:"firmBox", id:cleanId, name:`Coffre ${cleanId}`, amount:count, destination:"firmBoxes"}};
  }

  return {ok:false, reason:"Type de don inconnu."};
}

export function createAdminManager({
  io,
  players,
  groups,
  profileManager,
  auditStore,
  resetGroupInstance,
  updateAccountModeration,
  logger,
  now = ()=>Date.now()
} = {}){
  function actorFromSocket(socket){
    const player = players.get(socket.id);
    const account = player?.account || null;
    return {
      player,
      account,
      role:String(account?.role || "player").toLowerCase(),
      power:rolePower(account?.role),
      public:{
        accountId:String(account?.id || ""),
        playerId:String(player?.id || socket.id || ""),
        name:String(account?.username || player?.name || "Admin"),
        role:String(account?.role || "player")
      }
    };
  }

  function requireRole(socket, minimum = "moderator"){
    const actor = actorFromSocket(socket);
    if(actor.power < rolePower(minimum)){
      return {ok:false, reason:"Droits admin insuffisants.", actor};
    }
    return {ok:true, actor};
  }

  async function recordAudit({actor, action, reason, target, payload}){
    try{
      return await auditStore?.record?.({
        id:`admin_${now()}_${Math.random().toString(36).slice(2)}`,
        createdAt:now(),
        action,
        reason,
        actor:actor?.public || actor || {},
        target,
        payload
      });
    }catch(error){
      logger?.warn?.("Admin audit failed", {error:error?.message || String(error), action});
      return null;
    }
  }

  async function snapshot(socket, {profileLimit = 0, auditLimit = 20} = {}){
    const access = requireRole(socket, "moderator");
    if(!access.ok) return access;
    const onlineGroups = groupOnlinePlayers(players);
    const onlinePlayers = onlineGroups.map(group=>publicAdminPlayer(group.representative, profileManager, group.sessions));
    const profileEntries = profileManager.listProfileEntries?.() || [];
    const officialProfileEntries = profileEntries.filter(entry=>String(entry?.key || "").startsWith("account:"));
    const cleanProfileLimit = Math.max(0, Math.floor(Number(profileLimit || 0)));
    const sortedProfileEntries = officialProfileEntries
      .sort((a, b)=>Number(b.profile?.updatedAt || 0) - Number(a.profile?.updatedAt || 0));
    const profiles = (cleanProfileLimit > 0 ? sortedProfileEntries.slice(0, cleanProfileLimit) : sortedProfileEntries)
      .map(publicProfileEntry)
      .filter(Boolean);
    const groupList = [...groups.values()].map(group=>({
      id:group.id,
      leaderId:group.leaderId,
      members:[...(group.members || [])],
      instance:group.instance ? {
        id:group.instance.id || null,
        type:group.instance.type || "coop",
        portalId:group.instance.portal?.id || null,
        wave:Math.max(0, Number(group.instance.wave || 0)),
        completed:Boolean(group.instance.completed),
        enemies:(group.instance.enemies || []).filter(enemy=>Number(enemy.hp || 0) > 0).length
      } : null
    }));
    return {
      ok:true,
      snapshot:{
        generatedAt:now(),
        totals:{
          sockets:players.size,
          online:onlinePlayers.filter(player=>player.connected).length,
          game:onlinePlayers.filter(player=>player.clientMode === "game").length,
          groups:groupList.length,
          instances:groupList.filter(group=>group.instance).length,
          profiles:officialProfileEntries.length
        },
        onlinePlayers,
        groups:groupList,
        recentProfiles:profiles,
        audit:await auditStore?.list?.({limit:auditLimit}) || []
      }
    };
  }

  async function inspectPlayer(socket, target = {}){
    const access = requireRole(socket, "moderator");
    if(!access.ok) return access;
    const online = findOnlinePlayer(players, target);
    const key = profileKeyFromTarget(target, online, profileManager);
    const entry = key ? profileManager.getProfileEntry?.(key) : null;
    if(!online && !entry) return {ok:false, reason:"Joueur introuvable."};
    const audit = await auditStore?.list?.({limit:100}) || [];
    const filteredAudit = audit.filter(item=>
      (key && item?.target?.key === key)
      || (online?.id && item?.target?.playerId === online.id)
      || (target.accountId && String(item?.payload?.accountId || "") === String(target.accountId || ""))
      || (entry?.profile?.player?.name && String(item?.target?.name || "").toLowerCase() === String(entry.profile.player.name).toLowerCase())
    );
    return {
      ok:true,
      player:online ? publicAdminPlayer(online, profileManager) : null,
      profile:entry ? publicProfileEntry(entry) : null,
      details:entry ? buildPublicPlayerProfile({key, profile:entry.profile}) : null,
      inventory:entry ? buildAdminInventory(entry.profile) : null,
      activity:entry ? {
        kills:topKillEntries(entry.profile.killStats, 20),
        suspicion:analyzeProfileSuspicion(entry.profile),
        logs:buildActivityLog(entry, filteredAudit)
      } : {kills:[], suspicion:{score:0, level:"clear", suspicious:false, reasons:[]}, logs:filteredAudit.map(item=>({
        type:"audit",
        severity:"warning",
        label:item.action || "Action admin",
        detail:item.reason || "Sans raison",
        at:item.createdAt || 0
      }))}
    };
  }

  async function kickPlayer(socket, {targetId, accountId, reason} = {}){
    const access = requireRole(socket, "moderator");
    if(!access.ok) return access;
    const target = findOnlinePlayer(players, {targetId, accountId});
    if(!target) return {ok:false, reason:"Joueur introuvable."};
    const targetAccountId = String(target.accountId || target.account?.id || "");
    if(target.id === socket.id || (targetAccountId && targetAccountId === String(access.actor.account?.id || ""))){
      return {ok:false, reason:"Cible invalide."};
    }
    const affectedPlayers = targetAccountId ? onlinePlayersForAccount(targetAccountId) : [target];
    const message = cleanReason(reason) || "Kick admin.";
    await recordAudit({
      actor:access.actor,
      action:"admin:kick",
      reason:message,
      target:{
        key:profileManager.profileKeyForPlayer?.(target) || "",
        playerId:target.id,
        name:target.name || ""
      },
      payload:{targetId:target.id, accountId:targetAccountId, sockets:affectedPlayers.map(player=>player.id)}
    });
    for(const player of affectedPlayers){
      const targetSocket = io?.sockets?.sockets?.get(player.id);
      targetSocket?.emit?.("admin:kicked", {message, at:now()});
      targetSocket?.disconnect?.(true);
    }
    return {ok:true, targetId:target.id, accountId:targetAccountId || null, disconnected:affectedPlayers.length};
  }

  function resolveProfileTarget(target = {}){
    const online = findOnlinePlayer(players, target);
    if(online){
      const key = profileManager.profileKeyForPlayer?.(online) || "";
      const entry = key ? profileManager.getProfileEntry?.(key) : null;
      return {online, key, entry};
    }
    const key = String(target.profileKey || (target.accountId ? `account:${target.accountId}` : ""));
    const entry = key ? profileManager.getProfileEntry?.(key) : null;
    return {online:null, key, entry};
  }

  async function adjustPlayer(socket, {targetId, profileKey, field, amount, mode = "add", reason} = {}){
    const access = requireRole(socket, "admin");
    if(!access.ok) return access;
    const cleanField = String(field || "");
    const cleanMode = String(mode || "add") === "set" ? "set" : "add";
    if(!ADJUSTABLE_FIELDS.has(cleanField)) return {ok:false, reason:"Champ non modifiable."};
    const cleanAmount = Math.round(Number(amount || 0));
    if(!Number.isFinite(cleanAmount)) return {ok:false, reason:"Montant invalide."};
    const message = cleanReason(reason);
    if(message.length < 4) return {ok:false, reason:"Raison admin obligatoire."};
    const target = resolveProfileTarget({targetId, profileKey});
    if(!target.key || !target.entry) return {ok:false, reason:"Profil cible introuvable."};
    const before = publicProfileEntry(target.entry);
    const nextProfile = profileManager.updateProfileByKey?.(target.key, profile=>{
      if(!profile.player || typeof profile.player !== "object") profile.player = {};
      if(cleanField === "xp" && cleanMode === "add"){
        profile.player = applyProgressionReward(profile.player, {xp:cleanAmount});
        return true;
      }
      if(cleanField === "xp" && cleanMode === "set"){
        const xpNext = getXpNextForLevel(profile.player.level || 1);
        profile.player.xp = Math.max(0, Math.min(xpNext, cleanAmount));
        profile.player.xpNext = xpNext;
        profile.player.totalXp = Math.max(Number(profile.player.totalXp || 0), cleanAmount);
        return true;
      }
      const previous = Math.max(0, Math.round(Number(profile.player[cleanField] || 0)));
      profile.player[cleanField] = cleanMode === "set"
        ? Math.max(0, cleanAmount)
        : Math.max(0, previous + cleanAmount);
      return true;
    });
    if(!nextProfile) return {ok:false, reason:"Modification impossible."};
    const after = publicProfileEntry({key:target.key, profile:nextProfile});
    await recordAudit({
      actor:access.actor,
      action:"admin:adjust-player",
      reason:message,
      target:{
        key:target.key,
        playerId:target.online?.id || "",
        name:after?.name || before?.name || ""
      },
      payload:{field:cleanField, amount:cleanAmount, mode:cleanMode, before, after}
    });
    if(target.online) io?.to?.(target.online.id)?.emit?.("profile:sync", nextProfile);
    return {ok:true, before, after};
  }

  async function grantPlayer(socket, {
    targetId,
    accountId,
    profileKey,
    type,
    id,
    amount = 1,
    destination = "cargoHold",
    shipId,
    reason
  } = {}){
    const access = requireRole(socket, "admin");
    if(!access.ok) return access;
    const message = cleanReason(reason);
    if(message.length < 4) return {ok:false, reason:"Raison admin obligatoire."};
    const target = resolveProfileTarget({targetId, accountId, profileKey});
    if(!target.key || !target.entry) return {ok:false, reason:"Profil cible introuvable."};
    let granted = null;
    let grantError = "Don impossible.";
    const nextProfile = profileManager.updateProfileByKey?.(target.key, profile=>{
      const result = applyGrantToProfile(profile, {type, id, amount, destination, shipId});
      if(!result.ok){
        grantError = result.reason || grantError;
        return false;
      }
      granted = result.granted;
      appendProfileActivity(profile, {
        type:"admin_grant",
        severity:"warning",
        label:"Don admin",
        detail:`${granted.amount} x ${granted.name}. Raison : ${message}`,
        data:{type:granted.type, id:granted.id, amount:granted.amount, destination:granted.destination}
      }, now());
      return true;
    });
    if(!nextProfile || !granted) return {ok:false, reason:grantError};
    const targetAccountId = String(accountId || target.online?.accountId || (target.key.startsWith("account:") ? target.key.slice("account:".length) : ""));
    await recordAudit({
      actor:access.actor,
      action:"admin:grant-player",
      reason:message,
      target:{
        key:target.key,
        playerId:target.online?.id || targetId || "",
        name:target.entry.profile?.player?.name || ""
      },
      payload:{accountId:targetAccountId, granted}
    });
    const onlineTargets = targetAccountId ? onlinePlayersForAccount(targetAccountId) : (target.online ? [target.online] : []);
    for(const player of onlineTargets) io?.to?.(player.id)?.emit?.("profile:sync", nextProfile);
    return {ok:true, profileKey:target.key, granted};
  }

  async function removeInventoryItem(socket, {
    targetId,
    accountId,
    profileKey,
    source = "inventory",
    inventoryUid,
    resourceId,
    reason
  } = {}){
    const access = requireRole(socket, "admin");
    if(!access.ok) return access;
    const message = cleanReason(reason);
    if(message.length < 4) return {ok:false, reason:"Raison admin obligatoire."};
    const target = resolveProfileTarget({targetId, accountId, profileKey});
    if(!target.key || !target.entry) return {ok:false, reason:"Profil cible introuvable."};
    const cleanSource = source === "resource" ? "resource" : "inventory";
    const cleanUid = String(inventoryUid || "");
    const cleanResourceId = String(resourceId || "");
    let removed = null;
    const nextProfile = profileManager.updateProfileByKey?.(target.key, profile=>{
      if(cleanSource === "resource"){
        const resource = rawMaterialCatalog.find(entry=>entry.id === cleanResourceId) || {
          id:cleanResourceId,
          name:cleanResourceId
        };
        const quantity = Math.max(0, Math.floor(Number(profile.cargoHold?.[cleanResourceId] || 0)));
        if(!cleanResourceId || quantity <= 0) return false;
        if(!profile.cargoHold || typeof profile.cargoHold !== "object") profile.cargoHold = {};
        profile.cargoHold[cleanResourceId] = 0;
        removed = {
          source:"resource",
          id:cleanResourceId,
          name:resource.name,
          quantity
        };
      }else{
        const index = Array.isArray(profile.inventoryItems)
          ? profile.inventoryItems.findIndex(entry=>String(entry?.uid || "") === cleanUid)
          : -1;
        if(index < 0) return false;
        const entry = profile.inventoryItems[index];
        const item = getServerItem(String(entry?.itemId || ""));
        unequipInventoryUid(profile, cleanUid);
        profile.inventoryItems.splice(index, 1);
        const stillOwned = profile.inventoryItems.some(candidate=>String(candidate?.itemId || "") === String(entry?.itemId || ""));
        if(!stillOwned){
          if(Array.isArray(profile.actionSlots)){
            profile.actionSlots = profile.actionSlots.map(itemId=>itemId === entry?.itemId ? null : itemId);
          }
          if(profile.actionSlotsByShip && typeof profile.actionSlotsByShip === "object"){
            for(const shipId of Object.keys(profile.actionSlotsByShip)){
              if(Array.isArray(profile.actionSlotsByShip[shipId])){
                profile.actionSlotsByShip[shipId] = profile.actionSlotsByShip[shipId].map(itemId=>itemId === entry?.itemId ? null : itemId);
              }
            }
          }
        }
        removed = {
          source:"inventory",
          uid:cleanUid,
          id:String(entry?.itemId || ""),
          name:item?.name || String(entry?.itemId || "Objet inconnu"),
          quantity:getInventoryEntryQuantity(entry)
        };
      }
      appendProfileActivity(profile, {
        type:"admin_inventory_remove",
        severity:"danger",
        label:"Objet supprime par admin",
        detail:`${removed.quantity} x ${removed.name}. Raison : ${message}`,
        data:{source:removed.source, itemId:removed.id, quantity:removed.quantity}
      }, now());
      return true;
    });
    if(!nextProfile || !removed) return {ok:false, reason:"Objet ou ressource introuvable."};
    const targetAccountId = String(accountId || target.online?.accountId || (target.key.startsWith("account:") ? target.key.slice("account:".length) : ""));
    await recordAudit({
      actor:access.actor,
      action:"admin:inventory-remove",
      reason:message,
      target:{
        key:target.key,
        playerId:target.online?.id || targetId || "",
        name:target.entry.profile?.player?.name || ""
      },
      payload:{accountId:targetAccountId, removed}
    });
    const onlineTargets = targetAccountId ? onlinePlayersForAccount(targetAccountId) : (target.online ? [target.online] : []);
    for(const player of onlineTargets) io?.to?.(player.id)?.emit?.("profile:sync", nextProfile);
    return {ok:true, profileKey:target.key, removed};
  }

  function onlinePlayersForAccount(accountId){
    const cleanAccountId = String(accountId || "");
    if(!cleanAccountId) return [];
    return [...players.values()].filter(player=>String(player.accountId || "") === cleanAccountId);
  }

  function resolveAccountTarget({targetId, accountId} = {}){
    const online = findOnlinePlayer(players, {targetId, accountId});
    const cleanAccountId = String(accountId || online?.accountId || online?.account?.id || "");
    return {online, accountId:cleanAccountId};
  }

  async function moderateAccount(socket, {targetId, accountId, action, durationMinutes, reason} = {}){
    const cleanAction = String(action || "").toLowerCase();
    if(!["ban", "unban", "mute", "unmute"].includes(cleanAction)){
      return {ok:false, reason:"Action moderation inconnue."};
    }
    const access = requireRole(socket, cleanAction.includes("ban") ? "admin" : "moderator");
    if(!access.ok) return access;
    if(!updateAccountModeration) return {ok:false, reason:"Stockage comptes indisponible."};
    const target = resolveAccountTarget({targetId, accountId});
    if(!target.accountId) return {ok:false, reason:"Compte cible introuvable."};
    if(target.accountId === String(access.actor.account?.id || "")) return {ok:false, reason:"Cible invalide."};

    const message = cleanReason(reason) || (cleanAction.startsWith("un") ? "Levee sanction admin." : "");
    if((cleanAction === "ban" || cleanAction === "mute") && message.length < 4){
      return {ok:false, reason:"Raison moderation obligatoire."};
    }

    const patch = {};
    if(cleanAction === "ban" || cleanAction === "mute"){
      const minutes = Math.max(0, Math.min(525600, Math.round(Number(durationMinutes || 0))));
      if(minutes <= 0) return {ok:false, reason:"Duree moderation invalide."};
      const until = now() + minutes * 60 * 1000;
      if(cleanAction === "ban"){
        patch.bannedUntil = until;
        patch.banReason = message;
      }else{
        patch.mutedUntil = until;
        patch.muteReason = message;
      }
    }else if(cleanAction === "unban"){
      patch.bannedUntil = 0;
      patch.banReason = "";
    }else if(cleanAction === "unmute"){
      patch.mutedUntil = 0;
      patch.muteReason = "";
    }

    const updatedAccount = await updateAccountModeration(target.accountId, patch);
    if(!updatedAccount) return {ok:false, reason:"Compte cible introuvable."};
    const moderation = moderationFields(updatedAccount);
    const affectedPlayers = onlinePlayersForAccount(target.accountId);
    for(const player of affectedPlayers){
      player.account = {...(player.account || {}), ...moderation};
      if(cleanAction === "ban"){
        const targetSocket = io?.sockets?.sockets?.get(player.id);
        targetSocket?.emit?.("admin:banned", {
          message:"Compte banni temporairement.",
          bannedUntil:moderation.bannedUntil,
          reason:moderation.banReason,
          at:now()
        });
        targetSocket?.disconnect?.(true);
      }else{
        io?.to?.(player.id)?.emit?.("account:moderation", {
          ...moderation,
          at:now()
        });
      }
    }

    await recordAudit({
      actor:access.actor,
      action:`admin:${cleanAction}`,
      reason:message,
      target:{
        key:`account:${target.accountId}`,
        playerId:target.online?.id || targetId || "",
        name:target.online?.name || target.online?.account?.username || ""
      },
      payload:{accountId:target.accountId, durationMinutes:Number(durationMinutes || 0), patch}
    });
    return {ok:true, action:cleanAction, accountId:target.accountId, moderation};
  }

  async function resetInstance(socket, {groupId, reason} = {}){
    const access = requireRole(socket, "admin");
    if(!access.ok) return access;
    if(!resetGroupInstance) return {ok:false, reason:"Reset instance indisponible."};
    const cleanGroupId = String(groupId || "");
    const group = groups.get(cleanGroupId);
    if(!group) return {ok:false, reason:"Groupe introuvable."};
    if(!group.instance) return {ok:false, reason:"Aucune instance active."};
    const message = cleanReason(reason) || "Reset instance admin.";
    const previousInstanceId = group.instance.id || null;
    const reset = resetGroupInstance(cleanGroupId, message);
    if(!reset) return {ok:false, reason:"Reset instance impossible."};
    await recordAudit({
      actor:access.actor,
      action:"admin:reset-instance",
      reason:message,
      target:{
        key:cleanGroupId,
        playerId:group.leaderId || "",
        name:"Instance groupe"
      },
      payload:{groupId:cleanGroupId, previousInstanceId}
    });
    return {ok:true, groupId:cleanGroupId, previousInstanceId};
  }

  return {
    adjustPlayer,
    grantPlayer,
    inspectPlayer,
    kickPlayer,
    moderateAccount,
    removeInventoryItem,
    requireRole,
    resetInstance,
    snapshot
  };
}
