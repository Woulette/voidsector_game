import { dbEnabled, pool } from "../db/client.js";
import { pilotNameKey, sanitizePilotName } from "../players/profileIdentity.js";

export async function reservePilotIdentity({
  accountId,
  pilotName,
  database = pool,
  enabled = dbEnabled,
  now = ()=>Date.now()
} = {}){
  const cleanAccountId = String(accountId || "");
  const displayName = sanitizePilotName(pilotName, "");
  const nameKey = pilotNameKey(displayName);
  if(!cleanAccountId || !displayName || !nameKey){
    return {ok:false, reason:"Identite pilote invalide."};
  }
  if(!enabled) return {ok:true, nameKey, displayName};

  const client = await database.connect();
  try{
    await client.query("BEGIN");
    const ownerResult = await client.query(
      "SELECT account_id FROM pilot_identities WHERE name_key = $1 FOR UPDATE",
      [nameKey]
    );
    const ownerId = String(ownerResult.rows?.[0]?.account_id || "");
    if(ownerId && ownerId !== cleanAccountId){
      await client.query("ROLLBACK");
      return {ok:false, reason:"Nom de pilote deja utilise."};
    }

    await client.query(
      "DELETE FROM pilot_identities WHERE account_id = $1 AND name_key <> $2",
      [cleanAccountId, nameKey]
    );
    const timestamp = now();
    const reservationResult = await client.query(`
      INSERT INTO pilot_identities (name_key, display_name, account_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $4)
      ON CONFLICT (name_key) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        updated_at = EXCLUDED.updated_at
      WHERE pilot_identities.account_id = EXCLUDED.account_id
      RETURNING account_id
    `, [nameKey, displayName, cleanAccountId, timestamp]);
    if(String(reservationResult.rows?.[0]?.account_id || "") !== cleanAccountId){
      await client.query("ROLLBACK");
      return {ok:false, reason:"Nom de pilote deja utilise."};
    }
    await client.query("COMMIT");
    return {ok:true, nameKey, displayName};
  }catch(error){
    try{
      await client.query("ROLLBACK");
    }catch{}
    if(error?.code === "23505"){
      return {ok:false, reason:"Nom de pilote deja utilise."};
    }
    throw error;
  }finally{
    client.release();
  }
}
