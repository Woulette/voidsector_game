export const RANK_TABLE = [
  {id:"recrue", name:"Recrue", score:0, asset:"01_Recrue.svg"},
  {id:"pilote_debutant", name:"Pilote débutant", score:250, asset:"02_Pilote_debutant.svg"},
  {id:"pilote", name:"Pilote", score:650, asset:"03_Pilote.svg"},
  {id:"pilote_confirme", name:"Pilote confirmé", score:1100, asset:"04_Pilote_confirme.svg"},
  {id:"soldat_spatial", name:"Soldat spatial", score:1700, asset:"05_Soldat_spatial.svg"},
  {id:"soldat_elite", name:"Soldat d'élite", score:2600, asset:"06_Soldat_d_elite.svg"},
  {id:"caporal", name:"Caporal", score:3900, asset:"07_Caporal.svg"},
  {id:"caporal_chef", name:"Caporal-chef", score:5500, asset:"08_Caporal-chef.svg"},
  {id:"sergent", name:"Sergent", score:7500, asset:"09_Sergent.svg"},
  {id:"sergent_chef", name:"Sergent-chef", score:9800, asset:"10_Sergent-chef.svg"},
  {id:"adjudant", name:"Adjudant", score:12800, asset:"11_Adjudant.svg"},
  {id:"adjudant_chef", name:"Adjudant-chef", score:16500, asset:"12_Adjudant-chef.svg"},
  {id:"aspirant", name:"Aspirant", score:21000, asset:"13_Aspirant.svg"},
  {id:"sous_lieutenant", name:"Sous-lieutenant", score:26000, asset:"14_Sous-lieutenant.svg"},
  {id:"lieutenant", name:"Lieutenant", score:32000, asset:"15_Lieutenant.svg"},
  {id:"capitaine", name:"Capitaine", score:39000, asset:"16_Capitaine.svg"},
  {id:"commandant", name:"Commandant", score:47000, asset:"17_Commandant.svg"},
  {id:"lieutenant_colonel", name:"Lieutenant-colonel", score:56000, asset:"18_Lieutenant-colonel.svg"},
  {id:"colonel", name:"Colonel", score:68000, asset:"19_Colonel.svg"},
  {id:"colonel_elite", name:"Colonel d'élite", score:82000, asset:"20_Colonel_d_elite.svg"},
  {id:"general_brigade", name:"Général de brigade", score:100000, asset:"21_General_de_brigade.svg"},
  {id:"general_division", name:"Général de division", score:125000, asset:"22_General_de_division.svg"},
  {id:"general_corps_armee", name:"Général de corps d'armée", score:155000, asset:"23_General_de_corps_d_armee.svg"},
  {id:"general_armee", name:"Général d'armée", score:190000, asset:"24_General_d_armee.svg"},
  {id:"marechal", name:"Maréchal", score:230000, asset:"25_Marechal.svg"}
];

export const RANK_POINT_RULES = [
  {id:"xp", label:"Expérience totale gagnée", source:"XP gagnée sur les monstres, vagues et récompenses de portail", rate:"1 point de classement par XP", multiplier:1},
  {id:"kill", label:"Monstres détruits", source:"Chaque mob tué en zone ou en portail", rate:"55 points de classement par kill", multiplier:55},
  {id:"level", label:"Niveaux pilote", source:"Progression du niveau du commandant", rate:"120 points par niveau gagné après le niveau 1", multiplier:120},
  {id:"portal", label:"Portails terminés", source:"Nettoyage complet des 30 vagues d'un portail", rate:"2 500 points par portail terminé", multiplier:2500}
];

export const LOCAL_LEADERBOARD_PREVIEW = [
  {id:"vex09", pilot:"VEX-09", level:34, kills:1260, portals:12, points:186000},
  {id:"orion5", pilot:"ORION-5", level:29, kills:940, portals:8, points:127500},
  {id:"kira77", pilot:"KIRA-77", level:24, kills:610, portals:5, points:74200},
  {id:"raven13", pilot:"RAVEN-13", level:18, kills:350, portals:2, points:38600},
  {id:"nova21", pilot:"NOVA-21", level:14, kills:210, portals:1, points:21400},
  {id:"atlas02", pilot:"ATLAS-02", level:10, kills:86, portals:0, points:9650}
];

export function getRankById(id){
  return RANK_TABLE.find(rank=>rank.id === id) || RANK_TABLE[0];
}

export function getRankAssetPath(rankLike){
  const id = typeof rankLike === "string" ? rankLike : rankLike?.id;
  const rank = getRankById(id);
  return `assets/ranks/${rank.asset || `${rank.id}.svg`}`;
}

export function getRankForScore(score){
  let current = RANK_TABLE[0];
  for(const rank of RANK_TABLE){
    if(Number(score || 0) >= rank.score) current = rank;
    else break;
  }
  return current;
}

export function calculateRankScore(player={}, portalClears=0){
  const totalXp = Math.max(0, Number(player.totalXp || 0));
  const totalKills = Math.max(0, Number(player.totalKills || 0));
  const levelBonus = Math.max(0, Number(player.level || 1) - 1);
  const clears = Math.max(0, Number(portalClears || 0));
  return totalXp + totalKills * 55 + levelBonus * 120 + clears * 2500;
}

export function buildRankBreakdown(player={}, portalClears=0){
  const totalXp = Math.max(0, Number(player.totalXp || 0));
  const totalKills = Math.max(0, Number(player.totalKills || 0));
  const levelBonus = Math.max(0, Number(player.level || 1) - 1);
  const clears = Math.max(0, Number(portalClears || 0));
  return [
    {id:"xp", label:"XP totale gagnée", source:"Monstres, vagues et récompenses de portail", amount:totalXp, rate:1, formula:`${totalXp} × 1`, points:totalXp},
    {id:"kill", label:"Monstres détruits", source:"Chaque ennemi tué", amount:totalKills, rate:55, formula:`${totalKills} × 55`, points:totalKills * 55},
    {id:"level", label:"Niveaux gagnés", source:"Chaque niveau après le niveau 1", amount:levelBonus, rate:120, formula:`${levelBonus} × 120`, points:levelBonus * 120},
    {id:"portal", label:"Portails terminés", source:"30 vagues nettoyées + boss tué", amount:clears, rate:2500, formula:`${clears} × 2500`, points:clears * 2500}
  ];
}

export function getNextRankForScore(score){
  const current = getRankForScore(score);
  return RANK_TABLE.find(rank=>rank.score > current.score) || null;
}

export function getRankProgressForScore(score){
  const current = getRankForScore(score);
  const next = getNextRankForScore(score);
  if(!next) return {score,current,next,progress:100,remaining:0};
  const span = Math.max(1, next.score - current.score);
  return {score,current,next,progress:Math.max(0, Math.min(100, (score - current.score) / span * 100)),remaining:Math.max(0, next.score - score)};
}

export function buildLeaderboardRows(player={}, portalClears=0){
  const selfPoints = calculateRankScore(player, portalClears);
  const self = {
    id:"player",
    pilot:player.name || "NOVA-37",
    level:Number(player.level || 1),
    kills:Number(player.totalKills || 0),
    portals:portalClears,
    points:selfPoints,
    isPlayer:true
  };
  return [self, ...LOCAL_LEADERBOARD_PREVIEW].map(row=>{
    const rank = row.rankId ? getRankById(row.rankId) : getRankForScore(row.points);
    return {
      ...row,
      rankId:rank.id,
      grade:row.grade || rank.name
    };
  }).sort((a,b)=>b.points - a.points);
}
