#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { normalizeServerUrl } from "../../src/multiplayer/serverUrlConfig.js";

const DEFAULT_HEALTH_URL = "http://127.0.0.1:3001/health";

function numberOption(value, fallback, {min = 0, max = Number.MAX_SAFE_INTEGER} = {}){
  const parsed = Number(value);
  if(!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function readArg(argv, name){
  const prefix = `${name}=`;
  const direct = argv.find(arg=>String(arg || "").startsWith(prefix));
  if(direct) return direct.slice(prefix.length);
  const index = argv.indexOf(name);
  if(index >= 0 && index + 1 < argv.length) return argv[index + 1];
  return null;
}

export function parseReadinessArgs(argv = [], env = process.env){
  return {
    url:readArg(argv, "--url") || env.BETA_HEALTH_URL || DEFAULT_HEALTH_URL,
    expectedStorage:readArg(argv, "--expected-storage") || env.BETA_EXPECTED_STORAGE || "postgres",
    expectedMaxGamePlayers:numberOption(
      readArg(argv, "--expected-max-game-players") || env.BETA_EXPECTED_MAX_GAME_PLAYERS,
      0,
      {min:0, max:100000}
    ),
    clientIndexPath:readArg(argv, "--client-index") || env.BETA_CLIENT_INDEX || "",
    expectedClientServerUrl:readArg(argv, "--expected-client-server-url") || env.BETA_EXPECTED_CLIENT_SERVER_URL || "",
    allowLocalClientServerUrl:argv.includes("--allow-local-client-server-url") || String(env.BETA_ALLOW_LOCAL_CLIENT_SERVER_URL || "").toLowerCase() === "true",
    retries:numberOption(readArg(argv, "--retries") || env.BETA_HEALTH_RETRIES, 10, {min:1, max:120}),
    delayMs:numberOption(readArg(argv, "--delay-ms") || env.BETA_HEALTH_DELAY_MS, 1000, {min:0, max:60000})
  };
}

export function validateHealthPayload(payload, {expectedStorage = "postgres", expectedMaxGamePlayers = 0} = {}){
  if(!payload || typeof payload !== "object" || Array.isArray(payload)){
    return ["health response is not a JSON object"];
  }
  const failures = [];
  if(payload.ok !== true) failures.push("health ok is not true");
  if(String(payload.storage || "") !== String(expectedStorage || "")){
    failures.push(`storage is "${payload.storage || "missing"}", expected "${expectedStorage}"`);
  }
  if(String(expectedStorage || "") === "postgres"){
    const database = payload.readiness?.database;
    if(!database || typeof database !== "object"){
      failures.push("database readiness is missing");
    }else{
      if(database.configured !== true) failures.push("database is not configured");
      if(database.ok !== true) failures.push("database check is not ok");
    }
  }
  const expectedMax = Math.max(0, Math.floor(Number(expectedMaxGamePlayers || 0)));
  if(expectedMax > 0){
    const actualMax = Number(payload.limits?.maxConcurrentGamePlayers);
    if(actualMax !== expectedMax){
      failures.push(`maxConcurrentGamePlayers is ${Number.isFinite(actualMax) ? actualMax : "missing"}, expected ${expectedMax}`);
    }
  }
  return failures;
}

function readHtmlAttribute(tag, name){
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(['"])(.*?)\\1`, "i");
  return tag.match(pattern)?.[2] || "";
}

export function extractClientServerUrlCandidates(indexHtml = ""){
  const html = String(indexHtml || "");
  const candidates = [];
  for(const match of html.matchAll(/<meta\b[^>]*>/gi)){
    const tag = match[0];
    if(readHtmlAttribute(tag, "name") === "voidsector-server-url"){
      candidates.push(readHtmlAttribute(tag, "content"));
    }
  }
  for(const match of html.matchAll(/__VOIDSECTOR_CONFIG__[\s\S]{0,400}?serverUrl\s*:\s*(['"])(.*?)\1/g)){
    candidates.push(match[2]);
  }
  return candidates;
}

function isLocalServerUrl(serverUrl){
  try{
    const url = new URL(serverUrl);
    const hostname = url.hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  }catch{
    return false;
  }
}

export function validateClientServerUrlConfig(indexHtml, {
  expectedClientServerUrl = "",
  allowLocalClientServerUrl = false
} = {}){
  const failures = [];
  const configuredUrls = extractClientServerUrlCandidates(indexHtml);
  const normalizedUrls = configuredUrls.map(value=>normalizeServerUrl(value)).filter(Boolean);
  if(!normalizedUrls.length){
    failures.push("client server URL is missing in index.html");
    return failures;
  }
  const primaryUrl = normalizedUrls[0];
  if(!allowLocalClientServerUrl && isLocalServerUrl(primaryUrl)){
    failures.push(`client server URL points to local development (${primaryUrl})`);
  }
  if(expectedClientServerUrl){
    const expected = normalizeServerUrl(expectedClientServerUrl);
    if(!expected){
      failures.push("--expected-client-server-url is not a valid http(s) URL");
    }else if(primaryUrl !== expected){
      failures.push(`client server URL is "${primaryUrl}", expected "${expected}"`);
    }
  }
  return failures;
}

function wait(delayMs){
  if(!delayMs) return Promise.resolve();
  return new Promise(resolve=>setTimeout(resolve, delayMs));
}

async function readHealthJson(response){
  if(typeof response.json === "function") return response.json();
  const text = typeof response.text === "function" ? await response.text() : "";
  return JSON.parse(text || "{}");
}

export async function checkBetaReadiness({
  url = DEFAULT_HEALTH_URL,
  expectedStorage = "postgres",
  expectedMaxGamePlayers = 0,
  clientIndexPath = "",
  expectedClientServerUrl = "",
  allowLocalClientServerUrl = false,
  retries = 10,
  delayMs = 1000,
  fetchFn = fetch,
  readFileFn = readFile,
  logger = console
} = {}){
  if(clientIndexPath){
    try{
      const indexHtml = await readFileFn(clientIndexPath, "utf8");
      const clientFailures = validateClientServerUrlConfig(indexHtml, {
        expectedClientServerUrl,
        allowLocalClientServerUrl
      });
      if(clientFailures.length) throw new Error(clientFailures.join("; "));
    }catch(error){
      logger?.error?.(`Beta readiness FAILED: client config (${error?.message || String(error)})`);
      return {ok:false, attempts:0, error};
    }
  }
  let lastError = null;
  const attempts = numberOption(retries, 10, {min:1, max:120});
  for(let attempt = 1; attempt <= attempts; attempt += 1){
    try{
      const response = await fetchFn(url, {headers:{accept:"application/json"}});
      if(!response?.ok){
        throw new Error(`health returned HTTP ${response?.status || "unknown"}`);
      }
      const payload = await readHealthJson(response);
      const failures = validateHealthPayload(payload, {expectedStorage, expectedMaxGamePlayers});
      if(failures.length) throw new Error(failures.join("; "));
      const limitLabel = expectedMaxGamePlayers > 0 ? ` maxGame=${payload.limits?.maxConcurrentGamePlayers}` : "";
      logger?.log?.(`Beta readiness OK: ${url} storage=${payload.storage}${limitLabel}`);
      return {ok:true, attempt, payload};
    }catch(error){
      lastError = error;
      if(attempt < attempts) await wait(delayMs);
    }
  }
  logger?.error?.(`Beta readiness FAILED: ${url} (${lastError?.message || String(lastError)})`);
  return {ok:false, attempts, error:lastError};
}

export async function main(argv = process.argv.slice(2), env = process.env, options = {}){
  const config = parseReadinessArgs(argv, env);
  const result = await checkBetaReadiness({
    ...config,
    ...options
  });
  return result.ok ? 0 : 1;
}

if(process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]){
  main().then(code=>process.exit(code)).catch(error=>{
    console.error(`Beta readiness FAILED: ${error?.message || String(error)}`);
    process.exit(1);
  });
}
