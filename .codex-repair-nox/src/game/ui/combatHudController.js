import { fmt } from "../../core/utils.js";
import { getVesperObjectiveHud, isVesperPortal } from "../../data/vesperPortal.js?v=20260726-kharon1";
import { getKharonWaveHud, isKharonPortal } from "../../data/kharonPortal.js?v=20260726-kharon1";
import { getIonisWaveHud, isIonisPortal } from "../../data/ionisPortal.js?v=20260726-portals2530-1";
import { getEclaniteObjectiveHud, isEclanitePortal } from "../../data/eclanitePortal.js?v=20260726-portals2530-1";
import { PORTAL_WAVE_TOTAL } from "../combatData.js";
import { updateCombatMeter, updateLootPopup as renderLootPopup, updateSafeZoneNotice, updateTargetPanel } from "./hud.js";

export function portalUsesWaveHud({gameMode, currentMap} = {}){
  return gameMode === "portal" && !currentMap?.rickyPortal && !currentMap?.vesperPortal && !currentMap?.eclanitePortal;
}

export function formatPortalTimer(remainingMs){
  const totalSeconds = Math.max(0, Math.ceil(Number(remainingMs || 0) / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export function createCombatHudController({
  store,
  rewards,
  combatMetricModes,
  getPlayer,
  getGameMode,
  getActivePortal,
  getCurrentMap,
  getPortalWave,
  getPortalWaveTotal,
  getPortalDelay,
  getPortalWaitingForClear,
  getPortalWaveState = ()=>"",
  getPortalCompleted,
  getPortalObjective = ()=>null,
  getPortalLives = ()=>3,
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
    const portalWaveTotal = Math.max(1, Number(getPortalWaveTotal?.() || PORTAL_WAVE_TOTAL));
    const portalWaitingForClear = Boolean(getPortalWaitingForClear?.());
    const portalCompleted = getPortalCompleted();
    const showPortalWaves = portalUsesWaveHud({gameMode, currentMap});
    const isVesperEncounter = gameMode === "portal" && isVesperPortal(getActivePortal());
    const isKharonEncounter = gameMode === "portal" && isKharonPortal(getActivePortal());
    const isIonisEncounter = gameMode === "portal" && isIonisPortal(getActivePortal());
    const isEclaniteEncounter = gameMode === "portal" && isEclanitePortal(getActivePortal());
    const kharonHud = isKharonEncounter
      ? getKharonWaveHud({
          wave:portalWave,
          waveTotal:portalWaveTotal,
          waveState:getPortalWaveState(),
          waitingForClear:portalWaitingForClear,
          nextWaveDelay:getPortalDelay(),
          completed:portalCompleted,
          lives:getPortalLives(),
          objective:getPortalObjective()
        })
      : null;
    const ionisHud = isIonisEncounter
      ? getIonisWaveHud({
          wave:portalWave,
          waveTotal:portalWaveTotal,
          waveState:getPortalWaveState(),
          waitingForClear:portalWaitingForClear,
          nextWaveDelay:getPortalDelay(),
          completed:portalCompleted,
          lives:getPortalLives()
        })
      : null;
    const eclaniteHud = isEclaniteEncounter
      ? getEclaniteObjectiveHud(
          portalCompleted
            ? {...(getPortalObjective() || {}), kind:"eclanite", phase:"complete"}
            : getPortalObjective(),
          getPortalLives(),
          Date.now()
        )
      : null;
    const safeAreaLabel = safeArea?.type === "portal" ? "PORTAIL" : safeArea?.type === "relay" ? "RELAIS" : "SPAWN";
    const safeLabel = safeArea ? ((player.safeZoneLock || 0) <= 0 ? ` · SAFE ${safeAreaLabel}` : ` · SAFE DANS ${Math.ceil(player.safeZoneLock || 0)}S`) : "";
    const portalWaveLabel = showPortalWaves
      ? (portalWave
          ? isKharonEncounter
            ? ` · ${kharonHud.phase.label} · VAGUE ${Math.min(portalWave, portalWaveTotal)}/${portalWaveTotal}`
            : isIonisEncounter
              ? ` · GROUPE ${ionisHud.group.group}/${ionisHud.group.groupTotal} · VAGUE ${Math.min(portalWave, portalWaveTotal)}/${portalWaveTotal}`
              : ` · VAGUE ${Math.min(portalWave, portalWaveTotal)}/${portalWaveTotal}`
          : " · PRÉPARATION")
      : "";
    document.getElementById("gameZoneName").textContent = gameMode === "portal"
      ? `PORTAIL : ${getActivePortal()?.name || currentMapLabel}${portalWaveLabel}`
      : `ZONE : ${currentMapLabel}${safeLabel}`;
    const portalTimerHud = document.getElementById("portalTimerHud");
    if(portalTimerHud){
      const showEclaniteTimer = isEclaniteEncounter && !portalCompleted && !eclaniteHud?.completed;
      const showPortalTimer = showEclaniteTimer || (showPortalWaves && !portalCompleted && portalWave < portalWaveTotal);
      portalTimerHud.classList.toggle("hidden", !showPortalTimer);
      portalTimerHud.classList.toggle("is-eclanite", isEclaniteEncounter);
      portalTimerHud.classList.toggle("is-urgent", showEclaniteTimer && Number(eclaniteHud?.remainingMs || 0) <= 30_000);
      portalTimerHud.querySelector("strong").textContent = showEclaniteTimer
        ? formatPortalTimer(eclaniteHud.remainingMs)
        : portalWaitingForClear
          ? "—"
          : Math.max(0, Math.ceil(getPortalDelay() || 0));
      portalTimerHud.querySelector("span").textContent = showEclaniteTimer
        ? `ZONE ${eclaniteHud.zone}/3 · ${eclaniteHud.phase === "core" ? "NOYAU x5" : eclaniteHud.phase === "boss" ? "BOSS" : "GARDIENS"}`
        : portalWaitingForClear
          ? "Éliminez tous les ennemis"
          : isKharonEncounter && kharonHud?.phase?.boss
            ? `${kharonHud.phase.bossName} en approche`
            : isIonisEncounter
              ? (portalWave <= 0 ? "Premier groupe" : "Prochain renfort")
              : (portalWave <= 0 ? "Première vague" : "Vague suivante");
    }
    const portalObjectiveHud = document.getElementById("portalObjectiveHud");
    if(portalObjectiveHud){
      portalObjectiveHud.classList.toggle("hidden", !isVesperEncounter && !isKharonEncounter && !isIonisEncounter && !isEclaniteEncounter);
      portalObjectiveHud.classList.toggle("is-eclanite", isEclaniteEncounter);
      portalObjectiveHud.classList.toggle("is-eclanite-core", isEclaniteEncounter && eclaniteHud?.phase === "core");
      if(isVesperEncounter){
        const objectiveHud = getVesperObjectiveHud(getPortalObjective(), getPortalLives());
        const label = portalObjectiveHud.querySelector(".portal-objective-hud-head span");
        const title = portalObjectiveHud.querySelector("[data-vesper-objective-title]");
        const detail = portalObjectiveHud.querySelector("[data-vesper-objective-detail]");
        const lives = portalObjectiveHud.querySelector("[data-vesper-lives]");
        const progress = portalObjectiveHud.querySelector("[data-vesper-objective-progress]");
        if(label) label.textContent = "OBJECTIF VESPER";
        if(title) title.textContent = objectiveHud.title;
        if(detail) detail.textContent = objectiveHud.detail;
        if(lives) lives.textContent = `${objectiveHud.lives}/3 VIES`;
        if(progress) progress.style.width = `${Math.round(objectiveHud.progress * 100)}%`;
        portalObjectiveHud.classList.toggle("is-boss", objectiveHud.title.includes("DRONE GÉANT"));
        portalObjectiveHud.classList.toggle("is-complete", objectiveHud.progress >= 1 && objectiveHud.title.includes("SÉCURISÉE"));
        portalObjectiveHud.classList.toggle("is-elite", false);
      }else if(isKharonEncounter){
        const label = portalObjectiveHud.querySelector(".portal-objective-hud-head span");
        const title = portalObjectiveHud.querySelector("[data-vesper-objective-title]");
        const detail = portalObjectiveHud.querySelector("[data-vesper-objective-detail]");
        const lives = portalObjectiveHud.querySelector("[data-vesper-lives]");
        const progress = portalObjectiveHud.querySelector("[data-vesper-objective-progress]");
        if(label) label.textContent = "FORGE DE KHARON";
        if(title) title.textContent = kharonHud.title;
        if(detail) detail.textContent = kharonHud.detail;
        if(lives) lives.textContent = `${kharonHud.lives}/3 VIES`;
        if(progress) progress.style.width = `${Math.round(kharonHud.progress * 100)}%`;
        portalObjectiveHud.classList.toggle("is-boss", kharonHud.phase.boss || kharonHud.bombActive);
        portalObjectiveHud.classList.toggle("is-complete", kharonHud.progress >= 1);
        portalObjectiveHud.classList.toggle("is-elite", false);
      }else if(isIonisEncounter){
        const label = portalObjectiveHud.querySelector(".portal-objective-hud-head span");
        const title = portalObjectiveHud.querySelector("[data-vesper-objective-title]");
        const detail = portalObjectiveHud.querySelector("[data-vesper-objective-detail]");
        const lives = portalObjectiveHud.querySelector("[data-vesper-lives]");
        const progress = portalObjectiveHud.querySelector("[data-vesper-objective-progress]");
        if(label) label.textContent = "TEMPÊTE D’IONIS";
        if(title) title.textContent = ionisHud.title;
        if(detail) detail.textContent = ionisHud.detail;
        if(lives) lives.textContent = `${ionisHud.lives}/3 VIES`;
        if(progress) progress.style.width = `${Math.round(ionisHud.progress * 100)}%`;
        portalObjectiveHud.classList.toggle("is-boss", false);
        portalObjectiveHud.classList.toggle("is-complete", ionisHud.completed);
        portalObjectiveHud.classList.toggle("is-elite", ionisHud.finalEliteAssault && !ionisHud.completed);
      }else if(isEclaniteEncounter){
        const label = portalObjectiveHud.querySelector(".portal-objective-hud-head span");
        const title = portalObjectiveHud.querySelector("[data-vesper-objective-title]");
        const detail = portalObjectiveHud.querySelector("[data-vesper-objective-detail]");
        const lives = portalObjectiveHud.querySelector("[data-vesper-lives]");
        const progress = portalObjectiveHud.querySelector("[data-vesper-objective-progress]");
        if(label) label.textContent = `RUCHE D'ECLANITE · ZONE ${eclaniteHud.zone}/3`;
        if(title) title.textContent = eclaniteHud.title;
        if(detail) detail.textContent = eclaniteHud.detail;
        if(lives) lives.textContent = `${eclaniteHud.lives}/3 VIES`;
        if(progress) progress.style.width = `${Math.round(eclaniteHud.progress * 100)}%`;
        portalObjectiveHud.classList.toggle("is-boss", eclaniteHud.isBoss);
        portalObjectiveHud.classList.toggle("is-complete", eclaniteHud.completed);
        portalObjectiveHud.classList.toggle("is-elite", false);
      }
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
