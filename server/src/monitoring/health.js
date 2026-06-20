function countOnlinePlayers(players){
  const onlinePlayers = [...players.values()].filter(player=>player.connected !== false);
  const accountKey = player=>String(
    player.accountId || player.account?.id || player.clientId || player.id || ""
  );
  return {
    sockets:players.size,
    online:new Set(onlinePlayers.map(accountKey).filter(Boolean)).size,
    game:new Set(
      onlinePlayers
        .filter(player=>player.clientMode === "game")
        .map(accountKey)
        .filter(Boolean)
    ).size
  };
}

export async function buildHealthStatus({
  players,
  databaseEnabled,
  checkDatabase,
  uptimeSeconds = ()=>Math.round(process.uptime()),
  now = ()=>Date.now()
}){
  let database = {
    configured:Boolean(databaseEnabled),
    ok:!databaseEnabled,
    latencyMs:null
  };

  if(databaseEnabled){
    try{
      const result = await checkDatabase();
      database = {
        configured:true,
        ok:result?.ok === true,
        latencyMs:Number.isFinite(result?.latencyMs) ? Math.max(0, Number(result.latencyMs)) : null
      };
    }catch{
      database = {
        configured:true,
        ok:false,
        latencyMs:null
      };
    }
  }

  const ok = database.ok;
  return {
    statusCode:ok ? 200 : 503,
    body:{
      ok,
      service:"voidsector-realtime",
      storage:databaseEnabled ? "postgres" : "json",
      readiness:{
        database
      },
      uptimeSeconds:uptimeSeconds(),
      players:countOnlinePlayers(players),
      at:now()
    }
  };
}
