const DEFAULT_SLOW_FRAME_MS = 12;
const MAX_FRAMES = 120;
const MAX_SLOW_FRAMES = 40;
const MAX_HIT_FRAMES = 80;
const OVERLAY_REFRESH_MS = 180;
const FLAG_NAMES = new Set([
  "hideDamageTexts",
  "hideEnemyAttackVisuals",
  "hideParticles"
]);

const profiler = {
  initialized:false,
  enabled:false,
  current:null,
  frames:[],
  slowFrames:[],
  hitFrames:[],
  pendingCounters:Object.create(null),
  flags:{
    hideDamageTexts:false,
    hideEnemyAttackVisuals:false,
    hideParticles:false
  },
  options:{
    slowFrameMs:DEFAULT_SLOW_FRAME_MS,
    overlay:true
  },
  overlay:null,
  overlayBody:null,
  lastOverlayAt:0
};

function now(){
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function hasWindow(){
  return typeof window !== "undefined";
}

function hasDocument(){
  return typeof document !== "undefined";
}

function queryEnablesProfiler(){
  if(!hasWindow()) return false;
  try{
    const params = new URLSearchParams(window.location.search || "");
    return params.has("combatProfiler") || params.has("perfTrace");
  }catch{
    return false;
  }
}

function storageEnablesProfiler(){
  if(!hasWindow()) return false;
  try{
    return window.localStorage?.getItem("voidsector:combat-profiler") === "1";
  }catch{
    return false;
  }
}

function cloneCounters(counters = {}){
  return Object.fromEntries(Object.entries(counters).map(([key, value])=>[key, Number(value || 0)]));
}

function addToMap(target, key, value){
  const amount = Number(value || 0);
  if(!Number.isFinite(amount) || amount === 0) return;
  target[key] = Number(target[key] || 0) + amount;
}

function sortedEntries(object = {}, limit = 8){
  return Object.entries(object)
    .filter(([, value])=>Number(value || 0) > 0)
    .sort((left, right)=>Number(right[1] || 0) - Number(left[1] || 0))
    .slice(0, limit);
}

function createOverlay(){
  if(!hasDocument() || profiler.overlay || profiler.options.overlay === false) return;
  const overlay = document.createElement("div");
  overlay.id = "combatFrameProfiler";
  overlay.style.cssText = [
    "position:fixed",
    "left:12px",
    "top:84px",
    "z-index:99999",
    "width:310px",
    "max-height:52vh",
    "overflow:hidden",
    "pointer-events:none",
    "background:rgba(2,6,23,.88)",
    "border:1px solid rgba(125,211,252,.55)",
    "box-shadow:0 0 18px rgba(14,165,233,.18)",
    "color:#dbeafe",
    "font:11px/1.35 Consolas, monospace",
    "padding:8px",
    "white-space:pre-wrap"
  ].join(";");
  const title = document.createElement("div");
  title.textContent = "COMBAT PROFILER";
  title.style.cssText = "color:#facc15;font-weight:700;margin-bottom:5px;letter-spacing:.06em;";
  const body = document.createElement("div");
  overlay.append(title, body);
  document.body.appendChild(overlay);
  profiler.overlay = overlay;
  profiler.overlayBody = body;
}

function removeOverlay(){
  profiler.overlay?.remove();
  profiler.overlay = null;
  profiler.overlayBody = null;
}

function averageFrameMs(){
  const frames = profiler.frames.slice(-45);
  if(!frames.length) return 0;
  return frames.reduce((sum, frame)=>sum + Number(frame.frameMs || 0), 0) / frames.length;
}

function maxFrameMs(){
  return profiler.frames.slice(-45).reduce((max, frame)=>Math.max(max, Number(frame.frameMs || 0)), 0);
}

function formatEntries(entries, suffix = ""){
  if(!entries.length) return "  aucun";
  return entries.map(([key, value])=>`  ${key}: ${Number(value || 0).toFixed(suffix ? 2 : 0)}${suffix}`).join("\n");
}

function latestDiagnosticFrame(frame){
  const candidates = [frame, profiler.slowFrames.at(-1), profiler.hitFrames.at(-1)].filter(Boolean);
  return candidates.reduce((latest, candidate)=>Number(candidate.at || 0) > Number(latest.at || 0) ? candidate : latest, candidates[0] || frame);
}

function renderOverlay(frame){
  if(!profiler.enabled || profiler.options.overlay === false) return;
  createOverlay();
  if(!profiler.overlayBody) return;
  const t = now();
  if(t - profiler.lastOverlayAt < OVERLAY_REFRESH_MS && Number(frame?.frameMs || 0) < Number(profiler.options.slowFrameMs || DEFAULT_SLOW_FRAME_MS)) return;
  profiler.lastOverlayAt = t;
  const frameSource = latestDiagnosticFrame(frame);
  const timings = sortedEntries(frameSource?.timings || {}, 9);
  const counters = sortedEntries(frameSource?.counters || {}, 10);
  const flags = Object.entries(profiler.flags)
    .filter(([, value])=>Boolean(value))
    .map(([key])=>key)
    .join(", ") || "aucun";
  profiler.overlayBody.textContent = [
    `frame ${Number(frame?.frameMs || 0).toFixed(2)} ms | avg ${averageFrameMs().toFixed(2)} | max ${maxFrameMs().toFixed(2)}`,
    `slow >= ${Number(profiler.options.slowFrameMs || DEFAULT_SLOW_FRAME_MS).toFixed(0)} ms | count ${profiler.slowFrames.length} | hits ${profiler.hitFrames.length}`,
    `queues/events:`,
    formatEntries(counters),
    `timings:`,
    formatEntries(timings, " ms"),
    `flags: ${flags}`
  ].join("\n");
}

function isCombatHitFrame(frame){
  const counters = frame?.counters || {};
  return Number(counters["events.playerDamage.processed"] || 0) > 0
    || Number(counters["events.playerDamage.queued"] || 0) > 0
    || Number(counters["events.enemyAttack.processed"] || 0) > 0
    || Number(counters["events.enemyAttack.queued"] || 0) > 0
    || Number(counters["socket.playerDamage"] || 0) > 0
    || Number(counters["socket.enemyAttack"] || 0) > 0
    || Number(counters["socket.playerStateCorrection"] || 0) > 0
    || Number(counters["sync.player.correction"] || 0) > 0
    || Number(counters["sync.player.maxCorrectionPx"] || 0) > 0;
}

function pushFrame(frame){
  profiler.frames.push(frame);
  if(profiler.frames.length > MAX_FRAMES) profiler.frames.splice(0, profiler.frames.length - MAX_FRAMES);
  if(isCombatHitFrame(frame)){
    profiler.hitFrames.push(frame);
    if(profiler.hitFrames.length > MAX_HIT_FRAMES) profiler.hitFrames.splice(0, profiler.hitFrames.length - MAX_HIT_FRAMES);
  }
  if(Number(frame.frameMs || 0) >= Number(profiler.options.slowFrameMs || DEFAULT_SLOW_FRAME_MS)){
    profiler.slowFrames.push(frame);
    if(profiler.slowFrames.length > MAX_SLOW_FRAMES) profiler.slowFrames.splice(0, profiler.slowFrames.length - MAX_SLOW_FRAMES);
    if(hasWindow()) console.info("[VoidSector combat profiler] slow frame", frame);
  }
}

function installWindowApi(){
  if(!hasWindow() || window.__voidsectorCombatProfiler?.__voidsectorProfilerApi) return;
  window.__voidsectorCombatProfiler = {
    __voidsectorProfilerApi:true,
    enable:enableCombatFrameProfiler,
    disable:disableCombatFrameProfiler,
    clear:clearCombatFrameProfiler,
    snapshot:getCombatProfilerSnapshot,
    dump(){
      const snapshot = getCombatProfilerSnapshot();
      console.info("[VoidSector combat profiler] snapshot", snapshot);
      return snapshot;
    },
    setThreshold(ms){
      profiler.options.slowFrameMs = Math.max(1, Number(ms || DEFAULT_SLOW_FRAME_MS));
      return profiler.options.slowFrameMs;
    },
    setFlag:setCombatProfilerFlag,
    flags:profiler.flags
  };
}

export function initializeCombatFrameProfiler(){
  if(profiler.initialized) return profiler.enabled;
  profiler.initialized = true;
  profiler.enabled = queryEnablesProfiler() || storageEnablesProfiler();
  installWindowApi();
  if(profiler.enabled) createOverlay();
  return profiler.enabled;
}

export function enableCombatFrameProfiler(options = {}){
  initializeCombatFrameProfiler();
  profiler.enabled = true;
  if(Number.isFinite(Number(options.slowFrameMs))) profiler.options.slowFrameMs = Math.max(1, Number(options.slowFrameMs));
  if(options.overlay === false) profiler.options.overlay = false;
  else profiler.options.overlay = true;
  if(hasWindow()){
    try{ window.localStorage?.setItem("voidsector:combat-profiler", "1"); }catch{}
  }
  createOverlay();
  return getCombatProfilerSnapshot();
}

export function disableCombatFrameProfiler(){
  initializeCombatFrameProfiler();
  profiler.enabled = false;
  profiler.current = null;
  if(hasWindow()){
    try{ window.localStorage?.removeItem("voidsector:combat-profiler"); }catch{}
  }
  removeOverlay();
  return getCombatProfilerSnapshot();
}

export function clearCombatFrameProfiler(){
  profiler.frames = [];
  profiler.slowFrames = [];
  profiler.hitFrames = [];
  profiler.pendingCounters = Object.create(null);
  profiler.current = null;
}

export function isCombatFrameProfilerEnabled(){
  initializeCombatFrameProfiler();
  return profiler.enabled;
}

export function beginCombatProfilerFrame({dt = 0, drawFrame = true} = {}){
  initializeCombatFrameProfiler();
  if(!profiler.enabled) return null;
  profiler.current = {
    startedAt:now(),
    dt:Number(dt || 0),
    drawFrame:Boolean(drawFrame),
    timings:Object.create(null),
    counters:cloneCounters(profiler.pendingCounters)
  };
  profiler.pendingCounters = Object.create(null);
  return profiler.current;
}

export function finishCombatProfilerFrame({frameMs} = {}){
  if(!profiler.enabled || !profiler.current) return null;
  const current = profiler.current;
  const measuredFrameMs = Number.isFinite(Number(frameMs))
    ? Number(frameMs)
    : now() - Number(current.startedAt || now());
  const frame = {
    at:Date.now(),
    dt:current.dt,
    drawFrame:current.drawFrame,
    frameMs:measuredFrameMs,
    timings:cloneCounters(current.timings),
    counters:cloneCounters(current.counters)
  };
  profiler.current = null;
  pushFrame(frame);
  renderOverlay(frame);
  return frame;
}

export function timeCombatProfiler(label, fn){
  initializeCombatFrameProfiler();
  if(!profiler.enabled || typeof fn !== "function") return typeof fn === "function" ? fn() : undefined;
  const started = now();
  try{
    return fn();
  }finally{
    recordCombatProfilerTiming(label, now() - started);
  }
}

export function recordCombatProfilerTiming(label, durationMs){
  if(!profiler.enabled || !label) return;
  const target = profiler.current?.timings || profiler.pendingCounters;
  addToMap(target, String(label), Number(durationMs || 0));
}

export function countCombatProfiler(label, amount = 1){
  initializeCombatFrameProfiler();
  if(!profiler.enabled || !label) return;
  const target = profiler.current?.counters || profiler.pendingCounters;
  addToMap(target, String(label), amount);
}

export function setCombatProfilerMetric(label, value){
  initializeCombatFrameProfiler();
  if(!profiler.enabled || !label) return;
  const target = profiler.current?.counters || profiler.pendingCounters;
  target[String(label)] = Number(value || 0);
}

export function maxCombatProfilerMetric(label, value){
  initializeCombatFrameProfiler();
  if(!profiler.enabled || !label) return;
  const amount = Number(value || 0);
  if(!Number.isFinite(amount)) return;
  const target = profiler.current?.counters || profiler.pendingCounters;
  const key = String(label);
  target[key] = Math.max(Number(target[key] || 0), amount);
}

export function setCombatProfilerFlag(name, enabled = true){
  initializeCombatFrameProfiler();
  const key = String(name || "");
  if(!FLAG_NAMES.has(key)) return {...profiler.flags};
  profiler.flags[key] = Boolean(enabled);
  return {...profiler.flags};
}

export function isCombatProfilerFlagEnabled(name){
  initializeCombatFrameProfiler();
  return profiler.enabled && Boolean(profiler.flags[String(name || "")]);
}

export function getCombatProfilerSnapshot(){
  initializeCombatFrameProfiler();
  return {
    enabled:profiler.enabled,
    options:{...profiler.options},
    flags:{...profiler.flags},
    frames:profiler.frames.map(frame=>({
      ...frame,
      timings:{...frame.timings},
      counters:{...frame.counters}
    })),
    slowFrames:profiler.slowFrames.map(frame=>({
      ...frame,
      timings:{...frame.timings},
      counters:{...frame.counters}
    })),
    hitFrames:profiler.hitFrames.map(frame=>({
      ...frame,
      timings:{...frame.timings},
      counters:{...frame.counters}
    }))
  };
}

initializeCombatFrameProfiler();
