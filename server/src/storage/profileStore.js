import crypto from "node:crypto";
import fs from "node:fs";
import { mkdir, open, rename, rm } from "node:fs/promises";
import { dbEnabled, pool, query } from "../db/client.js";

const DATA_DIR_URL = new URL("../../data/", import.meta.url);
const PROFILE_STORE_URL = new URL("../../data/profiles.json", import.meta.url);

const PROFILE_UPSERT_SQL = `
  INSERT INTO player_profiles (profile_key, account_id, profile_json, updated_at)
  VALUES ($1, (SELECT id FROM accounts WHERE id = $2), $3::jsonb, $4)
  ON CONFLICT (profile_key) DO UPDATE SET
    account_id = EXCLUDED.account_id,
    profile_json = EXCLUDED.profile_json,
    updated_at = EXCLUDED.updated_at
  WHERE player_profiles.updated_at <= EXCLUDED.updated_at
`;

function cloneEntries(entries = []){
  return (Array.isArray(entries) ? entries : []).map(([key, profile])=>[
    String(key || ""),
    JSON.parse(JSON.stringify(profile || {}))
  ]).filter(([key])=>Boolean(key));
}

function readJsonProfiles(fileSystem, profileStoreUrl){
  if(!fileSystem.existsSync(profileStoreUrl)) return {};
  const raw = fileSystem.readFileSync(profileStoreUrl, "utf8");
  const parsed = JSON.parse(raw || "{}");
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

async function writeJsonAtomically({entries, dataDirUrl, profileStoreUrl, fileSystem, fileSystemPromises}){
  await fileSystemPromises.mkdir(dataDirUrl, {recursive:true});
  const tempUrl = new URL(`profiles.${crypto.randomUUID()}.tmp`, dataDirUrl);
  const mergedProfiles = readJsonProfiles(fileSystem, profileStoreUrl);
  for(const [key, profile] of entries){
    const storedVersion = Math.max(0, Number(mergedProfiles[key]?.updatedAt || 0));
    const incomingVersion = Math.max(0, Number(profile?.updatedAt || 0));
    if(storedVersion > incomingVersion) continue;
    mergedProfiles[key] = profile;
  }
  let handle = null;
  try{
    handle = await fileSystemPromises.open(tempUrl, "wx");
    await handle.writeFile(`${JSON.stringify(mergedProfiles, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    await fileSystemPromises.rename(tempUrl, profileStoreUrl);
  }catch(error){
    if(handle){
      try{ await handle.close(); }catch(closeError){}
    }
    try{ await fileSystemPromises.rm(tempUrl, {force:true}); }catch(cleanupError){}
    throw error;
  }
}

async function persistDatabaseEntries({entries, database}){
  const client = await database.connect();
  try{
    await client.query("BEGIN");
    for(const [key, profile] of entries){
      const accountId = key.startsWith("account:") ? key.slice("account:".length) : null;
      await client.query(PROFILE_UPSERT_SQL, [
        key,
        accountId,
        JSON.stringify(profile),
        Math.max(0, Number(profile?.updatedAt || Date.now()))
      ]);
    }
    await client.query("COMMIT");
  }catch(error){
    try{ await client.query("ROLLBACK"); }catch(rollbackError){}
    throw error;
  }finally{
    client.release();
  }
}

export function createProfilePersistence({
  database = dbEnabled && pool ? {
    query,
    connect:()=>pool.connect()
  } : null,
  dataDirUrl = DATA_DIR_URL,
  profileStoreUrl = PROFILE_STORE_URL,
  fileSystem = fs,
  fileSystemPromises = {mkdir, open, rename, rm}
} = {}){
  let writeTail = Promise.resolve();

  async function loadProfileEntries(sanitizeProfile){
    if(database){
      const result = await database.query("SELECT profile_key, profile_json FROM player_profiles");
      return result.rows.map(row=>[row.profile_key, sanitizeProfile(row.profile_json || {})]);
    }
    if(!fileSystem.existsSync(profileStoreUrl)) return [];
    const raw = fileSystem.readFileSync(profileStoreUrl, "utf8");
    const data = JSON.parse(raw || "{}");
    return Object.entries(data || {}).map(([key, profile])=>[key, sanitizeProfile(profile)]);
  }

  function persistProfileEntries(entries){
    const snapshot = cloneEntries(entries);
    const operation = writeTail
      .catch(()=>{})
      .then(()=>database
        ? persistDatabaseEntries({entries:snapshot, database})
        : writeJsonAtomically({
            entries:snapshot,
            dataDirUrl,
            profileStoreUrl,
            fileSystem,
            fileSystemPromises
          }));
    writeTail = operation;
    return operation;
  }

  async function flushProfilePersistence(){
    await writeTail;
  }

  return {
    flushProfilePersistence,
    loadProfileEntries,
    persistProfileEntries
  };
}

const defaultPersistence = createProfilePersistence();

export const loadProfileEntries = sanitizeProfile=>defaultPersistence.loadProfileEntries(sanitizeProfile);
export const persistProfileEntries = entries=>defaultPersistence.persistProfileEntries(entries);
export const flushProfilePersistence = ()=>defaultPersistence.flushProfilePersistence();
