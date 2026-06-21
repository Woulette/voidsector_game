export const RANK_TABLE = [
  {id:"recrue", name:"Recrue", score:0, asset:"01_Recrue.svg"},
  {id:"pilote_debutant", name:"Pilote débutant", score:500, asset:"02_Pilote_debutant.svg"},
  {id:"pilote", name:"Pilote", score:1500, asset:"03_Pilote.svg"},
  {id:"pilote_confirme", name:"Pilote confirmé", score:3500, asset:"04_Pilote_confirme.svg"},
  {id:"soldat_spatial", name:"Soldat spatial", score:6000, asset:"05_Soldat_spatial.svg"},
  {id:"soldat_elite", name:"Soldat d'élite", score:9000, asset:"06_Soldat_d_elite.svg"},
  {id:"caporal", name:"Caporal", score:13000, asset:"07_Caporal.svg"},
  {id:"caporal_chef", name:"Caporal-chef", score:18000, asset:"08_Caporal-chef.svg"},
  {id:"sergent", name:"Sergent", score:25000, asset:"09_Sergent.svg"},
  {id:"sergent_chef", name:"Sergent-chef", score:35000, asset:"10_Sergent-chef.svg"},
  {id:"adjudant", name:"Adjudant", score:50000, asset:"11_Adjudant.svg"},
  {id:"adjudant_chef", name:"Adjudant-chef", score:70000, asset:"12_Adjudant-chef.svg"},
  {id:"aspirant", name:"Aspirant", score:95000, asset:"13_Aspirant.svg"},
  {id:"sous_lieutenant", name:"Sous-lieutenant", score:130000, asset:"14_Sous-lieutenant.svg"},
  {id:"lieutenant", name:"Lieutenant", score:180000, asset:"15_Lieutenant.svg"},
  {id:"capitaine", name:"Capitaine", score:250000, asset:"16_Capitaine.svg"},
  {id:"commandant", name:"Commandant", score:350000, asset:"17_Commandant.svg"},
  {id:"lieutenant_colonel", name:"Lieutenant-colonel", score:500000, asset:"18_Lieutenant-colonel.svg"},
  {id:"colonel", name:"Colonel", score:700000, asset:"19_Colonel.svg"},
  {id:"colonel_elite", name:"Colonel d'élite", score:950000, asset:"20_Colonel_d_elite.svg"},
  {id:"general_brigade", name:"Général de brigade", score:1300000, asset:"21_General_de_brigade.svg"},
  {id:"general_division", name:"Général de division", score:1850000, asset:"22_General_de_division.svg"},
  {id:"general_corps_armee", name:"Général de corps d'armée", score:2600000, asset:"23_General_de_corps_d_armee.svg"},
  {id:"general_armee", name:"Général d'armée", score:3700000, asset:"24_General_d_armee.svg"},
  {id:"marechal", name:"Maréchal", score:5000000, asset:"25_Marechal.svg"}
];

export const RANK_POINT_RULES = [
  {id:"xp", label:"Expérience totale gagnée", source:"XP totale gagnée", rate:"1 point par 100 000 XP", multiplier:0.00001},
  {id:"reputation", label:"Réputation", source:"Réputation totale gagnée", rate:"1 point par 10 000 réputation", multiplier:0.0001},
  {id:"kill", label:"Monstres détruits", source:"Barème fixe propre à chaque monstre", rate:"Points attribués par paliers de kills", multiplier:1},
  {id:"level", label:"Niveaux pilote", source:"Progression du niveau du commandant", rate:"1 000 points par niveau gagné après le niveau 1", multiplier:1000},
  {id:"portal", label:"Portails terminés", source:"Nettoyage complet des 30 vagues d'un portail", rate:"2 500 points par portail terminé", multiplier:2500}
];

