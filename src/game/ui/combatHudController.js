import { fmt } from "../../core/utils.js";
import { PORTAL_WAVE_TOTAL } from "../combatData.js";
import { updateCombatMeter, updateLootPopup as renderLootPopup, updateSafeZoneNotice, updateTargetPanel } from "./hud.js";

export function createCombatHudController({
  store,
  rewards,
  combatMetricModes,
  getPlayer,
  getGameMode,
  getActivePortal,
  getCurrentMap,
  getPortalWave,
  getPortalDelay,
  getPortalCompleted,
  getCombatCargoExpanded,
  getCurrentRank,
  getRankAssetPath,
  getShipCargoUsed,
  getShipCargoCapacity,
  getSafeArea,
  isPlayerOutsideMap,
  isRepairBotReady,
  validSelectedEnemy
}){
  function renderRadiationNotice(){
    const player = getPlayer();
    if(getGameMode() !== "open" || !isPlayerOutsideMap()) return;
    const notice = document.getElementById("safeZoneNotice");
    if(!notice) return;
    notice.classList.remove("hidden");
    notice.classList.add("is-radiation");
    const title = notice.querySelector("strong");
    const text = notice.querySelector("span");
    if(title) title.textContent = "ZONE IRRADIÉE";
    if(text) text.textContent = `Votre vaisseau sera détruit dans ${Math.ceil(player.radiationTimer ?? 30)}s si vous ne rejoignez pas la zone non irradiée.`;
  }

  function updateHud(){
    const player = getPlayer();
    const enemy = validSelectedEnemy();
    const rank = getCurrentRank();
    const repairState = isRepairBotReady();
    const safeArea = getSafeArea();
    const gameMode = getGameMode();
    const currentMap = getCurrentMap();
    const currentMapLabel = currentMap.displayName || currentMap.name;
    const portalWave = getPortalWave();
    const portalCompleted = getPortalCompleted();
    const safeLabel = safeArea ? ((player.safeZoneLock || 0) <= 0 ? ` · SAFE ${safeArea.type === "portal" ? "PORTAIL" : "SPAWN"}` : ` · SAFE DANS ${Math.ceil(player.safeZoneLock || 0)}S`) : "";
    document.getElementById("gameZoneName").textContent = gameMode === "portal" ? `PORTAIL : ${getActivePortal()?.name || currentMapLabel}${portalWave ? ` · VAGUE ${Math.min(portalWave, PORTAL_WAVE_TOTAL)}/${PORTAL_WAVE_TOTAL}` : " · PRÉPARATION"}` : `ZONE : ${currentMapLabel}${safeLabel}`;
    const portalTimerHud = document.getElementById("portalTimerHud");
    if(portalTimerHud){
      const showPortalTimer = gameMode === "portal" && !portalCompleted && portalWave < PORTAL_WAVE_TOTAL;
      portalTimerHud.classList.toggle("hidden", !showPortalTimer);
      portalTimerHud.querySelector("strong").textContent = Math.max(0, Math.ceil(getPortalDelay() || 0));
      portalTimerHud.querySelector("span").textContent = portalWave <= 0 ? "Premieres vagues" : "Vague suivante";
    }
    document.getElementById("gamePlayerName").textContent = store.state.player.name || "PILOTE";
    document.getElementById("gameRankHud").innerHTML = `<img class="rank-icon" src="${getRankAssetPath(rank)}" alt="${rank.name}"><span>${rank.name}</span>`;
    document.getElementById("gameLevel").textContent = store.state.player.level;
    updateCombatMeter({metric:"hp", value:player.hp, max:player.maxHp, label:"la vie", mode:combatMetricModes.hp});
    updateCombatMeter({metric:"shield", value:player.shield, max:player.maxShield, label:"le bouclier", mode:combatMetricModes.shield});
    updateCombatMeter({metric:"xp", value:store.state.player.xp, max:store.state.player.xpNext, label:"l'expérience", mode:combatMetricModes.xp});
    document.getElementById("gameSpeed").textContent = player.displayedSpeed;
    const cargoUsed = getShipCargoUsed(store.state.activeShip);
    const cargoCapacity = getShipCargoCapacity(store.state.activeShip);
    const cargoPercent = cargoCapacity > 0 ? Math.max(0, Math.min(100, cargoUsed / cargoCapacity * 100)) : 0;
    const cargoToggle = document.getElementById("gameCargoToggle");
    const cargoValue = document.getElementById("gameCargoValue");
    const cargoFill = document.getElementById("gameCargoFill");
    if(cargoValue) cargoValue.textContent = `${fmt(cargoUsed)} / ${fmt(cargoCapacity)}`;
    if(cargoFill) cargoFill.style.width = `${cargoPercent}%`;
    if(cargoToggle){
      cargoToggle.classList.toggle("expanded", getCombatCargoExpanded());
      cargoToggle.classList.toggle("full", cargoCapacity > 0 && cargoUsed >= cargoCapacity);
      cargoToggle.title = `Soute : ${fmt(cargoUsed)} / ${fmt(cargoCapacity)}`;
    }
    document.getElementById("gameRepairHud").textContent = !player.extraBonus?.repairBot ? "Drone réparation : non équipé" : player.repairBotActive ? "Drone réparation : actif" : repairState.ok ? (player.extraBonus?.repairBotAuto ? "Drone réparation : prêt (auto)" : "Drone réparation : prêt") : `Drone réparation : ${repairState.reason}`;
    document.getElementById("gameCreditsHud").textContent = fmt(store.state.player.credits);
    document.getElementById("gamePremiumHud").textContent = fmt(store.state.player.premium);
    updateSafeZoneNotice({safeArea, isActive:gameMode === "open" && safeArea && (player.safeZoneLock || 0) <= 0});
    renderRadiationNotice();
    updateTargetPanel(enemy);
  }

  function updateLootPopup(){
    renderLootPopup({notices:rewards.getLootNotices()});
  }

  return {updateHud, renderRadiationNotice, updateLootPopup};
}
