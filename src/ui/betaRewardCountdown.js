import { getBetaRewardStatus } from "../data/premium.js?v=20261024-beta-clock1";

const activeCountdowns = new WeakMap();

export function formatBetaRewardCountdown(remainingMs){
  const seconds = Math.max(0, Math.ceil(Number(remainingMs) / 1000) || 0);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value=>String(value).padStart(2, "0")).join(":");
}

export function getBetaRewardCountdownView(status, now = Date.now()){
  if(status.completed) return null;
  if(status.canClaim) return {label:"Récompense du jour", value:"Disponible maintenant", waiting:false};
  return {
    label:"Prochaine récompense dans",
    value:formatBetaRewardCountdown(Number(status.nextAvailableAt) - now),
    waiting:true
  };
}

export function renderBetaRewardCountdown(status, now = Date.now()){
  const view = getBetaRewardCountdownView(status, now);
  if(!view) return "";
  return `<div class="sc-beta-countdown ${view.waiting ? "" : "is-ready"}" data-beta-reward-countdown data-beta-reward-waiting="${view.waiting}"><span data-beta-countdown-label>${view.label}</span><strong data-beta-countdown-time role="timer" aria-live="off">${view.value}</strong><span class="sc-beta-schedule">Chaque jour à 08:00 · heure de Paris</span></div>`;
}

/** Refresh text in place; only a newly available reward rebuilds the calendar. */
export function syncBetaRewardCountdown(panel, {
  getProfile = ()=>({}), render = ()=>{}, active = true, now = Date.now,
  getStatus = getBetaRewardStatus,
  setIntervalFn = globalThis.setInterval, clearIntervalFn = globalThis.clearInterval,
  visibilityTarget = panel?.ownerDocument
} = {}){
  if(!panel) return ()=>{};
  activeCountdowns.get(panel)?.();
  const calendar = active && panel.querySelector("[data-beta-reward-calendar]");
  const clock = calendar && calendar.querySelector("[data-beta-reward-countdown]");
  if(!clock) return ()=>{};

  const label = clock.querySelector("[data-beta-countdown-label]");
  const value = clock.querySelector("[data-beta-countdown-time]");
  let intervalId;
  let disposed = false;
  let waiting = clock.getAttribute("data-beta-reward-waiting") === "true";
  function dispose(){
    if(disposed) return;
    disposed = true;
    if(intervalId !== undefined) clearIntervalFn(intervalId);
    visibilityTarget?.removeEventListener("visibilitychange", refresh);
    if(activeCountdowns.get(panel) === dispose) activeCountdowns.delete(panel);
  }
  function refresh(){
    if(disposed) return;
    const instant = now();
    const status = getStatus(getProfile(), instant);
    const view = getBetaRewardCountdownView(status, instant);
    if(!view){dispose();return;}
    if(label) label.textContent = view.label;
    if(value) value.textContent = view.value;
    if(waiting === true && !view.waiting){
      dispose();
      render();
      return;
    }
    waiting = view.waiting;
  }
  activeCountdowns.set(panel, dispose);
  refresh();
  if(!disposed && waiting){
    intervalId = setIntervalFn(refresh, 1000);
    visibilityTarget?.addEventListener("visibilitychange", refresh);
  }
  return dispose;
}
