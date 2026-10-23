export const PRISMATIC_PORTAL_ID = "prismatic";
export const PRISMATIC_PORTAL_LEVEL = 40;
export const PRISMATIC_PLANET_MAX_HP = 2_000_000;
export const PRISMATIC_BOSS_MAX_HP = 2_000_000;
export const PRISMATIC_BOSS_MAX_SHIELD = 2_000_000;
export const PRISMATIC_GUARDIAN_ASSET = "assets/drones/ancestral_drone.png?v=20260726-prismatic1";

export const PRISMATIC_PLANET_ASSETS = Object.freeze({
  fire:"assets/maps/decor/planet_solaris_yellow.png",
  water:"assets/maps/decor/planet_cyan_blue.png",
  red:"assets/maps/decor/planet_astra_red.png"
});

export const PRISMATIC_PORTAL_MAP = Object.freeze({
  width:6_000,
  height:4_200,
  spawn:Object.freeze({x:0, y:1_750}),
  rift:Object.freeze({x:0, y:0, radius:190}),
  planets:Object.freeze([
    Object.freeze({
      id:"prismatic_planet_fire",
      element:"fire",
      label:"PLANÈTE DE FEU",
      x:-1_750,
      y:-850,
      asset:PRISMATIC_PLANET_ASSETS.fire
    }),
    Object.freeze({
      id:"prismatic_planet_water",
      element:"water",
      label:"PLANÈTE D’EAU",
      x:1_750,
      y:-850,
      asset:PRISMATIC_PLANET_ASSETS.water
    }),
    Object.freeze({
      id:"prismatic_planet_red",
      element:"red",
      label:"PLANÈTE ROUGE CRISTALLINE",
      x:0,
      y:400,
      asset:PRISMATIC_PLANET_ASSETS.red
    })
  ])
});

const PRISMATIC_STAGES = new Set(["planets", "rift", "bosses", "complete"]);
const PRISMATIC_ELEMENTS = new Set(["fire", "water", "red"]);
const PRISMATIC_BOSS_COLORS = new Set(["red", "green", "blue"]);

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max){
  return Math.max(min, Math.min(max, finite(value, min)));
}

function normalizedStage(value, completedAt){
  if(completedAt > 0) return "complete";
  const stage = String(value || "").toLowerCase();
  return PRISMATIC_STAGES.has(stage) ? stage : "planets";
}

function findPlanetFallback(value, index){
  const id = String(value?.id || "");
  const element = String(value?.element || "").toLowerCase();
  return PRISMATIC_PORTAL_MAP.planets.find(planet=>planet.id === id)
    || PRISMATIC_PORTAL_MAP.planets.find(planet=>planet.element === element)
    || PRISMATIC_PORTAL_MAP.planets[index]
    || PRISMATIC_PORTAL_MAP.planets[0];
}

function normalizePlanet(value, index){
  const source = value && typeof value === "object" ? value : {};
  const fallback = findPlanetFallback(source, index);
  const element = PRISMATIC_ELEMENTS.has(String(source.element || "").toLowerCase())
    ? String(source.element).toLowerCase()
    : fallback.element;
  const maxHp = Math.max(1, finite(source.maxHp, PRISMATIC_PLANET_MAX_HP));
  const hp = clamp(source.hp === undefined ? maxHp : source.hp, 0, maxHp);
  return {
    id:String(source.id || fallback.id),
    element,
    label:String(source.label || fallback.label),
    x:finite(source.x, fallback.x),
    y:finite(source.y, fallback.y),
    hp,
    maxHp,
    destroyed:source.destroyed === undefined ? hp <= 0 : Boolean(source.destroyed),
    guardiansRemaining:Math.max(0, Math.floor(finite(source.guardiansRemaining)))
  };
}

function normalizeRift(value, stage){
  const source = value && typeof value === "object" ? value : {};
  const activeByStage = stage === "rift" || stage === "bosses" || stage === "complete";
  const enteredByStage = stage === "bosses" || stage === "complete";
  return {
    active:source.active === undefined ? activeByStage : Boolean(source.active),
    x:finite(source.x, PRISMATIC_PORTAL_MAP.rift.x),
    y:finite(source.y, PRISMATIC_PORTAL_MAP.rift.y),
    radius:Math.max(40, finite(source.radius, PRISMATIC_PORTAL_MAP.rift.radius)),
    entered:source.entered === undefined ? enteredByStage : Boolean(source.entered)
  };
}

function normalizeBoss(value, index){
  const source = value && typeof value === "object" ? value : {};
  const fallbackColor = ["red", "green", "blue"][index] || "red";
  const color = PRISMATIC_BOSS_COLORS.has(String(source.color || "").toLowerCase())
    ? String(source.color).toLowerCase()
    : fallbackColor;
  const maxHp = Math.max(1, finite(source.maxHp, PRISMATIC_BOSS_MAX_HP));
  const maxShield = Math.max(0, finite(source.maxShield, PRISMATIC_BOSS_MAX_SHIELD));
  const hp = clamp(source.hp === undefined ? maxHp : source.hp, 0, maxHp);
  const shield = clamp(source.shield === undefined ? maxShield : source.shield, 0, maxShield);
  return {
    id:String(source.id || `prismatic_boss_${color}`),
    color,
    hp,
    maxHp,
    shield,
    maxShield,
    alive:source.alive === undefined ? hp > 0 : Boolean(source.alive)
  };
}

