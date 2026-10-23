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

export function isLocalServerUrl(value){
  const normalized = normalizeServerUrl(value);
  if(!normalized) return false;
  try{
    const hostname = new URL(normalized).hostname.toLowerCase();
    return hostname === "localhost"
      || hostname === "127.0.0.1"
      || hostname === "::1"
      || hostname === "[::1]"
      || hostname.endsWith(".localhost");
  }catch(error){
    return false;
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
  pageOrigin = "",
  defaultUrl = DEFAULT_MULTIPLAYER_SERVER_URL
} = {}){
  const fallbackUrl = normalizeServerUrl(defaultUrl) || DEFAULT_MULTIPLAYER_SERVER_URL;
  const localPage = isLocalServerUrl(pageOrigin);
  const resolvedQueryUrl = localPage ? queryUrl || getServerUrlFromSearch(locationSearch) : "";
  const candidates = localPage
    ? [resolvedQueryUrl, configuredUrl, storedUrl].filter(isLocalServerUrl).concat(fallbackUrl)
    : [configuredUrl, storedUrl, fallbackUrl];
  for(const value of candidates){
    const normalized = normalizeServerUrl(value);
    if(normalized) return normalized;
  }
  return DEFAULT_MULTIPLAYER_SERVER_URL;
}

export function resolveConnectionServerUrl({
  requestedUrl = "",
  currentUrl = "",
  configuredUrl = "",
  pageOrigin = "",
  defaultUrl = DEFAULT_MULTIPLAYER_SERVER_URL
} = {}){
  const normalizedPageOrigin = normalizeServerUrl(pageOrigin);
  const fallbackUrl = normalizeServerUrl(defaultUrl) || DEFAULT_MULTIPLAYER_SERVER_URL;
  if(isLocalServerUrl(normalizedPageOrigin)){
    for(const value of [requestedUrl, currentUrl, configuredUrl, fallbackUrl]){
      if(!isLocalServerUrl(value)) continue;
      const normalized = normalizeServerUrl(value);
      if(normalized) return normalized;
    }
    return DEFAULT_MULTIPLAYER_SERVER_URL;
  }

  for(const value of [configuredUrl, normalizedPageOrigin]){
    const normalized = normalizeServerUrl(value);
    if(normalized && !isLocalServerUrl(normalized)) return normalized;
  }
  return fallbackUrl;
}
