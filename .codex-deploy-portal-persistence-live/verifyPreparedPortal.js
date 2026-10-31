import {pool, query} from "/opt/avosoma/server/src/db/client.js";

try{
  const result = await query(`
    SELECT profile_json->'preparedPortal' AS portal
    FROM player_profiles
    WHERE lower(profile_json->'player'->>'name') = lower($1)
  `, ["Avosoma"]);
  console.log(JSON.stringify(result.rows));
}finally{
  await pool?.end();
}
