export const AZURON_PORTAL_ID = "blue";
export const AZURON_ENEMY_LEVEL = 10;
export const AZURON_TOTAL_WAVES = 30;
export const AZURON_WAVES_PER_BATCH = 5;
export const AZURON_WAVE_INTERVAL_MS = 15_000;
export const AZURON_INTERMISSION_MS = 0;
export const AZURON_SPAWN_RADIUS = 2000;
export const AZURON_STATIONARY_RING_RADIUS_MIN = 150;
export const AZURON_STATIONARY_RING_RADIUS_MAX = 160;
export const AZURON_PORTAL_MAP = Object.freeze({width:7800, height:5400, spawn:Object.freeze({x:0, y:0})});

export const AZURON_WAVE_FAMILIES = Object.freeze([
  {kind:"drone_pirate", label:"Orbes sentinelles", count:10},
  {kind:"raider_astral", label:"Vorak rushers", count:10},
  {kind:"chasseur_spectral", label:"Parasites astraux", count:10},
  {kind:"cuirasse_nebulaire", label:"Traqueurs abyssaux", count:10},
  {kind:"eclanite", label:"Éclanites", count:5},
  {kind:"cuirasse_ambre", label:"Cuirasses ambrées", count:5}
].map(Object.freeze));

export function getAzuronWaveDefinition(wave){
  const number = Math.max(1, Math.min(AZURON_TOTAL_WAVES, Math.floor(Number(wave) || 1)));
  const batch = Math.ceil(number / AZURON_WAVES_PER_BATCH);
  return {...AZURON_WAVE_FAMILIES[batch - 1], wave:number, batch};
}

// Reinforcements always enter around the arena centre, independently of the pilot.
export function getAzuronSpawnPositions(wave){
  const {count} = getAzuronWaveDefinition(wave);
  return Array.from({length:count}, (_, index)=>{
    const angle = -Math.PI / 2 + index * Math.PI * 2 / count + Number(wave || 1) * .137;
    return {x:Math.cos(angle) * AZURON_SPAWN_RADIUS, y:Math.sin(angle) * AZURON_SPAWN_RADIUS};
  });
}

export function getAzuronStageGates({nextWave = 0, completed = false, portalId = "blue"} = {}){
  const common = {azuronGate:true, portalId:getWavePortalTier(portalId)?.id || "blue", r:95, safeRadius:130, activationRadius:170, y:0};
  return [
    ...(!completed && nextWave > 1 && nextWave <= AZURON_TOTAL_WAVES
      ? [{...common, id:"azuron-continue", action:"continue", x:-360,
          label:`CONTINUER · VAGUES ${nextWave}–${Math.min(AZURON_TOTAL_WAVES,nextWave+4)}`}]
      : []),
    {...common, id:"azuron-exit", action:"exit", x:360,
      label:completed ? "SORTIR · ÉPREUVE TERMINÉE" : "SORTIR · REPRISE CONSERVÉE"}
  ];
}
import { getWavePortalTier } from "./wavePortalTiers.js";

