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
  maxConcurrentGamePlayers = 0,
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
      limits:{
        maxConcurrentGamePlayers:Math.max(0, Math.floor(Number(maxConcurrentGamePlayers || 0)))
      },
      at:now()
    }
  };
}

export async function buildSafeHealthStatus({
  players,
  databaseEnabled,
  checkDatabase,
  maxConcurrentGamePlayers = 0,
  uptimeSeconds,
  now = ()=>Date.now(),
  buildHealthStatusFn = buildHealthStatus,
  logger,
  onError
}){
  try{
    return await buildHealthStatusFn({
      players,
      databaseEnabled,
      checkDatabase,
      maxConcurrentGamePlayers,
      uptimeSeconds,
      now
    });
  }catch(error){
    const at = now();
    const payload = {
      source:"health",
      eventName:"GET /health",
      error:error?.stack || error?.message || String(error),
      at
    };
    logger?.error?.("[health] check failed", payload);
    try{
      onError?.(payload);
    }catch(logError){
      logger?.warn?.("[health] error log failed", {
        error:logError?.stack || logError?.message || String(logError),
        at:now()
      });
    }
    return {
      statusCode:503,
      body:{
        ok:false,
        service:"voidsector-realtime",
        storage:databaseEnabled ? "postgres" : "json",
        readiness:{
          database:{
            configured:Boolean(databaseEnabled),
            ok:false,
            latencyMs:null
          }
        },
        players:{
          sockets:0,
          online:0,
          game:0
        },
        limits:{
          maxConcurrentGamePlayers:Math.max(0, Math.floor(Number(maxConcurrentGamePlayers || 0)))
        },
        at,
        error:"healthcheck_failed"
      }
    };
  }
}
