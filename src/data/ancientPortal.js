export const ANCIENT_PORTAL_ID = "ancient";
export const ANCIENT_PORTAL_LEVEL = 45;
export const ANCIENT_INITIAL_TIME_MS = 5 * 60_000;
export const ANCIENT_RESCUE_TIME_BONUS_MS = 5 * 60_000;
export const ANCIENT_BOMB_RADIUS = 100;

export const ANCIENT_PORTAL_MAP = Object.freeze({
  width:6_800,
  height:5_200,
  spawn:Object.freeze({x:0, y:700}),
  hub:Object.freeze({x:0, y:0, radius:850}),
  beacon:Object.freeze({x:0, y:0, radius:180}),
  rift:Object.freeze({x:0, y:0, radius:210}),
  paradiseSpawn:Object.freeze({x:0, y:1_700}),
  paradiseArena:Object.freeze({x:0, y:0, radius:2_300}),
  demonKing:Object.freeze({x:0, y:-120}),
  god:Object.freeze({x:0, y:-1_650, radius:210}),
  rooms:Object.freeze([
    Object.freeze({id:"ancient_room_1", number:1, label:"SALLE I", x:0, y:-1_900, radius:560}),
    Object.freeze({id:"ancient_room_2", number:2, label:"SALLE II", x:1_807, y:-587, radius:560}),
    Object.freeze({id:"ancient_room_3", number:3, label:"SALLE III", x:1_117, y:1_537, radius:560}),
    Object.freeze({id:"ancient_room_4", number:4, label:"SALLE IV", x:-1_117, y:1_537, radius:560}),
    Object.freeze({id:"ancient_room_5", number:5, label:"SALLE V", x:-1_807, y:-587, radius:560})
  ])
});

const ANCIENT_PHASES = new Set(["hell", "paradise", "epilogue", "failed"]);
const ANCIENT_STAGES = new Set([
  "rescue",
  "find_talisman",
  "open_rift",
  "enter_rift",
  "demon_king",
  "god",
  "complete",
  "failed"
]);
const ANCIENT_ROOM_ROLES = new Set(["unknown", "angel", "talisman", "empty"]);

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max){
  return Math.max(min, Math.min(max, finite(value, min)));
}

function clamp01(value){
  return clamp(value, 0, 1);
}

