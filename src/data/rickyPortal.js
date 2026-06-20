export const RICKY_PORTAL_MAP = Object.freeze({
  width:11000,
  height:8200,
  spawn:Object.freeze({x:0, y:3400}),
  chamber:Object.freeze({
    left:-1800,
    right:1800,
    top:-1750,
    bottom:1250,
    wall:190,
    breachHalfWidth:420
  }),
  cage:Object.freeze({x:0, y:-520, radius:150, hp:30000}),
  boss:Object.freeze({x:0, y:260}),
  approachRadius:760,
  interactionRadius:170,
  channelSeconds:10,
  exitDelaySeconds:15
});

export const RICKY_PORTAL_LEVERS = Object.freeze([
  Object.freeze({id:"south_west", number:1, label:"Balise 1", x:-4300, y:2850}),
  Object.freeze({id:"south_east", number:2, label:"Balise 2", x:4300, y:2850}),
  Object.freeze({id:"north_east", number:3, label:"Balise 3", x:4300, y:-3000}),
  Object.freeze({id:"north_west", number:4, label:"Balise 4", x:-4300, y:-3000})
]);

export const RICKY_PORTAL_TRIGGER_ZONES = Object.freeze([
  Object.freeze({
    id:"route_1",
    number:1,
    centerX:-2000,
    centerY:2800,
    minX:-2850,
    maxX:-1150,
    minY:1450,
    maxY:4100
  }),
  Object.freeze({
    id:"route_2",
    number:2,
    centerX:2000,
    centerY:2800,
    minX:1150,
    maxX:2850,
    minY:1450,
    maxY:4100
  }),
  Object.freeze({
    id:"route_3",
    number:3,
    centerX:4000,
    centerY:0,
    minX:2850,
    maxX:5500,
    minY:-2200,
    maxY:2200
  }),
  Object.freeze({
    id:"route_4",
    number:4,
    centerX:0,
    centerY:-3000,
    minX:-5500,
    maxX:5500,
    minY:-4100,
    maxY:-2100
  })
]);

export const RICKY_PORTAL_RETURN_POINTS = Object.freeze({
  astra:Object.freeze({x:4300, y:-3300}),
  cyan:Object.freeze({x:4300, y:3300}),
  jaune:Object.freeze({x:-4300, y:3300}),
  verte:Object.freeze({x:-4300, y:-3300})
});

export function getRickyPortalWalls(breachOpen = false){
  const {left, right, top, bottom, wall, breachHalfWidth} = RICKY_PORTAL_MAP.chamber;
  const halfWall = wall / 2;
  const walls = [
    {id:"north", minX:left - halfWall, maxX:right + halfWall, minY:top - halfWall, maxY:top + halfWall},
    {id:"west", minX:left - halfWall, maxX:left + halfWall, minY:top - halfWall, maxY:bottom + halfWall},
    {id:"east", minX:right - halfWall, maxX:right + halfWall, minY:top - halfWall, maxY:bottom + halfWall}
  ];
  if(breachOpen){
    walls.push(
      {id:"south_west", minX:left - halfWall, maxX:-breachHalfWidth, minY:bottom - halfWall, maxY:bottom + halfWall},
      {id:"south_east", minX:breachHalfWidth, maxX:right + halfWall, minY:bottom - halfWall, maxY:bottom + halfWall}
    );
  }else{
    walls.push({id:"south", minX:left - halfWall, maxX:right + halfWall, minY:bottom - halfWall, maxY:bottom + halfWall});
  }
  return walls;
}

function circleIntersectsRect(point, radius, rect){
  const nearestX = Math.max(rect.minX, Math.min(rect.maxX, point.x));
  const nearestY = Math.max(rect.minY, Math.min(rect.maxY, point.y));
  return Math.hypot(point.x - nearestX, point.y - nearestY) < radius;
}

function collidesWithRickyWalls(point, breachOpen, radius){
  return getRickyPortalWalls(breachOpen).some(wall=>circleIntersectsRect(point, radius, wall));
}

export function resolveRickyPortalPoint(previous, requested, breachOpen = false, radius = 48){
  const padding = Math.max(16, Number(radius || 48));
  const halfW = RICKY_PORTAL_MAP.width / 2;
  const halfH = RICKY_PORTAL_MAP.height / 2;
  const next = {
    x:Math.max(-halfW + padding, Math.min(halfW - padding, Number(requested?.x || 0))),
    y:Math.max(-halfH + padding, Math.min(halfH - padding, Number(requested?.y || 0)))
  };
  const before = {
    x:Number(previous?.x ?? next.x),
    y:Number(previous?.y ?? next.y)
  };
  const distance = Math.hypot(next.x - before.x, next.y - before.y);
  const steps = Math.max(1, Math.ceil(distance / Math.max(12, padding * .45)));
  let lastSafe = before;
  for(let step = 1; step <= steps; step += 1){
    const ratio = step / steps;
    const sample = {
      x:before.x + (next.x - before.x) * ratio,
      y:before.y + (next.y - before.y) * ratio
    };
    if(collidesWithRickyWalls(sample, breachOpen, padding)) return lastSafe;
    lastSafe=sample;
  }
  if(!collidesWithRickyWalls(next, breachOpen, padding)) return next;
  const slideX = {x:next.x, y:before.y};
  if(!collidesWithRickyWalls(slideX, breachOpen, padding)) return slideX;
  const slideY = {x:before.x, y:next.y};
  if(!collidesWithRickyWalls(slideY, breachOpen, padding)) return slideY;
  return before;
}

export function findRickyPortalLever(id){
  const cleanId = String(id || "");
  return RICKY_PORTAL_LEVERS.find(lever=>lever.id === cleanId) || null;
}

export function isPointInRickyTriggerZone(point, zone){
  if(!point || !zone) return false;
  const x = Number(point.x || 0);
  const y = Number(point.y || 0);
  return x >= Number(zone.minX)
    && x <= Number(zone.maxX)
    && y >= Number(zone.minY)
    && y <= Number(zone.maxY);
}
