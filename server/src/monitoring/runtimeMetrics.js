const DEFAULT_SAMPLE_LIMIT = 1200;
const DEFAULT_EVENT_LIMIT = 120;

function cleanEventName(value){
  return String(value || "unknown").slice(0, 120);
}

function finite(value, fallback = 0){
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function percentile(sorted, ratio){
  if(!sorted.length) return 0;
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function summarizeSamples(samples){
  const sorted = samples
    .map(value=>Math.max(0, finite(value)))
    .sort((left, right)=>left - right);
  return {
    samples:sorted.length,
    p50Ms:Number(percentile(sorted, .5).toFixed(2)),
    p95Ms:Number(percentile(sorted, .95).toFixed(2)),
    p99Ms:Number(percentile(sorted, .99).toFixed(2)),
    maxMs:Number((sorted[sorted.length - 1] || 0).toFixed(2))
  };
}

function increment(map, key){
  map.set(key, Math.max(0, Number(map.get(key) || 0)) + 1);
}

function topEntries(map, limit = 12){
  return [...map.entries()]
    .sort((left, right)=>right[1] - left[1])
    .slice(0, limit)
    .map(([eventName, count])=>({eventName, count}));
}

export function createRuntimeMetrics({
  sampleLimit = DEFAULT_SAMPLE_LIMIT,
  eventLimit = DEFAULT_EVENT_LIMIT,
  now = ()=>Date.now()
} = {}){
  const tickDurations = [];
  const eventLoopLag = [];
  const socketEvents = new Map();
  const rateLimits = new Map();
  const combatResults = new Map();
  const startedAt = now();

  function pushSample(target, value){
    target.push(Math.max(0, finite(value)));
    const limit = Math.max(60, Math.floor(finite(sampleLimit, DEFAULT_SAMPLE_LIMIT)));
    if(target.length > limit) target.splice(0, target.length - limit);
  }

  function keepEventMapBounded(map){
    const limit = Math.max(20, Math.floor(finite(eventLimit, DEFAULT_EVENT_LIMIT)));
    if(map.size <= limit) return;
    const leastUsed = [...map.entries()].sort((left, right)=>left[1] - right[1]);
    for(let index = 0; index < map.size - limit; index += 1) map.delete(leastUsed[index][0]);
  }

  function recordTick({durationMs = 0, lagMs = 0} = {}){
    pushSample(tickDurations, durationMs);
    pushSample(eventLoopLag, lagMs);
  }

  function recordSocketEvent(eventName){
    increment(socketEvents, cleanEventName(eventName));
    keepEventMapBounded(socketEvents);
  }

  function recordRateLimit(eventName, kind = "socket"){
    increment(rateLimits, `${String(kind || "socket").slice(0, 24)}:${cleanEventName(eventName)}`);
    keepEventMapBounded(rateLimits);
  }

  function recordCombatResult(outcome, reasonCode = ""){
    const normalizedOutcome = ["hit", "miss", "rejected"].includes(String(outcome || ""))
      ? String(outcome)
      : "unknown";
    const normalizedReason = cleanEventName(reasonCode || "UNSPECIFIED");
    const key = normalizedOutcome === "rejected"
      ? `${normalizedOutcome}:${normalizedReason}`
      : normalizedOutcome;
    increment(combatResults, key);
    keepEventMapBounded(combatResults);
  }

  function snapshot(){
    return {
      windowStartedAt:startedAt,
      tick:summarizeSamples(tickDurations),
      eventLoopLag:summarizeSamples(eventLoopLag),
      socketEvents:topEntries(socketEvents),
      rateLimits:topEntries(rateLimits),
      combatResults:topEntries(combatResults)
    };
  }

  return {
    recordTick,
    recordSocketEvent,
    recordRateLimit,
    recordCombatResult,
    snapshot
  };
}
