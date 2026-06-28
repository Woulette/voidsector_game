import { appendFileSync, mkdirSync } from "node:fs";
import { applyDronePermanentUpgrade, applyEquipmentUpgrade, equipInventoryUid, findEquippedSlot, getServerItem, unequipInventoryUid, unequipShipLoadout, unequipSlot } from "../economy/equipment.js";
import { claimServerRefineryJob, completeServerRefineryShipment, completeServerRefineryUpgrades, refineServerShipCargoRecipe, rushServerRefineryShipment, rushServerRefineryUpgrade, startServerRefineryJob, startServerRefineryShipment, startServerRefineryUpgrade, toggleServerRefineryProduction } from "../economy/refinery.js";
import { runServerSpaceCaster } from "../economy/spaceCaster.js";
import { acceptServerQuest, claimCompletedServerQuests, claimServerQuest, progressServerQuestAction, progressServerQuestKill, trackServerQuest } from "../quests/quests.js";
import { checkServerQuestTimers, recordServerQuestDeath, recordServerQuestHpLoss } from "../quests/questFailures.js";
import { spendCurrency } from "./progression.js";
import { performServerPrestige, unlockServerPortal, upgradeServerSkill } from "./progressionActions.js";
import { sanitizeProfile } from "./profileSanitize.js";
import { addInventoryItemAmount, isStackableInventoryItem } from "../economy/inventoryStacks.js";
import { appendProfileActivity } from "./activityLog.js";
import { depositServerCombatBoostMaterial } from "../economy/combatBoosts.js";
import { sellServerCommerceMaterials } from "../economy/materialCommerce.js";
import { applyPremiumPackToPlayer, claimBetaRewardState, claimPremiumRewardState } from "../../../src/data/premium.js";
import { BOOSTER_TYPE_IDS, addPlayerBoosterUnits } from "../../../src/shared/firmBoosters.js";
import { getTutorialExpectedQuestId } from "../../../src/shared/tutorial.js";
import { abandonTutorialAfterOutsideQuestAction } from "./tutorialActions.js";
import { attachProfileSave, cloneProfileSnapshot, restoreProfileSnapshot } from "./profilePersistenceResult.js";
import { getProfileFirmQuestId } from "../quests/questState.js";

const BETA_PURCHASE_LOG_DIR = new URL("../../data/", import.meta.url);
const BETA_PURCHASE_LOG_FILE = new URL("../../data/betaPurchases.jsonl", import.meta.url);

function appendBetaPurchaseLog(record){
  try{
    mkdirSync(BETA_PURCHASE_LOG_DIR, {recursive:true});
    appendFileSync(BETA_PURCHASE_LOG_FILE, `${JSON.stringify(record)}\n`, "utf8");
  }catch(error){
    console.warn("[beta] Impossible d'ecrire le journal d'achat beta:", error?.message || error);
  }
}

