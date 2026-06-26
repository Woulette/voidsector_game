const DEFAULT_SERVER_ERROR_LIMIT = 200;

function cleanString(value, fallback = "", maxLength = 4000){
  const clean = String(value ?? fallback);
  return clean.length > maxLength ? clean.slice(0, maxLength) : clean;
}

function cleanSeverity(value){
  const clean = String(value || "danger").toLowerCase();
  return ["danger", "warning", "info"].includes(clean) ? clean : "danger";
}

function cleanContext(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return {};
  const context = {};
  for(const [key, raw] of Object.entries(value)){
    const cleanKey = cleanString(key, "", 80);
    if(!cleanKey) continue;
    if(raw === null || ["string", "number", "boolean"].includes(typeof raw)){
      context[cleanKey] = typeof raw === "string" ? cleanString(raw, "", 500) : raw;
    }else{
      try{
        context[cleanKey] = cleanString(JSON.stringify(raw), "", 500);
      }catch{
        context[cleanKey] = "[unserializable]";
      }
    }
  }
  return context;
}

export function createServerErrorLog({limit = DEFAULT_SERVER_ERROR_LIMIT, now = ()=>Date.now()} = {}){
  const entries = [];
  const maxEntries = Math.max(1, Math.min(1000, Math.floor(Number(limit || DEFAULT_SERVER_ERROR_LIMIT))));

  function record(entry = {}){
    const at = Math.max(0, Number(entry.at || now()));
    const next = {
      id:cleanString(entry.id || `server_error_${at}_${Math.random().toString(36).slice(2)}`, "", 120),
      source:cleanString(entry.source || "server", "server", 80),
      eventName:cleanString(entry.eventName || "", "", 120),
      socketId:cleanString(entry.socketId || "", "", 120),
      accountId:cleanString(entry.accountId || "", "", 120),
      playerId:cleanString(entry.playerId || "", "", 120),
      mapId:cleanString(entry.mapId || "", "", 80),
      severity:cleanSeverity(entry.severity),
      error:cleanString(entry.error || "Unknown server error"),
      context:cleanContext(entry.context),
      at
    };
    entries.push(next);
    if(entries.length > maxEntries) entries.splice(0, entries.length - maxEntries);
    return next;
  }

  function list({limit:listLimit = 50} = {}){
    const cleanLimit = Math.max(1, Math.min(maxEntries, Math.floor(Number(listLimit || 50))));
    return entries.slice(-cleanLimit).reverse();
  }

  return {
    list,
    record
  };
}
