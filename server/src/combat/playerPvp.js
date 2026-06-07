export function getPlayerPvpBlockReason({sameGroup = false, attackerLevel = 1, targetLevel = 1} = {}){
  if(sameGroup) return "Tir refuse sur membre du groupe.";
  if(Number(attackerLevel) < 10) return "Tu dois atteindre le niveau 10 pour attaquer un joueur.";
  if(Number(targetLevel) < 10) return "Ce joueur est protege jusqu'au niveau 10.";
  return "";
}
