export const ECLANITE_PORTAL_ID = "emerald";
export const ECLANITE_PORTAL_LEVEL = 30;
export const ECLANITE_ZONE_COUNT = 3;
export const ECLANITE_ZONE_DURATION_MS = 180_000;
export const ECLANITE_CORE_MAX_HP = 5_000_000;
export const ECLANITE_CORE_DAMAGE_MULTIPLIER = 5;

export const ECLANITE_PORTAL_MAP = Object.freeze({
  width:5_200,
  height:3_600,
  spawn:Object.freeze({x:-320, y:1_450}),
  wallThickness:180,
  breachOne:Object.freeze({x:0, y:760, halfSize:330}),
  breachTwo:Object.freeze({x:1_300, y:0, halfSize:360}),
  zones:Object.freeze([
    Object.freeze({id:1, label:"COMPARTIMENT I", x:-1_300, y:820, color:"#4ade80"}),
    Object.freeze({id:2, label:"COMPARTIMENT II", x:1_300, y:820, color:"#f87171"}),
    Object.freeze({id:3, label:"COMPARTIMENT III", x:0, y:-900, color:"#60a5fa"})
  ])
});

export const ECLANITE_CORE_ASSET = "assets/enemies/generated/smooth_variants_01/smooth_01_magma_core_orb.png";
export const ECLANITE_BOSS_ASSETS = Object.freeze({
  green:"assets/enemies/generated/void-crystals/eclanite.png",
  red:"assets/enemies/generated/void-crystals/cristanite.png",
  blue:"assets/enemies/generated/void-crystals/astranite.png"
});

function clamp01(value){
  return Math.max(0, Math.min(1, Number(value || 0)));
}

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function wallRect(id, minX, maxX, minY, maxY){
  return Object.freeze({id, minX, maxX, minY, maxY});
}

export function getEclanitePortalWalls({oneOpen = false, twoOpen = false} = {}){
  const halfWidth = ECLANITE_PORTAL_MAP.width / 2;
  const halfHeight = ECLANITE_PORTAL_MAP.height / 2;
  const halfWall = ECLANITE_PORTAL_MAP.wallThickness / 2;
  const breachOne = ECLANITE_PORTAL_MAP.breachOne;
  const breachTwo = ECLANITE_PORTAL_MAP.breachTwo;
  const walls = [];

  if(oneOpen){
    walls.push(
      wallRect(
        "vertical_north",
        -halfWall,
        halfWall,
        halfWall,
        breachOne.y - breachOne.halfSize
      ),
      wallRect(
        "vertical_south",
        -halfWall,
        halfWall,
        breachOne.y + breachOne.halfSize,
        halfHeight
      )
    );
  }else{
    walls.push(wallRect("vertical_locked", -halfWall, halfWall, halfWall, halfHeight));
  }

  if(twoOpen){
    walls.push(
      wallRect(
        "horizontal_west",
        -halfWidth,
        breachTwo.x - breachTwo.halfSize,
        -halfWall,
        halfWall
      ),
      wallRect(
        "horizontal_east",
        breachTwo.x + breachTwo.halfSize,
        halfWidth,
        -halfWall,
        halfWall
      )
    );
  }else{
    walls.push(wallRect("horizontal_locked", -halfWidth, halfWidth, -halfWall, halfWall));
  }
  return walls;
}

function circleIntersectsRect(point, radius, rect){
  const nearestX = Math.max(rect.minX, Math.min(rect.maxX, point.x));
  const nearestY = Math.max(rect.minY, Math.min(rect.maxY, point.y));
  return Math.hypot(point.x - nearestX, point.y - nearestY) < radius;
}

function collidesWithEclaniteWalls(point, breaches, radius){
  return getEclanitePortalWalls(breaches)
    .some(wall=>circleIntersectsRect(point, radius, wall));
}

export function resolveEclanitePortalPoint(previous, requested, breaches = {}, radius = 48){
  const padding = Math.max(16, finite(radius, 48));
  const halfWidth = ECLANITE_PORTAL_MAP.width / 2;
  const halfHeight = ECLANITE_PORTAL_MAP.height / 2;
  const next = {
    x:Math.max(-halfWidth + padding, Math.min(halfWidth - padding, finite(requested?.x))),
    y:Math.max(-halfHeight + padding, Math.min(halfHeight - padding, finite(requested?.y)))
  };
  const before = {
    x:finite(previous?.x, next.x),
    y:finite(previous?.y, next.y)
  };
  const openState = {
    oneOpen:Boolean(breaches?.oneOpen),
    twoOpen:Boolean(breaches?.twoOpen)
  };
  const distance = Math.hypot(next.x - before.x, next.y - before.y);
  const steps = Math.max(1, Math.ceil(distance / Math.max(12, padding * .45)));
  let lastSafe = before;
  for(let step = 1; step <= steps; step += 1){
    const ratio = step / steps;
    const sample = {
      x:before.x + (next.x - before.x) * ratio,
      y:before.y + (next.y - before.y) * ratio
    };
    if(collidesWithEclaniteWalls(sample, openState, padding)) return lastSafe;
    lastSafe = sample;
  }
  if(!collidesWithEclaniteWalls(next, openState, padding)) return next;
  const slideX = {x:next.x, y:before.y};
  if(!collidesWithEclaniteWalls(slideX, openState, padding)) return slideX;
  const slideY = {x:before.x, y:next.y};
  if(!collidesWithEclaniteWalls(slideY, openState, padding)) return slideY;
  return before;
}

