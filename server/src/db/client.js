import { Pool } from "pg";
import { runDatabaseMigrations } from "./migrations.js";

const DATABASE_URL = String(process.env.DATABASE_URL || "").trim();

export const dbEnabled = Boolean(DATABASE_URL);

export const pool = dbEnabled
  ? new Pool({
      connectionString:DATABASE_URL,
      ssl:process.env.DATABASE_SSL === "true" ? {rejectUnauthorized:false} : undefined
    })
  : null;

export async function query(text, params = []){
  if(!pool) throw new Error("DATABASE_URL is not configured.");
  return pool.query(text, params);
}

export async function checkDatabaseConnection(){
  if(!pool) return {ok:false, latencyMs:null};
  const startedAt = Date.now();
  await query("SELECT 1");
  return {
    ok:true,
    latencyMs:Math.max(0, Date.now() - startedAt)
  };
}

export async function initializeDatabase(){
  if(!pool) return false;
  await runDatabaseMigrations({database:pool});
  return true;
}

export async function closeDatabase(){
  if(pool) await pool.end();
}
