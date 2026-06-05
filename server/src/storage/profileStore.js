import fs from "node:fs";
import { dbEnabled, query } from "../db/client.js";

const DATA_DIR_URL = new URL("../../data/", import.meta.url);
const PROFILE_STORE_URL = new URL("../../data/profiles.json", import.meta.url);

export async function loadProfileEntries(sanitizeProfile){
  if(dbEnabled){
    const result = await query("SELECT profile_key, profile_json FROM player_profiles");
    return result.rows.map(row=>[row.profile_key, sanitizeProfile(row.profile_json || {})]);
  }
  if(!fs.existsSync(PROFILE_STORE_URL)) return [];
  const raw = fs.readFileSync(PROFILE_STORE_URL, "utf8");
  const data = JSON.parse(raw || "{}");
  return Object.entries(data || {}).map(([key, profile])=>[key, sanitizeProfile(profile)]);
}

export async function persistProfileEntries(entries){
  if(dbEnabled){
    for(const [key, profile] of entries){
      const accountId = String(key || "").startsWith("account:") ? String(key).slice("account:".length) : null;
      await query(`
        INSERT INTO player_profiles (profile_key, account_id, profile_json, updated_at)
        VALUES ($1, (SELECT id FROM accounts WHERE id = $2), $3::jsonb, $4)
        ON CONFLICT (profile_key) DO UPDATE SET
          account_id = EXCLUDED.account_id,
          profile_json = EXCLUDED.profile_json,
          updated_at = EXCLUDED.updated_at
      `, [
        key,
        accountId,
        JSON.stringify(profile || {}),
        Number(profile?.updatedAt || Date.now())
      ]);
    }
    return;
  }
  fs.mkdirSync(DATA_DIR_URL, {recursive:true});
  fs.writeFileSync(PROFILE_STORE_URL, JSON.stringify(Object.fromEntries(entries), null, 2));
}
