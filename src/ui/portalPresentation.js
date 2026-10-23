const FOCUSED_PORTALS = Object.freeze({
  blue:{number:"01", color:"#51c7ff", type:"Épreuve d’initiation", format:"20 vagues", rhythm:"5 groupes de 4", unlock:"Compétences et recette du Laser MK-IV"},
  violet:{number:"02", color:"#bd8bff", type:"Sauvetage tactique", format:"4 drones à libérer", rhythm:"Drone Géant final", unlock:"Noyau Overdrive Drone"},
  red:{number:"03", color:"#ff9b68", type:"Épreuve des trois boss", format:"30 vagues", rhythm:"3 boss à affronter", unlock:"Vaisseaux élite et à compétence"},
  ionis:{number:"04", color:"#83acff", type:"Survie en vagues", format:"40 vagues", rhythm:"10 groupes de 4", unlock:"Améliorations d’équipement"}
});

export function getPortalPresentation(portal){
  return FOCUSED_PORTALS[portal?.id] || null;
}

export function getPortalAccess(portal, state){
  const pieces = Math.max(0, Number(state.portalPieces?.[portal.id] || 0));
  const required = Math.max(1, Number(portal.piecesRequired || 1));
  const unlocked = Array.isArray(state.unlockedPortals) && state.unlockedPortals.includes(portal.id);
  const levelOk = Number(state.player?.level || 0) >= portal.requirement.level;
  const contentReady = portal.contentStatus !== "to_define";
  const canPrepare = unlocked && levelOk && Boolean(state.activeShip) && contentReady;
  const canUnlock = !unlocked && levelOk && pieces >= required;
  const clears = Math.max(0, Number(state.completedPortals?.[portal.id] || 0));
  const run = state.portalRuns?.[portal.id];
  const lives = run ? Math.max(0, Math.min(3, Math.round(Number(run.lives || 0)))) : 3;
  const status = !contentReady ? "À venir" : unlocked ? "Déverrouillé" : !levelOk ? `Niveau ${portal.requirement.level} requis` : "À déverrouiller";
  return {pieces, required, unlocked, levelOk, contentReady, canPrepare, canUnlock, clears, lives, progress:Math.min(100, pieces / required * 100), missing:Math.max(0, required - pieces), status};
}

export function splitPortalRewards(portal){
  return String(portal.reward || "").split(/\s*(?:Â·|·)\s*/u).map(part=>{
    const ammo = part.match(/^([\d\s]+) munitions x(\d+)$/iu);
    if(ammo) return {kind:"ammo", amount:Number(ammo[1].replace(/\s/g, "")), multiplier:ammo[2], text:part};
    const nova = part.match(/^([\d\s]+) NOVA$/iu);
    if(nova) return {kind:"nova", amount:Number(nova[1].replace(/\s/g, "")), text:part};
    return {kind:"special", text:part};
  });
}
