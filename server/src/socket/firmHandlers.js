import { applyFirmPendingRewards, applyFirmQuestClaimReward, buyFirmShopItem, openFirmBox } from "../firms/firmEconomy.js";
import { enrichFirmSnapshot } from "../firms/firmSnapshots.js";
import { confirmProfileSave } from "./profileSaveGuard.js";

export function registerFirmHandlers(socket, context){
  const {emitProfileSync, firmWarManager, guard, io, players, profileManager} = context;

  function getPlayerContext(){
    const player = players.get(socket.id);
    if(!player) return null;
    const profile = profileManager.getProfileForPlayer(player);
    const playerKey = profileManager.profileKeyForPlayer(player);
    return {player, playerKey, profile};
  }

  function emitSnapshot({includeShop = false} = {}){
    const current = getPlayerContext();
    const accountId = String(current?.player?.accountId || "");
    const accountPlayers = accountId
      ? [...players.values()].filter(player=>
          String(player?.accountId || "") === accountId
          && player?.connected !== false
        )
      : [];
    const activeGamePlayer = accountPlayers.find(player=>player.clientMode === "game") || current?.player || null;
    const snapshotContext = activeGamePlayer
      ? {
          player:activeGamePlayer,
          playerKey:profileManager.profileKeyForPlayer(activeGamePlayer),
          profile:profileManager.getProfileForPlayer(activeGamePlayer)
        }
      : current;
    const rawSnapshot = enrichFirmSnapshot(profileManager, snapshotContext
      ? firmWarManager.snapshot({...snapshotContext, includeShop})
      : firmWarManager.snapshot());
    const snapshot = {
      ...rawSnapshot,
      snapshotComplete:Boolean(snapshotContext),
      includesShop:Boolean(includeShop)
    };
    const targetIds = [...new Set(accountPlayers.map(player=>player.id).filter(Boolean))];
    if(io?.to && targetIds.length){
      for(const socketId of targetIds){
        io.to(socketId).emit("firm:snapshot", snapshot);
        io.to(socketId).emit("firm:ranking", snapshot);
      }
      return;
    }
    socket.emit("firm:snapshot", snapshot);
    socket.emit("firm:ranking", snapshot);
  }

  async function ensureSaved(result){
    return confirmProfileSave(socket, result, {eventName:"firm:error"});
  }

  socket.on("firm:sync", payload=>{
    if(!guard("firm:sync")) return;
    emitSnapshot({includeShop:Boolean(payload?.includeShop)});
  });

  socket.on("firm:shop-buy", async payload=>{
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
    if(!await ensureSaved(result)) return;
    emitProfileSync(current.player, result.profile);
    socket.emit("firm:updated", {action:"shop-buy", item:result.item, firmatons:result.firmatons, at:Date.now()});
    emitSnapshot({includeShop:true});
  });

  socket.on("firm:box-open", async payload=>{
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
    if(!await ensureSaved(result)) return;
    emitProfileSync(current.player, result.profile);
    socket.emit("firm:updated", {action:"box-open", boxRarity:result.boxRarity, reward:result.reward, rewardRarity:result.rewardRarity, at:Date.now()});
    emitSnapshot({includeShop:true});
  });

  socket.on("firm:reward-claim", async ()=>{
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
    if(!await ensureSaved(result)) return;
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

  socket.on("firm:quest-claim", async payload=>{
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
    if(!await ensureSaved(applied)) return;
    emitProfileSync(current.player, applied.profile);
    socket.emit("firm:updated", {action:"quest-claim", questId:result.questId, reward:result.reward, at:Date.now()});
    emitSnapshot({includeShop:true});
  });

  socket.on("firm:season-objective-claim", async payload=>{
    if(!guard("firm:season-objective-claim")) return;
    const current = getPlayerContext();
    if(!current) return;
    const result = firmWarManager.claimSeasonObjectiveReward({
      objectiveId:payload?.id,
      claimedRewardIds:(current.profile?.firmRewardHistory || []).map(entry=>entry?.id),
      contributor:{
        key:current.playerKey,
        name:current.profile?.player?.name || current.player.name || "Pilote",
        firmId:current.profile?.player?.firmId || current.player.account?.firmId || "astra"
      }
    });
    if(!result.ok){
      socket.emit("firm:error", {message:result.reason || "Réclamation saisonnière impossible."});
      return;
    }
    const applied = profileManager.updateProfileForPlayer({
      player:current.player,
      update:profile=>applyFirmQuestClaimReward(profile, result)
    });
    if(!applied.ok){
      socket.emit("firm:error", {message:applied.reason || "Réclamation saisonnière impossible."});
      return;
    }
    if(!await ensureSaved(applied)) return;
    emitProfileSync(current.player, applied.profile);
    socket.emit("firm:updated", {action:"season-objective-claim", objectiveId:result.objectiveId, reward:result.reward, at:Date.now()});
    emitSnapshot({includeShop:true});
  });

  if(players.get(socket.id)?.accountId) emitSnapshot({includeShop:true});
}
