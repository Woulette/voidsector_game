import { getFirmDefinition, getFirmMapId, getFirmMapName } from "../../../src/data/firms.js";
import { TUTORIAL_ROCKET_TRAINING_AMOUNT, getTutorialQuestIds } from "../../../src/shared/tutorial.js";
import { getServerItem } from "../economy/equipment.js";
import { getInventoryEntryQuantity } from "../economy/inventoryStacks.js";
import { getQuest, getQuestObjectives, getQuestObjectiveProgress } from "../quests/questState.js";
import { getTutorialRocketTrainingSlots } from "./tutorialRocketTraining.js";

function inventoryItem(profile, uid){
  const entry = profile.inventoryItems?.find(item=>item.uid === uid);
  return entry ? getServerItem(entry.itemId) : null;
}

function shipLoadout(profile, shipId){
  return profile.shipLoadouts?.[shipId] || {};
}

function hasRepairDrone(profile, shipId){
  return (shipLoadout(profile, shipId).extras || [])
    .some(uid=>Boolean(inventoryItem(profile, uid)?.effect?.repairBot));
}

function emptyShipLoadout(profile, shipId){
  const loadout = shipLoadout(profile, shipId);
  return ![...(loadout.lasers || []), loadout.missileLauncher, loadout.rocketLauncher,
    ...(loadout.generators || []), ...(loadout.extras || [])].some(Boolean);
}

function readyStarterShip(profile){
  const shipId = profile.activeShip;
  return profile.ownedShips?.includes(shipId)
    && (shipLoadout(profile, shipId).lasers || [])
      .some(uid=>inventoryItem(profile, uid)?.category === "canon")
    && hasRepairDrone(profile, shipId);
}

function readyVelox(profile){
  const loadout = shipLoadout(profile, "velox");
  const laserUids = [...new Set((loadout.lasers || []).filter(Boolean))];
  return profile.ownedShips?.includes("velox")
    && profile.activeShip === "velox"
    && laserUids.filter(uid=>inventoryItem(profile, uid)?.category === "canon").length >= 3
    && hasRepairDrone(profile, "velox")
    && inventoryItem(profile, loadout.rocketLauncher)?.slotType === "rocketLauncher";
}

function isAliveOnMap(player, mapId, shipId){
  return Boolean(player?.state && player.connected !== false
    && Number(player.state.hp) > 0
    && (!shipId || !player.state.shipId || player.state.shipId === shipId)
    && String(player.state.mapId ?? player.mapId ?? "") === String(mapId));
}

function isAtHome(profile, player){
  const firm = getFirmDefinition(profile.player?.firmId);
  if(!isAliveOnMap(player, getFirmMapId(firm.id, 1))) return false;
  const x = Number(player.state.x);
  const y = Number(player.state.y);
  return Number.isFinite(x) && Number.isFinite(y)
    && Math.hypot(x - firm.spawn.x, y - firm.spawn.y) <= 520;
}

function hasCompletedTutorialMapVisit(profile,yellowQuest){
  if(profile.completedQuestClaims?.[yellowQuest]) return true;
  if(!profile.activeQuestIds?.includes(yellowQuest)) return false;
  const quest = getQuest(yellowQuest);
  return getQuestObjectives(quest).some((objective,index)=>objective.type === "visit_map"
    && objective.map === getFirmMapName(profile.player?.firmId,2)
    && getQuestObjectiveProgress(profile,yellowQuest,objective,index) >= Number(objective.count || 1));
}

