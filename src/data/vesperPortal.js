export const VESPER_PORTAL_ID = "violet";
export const VESPER_DRONE_ASSET = "assets/drones/drone_test_sprite.webp";
export const VESPER_CAGE_INTACT_ASSET = "assets/portals/ricky/cage_intact.png";
export const VESPER_CAGE_DESTROYED_ASSET = "assets/portals/ricky/cage_destroyed.png";

export const VESPER_PORTAL_MAP = Object.freeze({
  width:6400,
  height:4600,
  spawn:Object.freeze({x:0, y:0}),
  cages:Object.freeze([
    Object.freeze({id:"vesper-cage-1", number:1, x:-2450, y:-1650}),
    Object.freeze({id:"vesper-cage-2", number:2, x:2450, y:-1650}),
    Object.freeze({id:"vesper-cage-3", number:3, x:-2450, y:1650}),
    Object.freeze({id:"vesper-cage-4", number:4, x:2450, y:1650})
  ])
});

const VESPER_RENDER_MODES = Object.freeze({
  cage:"vesper_cage",
  turret:"vesper_turret",
  guard:"vesper_guard",
  boss:"vesper_boss",
  orbiter:"vesper_boss_orbiter",
  ally:"vesper_ally_drone"
});

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function boundedInteger(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER){
  return Math.max(min, Math.min(max, Math.round(finite(value, fallback))));
}

function normalizeCage(cage, index){
  const fallback = VESPER_PORTAL_MAP.cages[index] || {};
  return {
    ...cage,
    id:String(cage?.id || fallback.id || `vesper-cage-${index + 1}`),
    number:boundedInteger(cage?.number, fallback.number || index + 1, 1, 4),
    x:finite(cage?.x, fallback.x),
    y:finite(cage?.y, fallback.y),
    radius:Math.max(55, finite(cage?.radius, 115)),
    hp:Math.max(0, finite(cage?.hp, 0)),
    maxHp:Math.max(1, finite(cage?.maxHp, cage?.hp || 1)),
    destroyed:Boolean(cage?.destroyed),
    defendersSpawned:Boolean(cage?.defendersSpawned),
    reinforcementsSpawned:Boolean(cage?.reinforcementsSpawned),
    turretsRemaining:boundedInteger(cage?.turretsRemaining, 0, 0, 12),
    turretIds:Array.isArray(cage?.turretIds) ? cage.turretIds.map(String).slice(0, 12) : [],
    allyId:cage?.allyId ? String(cage.allyId) : null
  };
}

function normalizeAlly(ally, index, receivedAt){
  return {
    ...ally,
    id:String(ally?.id || `vesper-ally-${index + 1}`),
    name:String(ally?.name || `Drone libéré ${index + 1}`),
    img:String(ally?.img || VESPER_DRONE_ASSET),
    x:finite(ally?.x),
    y:finite(ally?.y),
    vx:finite(ally?.vx),
    vy:finite(ally?.vy),
    angle:finite(ally?.angle),
    hp:Math.max(0, finite(ally?.hp)),
    maxHp:Math.max(1, finite(ally?.maxHp, ally?.hp || 1)),
    shield:Math.max(0, finite(ally?.shield)),
    maxShield:Math.max(0, finite(ally?.maxShield, ally?.shield || 0)),
    radius:Math.max(12, finite(ally?.radius, 34)),
    width:Math.max(34, finite(ally?.width, 68)),
    height:Math.max(34, finite(ally?.height, 68)),
    attackRange:Math.max(0, finite(ally?.attackRange)),
    alive:ally?.alive !== false && finite(ally?.hp, 1) > 0,
    renderMode:VESPER_RENDER_MODES.ally,
    color:String(ally?.color || "#ef3340"),
    receivedAt
  };
}

function normalizeOrbiter(orbiter, index){
  return {
    ...orbiter,
    id:String(orbiter?.id || `vesper-orbiter-${index + 1}`),
    x:finite(orbiter?.x),
    y:finite(orbiter?.y),
    angle:finite(orbiter?.angle),
    orbitRadius:Math.max(20, finite(orbiter?.orbitRadius, 150)),
    size:Math.max(24, finite(orbiter?.size, 52)),
    img:String(orbiter?.img || VESPER_DRONE_ASSET),
    color:String(orbiter?.color || "#ef3340"),
    renderMode:VESPER_RENDER_MODES.orbiter
  };
}

export function isVesperPortal(portal){
  return portal?.encounterKind !== "azuron" && String(portal?.id || portal?.portalId || portal || "") === VESPER_PORTAL_ID;
}

export function getVesperEntityVisualKind(entity){
  const mode = String(entity?.renderMode || "");
  const kind = String(entity?.kind || "");
  if(mode === VESPER_RENDER_MODES.cage || kind === "vesper_cage") return "cage";
  if(mode === VESPER_RENDER_MODES.turret || kind === "vesper_turret") return "turret";
  if(mode === VESPER_RENDER_MODES.guard) return "guard";
  if(mode === VESPER_RENDER_MODES.boss || kind === "vesper_giant_drone") return "boss";
  if(mode === VESPER_RENDER_MODES.orbiter) return "orbiter";
  if(mode === VESPER_RENDER_MODES.ally) return "ally";
  return "";
}