export function createProfileActions({profiles, persist, getExistingProfile}){
  function commitProfileChange(key, previous, next){
    const finalProfile = sanitizeProfile(next);
    profiles.set(key, finalProfile);
    let persistResult = null;
    try{
      persistResult = persist(key);
    }catch(error){
      persistResult = Promise.reject(error);
    }
    const save = Promise.resolve(persistResult).catch(error=>{
      restoreProfileSnapshot(profiles, key, previous);
      throw error;
    });
    save.catch(()=>{});
    return {profile:finalProfile, save};
  }

  function commitProfileResult(result, key, previous, next){
    const committed = commitProfileChange(key, previous, next);
    return attachProfileSave({...result, profile:committed.profile}, committed.save);
  }

  function rejectTutorialSelectionPurchase(profile){
    if(profile?.tutorial?.status !== "active") return null;
    if(["launcher_select_velox", "launcher_select_laser"].includes(profile.tutorial.step)){
      return {ok:false, reason:"Tutoriel actif : selectionne d'abord l'article indique."};
    }
    return null;
  }

  function rejectTutorialEconomyAction(profile, action = {}){
    if(profile?.tutorial?.status !== "active") return null;
    const step = String(profile.tutorial.step || "");
    if(step === "launcher_upgrade_storage"){
      return {ok:false, reason:"Tutoriel actif : clique d'abord sur AMELIORER pour le stockage."};
    }
    if(step !== "launcher_launch_storage_upgrade") return null;
    const isExpectedStorageLaunch = action?.kind === "refinery-upgrade-start"
      && action?.type === "module"
      && action?.id === "storage";
    if(isExpectedStorageLaunch) return null;
    return {ok:false, reason:"Tutoriel actif : lance uniquement l'amelioration du stockage."};
  }

  function canAcceptQuestDuringActiveTutorial(profile, questId){
    if(profile?.tutorial?.status !== "active") return true;
    const expectedSourceId = getTutorialExpectedQuestId(profile.tutorial);
    const expectedFirmId = getProfileFirmQuestId(profile, expectedSourceId);
    const candidate = String(questId || "");
    return Boolean(expectedSourceId && (candidate === expectedSourceId || candidate === expectedFirmId));
  }

  function spendAndUpdate({player, priceType, amount, update, activity} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    const tutorialBlocked = rejectTutorialSelectionPurchase(profile);
    if(tutorialBlocked) return tutorialBlocked;
    const previous = cloneProfileSnapshot(profile);
    const result = spendCurrency(profile.player || {}, priceType, amount);
    if(!result.ok) return result;
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now(),
      player:result.player
    });
    if(typeof update === "function") update(next);
    if(activity) appendProfileActivity(next, activity);
    return commitProfileResult(result, key, previous, next);
  }

  function addAmmoPurchase({player, purchase} = {}){
    return spendAndUpdate({
      player,
      priceType:purchase?.priceType,
      amount:purchase?.totalPrice,
      update:profile=>{
        if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
        profile.ammoInventory[purchase.id] = Math.max(0, Number(profile.ammoInventory[purchase.id] || 0)) + Math.max(0, Number(purchase.totalAmount || 0));
      },
      activity:{
        type:"shop_purchase",
        label:"Achat munitions",
        detail:`${purchase?.id || "munition"} x${Math.max(0, Number(purchase?.totalAmount || 0))} pour ${Math.max(0, Number(purchase?.totalPrice || 0))} ${purchase?.priceType || "credits"}.`,
        data:{itemId:purchase?.id || "", amount:Number(purchase?.totalAmount || 0), price:Number(purchase?.totalPrice || 0), priceType:purchase?.priceType || "credits"}
      }
    });
  }
  
  function addItemPurchase({player, purchase} = {}){
    return spendAndUpdate({
      player,
      priceType:purchase?.priceType,
      amount:purchase?.totalPrice,
      update:profile=>{
        addInventoryItemAmount(profile, purchase.id, Math.max(1, Number(purchase?.quantity || 1)));
      },
      activity:{
        type:"shop_purchase",
        label:"Achat objet",
        detail:`${purchase?.id || "objet"} x${Math.max(1, Number(purchase?.quantity || 1))} pour ${Math.max(0, Number(purchase?.totalPrice || 0))} ${purchase?.priceType || "credits"}.`,
        data:{itemId:purchase?.id || "", amount:Number(purchase?.quantity || 1), price:Number(purchase?.totalPrice || 0), priceType:purchase?.priceType || "credits"}
      }
    });
  }

  function addBoosterPurchase({player, purchase} = {}){
    return spendAndUpdate({
      player,
      priceType:purchase?.priceType,
      amount:purchase?.totalPrice,
      update:profile=>{
        profile.boosters = addPlayerBoosterUnits(profile.boosters, {
          series:"s1",
          type:purchase?.type,
          quantity:purchase?.quantity,
          now:Date.now()
        });
      },
      activity:{
        type:"booster_purchase",
        label:"Achat booster S1",
        detail:`${purchase?.name || "Booster S1"} x${Math.max(1, Number(purchase?.quantity || 1))} pour ${Math.max(0, Number(purchase?.totalPrice || 0))} NOVA.`,
        data:{
          boosterType:purchase?.type || "",
          series:"s1",
          quantity:Number(purchase?.quantity || 1),
          price:Number(purchase?.totalPrice || 0)
        }
      }
    });
  }

  function grantBooster({player, type, series = "s2", quantity = 1, source = "event"} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    if(!["s1", "s2"].includes(series)) return {ok:false, reason:"Série de booster invalide."};
    if(!BOOSTER_TYPE_IDS.includes(String(type || ""))) return {ok:false, reason:"Type de booster invalide."};
    const {key, profile} = getExistingProfile(player);
    const previous = cloneProfileSnapshot(profile);
    profile.boosters = addPlayerBoosterUnits(profile.boosters, {
      series,
      type,
      quantity,
      now:Date.now()
    });
    appendProfileActivity(profile, {
      type:"booster_grant",
      label:`Booster ${series.toUpperCase()}`,
      detail:`Booster ${type || "inconnu"} x${Math.max(1, Number(quantity || 1))} attribué via ${source}.`,
      data:{boosterType:type || "", series, quantity:Number(quantity || 1), source:String(source || "event")}
    });
    const next = sanitizeProfile({...profile, updatedAt:Date.now()});
    return commitProfileResult({ok:true}, key, previous, next);
  }

  function addShipPurchase({player, purchase} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    if(!purchase?.id) return {ok:false, reason:"Vaisseau invalide."};
    const {key, profile} = getExistingProfile(player);
    const tutorialBlocked = rejectTutorialSelectionPurchase(profile);
    if(tutorialBlocked) return tutorialBlocked;
    const previous = cloneProfileSnapshot(profile);
    if(Array.isArray(profile.ownedShips) && profile.ownedShips.includes(purchase.id)){
      return {ok:false, reason:"Vaisseau déjà possédé."};
    }
    const requiredPortal = String(purchase.requiresCompletedPortal || "");
    if(requiredPortal && Math.max(0, Number(profile.completedPortals?.[requiredPortal] || 0)) <= 0){
      return {ok:false, reason:`Pré requis : portail ${requiredPortal} terminé.`};
    }
    const result = spendCurrency(profile.player || {}, purchase.priceType, purchase.totalPrice);
    if(!result.ok) return result;
    profile.player = result.player;
    if(!Array.isArray(profile.ownedShips)) profile.ownedShips = ["orion"];
    profile.ownedShips.push(purchase.id);
    if(!profile.shipLoadouts || typeof profile.shipLoadouts !== "object") profile.shipLoadouts = {};
    if(!profile.shipLoadouts[purchase.id]){
      profile.shipLoadouts[purchase.id] = {
        lasers:[],
        missileLauncher:null,
        rocketLauncher:null,
        generators:[],
        extras:[]
      };
    }
    appendProfileActivity(profile, {
      type:"ship_purchase",
      label:"Achat vaisseau",
      detail:`${purchase.id} pour ${Math.max(0, Number(purchase.totalPrice || 0))} ${purchase.priceType || "credits"}.`,
      data:{shipId:purchase.id, price:Number(purchase.totalPrice || 0), priceType:purchase.priceType || "credits"}
    });
    const claimedQuests = claimCompletedServerQuests(profile).claimed || [];
    const next = sanitizeProfile({...profile, updatedAt:Date.now()});
    return commitProfileResult({...result, claimedQuests}, key, previous, next);
  }
  
  function addDronePurchase({player, purchase} = {}){
    return spendAndUpdate({
      player,
      priceType:purchase?.priceType,
      amount:purchase?.totalPrice,
      update:profile=>{
        profile.ownedDroneCount = Math.max(Number(profile.ownedDroneCount || 0), Number(purchase.nextCount || 0));
        if(!Array.isArray(profile.droneLoadout)) profile.droneLoadout = [];
        while(profile.droneLoadout.length < profile.ownedDroneCount) profile.droneLoadout.push(null);
        if(profile.droneLoadout.length > profile.ownedDroneCount) profile.droneLoadout.length = profile.ownedDroneCount;
      },
      activity:{
        type:"drone_purchase",
        label:"Achat drone",
        detail:`Drone ${Math.max(0, Number(purchase?.nextCount || 0))} pour ${Math.max(0, Number(purchase?.totalPrice || 0))} ${purchase?.priceType || "credits"}.`,
        data:{nextCount:Number(purchase?.nextCount || 0), price:Number(purchase?.totalPrice || 0), priceType:purchase?.priceType || "credits"}
      }
    });
  }
  
  function addDroneFormationPurchase({player, purchase} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    const tutorialBlocked = rejectTutorialSelectionPurchase(profile);
    if(tutorialBlocked) return tutorialBlocked;
    const previous = cloneProfileSnapshot(profile);
    const alreadyOwned = Array.isArray(profile.ownedDroneFormations) && profile.ownedDroneFormations.includes(purchase.id);
    const result = spendCurrency(profile.player || {}, purchase?.priceType, alreadyOwned ? 0 : purchase?.totalPrice);
    if(!result.ok) return result;
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now(),
      player:result.player
    });
    if(!Array.isArray(next.ownedDroneFormations)) next.ownedDroneFormations = ["base"];
    if(!next.ownedDroneFormations.includes("base")) next.ownedDroneFormations.unshift("base");
    if(!next.ownedDroneFormations.includes(purchase.id)) next.ownedDroneFormations.push(purchase.id);
    next.activeDroneFormation = purchase.id;
    appendProfileActivity(next, {
      type:"drone_formation",
      label:"Formation drone",
      detail:`Formation ${purchase?.id || "drone"} ${alreadyOwned ? "equipee" : "achetee"}.`,
      data:{formationId:purchase?.id || "", owned:alreadyOwned}
    });
    const finalProfile = sanitizeProfile(next);
    return commitProfileResult({...result, owned:alreadyOwned}, key, previous, finalProfile);
  }

  function addPremiumPackPurchase({player, purchase} = {}){
    return spendAndUpdate({
      player,
      priceType:purchase?.priceType,
      amount:purchase?.totalPrice,
      update:profile=>{
        applyPremiumPackToPlayer(profile.player, purchase);
      },
      activity:{
        type:"premium_purchase",
        label:"Pass premium",
        detail:`${purchase?.id || "premium"} active pour ${Math.max(0, Number(purchase?.days || 0))} jours.`,
        data:{packId:purchase?.id || "", price:Number(purchase?.totalPrice || 0), priceType:purchase?.priceType || "premium", days:Number(purchase?.days || 0)}
      }
    });
  }

  function ensureShipOwned(profile, shipId){
    const cleanShipId = String(shipId || "");
    if(!cleanShipId) return false;
    if(!Array.isArray(profile.ownedShips)) profile.ownedShips = ["orion"];
    if(profile.ownedShips.includes(cleanShipId)) return false;
    profile.ownedShips.push(cleanShipId);
    if(!profile.shipLoadouts || typeof profile.shipLoadouts !== "object") profile.shipLoadouts = {};
    if(!profile.shipLoadouts[cleanShipId]){
      profile.shipLoadouts[cleanShipId] = {
        lasers:[],
        missileLauncher:null,
        rocketLauncher:null,
        generators:[],
        extras:[]
      };
    }
    return true;
  }

  function grantInventoryItemCount(profile, itemId, amount = 1){
    const count = Math.max(0, Math.floor(Number(amount || 0)));
    if(count <= 0) return;
    if(isStackableInventoryItem(itemId)){
      addInventoryItemAmount(profile, itemId, count);
      return;
    }
    for(let i = 0; i < count; i += 1) addInventoryItemAmount(profile, itemId, 1);
  }

  function rewardSummary(reward = {}){
    const parts = [];
    if(reward.credits) parts.push(`${Math.max(0, Number(reward.credits || 0))} credits`);
    if(reward.premium) parts.push(`${Math.max(0, Number(reward.premium || 0))} NOVA`);
    for(const [id, amount] of Object.entries(reward.ammo || {})) parts.push(`${Math.max(0, Number(amount || 0))} ${id}`);
    for(const [id, amount] of Object.entries(reward.itemCounts || {})) parts.push(`${Math.max(0, Number(amount || 0))} ${id}`);
    for(const id of reward.items || []) parts.push(`1 ${id}`);
    for(const id of reward.ships || []) parts.push(`1 vaisseau ${id}`);
    if(reward.shipRandom) parts.push(reward.shipRandom.label || "1 vaisseau aleatoire");
    return parts.join(" + ") || "recompense";
  }

  function applyRewardPayload(profile, reward = {}, {randomShipKey = ""} = {}){
    if(!profile.player || typeof profile.player !== "object") profile.player = {};
    profile.player.credits = Math.max(0, Number(profile.player.credits || 0)) + Math.max(0, Number(reward.credits || 0));
    profile.player.premium = Math.max(0, Number(profile.player.premium || 0)) + Math.max(0, Number(reward.premium || 0));
    if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
    for(const [id, amount] of Object.entries(reward.ammo || {})){
      profile.ammoInventory[id] = Math.max(0, Number(profile.ammoInventory[id] || 0)) + Math.max(0, Number(amount || 0));
    }
    for(const [id, amount] of Object.entries(reward.itemCounts || {})) grantInventoryItemCount(profile, id, amount);
    for(const id of reward.items || []) grantInventoryItemCount(profile, id, 1);
    for(const id of reward.ships || []) ensureShipOwned(profile, id);
    let randomShip = "";
    const randomIds = Array.isArray(reward.shipRandom?.shipIds) ? reward.shipRandom.shipIds.map(String).filter(Boolean) : [];
    if(randomIds.length){
      const owned = new Set(Array.isArray(profile.ownedShips) ? profile.ownedShips.map(String) : []);
      const pool = randomIds.filter(id=>!owned.has(id));
      const candidates = pool.length ? pool : randomIds;
      randomShip = candidates[Math.floor(Math.random() * candidates.length)] || "";
      if(randomShip) ensureShipOwned(profile, randomShip);
      if(randomShipKey){
        if(!profile.betaRewardState || typeof profile.betaRewardState !== "object") profile.betaRewardState = {};
        if(!profile.betaRewardState.randomShipRewards || typeof profile.betaRewardState.randomShipRewards !== "object"){
          profile.betaRewardState.randomShipRewards = {};
        }
        profile.betaRewardState.randomShipRewards[randomShipKey] = randomShip;
      }
    }
    return {randomShip};
  }

  function addBetaPackPurchase({player, purchase} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    if(!purchase?.id) return {ok:false, reason:"Pack beta invalide."};
    if(purchase.locked) return {ok:false, reason:purchase.reason || "Pack beta indisponible."};
    const {key, profile} = getExistingProfile(player);
    const previous = cloneProfileSnapshot(profile);
    const bought = Array.isArray(profile.betaPackPurchases) ? profile.betaPackPurchases.map(String) : [];
    if(bought.includes(purchase.id)) return {ok:false, reason:"Pack beta deja achete."};
    if(!Array.isArray(profile.betaPackPurchases)) profile.betaPackPurchases = [];
    profile.betaPackPurchases.push(purchase.id);
    if(!Array.isArray(profile.betaLaunchEntitlements)) profile.betaLaunchEntitlements = [];
    profile.betaLaunchEntitlements = [...new Set([
      ...profile.betaLaunchEntitlements.map(String),
      ...(purchase.launchEntitlements || []).map(String)
    ].filter(Boolean))];
    const launchPremiumDays = Math.max(0, Math.floor(Number(purchase.launchPremiumDays || 0)));
    profile.betaLaunchPremiumDays = Math.max(0, Math.floor(Number(profile.betaLaunchPremiumDays || 0))) + launchPremiumDays;
    if(!profile.betaShipChoices || typeof profile.betaShipChoices !== "object") profile.betaShipChoices = {};
    const grants = {...(purchase.grants || {})};
    if(purchase.shipChoice){
      profile.betaShipChoices[purchase.id] = purchase.shipChoice;
      grants.ships = [...(Array.isArray(grants.ships) ? grants.ships : []), purchase.shipChoice];
    }
    applyRewardPayload(profile, grants);
    appendProfileActivity(profile, {
      type:"beta_pack",
      label:"Pack beta",
      detail:`${purchase.name || purchase.id} attribue cote serveur${purchase.shipChoice ? ` avec ${purchase.shipChoice}` : ""}.`,
      data:{
        packId:purchase.id,
        realPrice:purchase.realPrice || "",
        shipChoice:purchase.shipChoice || "",
        launchEntitlements:purchase.launchEntitlements || [],
        launchPremiumDays
      }
    });
    const next = sanitizeProfile({...profile, updatedAt:Date.now()});
    const committed = commitProfileResult({ok:true}, key, previous, next);
    const logSave = committed.save.then(()=>appendBetaPurchaseLog({
      type:"beta_pack_purchase",
      accountKey:String(key || ""),
      playerId:String(player?.id || player?.accountId || ""),
      pilotName:String(next.player?.name || player?.name || ""),
      packId:purchase.id,
      packName:purchase.name || "",
      realPrice:purchase.realPrice || "",
      shipChoice:purchase.shipChoice || "",
      launchEntitlements:purchase.launchEntitlements || [],
      launchPremiumDays,
      totalLaunchPremiumDays:next.betaLaunchPremiumDays || 0,
      betaPackPurchases:next.betaPackPurchases || [],
      recordedAt:Date.now(),
      recordedAtIso:new Date().toISOString()
    }));
    return attachProfileSave(committed, logSave);
  }

  function claimPremiumReward({player} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    const previous = cloneProfileSnapshot(profile);
    const result = claimPremiumRewardState(profile);
    if(!result.ok) return result;
    applyRewardPayload(profile, result.reward?.reward || {});
    appendProfileActivity(profile, {
      type:"premium_reward",
      label:"Recompense premium",
      detail:`Jour ${result.day} : ${rewardSummary(result.reward?.reward || {})}.`,
      data:{day:result.day, reward:result.reward?.reward || {}}
    });
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    return commitProfileResult(result, key, previous, next);
  }

  function claimBetaReward({player} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    const previous = cloneProfileSnapshot(profile);
    const result = claimBetaRewardState(profile);
    if(!result.ok) return result;
    const applied = applyRewardPayload(profile, result.reward?.reward || {}, {randomShipKey:`day_${result.day}`});
    appendProfileActivity(profile, {
      type:"beta_reward",
      label:"Recompense beta",
      detail:`Jour ${result.day} : ${rewardSummary(result.reward?.reward || {})}.`,
      data:{day:result.day, reward:result.reward?.reward || {}, randomShip:applied.randomShip || ""}
    });
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    return commitProfileResult({...result, randomShip:applied.randomShip || ""}, key, previous, next);
  }

  function getSaleValue(item){
    if(!item || item.shop === false || item.category === "quest_item") return null;
    const price = Math.max(0, Math.round(Number(item.price || 0)));
    if(price <= 0) return null;
    return {
      priceType:item.priceType === "premium" ? "premium" : "credits",
      amount:Math.max(1, Math.floor(price * 0.35))
    };
  }

  function sellInventoryItem({player, inventoryUid} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const uid = String(inventoryUid || "");
    if(!uid) return {ok:false, reason:"Objet invalide."};
    const {key, profile} = getExistingProfile(player);
    const previous = cloneProfileSnapshot(profile);
    const entryIndex = Array.isArray(profile.inventoryItems)
      ? profile.inventoryItems.findIndex(entry=>entry?.uid === uid)
      : -1;
    if(entryIndex < 0) return {ok:false, reason:"Objet introuvable."};
    if(findEquippedSlot(profile, uid)) return {ok:false, reason:"Des equipe l'objet avant de le vendre."};
    const entry = profile.inventoryItems[entryIndex];
    const item = getServerItem(entry.itemId);
    const value = getSaleValue(item);
    if(!value) return {ok:false, reason:"Objet non vendable."};
    if(!profile.player || typeof profile.player !== "object") profile.player = {};
    const currencyKey = value.priceType === "premium" ? "premium" : "credits";
    profile.player[currencyKey] = Math.max(0, Number(profile.player[currencyKey] || 0)) + value.amount;
    profile.inventoryItems.splice(entryIndex, 1);
    appendProfileActivity(profile, {
      type:"inventory_sale",
      label:"Vente objet",
      detail:`${item.name || item.id} vendu pour ${value.amount} ${value.priceType}.`,
      data:{itemId:item.id, amount:value.amount, priceType:value.priceType}
    });
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    return commitProfileResult({
      ok:true,
      item:{id:item.id, name:item.name},
      inventoryUid:uid,
      priceType:value.priceType,
      amount:value.amount
    }, key, previous, next);
  }
  
  function applyEquipmentAction({player, action} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    const previous = cloneProfileSnapshot(profile);
    let result = null;
    if(action?.kind === "batch"){
      const actions = Array.isArray(action.actions) ? action.actions.slice(0, 64) : [];
      const applied = [];
      const rejected = [];
      for(const entry of actions){
        let entryResult = null;
        if(entry?.kind === "equip"){
          entryResult = equipInventoryUid(profile, entry);
        }else if(entry?.kind === "unequip-inventory"){
          entryResult = unequipInventoryUid(profile, String(entry.inventoryUid || ""))
            ? {ok:true}
            : {ok:false, reason:"Objet deja retire."};
        }else if(entry?.kind === "drone-upgrade"){
          entryResult = applyDronePermanentUpgrade(profile, entry);
        }else{
          entryResult = {ok:false, reason:"Action groupee invalide."};
        }
        if(entryResult.ok) applied.push({action:entry, result:entryResult});
        else rejected.push({action:entry, reason:entryResult.reason || "Action impossible."});
      }
      result = applied.length
        ? {ok:true, count:applied.length, applied, rejected}
        : {ok:false, reason:rejected[0]?.reason || "Aucune action groupee applicable."};
    }else if(action?.kind === "equip"){
      result = equipInventoryUid(profile, action);
    }else if(action?.kind === "unequip-slot"){
      result = unequipSlot(profile, action);
    }else if(action?.kind === "unequip-ship"){
      result = unequipShipLoadout(profile, action);
    }else if(action?.kind === "unequip-inventory"){
      result = unequipInventoryUid(profile, String(action.inventoryUid || ""))
        ? {ok:true}
        : {ok:false, reason:"Objet deja retire."};
    }else if(action?.kind === "drone-upgrade"){
      result = applyDronePermanentUpgrade(profile, action);
    }else if(action?.kind === "equipment-upgrade"){
      result = applyEquipmentUpgrade(profile, action);
    }else{
      result = {ok:false, reason:"Action equipement invalide."};
    }
    if(!result.ok){
      restoreProfileSnapshot(profiles, key, previous);
      return result;
    }
    const claimedQuests = claimCompletedServerQuests(profile).claimed || [];
    appendProfileActivity(profile, {
      type:"equipment",
      label:"Equipement",
      detail:`Action ${action?.kind || "equipement"} appliquee${action?.type ? ` sur ${action.type}` : ""}.`,
      data:{kind:action?.kind || "", type:action?.type || "", itemId:action?.itemId || action?.inventoryUid || ""}
    });
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    return commitProfileResult({...result, claimedQuests}, key, previous, next);
  }
  
  function setActiveShipForPlayer({player, shipId, worldSession = null} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const cleanShipId = String(shipId || "");
    const {key, profile} = getExistingProfile(player);
    const previous = cloneProfileSnapshot(profile);
    if(!cleanShipId) return {ok:false, reason:"Vaisseau invalide."};
    if(!Array.isArray(profile.ownedShips) || !profile.ownedShips.map(String).includes(cleanShipId)){
      return {ok:false, reason:"Vaisseau non possede."};
    }
    const draft = sanitizeProfile({
      ...profile,
      activeShip:cleanShipId,
      selectedShip:cleanShipId,
      ...(worldSession ? {worldSession} : {}),
      ...(worldSession ? {shipWorldSessions:{
        ...(profile.shipWorldSessions || {}),
        [String(worldSession.shipId || cleanShipId)]:worldSession
      }} : {}),
      updatedAt:Date.now()
    });
    appendProfileActivity(draft, {
      type:"ship_switch",
      label:"Changement vaisseau",
      detail:`Vaisseau actif : ${cleanShipId}.`,
      data:{shipId:cleanShipId}
    });
    const claimedQuests = claimCompletedServerQuests(draft).claimed || [];
    if(claimedQuests.length) draft.updatedAt = Date.now();
    const next = sanitizeProfile(draft);
    return commitProfileResult({ok:true, shipId:cleanShipId, claimedQuests}, key, previous, next);
  }
  
  function tutorialSnapshot(profile){
    return JSON.stringify(profile?.tutorial || null);
  }

  function applyQuestAction({player, action} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    if(action?.kind === "accept" && !canAcceptQuestDuringActiveTutorial(profile, action.questId)){
      return {ok:false, reason:"Tutoriel actif : accepte uniquement la mission indiquee."};
    }
    const previous = cloneProfileSnapshot(profile);
    const tutorialBefore = tutorialSnapshot(profile);
    let result = null;
    let claimedQuests = [];
    if(action?.kind === "accept"){
      result = acceptServerQuest(profile, action.questId);
    }else if(action?.kind === "track"){
      result = trackServerQuest(profile, action.questId);
    }else if(action?.kind === "claim"){
      result = claimServerQuest(profile, action.questId);
    }else if(action?.kind === "kill"){
      result = progressServerQuestKill(profile, {
        kind:action.enemyKind,
        zoneName:action.zoneName
      });
    }else if(action?.kind === "progress"){
      result = progressServerQuestAction(profile, action);
    }else if(action?.kind === "hp-loss"){
      result = recordServerQuestHpLoss(profile, action.amount);
    }else if(action?.kind === "death"){
      result = recordServerQuestDeath(profile);
    }else if(action?.kind === "timer-check"){
      result = checkServerQuestTimers(profile, action.now);
    }else{
      result = {ok:false, reason:"Action quete invalide."};
    }
    if(!result.ok){
      restoreProfileSnapshot(profiles, key, previous);
      return result;
    }
    if(action?.kind === "claim") claimedQuests = result.claimedQuests || [];
    if(action?.kind === "accept" && result.quest?.id){
      claimedQuests = claimCompletedServerQuests(profile, [result.quest.id]).claimed || [];
    }
    if(action?.kind === "kill" || action?.kind === "progress"){
      const completedIds = [...new Set((result.updates || [])
        .filter(update=>update?.completed)
        .map(update=>String(update.questId || update.id || ""))
        .filter(Boolean))];
      if(completedIds.length) claimedQuests = claimCompletedServerQuests(profile, completedIds).claimed || [];
    }
    abandonTutorialAfterOutsideQuestAction(profile);
    if((action?.kind === "timer-check" || action?.kind === "death" || action?.kind === "hp-loss") && !result.changed){
      return {...result, profile};
    }
    if(action?.kind !== "timer-check" && action?.kind !== "hp-loss"){
      appendProfileActivity(profile, {
        type:"quest",
        label:"Quete",
        detail:`Action ${action?.kind || "quete"}${action?.questId ? ` : ${action.questId}` : ""}.`,
        data:{kind:action?.kind || "", questId:action?.questId || "", claimed:claimedQuests.length}
      });
    }
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    const tutorialChanged = tutorialBefore !== tutorialSnapshot(next);
    return commitProfileResult({
      ...result,
      claimedQuests,
      tutorial:next.tutorial,
      tutorialChanged
    }, key, previous, next);
  }
  
  function applyEconomyAction({player, action} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    const tutorialBlocked = rejectTutorialEconomyAction(profile, action);
    if(tutorialBlocked) return tutorialBlocked;
    const previous = cloneProfileSnapshot(profile);
    const tutorialBefore = tutorialSnapshot(profile);
    completeServerRefineryUpgrades(profile);
    completeServerRefineryShipment(profile);
    let result = null;
    let questProgress = null;
    let claimedQuests = [];
    if(action?.kind === "space-caster"){
      result = runServerSpaceCaster(profile, action);
      if(result.ok) questProgress = progressServerQuestAction(profile, {type:"space_caster_use", amount:result.count});
    }else if(action?.kind === "refinery-upgrade-start"){
      result = startServerRefineryUpgrade(profile, action);
      if(result.ok){
        questProgress = progressServerQuestAction(profile, {
          type:result.type === "module" ? "refinery_module_upgrade_start" : "refinery_material_upgrade_start",
          moduleId:result.type === "module" ? result.id : "",
          materialId:result.type === "material" ? result.id : "",
          targetLevel:result.level
        });
      }
    }else if(action?.kind === "refinery-upgrade-rush"){
      result = rushServerRefineryUpgrade(profile, action);
    }else if(action?.kind === "refinery-production-toggle"){
      result = toggleServerRefineryProduction(profile, action.id);
    }else if(action?.kind === "refinery-job-start"){
      result = startServerRefineryJob(profile, action);
    }else if(action?.kind === "refinery-job-claim"){
      result = claimServerRefineryJob(profile, action);
    }else if(action?.kind === "refinery-shipment-start"){
      result = startServerRefineryShipment(profile, action);
    }else if(action?.kind === "refinery-shipment-rush"){
      result = rushServerRefineryShipment(profile, action);
    }else if(action?.kind === "ship-cargo-refine"){
      result = refineServerShipCargoRecipe(profile, action);
    }else if(action?.kind === "combat-boost-deposit"){
      result = depositServerCombatBoostMaterial(profile, action);
    }else if(action?.kind === "commerce-material-sell"){
      result = sellServerCommerceMaterials(profile, action);
    }else{
      result = {ok:false, reason:"Action economie invalide."};
    }
    if(!result.ok){
      restoreProfileSnapshot(profiles, key, previous);
      return result;
    }
    const completedIds = [...new Set((questProgress?.updates || [])
      .filter(update=>update?.completed)
      .map(update=>String(update.questId || update.id || ""))
      .filter(Boolean))];
    claimedQuests = claimCompletedServerQuests(profile, completedIds.length ? completedIds : null).claimed || [];
    abandonTutorialAfterOutsideQuestAction(profile);
    appendProfileActivity(profile, {
      type:"economy",
      label:"Economie",
      detail:`Action ${action?.kind || "economie"} appliquee.`,
      data:{kind:action?.kind || "", claimed:claimedQuests.length}
    });
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    const tutorialChanged = tutorialBefore !== tutorialSnapshot(next);
    return commitProfileResult({
      ...result,
      questUpdates:questProgress?.updates || [],
      claimedQuests,
      tutorial:next.tutorial,
      tutorialChanged
    }, key, previous, next);
  }
  
  function applyProgressionAction({player, action} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    const previous = cloneProfileSnapshot(profile);
    let result = null;
    if(action?.kind === "skill-upgrade"){
      result = upgradeServerSkill(profile, action.id);
    }else if(action?.kind === "portal-unlock"){
      result = unlockServerPortal(profile, {id:action.id, method:action.method});
    }else if(action?.kind === "prestige"){
      result = performServerPrestige(profile);
    }else{
      result = {ok:false, reason:"Action progression invalide."};
    }
    if(!result.ok){
      restoreProfileSnapshot(profiles, key, previous);
      return result;
    }
    appendProfileActivity(profile, {
      type:"progression",
      label:"Progression",
      detail:`Action ${action?.kind || "progression"} appliquee${action?.id ? ` : ${action.id}` : ""}.`,
      data:{kind:action?.kind || "", id:action?.id || ""}
    });
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    return commitProfileResult(result, key, previous, next);
  }
  
  return {addAmmoPurchase, addItemPurchase, addBoosterPurchase, grantBooster, addShipPurchase, addDronePurchase, addDroneFormationPurchase, addPremiumPackPurchase, addBetaPackPurchase, claimPremiumReward, claimBetaReward, sellInventoryItem, applyEquipmentAction, setActiveShipForPlayer, applyQuestAction, applyEconomyAction, applyProgressionAction};
}