export const MONSTER_RANK_POINT_RULES = Object.freeze({
  drone_pirate:Object.freeze({kills:70, points:1}),
  raider_astral:Object.freeze({kills:70, points:1}),
  chasseur_spectral:Object.freeze({kills:50, points:1}),
  pondeuse_astrale:Object.freeze({kills:1, points:1}),
  cuirasse_nebulaire:Object.freeze({kills:30, points:1}),
  boss_drone_pirate:Object.freeze({kills:10, points:1}),
  boss_raider_astral:Object.freeze({kills:10, points:1}),
  deadly_eclaireur:Object.freeze({kills:3, points:1}),
  deadly_intercepteur:Object.freeze({kills:3, points:1}),
  deadly_traqueur:Object.freeze({kills:1, points:1}),
  deadly_gardien:Object.freeze({kills:1, points:1}),
  deadly_ravageur:Object.freeze({kills:1, points:2}),
  eclanite:Object.freeze({kills:1, points:1}),
  cristanite:Object.freeze({kills:1, points:1}),
  astranite:Object.freeze({kills:1, points:1}),
  cuirasse_ambre:Object.freeze({kills:1, points:2}),
  deadly_amiral_k137:Object.freeze({kills:1, points:120})
});

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

export function getMonsterRankPointRule(kind){
  return MONSTER_RANK_POINT_RULES[String(kind || "")] || null;
}

export function calculateMonsterRankPointsForKills(kind, kills=0){
  const rule = getMonsterRankPointRule(kind);
  if(!rule) return 0;
  const cleanKills = Math.max(0, Math.floor(Number(kills || 0)));
  return Math.floor(cleanKills / rule.kills) * rule.points;
}

export function calculateMonsterKillRankPoints(kind, previousKills=0){
  const cleanKills = Math.max(0, Math.floor(Number(previousKills || 0)));
  return calculateMonsterRankPointsForKills(kind, cleanKills + 1)
    - calculateMonsterRankPointsForKills(kind, cleanKills);
}

export function calculateRankScore(player={}, portalClears=0){
  const totalXp = Math.max(0, Number(player.totalXp || 0));
  const reputation = Math.max(0, Number(player.reputation || 0));
  const monsterRankPoints = Math.max(0, Number(player.monsterRankPoints || 0));
  const levelBonus = Math.max(0, Number(player.level || 1) - 1);
  const clears = Math.max(0, Number(portalClears || 0));
  return Math.floor(totalXp / 100000) + Math.floor(reputation / 10000) + monsterRankPoints + levelBonus * 1000 + clears * 2500;
}

export function buildRankBreakdown(player={}, portalClears=0){
  const totalXp = Math.max(0, Number(player.totalXp || 0));
  const reputation = Math.max(0, Number(player.reputation || 0));
  const totalKills = Math.max(0, Number(player.totalKills || 0));
  const monsterRankPoints = Math.max(0, Number(player.monsterRankPoints || 0));
  const levelBonus = Math.max(0, Number(player.level || 1) - 1);
  const clears = Math.max(0, Number(portalClears || 0));
  return [
    {id:"xp", label:"XP totale gagnée", source:"1 point pour 100 000 XP", amount:totalXp, rate:0.00001, formula:`floor(${totalXp} / 100000)`, points:Math.floor(totalXp / 100000)},
    {id:"reputation", label:"Réputation", source:"1 point pour 10 000 réputation", amount:reputation, rate:0.0001, formula:`floor(${reputation} / 10000)`, points:Math.floor(reputation / 10000)},
    {id:"kill", label:"Monstres détruits", source:"Barème fixe selon le type de monstre", amount:totalKills, rate:null, formula:`${monsterRankPoints} points par paliers`, points:monsterRankPoints},
    {id:"level", label:"Niveaux gagnés", source:"1 000 points par niveau gagné", amount:levelBonus, rate:1000, formula:`${levelBonus} x 1000`, points:levelBonus * 1000},
    {id:"portal", label:"Portails terminés", source:"2 500 points par portail terminé", amount:clears, rate:2500, formula:`${clears} x 2500`, points:clears * 2500}
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