function normalizeEffect(value, index, {receivedAt, serverAt}){
  const source = value && typeof value === "object" ? value : {};
  const type = String(source.type || source.kind || "").toLowerCase();
  const color = String(source.color || source.element || (
    type.includes("heal") ? "green"
      : type.includes("slow") ? "blue"
        : type.includes("burn") || type.includes("fire") ? "red" : ""
  )).toLowerCase();
  const origin = source.from && typeof source.from === "object" ? source.from : null;
  const target = source.to && typeof source.to === "object" ? source.to : null;
  return {
    id:String(source.id || `prismatic_effect_${index}_${finite(source.at, serverAt)}`),
    type,
    color,
    x:finite(source.x, target?.x ?? origin?.x),
    y:finite(source.y, target?.y ?? origin?.y),
    from:origin ? {x:finite(origin.x), y:finite(origin.y)} : null,
    to:target ? {x:finite(target.x), y:finite(target.y)} : null,
    targetId:String(source.targetId || ""),
    targetBossId:String(source.targetBossId || ""),
    amount:Math.max(0, finite(source.amount)),
    radius:Math.max(0, finite(source.radius)),
    durationMs:Math.max(100, finite(source.durationMs, type.includes("rift") ? 1_600 : 900)),
    at:Math.max(0, finite(source.at, serverAt)),
    receivedAt:Math.max(0, finite(receivedAt, Date.now())),
    serverAt:Math.max(0, finite(serverAt))
  };
}

export function isPrismaticPortal(portal){
  return String(portal?.id || portal?.portalId || portal || "") === PRISMATIC_PORTAL_ID;
}

export function normalizePrismaticObjective(value, {
  receivedAt = Date.now(),
  serverAt = value?.at
} = {}){
  const source = value && typeof value === "object" ? value : {};
  const completedAt = Math.max(0, finite(source.completedAt));
  const stage = normalizedStage(source.stage, completedAt);
  const sourcePlanets = Array.isArray(source.planets) ? source.planets : [];
  const planets = PRISMATIC_PORTAL_MAP.planets.map((fallback, index)=>{
    const match = sourcePlanets.find(planet=>
      String(planet?.id || "") === fallback.id
      || String(planet?.element || "").toLowerCase() === fallback.element
    ) || sourcePlanets[index] || fallback;
    return normalizePlanet(match, index);
  });
  const normalizedReceivedAt = Math.max(0, finite(receivedAt, Date.now()));
  const normalizedServerAt = Math.max(0, finite(serverAt));
  const effects = (Array.isArray(source.effects) ? source.effects : [])
    .filter((effect, index, list)=>{
      const id = String(effect?.id || "");
      return !id || list.findIndex(candidate=>String(candidate?.id || "") === id) === index;
    })
    .map((effect, index)=>normalizeEffect(effect, index, {
      receivedAt:normalizedReceivedAt,
      serverAt:normalizedServerAt
    }));
  return {
    kind:"prismatic",
    stage,
    planets,
    rift:normalizeRift(source.rift, stage),
    bosses:(Array.isArray(source.bosses) ? source.bosses : []).map(normalizeBoss),
    effects,
    completedAt
  };
}

function vitalPercent(value, maxValue){
  return Math.round(clamp(finite(value) / Math.max(1, finite(maxValue, 1)), 0, 1) * 100);
}

export function getPrismaticObjectiveHud(objective, lives = 3){
  const state = normalizePrismaticObjective(objective);
  const destroyedPlanets = state.planets.filter(planet=>planet.destroyed).length;
  const guardiansRemaining = state.planets.reduce((sum, planet)=>sum + planet.guardiansRemaining, 0);
  const aliveBosses = state.bosses.filter(boss=>boss.alive).length;
  const defeatedBosses = state.bosses.length - aliveBosses;
  const bossHp = state.bosses.reduce((sum, boss)=>sum + boss.hp, 0);
  const bossMaxHp = state.bosses.reduce((sum, boss)=>sum + boss.maxHp, 0);
  const bossShield = state.bosses.reduce((sum, boss)=>sum + boss.shield, 0);
  const bossMaxShield = state.bosses.reduce((sum, boss)=>sum + boss.maxShield, 0);
  let title = `DÉTRUISEZ LES PLANÈTES · ${destroyedPlanets}/3`;
  let detail = `${guardiansRemaining} drone(s) ancestral(aux) protègent encore les planètes`;
  let progress = destroyedPlanets * .15;

  if(state.stage === "rift"){
    title = "TROU NOIR STABILISÉ";
    detail = "Rejoignez le centre et entrez dans la faille prismatique.";
    progress = .50;
  }else if(state.stage === "bosses"){
    title = `TRIADE PRISMATIQUE · ${aliveBosses}/3 BOSS`;
    detail = `PV ${vitalPercent(bossHp, bossMaxHp)}% · Boucliers ${vitalPercent(bossShield, bossMaxShield)}% · rouge brûle, vert soigne, bleu ralentit`;
    progress = .55 + defeatedBosses * .15;
  }else if(state.stage === "complete"){
    title = "NEXUS PRISMATIQUE PURIFIÉ";
    detail = "Les trois planètes et la triade prismatique sont neutralisées.";
    progress = 1;
  }else if(destroyedPlanets >= 3){
    title = "LES TROIS PLANÈTES SONT DÉTRUITES";
    detail = "Le trou noir va apparaître au centre du secteur.";
    progress = .45;
  }

  return {
    title,
    detail,
    lives:Math.max(0, Math.min(3, Math.floor(finite(lives, 3)))),
    progress:clamp(progress, 0, 1),
    stage:state.stage,
    destroyedPlanets,
    guardiansRemaining,
    aliveBosses,
    bossHpPct:vitalPercent(bossHp, bossMaxHp),
    bossShieldPct:vitalPercent(bossShield, bossMaxShield),
    completed:state.stage === "complete"
  };
}
