function normalizeClientOrigins(value){
  const raw = String(value || "").trim();
  if(!raw || raw === "*") return "*";
  return raw.split(",").map(origin=>origin.trim()).filter(Boolean);
}

function isValidClientOrigin(origin){
  try{
    const url = new URL(origin);
    return ["http:", "https:"].includes(url.protocol)
      && !url.username
      && !url.password
      && url.pathname === "/"
      && !url.search
      && !url.hash;
  }catch{
    return false;
  }
}

export function createRuntimeConfig(environment = process.env){
  const nodeEnv = String(environment.NODE_ENV || "development").trim().toLowerCase();
  const isProduction = nodeEnv === "production";
  const port = Number(environment.PORT || 3001);
  const clientOrigin = normalizeClientOrigins(environment.CLIENT_ORIGIN || "*");
  const databaseUrl = String(environment.DATABASE_URL || "").trim();
  const loadTestEnabled = String(environment.LOAD_TEST_ENABLED || "").trim().toLowerCase() === "true";
  const loadTestSecret = String(environment.LOAD_TEST_SECRET || "").trim();
  const origins = clientOrigin === "*" ? [] : clientOrigin;
  const errors = [];

  if(!Number.isInteger(port) || port < 1 || port > 65535){
    errors.push("PORT must be an integer between 1 and 65535.");
  }
  if(clientOrigin !== "*" && (!origins.length || origins.some(origin=>!isValidClientOrigin(origin)))){
    errors.push("CLIENT_ORIGIN must contain valid comma-separated http(s) origins without paths.");
  }
  if(isProduction && clientOrigin === "*"){
    errors.push("CLIENT_ORIGIN cannot be '*' in production.");
  }
  if(isProduction && !databaseUrl){
    errors.push("DATABASE_URL is required in production; JSON storage is development-only.");
  }
  if(loadTestEnabled && loadTestSecret.length < 16){
    errors.push("LOAD_TEST_SECRET must contain at least 16 characters when load testing is enabled.");
  }
  if(isProduction && loadTestEnabled){
    errors.push("LOAD_TEST_ENABLED cannot be true in production.");
  }
  if(errors.length){
    throw new Error(`Invalid server configuration:\n- ${errors.join("\n- ")}`);
  }

  return {
    nodeEnv,
    isProduction,
    port,
    clientOrigin:clientOrigin === "*" || clientOrigin.length === 1 ? clientOrigin === "*" ? "*" : clientOrigin[0] : clientOrigin,
    databaseEnabled:Boolean(databaseUrl),
    loadTest:{
      enabled:loadTestEnabled,
      secret:loadTestSecret
    }
  };
}

const runtimeConfig = createRuntimeConfig();