export function validateTutorialStep(profile, step, {player} = {}){
  const [passQuest, storageQuest, raiderQuest, yellowQuest] = getTutorialQuestIds(profile.player?.firmId);
  const completed = id=>Boolean(profile.completedQuestClaims?.[id]);
  const started = id=>completed(id) || profile.activeQuestIds?.includes(id);
  let valid = true;
  let reason = "Realise d'abord l'objectif indique par le tutoriel.";

  switch(step){
    case "launcher_depart":
      valid = readyStarterShip(profile);
      reason = "Equipe au moins un canon et un drone de reparation sur ton vaisseau actif avant de partir.";
      if(valid){
        valid = isAliveOnMap(player, getFirmMapId(profile.player?.firmId, 1), profile.activeShip);
        reason = "Rejoins en vie la carte 1 de ta firme pour commencer le tutoriel en vol.";
      }
      break;
    case "game_accept_pass": valid = started(passQuest); break;
    case "game_hunt_pass": valid = completed(passQuest); break;
    case "game_accept_storage": valid = started(storageQuest); break;
    case "game_accept_raiders": valid = started(raiderQuest); break;
    case "game_buy_rockets":
      valid = profile.tutorial?.rocketTrainingPurchased === TUTORIAL_ROCKET_TRAINING_AMOUNT;
      reason = "Achete le lot de 100 roquettes R-1 dans le magasin de combat pour poursuivre.";
      break;
    case "game_bind_laser":
      valid = profile.tutorial?.rocketTrainingPurchased === TUTORIAL_ROCKET_TRAINING_AMOUNT
        && profile.activeShip === "velox" && getTutorialRocketTrainingSlots(profile)[0] === "ammo_x1"
        && Number(profile.ammoInventory?.ammo_x1 || 0) > 0;
      reason = Number(profile.ammoInventory?.ammo_x1 || 0) > 0
        ? "Glisse la munition laser M-1 dans l'emplacement 1 du Velox puis attends sa synchronisation."
        : "Ton stock M-1 est vide : achete des munitions M-1 au magasin de combat avant de les assigner.";
      break;
    case "game_bind_rockets": {
      const slots = getTutorialRocketTrainingSlots(profile);
      valid = profile.tutorial?.rocketTrainingPurchased === TUTORIAL_ROCKET_TRAINING_AMOUNT
        && profile.activeShip === "velox" && slots[0] === "ammo_x1" && slots[1] === "rocket_r1"
        && Number(profile.ammoInventory?.ammo_x1 || 0) > 0 && Number(profile.ammoInventory?.rocket_r1 || 0) > 0;
      reason = Number(profile.ammoInventory?.rocket_r1 || 0) > 0
        ? "Glisse les roquettes R-1 dans l'emplacement 2 du Velox, en conservant M-1 dans le premier."
        : "Ton stock R-1 est vide : achete des roquettes R-1 au magasin de combat avant de les assigner.";
      break;
    }
    case "game_hunt_raiders": valid = completed(raiderQuest); break;
    case "game_accept_yellow": valid = started(yellowQuest); break;
    case "game_hunt_yellow": valid = completed(yellowQuest); break;
    case "game_tutorial_complete": valid = [passQuest, storageQuest, raiderQuest, yellowQuest].every(completed); break;
    case "launcher_buy_velox": valid = profile.ownedShips?.includes("velox"); break;
    case "launcher_buy_laser":
      valid = (profile.inventoryItems || []).filter(item=>item.itemId === "laser_mk1")
        .reduce((sum, item)=>sum + getInventoryEntryQuantity(item), 0) >= 2;
      break;
    case "launcher_unequip_orion": valid = emptyShipLoadout(profile, "orion"); break;
    case "launcher_equip_velox": valid = profile.ownedShips?.includes("velox") && profile.activeShip === "velox"; break;
    case "launcher_equip_three_lasers":
      valid = readyVelox(profile);
      reason = "Equipe le Velox actif avec trois canons distincts, un drone de reparation et un lance-roquette.";
      break;
    case "launcher_depart_velox":
      valid = readyVelox(profile);
      reason = "Equipe le Velox actif avec trois canons distincts, un drone de reparation et un lance-roquette avant de partir.";
      if(valid){
        valid = isAliveOnMap(player, getFirmMapId(profile.player?.firmId, 1), "velox");
        reason = "Rejoins en vie la carte 1 de ta firme avec ton Velox pour poursuivre le tutoriel en vol.";
      }
      break;
    case "launcher_launch_storage_upgrade":
      valid = completed(storageQuest);
      break;
    case "game_reach_map_2":
      valid = hasCompletedTutorialMapVisit(profile,yellowQuest) || isAliveOnMap(player, getFirmMapId(profile.player?.firmId, 2));
      reason = "Rejoins la deuxieme carte de ta firme avant de continuer.";
      break;
    case "game_return_hq_1":
    case "game_return_hq_2":
      valid = isAtHome(profile, player);
      reason = "Rejoins le quartier general de ta firme avant de continuer.";
      break;
    case "game_use_repair_drone": {
      const state = player?.state;
      valid = isAliveOnMap(player, state?.mapId)
        && hasRepairDrone(profile, profile.activeShip)
        && (state.repairBotActive === true
          || (Number(state.maxHp) > 0 && Number(state.hp) >= Number(state.maxHp)));
      reason = "Equipe et active ton drone de reparation, ou continue si ta coque est deja reparee.";
      break;
    }
  }
  return valid ? {ok:true} : {ok:false, code:"TUTORIAL_OBJECTIVE_PENDING", reason};
}
