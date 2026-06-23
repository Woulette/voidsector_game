import { getFirmShopItem, getFirmShopPrice, rollFirmBoxReward } from "./firmRules.js";

function ensureFirmEconomy(profile){
  profile.firmatons = Math.max(0, Math.floor(Number(profile.firmatons || 0)));
  if(!profile.firmBoxes || typeof profile.firmBoxes !== "object" || Array.isArray(profile.firmBoxes)) profile.firmBoxes = {};
  for(const rarity of ["common", "rare", "veryRare", "elite", "mythic"]){
    profile.firmBoxes[rarity] = Math.max(0, Math.floor(Number(profile.firmBoxes[rarity] || 0)));
  }
  if(!Array.isArray(profile.firmRewardHistory)) profile.firmRewardHistory = [];
  return profile;
}

function addRewardToProfile(profile, reward = {}){
  ensureFirmEconomy(profile);
  if(!profile.player || typeof profile.player !== "object") profile.player = {};
  profile.player.premium = Math.max(0, Number(profile.player.premium || 0)) + Math.max(0, Math.floor(Number(reward.premium || 0)));
  profile.firmatons += Math.max(0, Math.floor(Number(reward.firmatons || 0)));
  if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
  for(const [id, amount] of Object.entries(reward.ammo || {})){
    profile.ammoInventory[id] = Math.max(0, Number(profile.ammoInventory[id] || 0)) + Math.max(0, Math.floor(Number(amount || 0)));
  }
  if(!profile.cargoHold || typeof profile.cargoHold !== "object") profile.cargoHold = {};
  for(const [id, amount] of Object.entries(reward.materials || {})){
    profile.cargoHold[id] = Math.max(0, Number(profile.cargoHold[id] || 0)) + Math.max(0, Math.floor(Number(amount || 0)));
  }
  for(const [rarity, amount] of Object.entries(reward.boxes || {})){
    profile.firmBoxes[rarity] = Math.max(0, Number(profile.firmBoxes[rarity] || 0)) + Math.max(0, Math.floor(Number(amount || 0)));
  }
  return profile;
}

export function buyFirmShopItem(profile, itemId){
  ensureFirmEconomy(profile);
  const item = getFirmShopItem(itemId);
  if(!item) return {ok:false, reason:"Article de firme inconnu."};
  const reputation = Math.max(0, Number(profile.player?.reputation || 0));
  if(reputation < item.reputationRequired) return {ok:false, reason:`Reputation requise : ${item.reputationRequired}.`};
  const price = getFirmShopPrice(item, reputation);
  if(profile.firmatons < price) return {ok:false, reason:"Pas assez de firmatons."};
  profile.firmatons -= price;
  if(item.kind === "box") profile.firmBoxes[item.rarity] += 1;
  else addRewardToProfile(profile, item.reward || {});
  return {ok:true, item:{...item, price, basePrice:item.price}, firmatons:profile.firmatons};
}

export function openFirmBox(profile, rarity, {random = Math.random} = {}){
  ensureFirmEconomy(profile);
  const cleanRarity = String(rarity || "");
  if(Math.max(0, Number(profile.firmBoxes[cleanRarity] || 0)) <= 0) return {ok:false, reason:"Coffre de firme indisponible."};
  profile.firmBoxes[cleanRarity] -= 1;
  const result = rollFirmBoxReward(cleanRarity, random);
  const reward = result.reward || {};
  const normalized = {};
  if(reward.kind === "premium") normalized.premium = reward.amount;
  if(reward.kind === "ammo") normalized.ammo = {[reward.id]:reward.amount};
  if(reward.kind === "material") normalized.materials = {[reward.id]:reward.amount};
  addRewardToProfile(profile, normalized);
  profile.firmRewardHistory.push({
    id:`firm-box-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source:"box",
    label:reward.label || "Récompense de coffre",
    rarity:result.rewardRarity,
    reward:normalized,
    createdAt:Date.now()
  });
  if(profile.firmRewardHistory.length > 60) profile.firmRewardHistory.splice(0, profile.firmRewardHistory.length - 60);
  return {ok:true, ...result, normalizedReward:normalized, boxes:{...profile.firmBoxes}};
}

export function applyFirmPendingRewards(profile, entries = []){
  ensureFirmEconomy(profile);
  const claimed = [];
  for(const entry of Array.isArray(entries) ? entries : []){
    addRewardToProfile(profile, entry.reward || {});
    const historyEntry = {
      id:String(entry.id || `firm-reward-${Date.now()}`),
      source:String(entry.source || "firm"),
      label:String(entry.label || "Récompense de firme"),
      reward:JSON.parse(JSON.stringify(entry.reward || {})),
      createdAt:Number(entry.createdAt || Date.now())
    };
    profile.firmRewardHistory.push(historyEntry);
    claimed.push(historyEntry);
  }
  if(profile.firmRewardHistory.length > 60) profile.firmRewardHistory.splice(0, profile.firmRewardHistory.length - 60);
  return {ok:true, claimed};
}

export function applyFirmQuestClaimReward(profile, entry = {}){
  ensureFirmEconomy(profile);
  const reward = JSON.parse(JSON.stringify(entry.reward || {}));
  addRewardToProfile(profile, reward);
  const historyEntry = {
    id:String(entry.rewardId || `firm-quest-${String(entry.questId || "unknown")}-${Date.now()}`),
    source:"firm-quest",
    label:String(entry.label || "Prime de quête de firme"),
    reward,
    createdAt:Math.max(0, Number(entry.claimedAt || Date.now()))
  };
  profile.firmRewardHistory.push(historyEntry);
  if(profile.firmRewardHistory.length > 60) profile.firmRewardHistory.splice(0, profile.firmRewardHistory.length - 60);
  return {ok:true, claimed:historyEntry, firmatons:profile.firmatons};
}