export const config = {
  ...runtimeConfig,
  portalWaveTotal:30,
  logoutDelayMs:15000,
  combatRecentMs:15000,
  disconnectCombatGraceMs:30000,
  logoutMoveSpeed:8,
  afkAfterMs:5 * 60 * 1000,
  afkDisconnectMs:10 * 60 * 1000,
  accountActionLocks:{
    "shop:buy-ammo":{minIntervalMs:220, limit:24, windowMs:10000},
    "shop:buy-item":{minIntervalMs:300, limit:16, windowMs:10000},
    "shop:buy-premium-pack":{minIntervalMs:600, limit:8, windowMs:10000},
    "premium:reward-claim":{minIntervalMs:800, limit:6, windowMs:10000},
    "shop:buy-ship":{minIntervalMs:600, limit:8, windowMs:10000},
    "shop:buy-drone":{minIntervalMs:600, limit:8, windowMs:10000},
    "shop:buy-drone-formation":{minIntervalMs:600, limit:8, windowMs:10000},
    "inventory:sell-item":{minIntervalMs:400, limit:16, windowMs:10000},
    "equipment:equip":{minIntervalMs:180, limit:24, windowMs:10000},
    "equipment:unequip-slot":{minIntervalMs:180, limit:24, windowMs:10000},
    "equipment:unequip-ship":{minIntervalMs:300, limit:12, windowMs:10000},
    "equipment:unequip-inventory":{minIntervalMs:180, limit:24, windowMs:10000},
    "equipment:drone-upgrade":{minIntervalMs:500, limit:8, windowMs:10000},
    "equipment:upgrade":{minIntervalMs:500, limit:10, windowMs:10000},
    "quest:accept":{minIntervalMs:250, limit:16, windowMs:10000},
    "quest:track":{minIntervalMs:80, limit:40, windowMs:10000},
    "quest:claim":{minIntervalMs:500, limit:10, windowMs:10000},
    "quest:progress":{minIntervalMs:120, limit:24, windowMs:10000},
    "chat:send":{minIntervalMs:450, limit:12, windowMs:10000},
    "social:sync":{minIntervalMs:50, limit:60, windowMs:10000},
    "social:friend-request":{minIntervalMs:900, limit:8, windowMs:30000},
    "social:friend-response":{minIntervalMs:300, limit:20, windowMs:10000},
    "social:set-category":{minIntervalMs:500, limit:12, windowMs:10000},
    "social:remove":{minIntervalMs:350, limit:20, windowMs:10000},
    "social:private-message":{minIntervalMs:450, limit:12, windowMs:10000},
    "leaderboard:sync":{minIntervalMs:900000, limit:1, windowMs:900000},
    "firm:sync":{minIntervalMs:250, limit:20, windowMs:10000},
    "firm:shop-buy":{minIntervalMs:500, limit:12, windowMs:10000},
    "firm:box-open":{minIntervalMs:500, limit:12, windowMs:10000},
    "firm:reward-claim":{minIntervalMs:800, limit:6, windowMs:10000},
    "firm:quest-accept":{minIntervalMs:400, limit:12, windowMs:10000},
    "firm:quest-claim":{minIntervalMs:500, limit:10, windowMs:10000},
    "skill:upgrade":{minIntervalMs:450, limit:10, windowMs:10000},
    "portal:unlock":{minIntervalMs:1000, limit:5, windowMs:10000},
    "prestige:perform":{minIntervalMs:2500, limit:3, windowMs:30000},
    "space-caster:run":{minIntervalMs:900, limit:8, windowMs:10000},
    "refinery:upgrade-start":{minIntervalMs:350, limit:10, windowMs:10000},
    "refinery:upgrade-rush":{minIntervalMs:350, limit:10, windowMs:10000},
    "refinery:production-toggle":{minIntervalMs:180, limit:20, windowMs:10000},
    "refinery:job-start":{minIntervalMs:350, limit:10, windowMs:10000},
    "refinery:job-claim":{minIntervalMs:350, limit:10, windowMs:10000},
    "refinery:shipment-start":{minIntervalMs:350, limit:10, windowMs:10000},
    "refinery:shipment-rush":{minIntervalMs:350, limit:10, windowMs:10000},
    "refinery:ship-cargo-refine":{minIntervalMs:220, limit:20, windowMs:10000},
    "refinery:combat-boost-deposit":{minIntervalMs:220, limit:20, windowMs:10000},
    "loot:pickup":{minIntervalMs:80, limit:30, windowMs:10000},
    "portal:start":{minIntervalMs:1000, limit:5, windowMs:10000},
    "portal:ricky-heal":{minIntervalMs:500, limit:6, windowMs:10000},
    "portal:ricky-lever":{minIntervalMs:250, limit:20, windowMs:10000},
    "player:respawn":{minIntervalMs:500, limit:6, windowMs:10000},
    "portgun:teleport":{minIntervalMs:1000, limit:4, windowMs:10000},
    "group:invite":{minIntervalMs:500, limit:12, windowMs:10000},
    "group:kick":{minIntervalMs:350, limit:12, windowMs:10000},
    "group:promote":{minIntervalMs:350, limit:12, windowMs:10000},
    "profile:setup":{minIntervalMs:1200, limit:4, windowMs:30000},
    "loadtest:provision":{minIntervalMs:1000, limit:2, windowMs:30000},
    "profile:title-set":{minIntervalMs:300, limit:12, windowMs:10000},
    "profile:debug-reset-firm":{minIntervalMs:1500, limit:3, windowMs:30000},
    "admin:sync":{minIntervalMs:500, limit:10, windowMs:10000},
    "admin:inspect-player":{minIntervalMs:500, limit:20, windowMs:10000},
    "admin:kick":{minIntervalMs:1000, limit:8, windowMs:30000},
    "admin:adjust-player":{minIntervalMs:1200, limit:8, windowMs:30000},
    "admin:grant-player":{minIntervalMs:700, limit:12, windowMs:30000},
    "admin:inventory-remove":{minIntervalMs:700, limit:12, windowMs:30000},
    "admin:moderate-account":{minIntervalMs:1200, limit:8, windowMs:30000},
    "admin:reset-instance":{minIntervalMs:2000, limit:4, windowMs:60000}
  },
  socketRateLimits:{
    default:{limit:120, windowMs:1000},
    "player:state":{limit:30, windowMs:1000},
    "combat:fire":{limit:25, windowMs:1000},
    "combat:fire-player":{limit:25, windowMs:1000},
    "chat:send":{limit:8, windowMs:10000},
    "group:invite":{limit:16, windowMs:10000},
    "group:kick":{limit:16, windowMs:10000},
    "group:promote":{limit:16, windowMs:10000},
    "social:sync":{limit:60, windowMs:10000},
    "social:friend-request":{limit:10, windowMs:30000},
    "social:friend-response":{limit:20, windowMs:10000},
    "social:set-category":{limit:16, windowMs:10000},
    "social:remove":{limit:20, windowMs:10000},
    "social:private-message":{limit:12, windowMs:10000},
    "leaderboard:sync":{limit:2, windowMs:900000},
    "firm:sync":{limit:30, windowMs:10000},
    "firm:shop-buy":{limit:16, windowMs:10000},
    "firm:box-open":{limit:16, windowMs:10000},
    "firm:reward-claim":{limit:8, windowMs:10000},
    "firm:quest-accept":{limit:16, windowMs:10000},
    "firm:quest-claim":{limit:12, windowMs:10000},
    "loot:pickup":{limit:20, windowMs:10000},
    "player:laser":{limit:25, windowMs:1000},
    "player:respawn":{limit:8, windowMs:10000},
    "player:activity":{limit:30, windowMs:10000},
    "portgun:teleport":{limit:4, windowMs:10000},
    "portal:ricky-lever":{limit:30, windowMs:10000},
    "profile:save":{limit:6, windowMs:10000},
    "profile:setup":{limit:6, windowMs:60000},
    "loadtest:provision":{limit:3, windowMs:60000},
    "profile:title-set":{limit:16, windowMs:10000},
    "profile:debug-reset-firm":{limit:4, windowMs:60000},
    "auth:register":{limit:4, windowMs:60000},
    "auth:login":{limit:8, windowMs:60000},
    "auth:session":{limit:12, windowMs:60000},
    "admin:sync":{limit:12, windowMs:10000},
    "admin:inspect-player":{limit:24, windowMs:10000},
    "admin:kick":{limit:8, windowMs:30000},
    "admin:adjust-player":{limit:8, windowMs:30000},
    "admin:grant-player":{limit:12, windowMs:30000},
    "admin:inventory-remove":{limit:12, windowMs:30000},
    "admin:moderate-account":{limit:8, windowMs:30000},
    "admin:reset-instance":{limit:4, windowMs:60000},
    "shop:buy-ammo":{limit:20, windowMs:10000},
    "shop:buy-item":{limit:20, windowMs:10000},
    "shop:buy-premium-pack":{limit:12, windowMs:10000},
    "premium:reward-claim":{limit:8, windowMs:10000},
    "shop:buy-ship":{limit:12, windowMs:10000},
    "shop:buy-drone":{limit:12, windowMs:10000},
    "shop:buy-drone-formation":{limit:12, windowMs:10000},
    "inventory:sell-item":{limit:20, windowMs:10000},
    "equipment:equip":{limit:30, windowMs:10000},
    "equipment:unequip-slot":{limit:30, windowMs:10000},
    "equipment:unequip-ship":{limit:20, windowMs:10000},
    "equipment:unequip-inventory":{limit:30, windowMs:10000},
    "equipment:drone-upgrade":{limit:12, windowMs:10000},
    "equipment:upgrade":{limit:20, windowMs:10000},
    "quest:accept":{limit:20, windowMs:10000},
    "quest:track":{limit:40, windowMs:10000},
    "quest:claim":{limit:20, windowMs:10000},
    "quest:progress":{limit:30, windowMs:10000},
    "skill:upgrade":{limit:20, windowMs:10000},
    "portal:unlock":{limit:20, windowMs:10000},
    "prestige:perform":{limit:5, windowMs:10000},
    "space-caster:run":{limit:12, windowMs:10000},
    "refinery:upgrade-start":{limit:12, windowMs:10000},
    "refinery:upgrade-rush":{limit:12, windowMs:10000},
    "refinery:production-toggle":{limit:20, windowMs:10000},
    "refinery:job-start":{limit:12, windowMs:10000},
    "refinery:job-claim":{limit:12, windowMs:10000},
    "refinery:shipment-start":{limit:12, windowMs:10000},
    "refinery:shipment-rush":{limit:12, windowMs:10000},
    "refinery:ship-cargo-refine":{limit:20, windowMs:10000},
    "refinery:combat-boost-deposit":{limit:20, windowMs:10000}
  }
};
