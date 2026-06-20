export function createRewardSystem({onLootChanged} = {}){
  const LOOT_NOTICE_DURATION = 3;
  const MAX_LOOT_NOTICES = 5;
  let lootNotices = [];

  function reset(){
    lootNotices = [];
  }

  function tick(dt){
    lootNotices = lootNotices
      .map(notice=>({...notice, remaining:Math.max(0, notice.remaining - dt)}))
      .filter(notice=>notice.remaining > 0);
    return lootNotices.length;
  }

  function notifyLootChanged(){
    onLootChanged?.(lootNotices);
  }

  function pushLootNotice(loot){
    const duration = Math.max(1, Number(loot?.duration || LOOT_NOTICE_DURATION));
    lootNotices.unshift({
      id:`loot_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      loot,
      remaining:duration,
      duration
    });
    lootNotices = lootNotices.slice(0, MAX_LOOT_NOTICES);
    notifyLootChanged();
  }

  function rewardEnemy(){
    return false;
  }

  function showCargoLoot(materialLabels){
    pushLootNotice({credits:0, xp:0, premium:0, materials:materialLabels});
  }

  function showLootNotice(loot){
    pushLootNotice(loot || {});
  }

  return {
    reset,
    tick,
    rewardEnemy,
    showCargoLoot,
    showLootNotice,
    getLootNotices:()=>lootNotices.slice()
  };
}
