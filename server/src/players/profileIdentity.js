const PILOT_NAME_MAX_LENGTH = 24;

export function sanitizePilotName(value, fallback = "Pilote"){
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[^\p{L}\p{M}\p{N} ._-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PILOT_NAME_MAX_LENGTH);
  return normalized || String(fallback || "").slice(0, PILOT_NAME_MAX_LENGTH);
}

export function pilotNameKey(value){
  return sanitizePilotName(value, "").normalize("NFKC").toLocaleLowerCase("fr");
}
