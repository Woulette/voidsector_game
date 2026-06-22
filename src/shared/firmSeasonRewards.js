export const FIRM_INDIVIDUAL_TOP_REWARDS = Object.freeze([
  {premium:200_000, ammo:{ammo_x6:30_000}, firmatons:2_000},
  {premium:175_000, ammo:{ammo_x6:25_000}, firmatons:1_750},
  {premium:150_000, ammo:{ammo_x6:20_000}, firmatons:1_500},
  {premium:100_000, ammo:{ammo_x6:10_000}, firmatons:1_000},
  {premium:75_000, ammo:{ammo_x4:50_000}, firmatons:850},
  {premium:70_000, ammo:{ammo_x4:45_000}, firmatons:800},
  {premium:65_000, ammo:{ammo_x4:40_000}, firmatons:750},
  {premium:60_000, ammo:{ammo_x4:35_000}, firmatons:700},
  {premium:55_000, ammo:{ammo_x4:30_000}, firmatons:600},
  {premium:50_000, ammo:{ammo_x4:25_000}, firmatons:500}
]);

export const FIRM_INDIVIDUAL_PERCENT_REWARDS = Object.freeze([
  {percent:10, reward:{premium:25_000, ammo:{ammo_x4:10_000}, firmatons:400}},
  {percent:20, reward:{premium:15_000, ammo:{ammo_x4:5_000}, firmatons:350}},
  {percent:30, reward:{premium:10_000, firmatons:250}},
  {percent:50, reward:{premium:5_000, firmatons:200}},
  {percent:80, reward:{premium:2_000, firmatons:150}}
]);

export const FIRM_INDIVIDUAL_CLASSIFIED_REWARD = Object.freeze({firmatons:100});

function cloneReward(reward = {}){
  return JSON.parse(JSON.stringify(reward || {}));
}

export function getFirmIndividualReward(rank, totalPlayers){
  const cleanRank = Math.max(1, Math.floor(Number(rank || 1)));
  const total = Math.max(1, Math.floor(Number(totalPlayers || 1)));
  if(cleanRank <= FIRM_INDIVIDUAL_TOP_REWARDS.length){
    return {label:`Top ${cleanRank}`, reward:cloneReward(FIRM_INDIVIDUAL_TOP_REWARDS[cleanRank - 1])};
  }
  const percentile = cleanRank / total * 100;
  const tier = FIRM_INDIVIDUAL_PERCENT_REWARDS.find(entry=>percentile <= entry.percent);
  if(tier) return {label:`Top ${tier.percent}%`, reward:cloneReward(tier.reward)};
  return {label:"Joueur classé", reward:cloneReward(FIRM_INDIVIDUAL_CLASSIFIED_REWARD)};
}

export function getFirmIndividualRewardTiers(totalPlayers = 0){
  const total = Math.max(0, Math.floor(Number(totalPlayers || 0)));
  const fixed = FIRM_INDIVIDUAL_TOP_REWARDS.map((reward, index)=>({
    id:`top-${index + 1}`,
    label:`Top ${index + 1}`,
    kind:"fixed",
    rankStart:index + 1,
    rankEnd:index + 1,
    playerCount:total >= index + 1 ? 1 : 0,
    reward:cloneReward(reward)
  }));
  let previousEnd = Math.min(10, total);
  const percent = FIRM_INDIVIDUAL_PERCENT_REWARDS.map(tier=>{
    const rankStart = Math.max(11, previousEnd + 1);
    const rankEnd = Math.max(0, Math.min(total, Math.floor(total * tier.percent / 100)));
    const playerCount = Math.max(0, rankEnd - rankStart + 1);
    if(rankEnd >= rankStart) previousEnd = rankEnd;
    return {
      id:`top-${tier.percent}-percent`,
      label:`Top ${tier.percent}%`,
      kind:"percent",
      percent:tier.percent,
      rankStart,
      rankEnd,
      playerCount,
      reward:cloneReward(tier.reward)
    };
  });
  const remainingStart = Math.max(11, previousEnd + 1);
  const remainingEnd = total;
  return [
    ...fixed,
    ...percent,
    {
      id:"classified",
      label:"Reste des joueurs classés",
      kind:"classified",
      rankStart:remainingStart,
      rankEnd:remainingEnd,
      playerCount:Math.max(0, remainingEnd - remainingStart + 1),
      reward:cloneReward(FIRM_INDIVIDUAL_CLASSIFIED_REWARD)
    }
  ];
}