export function resolvePortalLives(payload, playerId = ""){
  const directKeys = ["portalLives", "livesRemaining", "lives"];
  for(const key of directKeys){
    if(payload && Object.hasOwn(payload, key)){
      const value = Number(payload[key]);
      if(Number.isFinite(value)) return boundedInteger(value, 0, 0, 3);
    }
  }
  const playerLives = payload?.playerLives;
  if(playerLives && typeof playerLives === "object"){
    const exact = playerLives[String(playerId || "")];
    if(Number.isFinite(Number(exact))) return boundedInteger(exact, 0, 0, 3);
  }
  if(payload?.objective && Object.hasOwn(payload.objective, "livesRemaining")){
    const value = Number(payload.objective.livesRemaining);
    if(Number.isFinite(value)) return boundedInteger(value, 0, 0, 3);
  }
  return null;
}

export function normalizeVesperObjective(objective, {allies = null, receivedAt = 0} = {}){
  const source = objective && typeof objective === "object" ? objective : {};
  if(source.__vesperNormalized === true && allies === null) return source;
  const cagesSource = Array.isArray(source.cages) && source.cages.length
    ? source.cages
    : VESPER_PORTAL_MAP.cages;
  const cages = cagesSource.slice(0, 4).map(normalizeCage);
  const cagesDestroyed = boundedInteger(
    source.cagesDestroyed,
    cages.filter(cage=>cage.destroyed).length,
    0,
    4
  );
  const cagesTotal = boundedInteger(source.cagesTotal, 4, 1, 4);
  const allySource = Array.isArray(allies)
    ? allies
    : Array.isArray(source.allies)
      ? source.allies
      : [];
  const bossOrbiters = (Array.isArray(source.bossOrbiters) ? source.bossOrbiters : [])
    .slice(0, 12)
    .map(normalizeOrbiter);
  const bossSpawned = Boolean(source.bossSpawned || source.bossId || bossOrbiters.length);
  const stage = ["cages", "boss", "complete"].includes(String(source.stage || ""))
    ? String(source.stage)
    : cagesDestroyed >= cagesTotal
      ? bossSpawned ? "boss" : "cages"
      : "cages";
  return {
    ...source,
    __vesperNormalized:true,
    kind:"vesper",
    stage,
    cagesDestroyed,
    cagesTotal,
    bossSpawned,
    bossId:source.bossId ? String(source.bossId) : null,
    cages,
    allies:allySource.slice(0, 4).map((ally, index)=>normalizeAlly(ally, index, receivedAt)),
    bossOrbiters
  };
}

export function getVesperObjectiveProgress(objective){
  const normalized = normalizeVesperObjective(objective);
  const turretsRemaining = normalized.cages.reduce(
    (total, cage)=>total + boundedInteger(cage.turretsRemaining, 0, 0, 12),
    0
  );
  return {
    stage:normalized.stage,
    cagesDestroyed:normalized.cagesDestroyed,
    cagesTotal:normalized.cagesTotal,
    alliesFreed:normalized.allies.filter(ally=>ally.alive).length,
    turretsRemaining,
    bossSpawned:normalized.bossSpawned,
    bossId:normalized.bossId,
    complete:normalized.stage === "complete"
  };
}

export function getVesperObjectiveHud(objective, lives = 3){
  const progress = getVesperObjectiveProgress(objective);
  const safeLives = boundedInteger(lives, 3, 0, 3);
  if(progress.complete){
    return {
      title:"FAILLE SÉCURISÉE",
      detail:`4 cages libérées · ${progress.alliesFreed} drone(s) secouru(s)`,
      progress:1,
      lives:safeLives
    };
  }
  if(progress.stage === "boss" || progress.bossSpawned){
    return {
      title:"ÉLIMINEZ LE DRONE GÉANT",
      detail:`Boss déployé · ${progress.alliesFreed} drone(s) allié(s) en soutien`,
      progress:.8,
      lives:safeLives
    };
  }
  const turretDetail = progress.turretsRemaining > 0
    ? `${progress.turretsRemaining} tourelle(s) protègent encore les cages`
    : "Approchez une cage et libérez son drone";
  return {
    title:`LIBÉREZ LES CAGES ${progress.cagesDestroyed}/${progress.cagesTotal}`,
    detail:`${turretDetail} · ${progress.alliesFreed} drone(s) libéré(s)`,
    progress:progress.cagesTotal > 0 ? progress.cagesDestroyed / progress.cagesTotal : 0,
    lives:safeLives
  };
}

export function getVesperObjectiveMarkers(objective, enemies = []){
  const normalized = normalizeVesperObjective(objective);
  const markers = normalized.cages.map(cage=>({
    id:cage.id,
    number:cage.number,
    x:cage.x,
    y:cage.y,
    active:cage.destroyed,
    unlocked:cage.turretsRemaining <= 0,
    destroyed:cage.destroyed,
    markerKind:"vesper_cage"
  }));
  if(normalized.bossSpawned && normalized.bossId){
    const boss = (Array.isArray(enemies) ? enemies : []).find(enemy=>String(enemy?.id || "") === normalized.bossId);
    if(boss){
      markers.push({
        id:normalized.bossId,
        x:finite(boss.x),
        y:finite(boss.y),
        markerKind:"vesper_boss"
      });
    }
  }
  return markers;
}
