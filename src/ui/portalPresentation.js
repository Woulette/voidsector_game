const FOCUSED_PORTALS = Object.freeze({
  blue:{number:"01", color:"#51c7ff", type:"Épreuve d’initiation", format:"30 vagues · niveau 10", rhythm:"6 séries de 5", unlock:"Compétences et recette du Laser MK-IV"},
  violet:{number:"02", color:"#ffbd45", type:"Épreuve renforcée ×2", format:"30 vagues · niveau 15", rhythm:"6 séries de 5", unlock:"Noyau Overdrive Drone"},
  red:{number:"03", color:"#ff5744", type:"Épreuve renforcée ×3", format:"30 vagues · niveau 20", rhythm:"6 séries de 5", unlock:"Vaisseaux élite et à compétence"},
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
  const activeAttempt=state.portalAttempt || null;
  const invoked=activeAttempt?.portalId===portal.id;
  const canPrepare = unlocked && !activeAttempt && levelOk && Boolean(state.activeShip) && contentReady;
  const canUnlock = !unlocked && levelOk && pieces >= required;
  const clears = Math.max(0, Number(state.completedPortals?.[portal.id] || 0));
  const run = state.portalRuns?.[portal.id];
  const lives = invoked ? activeAttempt.lives : run ? Math.max(0, Math.min(3, Math.round(Number(run.lives || 0)))) : 3;
  const status = !contentReady ? "À venir" : invoked ? "Portail invoqué" : unlocked ? "Tentative assemblée" : !levelOk ? `Niveau ${portal.requirement.level} requis` : "Fragments à réunir";
  return {pieces, required, unlocked, invoked, activeAttempt, levelOk, contentReady, canPrepare, canUnlock, clears, lives, progress:Math.min(100, pieces / required * 100), missing:Math.max(0, required - pieces), status};
}

export function splitPortalRewards(portal){
  return String(portal.reward || "").split(/\s*(?:Â·|·)\s*/u).map(part=>{
    const ammo = part.match(/^([\d\s]+) munitions x(\d+)$/iu);
    if(ammo) return {kind:"ammo", amount:Number(ammo[1].replace(/\s/g, "")), multiplier:ammo[2], text:part};
    const nova = part.match(/^([\d\s]+) NOVA$/iu);
    if(nova) return {kind:"nova", amount:Number(nova[1].replace(/\s/g, "")), text:part};
    const other=part.match(/^([\d\s]+) (crédits|XP|réputation)$/iu);
    if(other) return {kind:other[2].toLowerCase()==="crédits" ? "credits" : other[2].toLowerCase()==="xp" ? "xp" : "reputation",amount:Number(other[1].replace(/\s/g,"")),text:part};
    return {kind:"special", text:part};
  });
}
