export const FIRM_BOOSTER_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
export const S1_BOOSTER_DURATION_MS = 5 * 60 * 60 * 1000;
export const S2_BOOSTER_DURATION_MS = 24 * 60 * 60 * 1000;
export const S1_BOOSTER_PRICE = 10_000;

export const FIRM_BOOSTER_DEFINITIONS = Object.freeze({
  damage:Object.freeze({
    id:"damage",
    label:"Dégâts",
    asset:"assets/boosters/booster_damage.png",
    color:"#ff4d67",
    shopDesc:"Un amplificateur offensif qui pousse temporairement l'ensemble de votre armement au-delà de ses limites normales."
  }),
  shield:Object.freeze({
    id:"shield",
    label:"Bouclier",
    asset:"assets/boosters/booster_shield.png",
    color:"#38d9ff",
    shopDesc:"Une réserve d'énergie défensive qui renforce votre bouclier pendant toute la durée de connexion disponible."
  }),
  hull:Object.freeze({
    id:"hull",
    label:"Vie",
    asset:"assets/boosters/booster_hull.png",
    color:"#42e68b",
    shopDesc:"Un renfort structurel temporaire qui améliore la résistance de votre coque face aux attaques les plus violentes."
  }),
  credits:Object.freeze({
    id:"credits",
    label:"Crédits",
    asset:"assets/boosters/booster_credits.png",
    color:"#ffc928",
    shopDesc:"Un programme commercial qui augmente les crédits obtenus et rend chaque expédition plus rentable."
  }),
  nova:Object.freeze({
    id:"nova",
    label:"NOVA",
    asset:"assets/boosters/booster_nova.png",
    color:"#bd72ff"
  })
});

export const BOOSTER_TYPE_IDS = Object.freeze(Object.keys(FIRM_BOOSTER_DEFINITIONS));

export const FIRM_RANK_BOOSTERS = Object.freeze({
  1:Object.freeze({damage:.10, shield:.10, hull:.10, credits:.25, nova:.10}),
  2:Object.freeze({damage:.10, shield:.10, nova:.10}),
  3:Object.freeze({damage:.10, shield:.10}),
  4:Object.freeze({damage:.10})
});

export const S1_BOOSTER_SHOP = Object.freeze(BOOSTER_TYPE_IDS
  .filter(type=>type !== "nova")
  .map(type=>Object.freeze({
  id:`booster_s1_${type}`,
  type,
  series:"s1",
  name:`Booster ${FIRM_BOOSTER_DEFINITIONS[type].label}`,
  short:`Booster ${FIRM_BOOSTER_DEFINITIONS[type].label}`,
  category:"booster",
  rarity:"BOOSTER",
  priceType:"premium",
  price:S1_BOOSTER_PRICE,
  percent:.10,
  durationMs:S1_BOOSTER_DURATION_MS,
  img:FIRM_BOOSTER_DEFINITIONS[type].asset,
  desc:FIRM_BOOSTER_DEFINITIONS[type].shopDesc
})));

function finitePositive(value, maximum = Number.MAX_SAFE_INTEGER){
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(maximum, number)) : 0;
}

export function sanitizeFirmBoosters(value = {}){
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(BOOSTER_TYPE_IDS
    .map(id=>[id, finitePositive(source[id], 5)])
    .filter(([, percent])=>percent > 0));
}

function sanitizeS1State(value = {}){
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(BOOSTER_TYPE_IDS.map(type=>{
    const entry = source[type];
    const remainingMs = finitePositive(
      entry && typeof entry === "object" ? entry.remainingMs : entry,
      100 * 365 * 24 * 60 * 60 * 1000
    );
    return [type, {remainingMs}];
  }));
}

function sanitizeS2State(value = {}){
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(BOOSTER_TYPE_IDS.map(type=>{
    const entry = source[type];
    const endsAt = finitePositive(entry && typeof entry === "object" ? entry.endsAt : entry);
    return [type, {endsAt}];
  }));
}

export function sanitizePlayerBoosterState(value = {}){
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    s1:sanitizeS1State(source.s1),
    s2:sanitizeS2State(source.s2)
  };
}

export function consumeConnectedBoosterTime(value = {}, elapsedMs = 0){
  const state = sanitizePlayerBoosterState(value);
  const elapsed = finitePositive(elapsedMs, 24 * 60 * 60 * 1000);
  if(elapsed <= 0) return state;
  for(const type of BOOSTER_TYPE_IDS){
    state.s1[type].remainingMs = Math.max(0, state.s1[type].remainingMs - elapsed);
  }
  return state;
}

export function addPlayerBoosterUnits(value = {}, {
  series = "s1",
  type,
  quantity = 1,
  now = Date.now()
} = {}){
  const state = sanitizePlayerBoosterState(value);
  if(!BOOSTER_TYPE_IDS.includes(String(type || ""))) return state;
  const count = Math.max(1, Math.min(1000, Math.floor(Number(quantity || 1))));
  if(series === "s2"){
    const currentEnd = Math.max(Number(now), Number(state.s2[type].endsAt || 0));
    state.s2[type].endsAt = currentEnd + S2_BOOSTER_DURATION_MS * count;
  }else{
    state.s1[type].remainingMs += S1_BOOSTER_DURATION_MS * count;
  }
  return state;
}

