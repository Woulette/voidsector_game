import { ammoTypes } from "../../data/catalog.js";
import { createProjectile } from "./projectiles.js";

export function createRemoteWeaponEventProcessor({
  multiplayer,
  getState,
  beams,
  getCurrentMapToken
}){
  function applyRemoteWeaponEvents(){
    if(!multiplayer.remoteEffects?.length) return;
    const {currentMap, bullets, particles} = getState();
    const remaining = [];
    for(const event of multiplayer.remoteEffects.splice(0)){
      if(String(event.mapId ?? "") !== getCurrentMapToken(currentMap)){
        if((Date.now() - Number(event.createdAt || 0)) < 2000) remaining.push(event);
        continue;
      }
      const ammo = ammoTypes.find(entry=>entry.id === event.ammoId) || null;
      const kind = ["laser", "rocket", "missile"].includes(event.kind) ? event.kind : "laser";
      const starts = Array.isArray(event.starts) && event.starts.length
        ? event.starts
        : [{x:event.fromX, y:event.fromY, curveSide:0, curveStrength:0}];
      const toX = Number(event.toX || 0);
      const toY = Number(event.toY || 0);
      if(kind === "laser"){
        const start = starts[0] || {};
        beams.add({
          ammoId:ammo?.id || event.ammoId || "ammo_x1",
          fromX:Number(start.x ?? event.fromX ?? 0),
          fromY:Number(start.y ?? event.fromY ?? 0),
          toX,
          toY,
          targetId:event.targetId || null,
          blueLaser:Boolean(event.blueLaser)
        });
        continue;
      }
      const targetId = event.targetId === `player:${multiplayer.playerId}` ? "player" : String(event.targetId || "");
      for(const start of starts.slice(0, 12)){
        const bullet = createProjectile({
          owner:"remotePlayer",
          startX:Number(start.x || 0),
          startY:Number(start.y || 0),
          targetId,
          damage:0,
          travelTime:Math.max(.1, Math.min(2, Number(event.travelTime || .5))),
          radius:kind === "rocket" ? 10 : 7,
          color:ammo?.color || event.color || "rgba(125,211,252,.95)",
          particle:ammo?.particle || event.color || "rgba(147,197,253,.82)",
          kind,
          sprite:ammo?.projectileImg || ammo?.img || null,
          curveSide:Number(start.curveSide || 0),
          curveStrength:Number(start.curveStrength || 0),
          visualOnly:true,
          ammoId:ammo?.id || event.ammoId || null
        });
        bullet.fixedTarget = {x:toX, y:toY, hp:1};
        bullets.push(bullet);
        particles.push({
          x:Number(start.x || 0),
          y:Number(start.y || 0),
          life:.24,
          max:.24,
          size:kind === "rocket" ? 26 : 22,
          color:ammo?.particle || event.color || "rgba(147,197,253,.82)"
        });
      }
    }
    multiplayer.remoteEffects.push(...remaining);
  }

  return {
    applyRemoteWeaponEvents
  };
}
