export const DEFAULT_MULTIPLAYER_SERVER_URL = "http://localhost:3001";

export function normalizeServerUrl(value){
  const raw = String(value || "").trim();
  if(!raw) return "";
  let candidate = raw;
  if(!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)){
    const looksLikeHost = /^[\w.-]+(?::\d+)?$/i.test(candidate) || /^\[[^\]]+\](?::\d+)?$/.test(candidate);
    if(!looksLikeHost) return "";
    candidate = `http://${candidate}`;
  }
  try{
    const parsed = new URL(candidate);
    if(parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.origin;
  }catch(error){
    return "";
  }
}

export function getServerUrlFromSearch(locationSearch = ""){
  const raw = String(locationSearch || "");
  if(!raw) return "";
  try{
    return new URLSearchParams(raw.startsWith("?") ? raw : `?${raw}`).get("serverUrl") || "";
  }catch(error){
    return "";
  }
}

export function resolveInitialServerUrl({
  queryUrl = "",
  configuredUrl = "",
  storedUrl = "",
  locationSearch = "",
  defaultUrl = DEFAULT_MULTIPLAYER_SERVER_URL
} = {}){
  const resolvedQueryUrl = queryUrl || getServerUrlFromSearch(locationSearch);
  const fallbackUrl = normalizeServerUrl(defaultUrl) || DEFAULT_MULTIPLAYER_SERVER_URL;
  for(const value of [resolvedQueryUrl, configuredUrl, storedUrl, fallbackUrl]){
    const normalized = normalizeServerUrl(value);
    if(normalized) return normalized;
  }
  return DEFAULT_MULTIPLAYER_SERVER_URL;
}
