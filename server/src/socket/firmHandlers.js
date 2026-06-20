import { applyFirmPendingRewards, applyFirmQuestClaimReward, buyFirmShopItem, openFirmBox } from "../firms/firmEconomy.js";
import { enrichFirmSnapshot } from "../firms/firmSnapshots.js";

export function registerFirmHandlers(socket, context){
  const {emitProfileSync, firmWarManager, guard, players, profileManager} = context;

  function getPlayerContext(){
    const player = players.get(socket.id);
    if(!player) return null;
    const profile = profileManager.getProfileForPlayer(player);
    const playerKey = profileManager.profileKeyForPlayer(player);
    return {player, playerKey, profile};
  }

  function emitSnapshot({includeShop = false} = {}){
    const current = getPlayerContext();
    const snapshot = enrichFirmSnapshot(profileManager, current
      ? firmWarManager.snapshot({...current, includeShop})
      : firmWarManager.snapshot());
    socket.emit("firm:snapshot", snapshot);
    socket.emit("firm:ranking", snapshot);
  }

  socket.on("firm:sync", payload=>{
    if(!guard("firm:sync")) return;
    emitSnapshot({includeShop:Boolean(payload?.includeShop)});
  });

  socket.on("firm:shop-buy", payload=>{
    if(!guard("firm:shop-buy")) return;
    const current = getPlayerContext();
    if(!current) return;
    const result = profileManager.updateProfileForPlayer({
      player:current.player,
      update:profile=>buyFirmShopItem(profile, payload?.id)
    });
    if(!result.ok){
      socket.emit("firm:error", {message:result.reason || "Achat de firme impossible."});
      return;
    }
    emitProfileSync(current.player, result.profile);
    socket.emit("firm:updated", {action:"shop-buy", item:result.item, firmatons:result.firmatons, at:Date.now()});
    emitSnapshot({includeShop:true});
  });

  socket.on("firm:box-open", payload=>{
    if(!guard("firm:box-open")) return;
    const current = getPlayerContext();
    if(!current) return;
    const result = profileManager.updateProfileForPlayer({
      player:current.player,
      update:profile=>openFirmBox(profile, payload?.rarity)
    });
    if(!result.ok){
      socket.emit("firm:error", {message:result.reason || "Ouverture de coffre impossible."});
      return;
    }
    emitProfileSync(current.player, result.profile);
    socket.emit("firm:updated", {action:"box-open", boxRarity:result.boxRarity, reward:result.reward, rewardRarity:result.rewardRarity, at:Date.now()});
    emitSnapshot({includeShop:true});
  });

  socket.on("firm:reward-claim", ()=>{
    if(!guard("firm:reward-claim")) return;
    const current = getPlayerContext();
    if(!current) return;
    const pending = firmWarManager.getPendingRewards(current.playerKey);
    if(!pending.length){
      socket.emit("firm:error", {message:"Aucune recompense de firme en attente."});
      return;
    }
    const result = profileManager.updateProfileForPlayer({
      player:current.player,
      update:profile=>applyFirmPendingRewards(profile, pending)
    });
    if(!result.ok){
      socket.emit("firm:error", {message:result.reason || "Reclamation impossible."});
      return;
    }
    firmWarManager.consumePendingRewards(current.playerKey);
    emitProfileSync(current.player, result.profile);
    socket.emit("firm:updated", {action:"reward-claim", claimed:result.claimed, at:Date.now()});
    emitSnapshot({includeShop:true});
  });

  socket.on("firm:quest-accept", payload=>{
    if(!guard("firm:quest-accept")) return;
    const current = getPlayerContext();
    if(!current) return;
    const result = firmWarManager.acceptDailyQuest({
      questId:payload?.id,
      contributor:{
        key:current.playerKey,
        name:current.profile?.player?.name || current.player.name || "Pilote",
        firmId:current.profile?.player?.firmId || current.player.account?.firmId || "astra"
      }
    });
    if(!result.ok){
      socket.emit("firm:error", {message:result.reason || "Acceptation de quete impossible."});
      return;
    }
    socket.emit("firm:updated", {action:"quest-accept", questId:result.questId, at:Date.now()});
    emitSnapshot();
  });

  socket.on("firm:quest-claim", payload=>{
    if(!guard("firm:quest-claim")) return;
    const current = getPlayerContext();
    if(!current) return;
    const result = firmWarManager.claimQuestReward({
      questId:payload?.id,
      contributor:{
        key:current.playerKey,
        name:current.profile?.player?.name || current.player.name || "Pilote",
        firmId:current.profile?.player?.firmId || current.player.account?.firmId || "astra"
      }
    });
    if(!result.ok){
      socket.emit("firm:error", {message:result.reason || "Reclamation de quete impossible."});
      return;
    }
    const applied = profileManager.updateProfileForPlayer({
      player:current.player,
      update:profile=>applyFirmQuestClaimReward(profile, result)
    });
    if(!applied.ok){
      socket.emit("firm:error", {message:applied.reason || "Reclamation de quete impossible."});
      return;
    }
    emitProfileSync(current.player, applied.profile);
    socket.emit("firm:updated", {action:"quest-claim", questId:result.questId, reward:result.reward, at:Date.now()});
    emitSnapshot({includeShop:true});
  });

  if(players.get(socket.id)?.accountId) emitSnapshot();
}
