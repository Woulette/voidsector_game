import { ships } from "../../../src/data/ships.js";
import { WORLD_MAPS } from "../world/definitions.js";

export const LOAD_TEST_ACCOUNT_DOMAIN = "@voidsector-load.test";
export const LOAD_TEST_LASER_COUNT = 8;
export const LOAD_TEST_AMMO_COUNT = 5_000_000;
export const LOAD_TEST_LEVEL = 30;

const LOAD_TEST_PORTALS = ["blue", "violet", "red", "emerald", "void", "ancient"];
const LOAD_TEST_LASER_UID_PREFIX = "loadtest_laser_mk3_";

function clamp(value, min, max){
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function unique(values){
  return [...new Set((Array.isArray(values) ? values : []).map(String).filter(Boolean))];
}

function startingPoint(map, requested = {}){
  const fallback = map.spawn || {x:0, y:0};
  const halfWidth = Math.max(0, Number(map.width || 0) / 2 - 180);
  const halfHeight = Math.max(0, Number(map.height || 0) / 2 - 180);
  return {
    x:clamp(Number.isFinite(Number(requested.x)) ? Number(requested.x) : fallback.x, -halfWidth, halfWidth),
    y:clamp(Number.isFinite(Number(requested.y)) ? Number(requested.y) : fallback.y, -halfHeight, halfHeight)
  };
}

function removePreviousLoadTestLasers(items = []){
  return (Array.isArray(items) ? items : []).filter(item=>
    !String(item?.uid || "").startsWith(LOAD_TEST_LASER_UID_PREFIX)
    && !String(item?.uid || "").startsWith("loadtest_supply_")
  );
}

export function isLoadTestAccount(account){
  return String(account?.email || "").toLowerCase().endsWith(LOAD_TEST_ACCOUNT_DOMAIN);
}

export function provisionLoadTestBotProfile(profile, {
  mapId = "0",
  x,
  y,
  resetQuests = true,
  now = Date.now()
} = {}){
  if(!profile || typeof profile !== "object") return {ok:false, reason:"Profil introuvable."};
  const map = WORLD_MAPS[String(mapId || "")];
  if(!map) return {ok:false, reason:"Carte de test inconnue."};
  const razorion = ships.find(ship=>ship.id === "razorion");
  if(!razorion) return {ok:false, reason:"Razorion introuvable."};

  const laserUids = Array.from(
    {length:LOAD_TEST_LASER_COUNT},
    (_, index)=>`${LOAD_TEST_LASER_UID_PREFIX}${index + 1}`
  );
  const inventoryItems = removePreviousLoadTestLasers(profile.inventoryItems);
  for(const uid of laserUids) inventoryItems.push({uid, itemId:"laser_mk3"});
  inventoryItems.push(
    {uid:"loadtest_supply_teleportation_fluid", itemId:"teleportation_fluid", quantity:100},
    {uid:"loadtest_supply_portal_anchor_key", itemId:"portal_anchor_key", quantity:20}
  );

  const point = startingPoint(map, {x, y});
  const session = {
    source:"load-test",
    mapId:String(map.id),
    x:point.x,
    y:point.y,
    angle:0,
    hp:Number(razorion.stats?.vie || 35000),
    maxHp:Number(razorion.stats?.vie || 35000),
    shield:0,
    maxShield:0,
    shipId:razorion.id,
    shipImg:razorion.combatImg || razorion.img || "",
    updatedAt:now
  };

  profile.player = {
    ...(profile.player || {}),
    level:Math.max(LOAD_TEST_LEVEL, Number(profile.player?.level || 1)),
    xp:0,
    totalXp:Math.max(0, Number(profile.player?.totalXp || 0)),
    skillPoints:Math.max(LOAD_TEST_LEVEL, Number(profile.player?.skillPoints || 0)),
    credits:Math.max(10_000_000, Number(profile.player?.credits || 0)),
    premium:Math.max(1_000_000, Number(profile.player?.premium || 0))
  };
  profile.ownedShips = unique([...(profile.ownedShips || []), razorion.id]);
  profile.activeShip = razorion.id;
  profile.selectedShip = razorion.id;
  profile.inventoryItems = inventoryItems;
  profile.nextInventoryUid = Math.max(Number(profile.nextInventoryUid || 1), inventoryItems.length + 1);
  profile.ammoInventory = {
    ...(profile.ammoInventory || {}),
    ammo_x1:Math.max(LOAD_TEST_AMMO_COUNT, Number(profile.ammoInventory?.ammo_x1 || 0))
  };
  profile.actionSlots = ["ammo_x1", null, null, null, null, null, null, null, null];
  profile.actionSlotsByShip = {
    ...(profile.actionSlotsByShip || {}),
    [razorion.id]:[...profile.actionSlots]
  };
  profile.lastLaserAmmoId = "ammo_x1";
  profile.shipLoadouts = {
    ...(profile.shipLoadouts || {}),
    [razorion.id]:{
      lasers:laserUids,
      missileLauncher:null,
      rocketLauncher:null,
      generators:[],
      extras:[null, null, null]
    }
  };
  profile.unlockedPortals = unique([...(profile.unlockedPortals || []), ...LOAD_TEST_PORTALS]);
  profile.portalPieces = Object.fromEntries(LOAD_TEST_PORTALS.map(id=>[
    id,
    Math.max(100, Number(profile.portalPieces?.[id] || 0))
  ]));
  profile.worldSession = session;
  profile.shipWorldSessions = {
    ...(profile.shipWorldSessions || {}),
    [razorion.id]:session
  };
  if(resetQuests){
    profile.activeQuestIds = [];
    profile.activeQuestId = null;
    profile.questProgress = {};
    profile.questFailProgress = {};
    profile.completedQuestClaims = {};
  }
  profile.updatedAt = now;

  return {ok:true, profile, session, map};
}