export function isEclanitePortal(portal){
  return String(portal?.id || portal?.portalId || "") === ECLANITE_PORTAL_ID;
}

function normalizeVital(value, fallbackMax = ECLANITE_CORE_MAX_HP){
  if(!value || typeof value !== "object") return null;
  const maxHp = Math.max(1, finite(value.maxHp, fallbackMax));
  return {
    id:String(value.id || ""),
    hp:Math.max(0, Math.min(maxHp, finite(value.hp))),
    maxHp,
    exposed:Boolean(value.exposed),
    color:String(value.color || "")
  };
}

export function normalizeEclaniteObjective(value, {
  receivedAt = Date.now(),
  serverAt = value?.at
} = {}){
  const source = value && typeof value === "object" ? value : {};
  const zone = Math.max(1, Math.min(ECLANITE_ZONE_COUNT, Math.floor(finite(source.zone, 1))));
  const phase = ["guardians", "core", "boss", "complete"].includes(String(source.phase || ""))
    ? String(source.phase)
    : "guardians";
  const deadlineAt = Math.max(0, finite(source.deadlineAt));
  const remainingMs = source.remainingMs === undefined
    ? Math.max(0, deadlineAt - finite(serverAt, Date.now()))
    : Math.max(0, finite(source.remainingMs));
  return {
    kind:"eclanite",
    zone,
    phase,
    deadlineAt,
    remainingMs,
    guardiansRemaining:Math.max(0, Math.floor(finite(source.guardiansRemaining))),
    core:normalizeVital(source.core),
    boss:normalizeVital(source.boss),
    breaches:{
      oneOpen:Boolean(source.breaches?.oneOpen ?? source.breachOneOpen),
      twoOpen:Boolean(source.breaches?.twoOpen ?? source.breachTwoOpen)
    },
    completedAt:Math.max(0, finite(source.completedAt)),
    at:Math.max(0, finite(serverAt)),
    receivedAt:Math.max(0, finite(receivedAt, Date.now()))
  };
}

export function getEclaniteRemainingMs(objective, now = Date.now()){
  const normalized = objective?.kind === "eclanite"
    ? objective
    : normalizeEclaniteObjective(objective);
  if(normalized.phase === "complete") return 0;
  if(normalized.deadlineAt > 0 && normalized.at > 0){
    const elapsedClient = Math.max(0, finite(now) - finite(normalized.receivedAt, now));
    return Math.max(0, finite(normalized.remainingMs) - elapsedClient);
  }
  return Math.max(0, finite(normalized.remainingMs));
}

export function getEclaniteObjectiveHud(objective, lives = 3, now = Date.now()){
  const state = normalizeEclaniteObjective(objective, {
    receivedAt:objective?.receivedAt ?? now,
    serverAt:objective?.at
  });
  const zoneProgressBase = (state.zone - 1) / ECLANITE_ZONE_COUNT;
  const remainingMs = getEclaniteRemainingMs(state, now);
  let title = `ZONE ${state.zone}/${ECLANITE_ZONE_COUNT} · ÉLIMINEZ LES GARDIENS`;
  let detail = `${state.guardiansRemaining} gardien(s) protègent encore le noyau · ${Math.ceil(remainingMs / 1000)} s`;
  let phaseProgress = .18;
  if(state.phase === "core"){
    const hpRatio = state.core ? state.core.hp / Math.max(1, state.core.maxHp) : 1;
    title = `ZONE ${state.zone}/${ECLANITE_ZONE_COUNT} · NOYAU EXPOSÉ ×${ECLANITE_CORE_DAMAGE_MULTIPLIER}`;
    detail = `Détruisez le noyau avant l’échéance · ${Math.ceil(remainingMs / 1000)} s`;
    phaseProgress = .30 + (1 - hpRatio) * .55;
  }else if(state.phase === "boss"){
    const hpRatio = state.boss ? state.boss.hp / Math.max(1, state.boss.maxHp) : 1;
    const color = String(state.boss?.color || "").toUpperCase();
    title = `ZONE ${state.zone}/${ECLANITE_ZONE_COUNT} · BOSS ${color}`.trim();
    detail = "Le boss a récupéré les PV restants du noyau · dégâts normaux";
    phaseProgress = .30 + (1 - hpRatio) * .65;
  }else if(state.phase === "complete"){
    title = "RUCHE D’ÉCLANITE PURIFIÉE";
    detail = "Les trois compartiments sont sécurisés.";
    phaseProgress = 1;
  }
  const progress = state.phase === "complete"
    ? 1
    : clamp01(zoneProgressBase + phaseProgress / ECLANITE_ZONE_COUNT);
  return {
    title,
    detail,
    lives:Math.max(0, Math.min(3, Math.floor(finite(lives, 3)))),
    progress,
    remainingMs,
    timerSeconds:Math.max(0, Math.ceil(remainingMs / 1000)),
    phase:state.phase,
    zone:state.zone,
    boss:state.boss,
    core:state.core,
    breaches:state.breaches,
    isBoss:state.phase === "boss",
    completed:state.phase === "complete"
  };
}