function distancePointToSegment(point, start, end){
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if(lengthSquared <= 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const ratio = clamp(
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    0,
    1
  );
  return Math.hypot(
    point.x - (start.x + dx * ratio),
    point.y - (start.y + dy * ratio)
  );
}

function isHellPointAllowed(point, radius){
  const padding = Math.max(16, finite(radius, 48));
  const hub = ANCIENT_PORTAL_MAP.hub;
  if(Math.hypot(point.x - hub.x, point.y - hub.y) <= hub.radius - padding) return true;
  for(const room of ANCIENT_PORTAL_MAP.rooms){
    if(Math.hypot(point.x - room.x, point.y - room.y) <= room.radius - padding) return true;
    if(distancePointToSegment(point, hub, room) <= 230 - padding * .35) return true;
  }
  return false;
}

function isParadisePointAllowed(point, radius){
  const arena = ANCIENT_PORTAL_MAP.paradiseArena;
  return Math.hypot(point.x - arena.x, point.y - arena.y)
    <= arena.radius - Math.max(16, finite(radius, 48));
}

export function resolveAncientPortalPoint(previous, requested, {
  phase = "hell",
  rooms = []
} = {}, radius = 48){
  void rooms;
  const padding = Math.max(16, finite(radius, 48));
  const halfWidth = ANCIENT_PORTAL_MAP.width / 2;
  const halfHeight = ANCIENT_PORTAL_MAP.height / 2;
  const next = {
    x:clamp(requested?.x, -halfWidth + padding, halfWidth - padding),
    y:clamp(requested?.y, -halfHeight + padding, halfHeight - padding)
  };
  const before = {
    x:finite(previous?.x, next.x),
    y:finite(previous?.y, next.y)
  };
  const allowed = String(phase || "") === "paradise" || String(phase || "") === "epilogue"
    ? point=>isParadisePointAllowed(point, padding)
    : point=>isHellPointAllowed(point, padding);
  const distance = Math.hypot(next.x - before.x, next.y - before.y);
  const steps = Math.max(1, Math.ceil(distance / Math.max(12, padding * .4)));
  let lastSafe = allowed(before) ? before : (
    String(phase || "") === "paradise" || String(phase || "") === "epilogue"
      ? {...ANCIENT_PORTAL_MAP.paradiseSpawn}
      : {...ANCIENT_PORTAL_MAP.spawn}
  );
  for(let step = 1; step <= steps; step += 1){
    const ratio = step / steps;
    const sample = {
      x:before.x + (next.x - before.x) * ratio,
      y:before.y + (next.y - before.y) * ratio
    };
    if(!allowed(sample)) return lastSafe;
    lastSafe = sample;
  }
  return lastSafe;
}

function normalizeRoom(value, index){
  const source = value && typeof value === "object" ? value : {};
  const fallback = ANCIENT_PORTAL_MAP.rooms.find(room=>room.id === String(source.id || ""))
    || ANCIENT_PORTAL_MAP.rooms[index]
    || ANCIENT_PORTAL_MAP.rooms[0];
  const roleValue = String(source.role || "unknown").toLowerCase();
  return {
    id:String(source.id || fallback.id),
    number:Math.max(1, Math.min(5, Math.floor(finite(source.number, fallback.number)))),
    label:String(source.label || fallback.label),
    x:finite(source.x, fallback.x),
    y:finite(source.y, fallback.y),
    radius:Math.max(180, finite(source.radius, fallback.radius)),
    discovered:Boolean(source.discovered),
    role:ANCIENT_ROOM_ROLES.has(roleValue) ? roleValue : "unknown",
    cageDestroyed:Boolean(source.cageDestroyed),
    angelFreed:Boolean(source.angelFreed)
  };
}

function normalizeAlly(value, index){
  const source = value && typeof value === "object" ? value : {};
  const maxHp = Math.max(1, finite(source.maxHp, source.hp || 1));
  const maxShield = Math.max(0, finite(source.maxShield, source.shield));
  return {
    id:String(source.id || `precursor_angel_${index + 1}`),
    name:String(source.name || `Vaisseau-ange ${index + 1}`),
    x:finite(source.x),
    y:finite(source.y),
    vx:finite(source.vx),
    vy:finite(source.vy),
    angle:finite(source.angle),
    hp:clamp(source.hp === undefined ? maxHp : source.hp, 0, maxHp),
    maxHp,
    shield:clamp(source.shield === undefined ? maxShield : source.shield, 0, maxShield),
    maxShield,
    alive:source.alive !== false && finite(source.hp, 1) > 0,
    img:String(source.img || ""),
    color:String(source.color || "#f8fafc")
  };
}

function normalizeBomb(value, index){
  const source = value && typeof value === "object" ? value : {};
  return {
    id:String(source.id || `precursor_bomb_${index + 1}`),
    x:finite(source.x),
    y:finite(source.y),
    radius:Math.max(20, finite(source.radius, ANCIENT_BOMB_RADIUS)),
    detonateAt:Math.max(0, finite(source.detonateAt)),
    createdAt:Math.max(0, finite(source.createdAt || source.at))
  };
}

function normalizeEffect(value, index, receivedAt, serverAt){
  const source = value && typeof value === "object" ? value : {};
  return {
    id:String(source.id || `precursor_effect_${index}_${finite(source.at, serverAt)}`),
    type:String(source.type || source.kind || ""),
    x:finite(source.x, source.to?.x ?? source.from?.x),
    y:finite(source.y, source.to?.y ?? source.from?.y),
    radius:Math.max(0, finite(source.radius)),
    amount:finite(source.amount),
    durationMs:Math.max(100, finite(source.durationMs, 1_000)),
    at:Math.max(0, finite(source.at, serverAt)),
    receivedAt,
    serverAt
  };
}

export function isAncientPortal(portal){
  return String(portal?.id || portal?.portalId || portal || "") === ANCIENT_PORTAL_ID;
}

export function normalizeAncientObjective(value, {
  receivedAt = Date.now(),
  serverAt = value?.at
} = {}){
  const source = value && typeof value === "object" ? value : {};
  const phaseValue = String(source.phase || "").toLowerCase();
  const stageValue = String(source.stage || "").toLowerCase();
  const phase = ANCIENT_PHASES.has(phaseValue) ? phaseValue : "hell";
  const stage = ANCIENT_STAGES.has(stageValue)
    ? stageValue
    : phase === "paradise" ? "demon_king" : phase === "epilogue" ? "god" : phase === "failed" ? "failed" : "rescue";
  const normalizedReceivedAt = Math.max(0, finite(receivedAt, Date.now()));
  const normalizedServerAt = Math.max(0, finite(serverAt));
  const sourceRooms = Array.isArray(source.rooms) ? source.rooms : [];
  const rooms = ANCIENT_PORTAL_MAP.rooms.map((fallback, index)=>{
    const match = sourceRooms.find(room=>String(room?.id || "") === fallback.id)
      || sourceRooms[index]
      || fallback;
    return normalizeRoom(match, index);
  });
  const totalAngels = Math.max(2, Math.floor(finite(source.totalAngels, 2)));
  const rescuedCount = Math.max(
    0,
    Math.min(totalAngels, Math.floor(finite(
      source.rescuedCount,
      rooms.filter(room=>room.angelFreed).length
    )))
  );
  const effects = (Array.isArray(source.effects) ? source.effects : [])
    .filter((effect, index, list)=>{
      const id = String(effect?.id || "");
      return !id || list.findIndex(candidate=>String(candidate?.id || "") === id) === index;
    })
    .slice(-20)
    .map((effect, index)=>normalizeEffect(effect, index, normalizedReceivedAt, normalizedServerAt));
  return {
    kind:"precursors",
    phase,
    stage,
    deadlineAt:Math.max(0, finite(source.deadlineAt)),
    remainingMs:Math.max(0, finite(source.remainingMs)),
    rescuedCount,
    totalAngels,
    rooms,
    beacon:{
      x:finite(source.beacon?.x, ANCIENT_PORTAL_MAP.beacon.x),
      y:finite(source.beacon?.y, ANCIENT_PORTAL_MAP.beacon.y),
      radius:Math.max(60, finite(source.beacon?.radius, ANCIENT_PORTAL_MAP.beacon.radius)),
      active:Boolean(source.beacon?.active)
    },
    rift:{
      x:finite(source.rift?.x, ANCIENT_PORTAL_MAP.rift.x),
      y:finite(source.rift?.y, ANCIENT_PORTAL_MAP.rift.y),
      radius:Math.max(80, finite(source.rift?.radius, ANCIENT_PORTAL_MAP.rift.radius)),
      open:Boolean(source.rift?.open)
    },
    talisman:{acquired:Boolean(source.talisman?.acquired)},
    allies:(Array.isArray(source.allies) ? source.allies : []).map(normalizeAlly).filter(ally=>ally.alive),
    bombs:(Array.isArray(source.bombs) ? source.bombs : []).map(normalizeBomb),
    god:{
      visible:Boolean(source.god?.visible),
      x:finite(source.god?.x, ANCIENT_PORTAL_MAP.god.x),
      y:finite(source.god?.y, ANCIENT_PORTAL_MAP.god.y),
      radius:Math.max(80, finite(source.god?.radius, ANCIENT_PORTAL_MAP.god.radius))
    },
    effects,
    completedAt:Math.max(0, finite(source.completedAt)),
    failedAt:Math.max(0, finite(source.failedAt)),
    at:normalizedServerAt,
    receivedAt:normalizedReceivedAt
  };
}

export function getAncientRemainingMs(objective, now = Date.now()){
  const state = objective?.kind === "precursors"
    ? objective
    : normalizeAncientObjective(objective);
  if(state.phase === "failed" || state.completedAt) return 0;
  if(state.deadlineAt > 0 && state.at > 0){
    const elapsed = Math.max(0, finite(now) - finite(state.receivedAt, now));
    return Math.max(0, finite(state.remainingMs) - elapsed);
  }
  return Math.max(0, finite(state.remainingMs));
}

export function getAncientObjectiveHud(objective, lives = 3, now = Date.now()){
  const state = normalizeAncientObjective(objective, {
    receivedAt:objective?.receivedAt ?? now,
    serverAt:objective?.at
  });
  const remainingMs = getAncientRemainingMs(state, now);
  const discovered = state.rooms.filter(room=>room.discovered).length;
  let title = `RETROUVEZ LES VAISSEAUX-ANGES · ${state.rescuedCount}/${state.totalAngels}`;
  let detail = `${discovered}/5 salles explorées · le contenu reste secret jusqu’à votre entrée`;
  let progress = state.rescuedCount * .16 + discovered * .015;
  if(state.completedAt || state.stage === "complete"){
    title = "SANCTUAIRE DES PRÉCURSEURS SAUVÉ";
    detail = "Les vaisseaux-anges sont en sécurité et le Roi démon est vaincu.";
    progress = 1;
  }else if(state.stage === "find_talisman"){
    title = "RETROUVEZ LE GARDIEN DU TALISMAN";
    detail = "Explorez les salles restantes et éliminez le demi-boss blanc marqué du parchemin.";
    progress = .38 + discovered * .02;
  }else if(state.stage === "open_rift"){
    title = "PLACEZ LE TALISMAN DANS LA BALISE";
    detail = "Rejoignez le centre de l’enfer puis cliquez sur la balise.";
    progress = .52;
  }else if(state.stage === "enter_rift"){
    title = "LA FAILLE VERS LE PARADIS EST OUVERTE";
    detail = "Entrez dans la faille centrale avec les deux vaisseaux-anges.";
    progress = .60;
  }else if(state.stage === "demon_king"){
    title = "ABATTEZ LE ROI DES DÉMONS";
    detail = `${state.allies.length} ange(s) en soutien · évitez les bombes infernales de rayon 100.`;
    progress = .70;
  }else if(state.stage === "god" || state.phase === "epilogue"){
    title = "REJOIGNEZ LE DIEU DES VAISSEAUX";
    detail = "Le Roi démon est vaincu. Cliquez sur l’apparition divine pour achever le portail.";
    progress = .96;
  }else if(state.stage === "failed" || state.phase === "failed"){
    title = "TEMPS ÉCOULÉ · EXPULSION";
    detail = "Les vaisseaux-anges n’ont pas pu quitter l’enfer.";
    progress = 0;
  }
  return {
    title,
    detail,
    phase:state.phase,
    stage:state.stage,
    progress:clamp01(progress),
    remainingMs,
    rescuedCount:state.rescuedCount,
    totalAngels:state.totalAngels,
    discoveredRooms:discovered,
    alliesAlive:state.allies.length,
    bombsActive:state.bombs.length,
    lives:Math.max(0, Math.min(3, Math.floor(finite(lives, 3)))),
    failed:state.phase === "failed" || state.stage === "failed",
    completed:Boolean(state.completedAt)
  };
}

export function getAncientObjectiveMarkers(objective){
  const state = normalizeAncientObjective(objective);
  const markers = [];
  if(state.phase === "hell"){
    for(const room of state.rooms){
      const revealedAngel = room.discovered && room.role === "angel";
      const revealedTalisman = room.discovered && room.role === "talisman";
      markers.push({
        id:room.id,
        x:room.x,
        y:room.y,
        markerKind:room.angelFreed || revealedAngel
          ? "ancient_angel"
          : revealedTalisman
            ? "ancient_talisman"
            : room.discovered
              ? "ancient_room_discovered"
              : "ancient_room_unknown",
        number:room.angelFreed || revealedAngel ? "A" : revealedTalisman ? "T" : room.discovered ? "✓" : "?",
        active:!room.angelFreed,
        unlocked:true
      });
    }
    if(state.beacon.active){
      markers.push({
        id:"ancient_beacon",
        x:state.beacon.x,
        y:state.beacon.y,
        markerKind:"ancient_beacon",
        number:"T",
        active:true,
        unlocked:true
      });
    }
    if(state.rift.open){
      markers.push({
        id:"ancient_rift",
        x:state.rift.x,
        y:state.rift.y,
        markerKind:"ancient_rift",
        number:"◉",
        active:true,
        unlocked:true
      });
    }
  }else{
    for(const bomb of state.bombs){
      markers.push({
        id:bomb.id,
        x:bomb.x,
        y:bomb.y,
        markerKind:"ancient_bomb",
        number:"!",
        active:true,
        unlocked:true
      });
    }
    if(state.god.visible){
      markers.push({
        id:"ancient_god",
        x:state.god.x,
        y:state.god.y,
        markerKind:"ancient_god",
        number:"✦",
        active:true,
        unlocked:true
      });
    }
  }
  return markers;
}

export function getAncientInteractionTarget(objective, world){
  const state = normalizeAncientObjective(objective);
  const point = {x:finite(world?.x), y:finite(world?.y)};
  const candidates = [];
  if(state.phase === "hell" && state.beacon.active){
    candidates.push({action:"beacon", ...state.beacon, label:"Balise du talisman"});
  }
  if(state.phase === "hell" && state.rift.open){
    candidates.push({action:"rift", ...state.rift, label:"Faille vers le paradis"});
  }
  if(state.god.visible){
    candidates.push({action:"god", ...state.god, label:"Dieu des vaisseaux"});
  }
  return candidates.find(target=>
    Math.hypot(target.x - point.x, target.y - point.y) <= target.radius + 45
  ) || null;
}
