function countClaimable(entries = []){
  return (Array.isArray(entries) ? entries : []).filter(entry=>entry?.claimable).length;
}

export function getFirmRewardNotificationCounts(snapshot = null){
  const daily = countClaimable(snapshot?.dailyQuests);
  const weekly = countClaimable(snapshot?.seasonalQuests);
  const seasonal = countClaimable(snapshot?.seasonObjectives);
  const rewards = (Array.isArray(snapshot?.personal?.pendingRewards) ? snapshot.personal.pendingRewards : [])
    .filter(entry=>entry?.source === "season-individual" || entry?.source === "season-collective")
    .length;
  const quests = daily + weekly + seasonal;
  return {
    daily,
    weekly,
    seasonal,
    rewards,
    quests,
    total:quests + rewards
  };
}

export function getFirstFirmRewardDestination(snapshot = null){
  const counts = getFirmRewardNotificationCounts(snapshot);
  if(counts.daily) return {firmTab:"quests", questTab:"daily"};
  if(counts.weekly) return {firmTab:"quests", questTab:"weekly"};
  if(counts.seasonal) return {firmTab:"quests", questTab:"seasonal"};
  if(counts.rewards) return {firmTab:"rewards", questTab:null};
  return null;
}

export function formatFirmRewardNotificationCount(value){
  const count = Math.max(0, Math.floor(Number(value || 0)));
  return count > 99 ? "99+" : String(count);
}
