const MAX_PROFILE_ACTIVITY = 120;

function cleanText(value, fallback = ""){
  return String(value || fallback).trim().replace(/\s+/g, " ").slice(0, 220);
}

function cleanData(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return {};
  const data = {};
  for(const [key, raw] of Object.entries(value).slice(0, 12)){
    if(raw === null || raw === undefined) continue;
    if(typeof raw === "number") data[key] = Number.isFinite(raw) ? raw : 0;
    else if(typeof raw === "boolean") data[key] = raw;
    else data[key] = cleanText(raw).slice(0, 80);
  }
  return data;
}

export function sanitizeActivityLog(value){
  return (Array.isArray(value) ? value : [])
    .slice(-MAX_PROFILE_ACTIVITY)
    .map(entry=>({
      id:cleanText(entry?.id, `activity_${Date.now()}`),
      type:cleanText(entry?.type, "activity").slice(0, 40),
      severity:["info", "warning", "danger"].includes(entry?.severity) ? entry.severity : "info",
      label:cleanText(entry?.label, "Activite"),
      detail:cleanText(entry?.detail, ""),
      data:cleanData(entry?.data),
      createdAt:Math.max(0, Number(entry?.createdAt || Date.now()))
    }))
    .filter(entry=>entry.label);
}

export function appendProfileActivity(profile, entry = {}, now = Date.now()){
  if(!profile || typeof profile !== "object") return false;
  const current = sanitizeActivityLog(profile.activityLog);
  current.push({
    id:cleanText(entry.id, `activity_${now}_${Math.random().toString(36).slice(2)}`),
    type:cleanText(entry.type, "activity").slice(0, 40),
    severity:["info", "warning", "danger"].includes(entry.severity) ? entry.severity : "info",
    label:cleanText(entry.label, "Activite"),
    detail:cleanText(entry.detail, ""),
    data:cleanData(entry.data),
    createdAt:Math.max(0, Number(entry.createdAt || now))
  });
  profile.activityLog = current.slice(-MAX_PROFILE_ACTIVITY);
  return true;
}
