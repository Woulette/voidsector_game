import fs from "node:fs";
import { dbEnabled, query } from "../db/client.js";

const DATA_DIR_URL = new URL("../../data/", import.meta.url);
const AUDIT_URL = new URL("../../data/adminAudit.json", import.meta.url);
const MAX_JSON_AUDIT_ENTRIES = 1000;

function readJsonLog(logger){
  try{
    if(!fs.existsSync(AUDIT_URL)) return [];
    const parsed = JSON.parse(fs.readFileSync(AUDIT_URL, "utf8") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  }catch(error){
    logger?.warn?.("Unable to read admin audit log", {error:error?.message || String(error)});
    return [];
  }
}

function writeJsonLog(entries, logger){
  try{
    fs.mkdirSync(DATA_DIR_URL, {recursive:true});
    fs.writeFileSync(AUDIT_URL, `${JSON.stringify(entries.slice(-MAX_JSON_AUDIT_ENTRIES), null, 2)}\n`, "utf8");
  }catch(error){
    logger?.warn?.("Unable to write admin audit log", {error:error?.message || String(error)});
  }
}

function normalizeAuditEntry(entry = {}){
  const createdAt = Math.max(0, Number(entry.createdAt || Date.now()));
  return {
    id:String(entry.id || `audit_${createdAt}_${Math.random().toString(36).slice(2)}`),
    createdAt,
    action:String(entry.action || "admin:unknown").slice(0, 80),
    reason:String(entry.reason || "").slice(0, 240),
    actor:{
      accountId:String(entry.actor?.accountId || ""),
      playerId:String(entry.actor?.playerId || ""),
      name:String(entry.actor?.name || "Admin").slice(0, 32),
      role:String(entry.actor?.role || "player").slice(0, 24)
    },
    target:{
      key:String(entry.target?.key || ""),
      playerId:String(entry.target?.playerId || ""),
      name:String(entry.target?.name || "").slice(0, 32)
    },
    payload:entry.payload && typeof entry.payload === "object" ? entry.payload : {}
  };
}

function auditFromRow(row){
  return normalizeAuditEntry({
    id:row.id,
    createdAt:Number(row.created_at || 0),
    action:row.action,
    reason:row.reason,
    actor:{
      accountId:row.actor_account_id,
      playerId:row.actor_player_id,
      name:row.actor_name,
      role:row.actor_role
    },
    target:{
      key:row.target_key,
      playerId:row.target_player_id,
      name:row.target_name
    },
    payload:row.payload_json || {}
  });
}

export function createAdminAuditStore({logger} = {}){
  async function record(entry){
    const next = normalizeAuditEntry(entry);
    if(dbEnabled){
      await query(`
        INSERT INTO admin_audit_log (
          id, created_at, action, reason,
          actor_account_id, actor_player_id, actor_name, actor_role,
          target_key, target_player_id, target_name, payload_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
      `, [
        next.id,
        next.createdAt,
        next.action,
        next.reason,
        next.actor.accountId || null,
        next.actor.playerId || null,
        next.actor.name,
        next.actor.role,
        next.target.key || null,
        next.target.playerId || null,
        next.target.name || null,
        JSON.stringify(next.payload)
      ]);
      return next;
    }
    const entries = readJsonLog(logger);
    entries.push(next);
    writeJsonLog(entries, logger);
    return next;
  }

  async function list({limit = 50} = {}){
    const cleanLimit = Math.max(1, Math.min(200, Math.floor(Number(limit || 50))));
    if(dbEnabled){
      const result = await query(`
        SELECT *
        FROM admin_audit_log
        ORDER BY created_at DESC
        LIMIT $1
      `, [cleanLimit]);
      return result.rows.map(auditFromRow);
    }
    return readJsonLog(logger).slice(-cleanLimit).reverse().map(normalizeAuditEntry);
  }

  return {record, list};
}