export function getFirmBoostersForRank(rank){
  return sanitizeFirmBoosters(FIRM_RANK_BOOSTERS[Math.max(1, Math.min(4, Math.floor(Number(rank || 4))))] || {});
}

export function getActiveFirmBoosterValues(reward = {}, now = Date.now()){
  if(Number(reward?.endsAt || 0) <= Number(now)) return {};
  return sanitizeFirmBoosters(reward?.boosters);
}

export function buildFirmBoosterItems(reward = {}, now = Date.now()){
  const boosters = getActiveFirmBoosterValues(reward, now);
  return Object.entries(boosters).map(([id, percent])=>({
    ...FIRM_BOOSTER_DEFINITIONS[id],
    percent,
    series:"season",
    mode:"realtime",
    countsOffline:true,
    endsAt:Math.max(0, Number(reward?.endsAt || 0))
  }));
}

export function getActiveProfileBoosterSources(value = {}, now = Date.now(), connectedElapsedMs = 0){
  const state = sanitizePlayerBoosterState(value);
  const elapsed = finitePositive(connectedElapsedMs);
  const sources = [];
  for(const type of BOOSTER_TYPE_IDS){
    const definition = FIRM_BOOSTER_DEFINITIONS[type];
    const s1Remaining = Math.max(0, Number(state.s1[type].remainingMs || 0) - elapsed);
    if(s1Remaining > 0){
      sources.push({
        id:`s1:${type}`,
        type,
        series:"S1",
        label:`Booster S1 ${definition.label}`,
        percent:.10,
        mode:"connected",
        countsOffline:false,
        remainingMs:s1Remaining,
        endsAt:0,
        asset:definition.asset,
        color:definition.color
      });
    }
    const s2EndsAt = Number(state.s2[type].endsAt || 0);
    if(s2EndsAt > Number(now)){
      sources.push({
        id:`s2:${type}`,
        type,
        series:"S2",
        label:`Booster S2 ${definition.label}`,
        percent:.10,
        mode:"realtime",
        countsOffline:true,
        remainingMs:s2EndsAt - Number(now),
        endsAt:s2EndsAt,
        asset:definition.asset,
        color:definition.color
      });
    }
  }
  return sources;
}

export function getSeasonBoosterSources(reward = {}, now = Date.now()){
  const rank = Math.max(1, Math.min(4, Math.floor(Number(reward?.rank || 4))));
  return buildFirmBoosterItems(reward, now).map(item=>({
    id:`season:${item.id}`,
    type:item.id,
    series:"SAISON",
    label:`Saison de firme - Top ${rank}`,
    percent:item.percent,
    mode:"realtime",
    countsOffline:true,
    remainingMs:Math.max(0, Number(item.endsAt || 0) - Number(now)),
    endsAt:item.endsAt,
    asset:item.asset,
    color:item.color
  }));
}

export function mergeBoosterValues(...values){
  const merged = {};
  for(const value of values){
    for(const type of BOOSTER_TYPE_IDS){
      const percent = finitePositive(value?.[type], 5);
      if(percent > 0) merged[type] = finitePositive(Number(merged[type] || 0) + percent, 5);
    }
  }
  return merged;
}

export function boosterValuesFromSources(sources = []){
  return mergeBoosterValues(...sources.map(source=>({[source.type]:source.percent})));
}

export function getActivePlayerBoosterValues(value = {}, now = Date.now(), connectedElapsedMs = 0){
  return boosterValuesFromSources(getActiveProfileBoosterSources(value, now, connectedElapsedMs));
}

export function buildCombinedBoosterSnapshot({
  playerBoosters = {},
  seasonReward = {},
  now = Date.now(),
  connectedElapsedMs = 0
} = {}){
  const sources = [
    ...getActiveProfileBoosterSources(playerBoosters, now, connectedElapsedMs),
    ...getSeasonBoosterSources(seasonReward, now)
  ];
  const groups = BOOSTER_TYPE_IDS.map(type=>{
    const typeSources = sources.filter(source=>source.type === type);
    if(!typeSources.length) return null;
    const definition = FIRM_BOOSTER_DEFINITIONS[type];
    return {
      ...definition,
      percent:typeSources.reduce((sum, source)=>sum + Number(source.percent || 0), 0),
      sources:typeSources
    };
  }).filter(Boolean);
  return {
    generatedAt:Number(now),
    rank:seasonReward?.rank || null,
    endsAt:Math.max(0, Number(seasonReward?.endsAt || 0)),
    values:boosterValuesFromSources(sources),
    items:groups,
    sources,
    activeSourceCount:sources.length,
    season:{
      rank:seasonReward?.rank || null,
      endsAt:Math.max(0, Number(seasonReward?.endsAt || 0)),
      values:getActiveFirmBoosterValues(seasonReward, now)
    }
  };
}

export function getFirmBoosterPercent(boosters = {}, id){
  return finitePositive(boosters?.[id], 5);
}
