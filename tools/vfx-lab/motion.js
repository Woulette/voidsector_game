import { updateEnemyPursuit, moveEnemyToward } from "../../server/src/world/pursuit.js";
import { clamp, mix } from "./drawing.js";

export const movementNames = {drone_pirate:"Mouvement actuel", raider_astral:"Mouvement actuel", chasseur_spectral:"Mouvement actuel", cuirasse_nebulaire:"Mouvement actuel", cuirasse_ambre:"Mouvement actuel", eclanite:"Orientation fixe"};

export function demoTarget(time, width, height, scenario){
  const x = width - Math.max(64, width * .17);
  const y = height * .53;
  if(scenario !== "pursuit") return {x, y, angle:-Math.PI / 2, moving:false};
  const dx = Math.min(15, width * .035), dy = Math.min(54, height * .18);
  const vx = Math.cos(time * .61) * dx * .61;
  const vy = Math.cos(time * .73) * dy * .73;
  return {x:x + Math.sin(time * .61) * dx, y:y + Math.sin(time * .73) * dy,
    angle:Math.atan2(vy, vx) + Math.PI / 2, moving:true};
}

function arena(subject, width, height, target, scenario){
  const left = Math.max(42, subject.width / 2 + 15);
  const top = Math.max(36, subject.height / 2 + 17);
  const bottom = Math.max(top + 20, height - top);
  const right = scenario === "patrol" ? width - left : Math.max(left + 20, target.x - subject.width / 2 - 58);
  return {left, right:Math.min(width - left, right), top, bottom};
}

export function enemyMovement({subject,time,dt,width,height,scenario,state}){
  const target=demoTarget(time,width,height,scenario);
  const bounds=arena(subject,width,height,target,scenario);
    state.enemy ??= {id:"vfx-legacy-pursuit", kind:subject.kind, x:bounds.left, y:height * .5, angle:Math.PI / 2};
    const enemy = state.enemy;
    const speed = Number(subject.speed?.() || 190) * .38;
    if(scenario === "patrol"){
      const points = [[.08, .2], [.9, .2], [.9, .8], [.08, .8]];
      state.point ??= 0;
      const p = points[state.point];
      const destination = {x:mix(bounds.left, bounds.right, p[0]), y:mix(bounds.top, bounds.bottom, p[1])};
      if(moveEnemyToward(enemy, destination, speed, dt, 2) <= 2.01) state.point = (state.point + 1) % points.length;
    }else{
      const range = Math.min(subject.attackRange, Math.max(100, (target.x - bounds.left) / .7));
      updateEnemyPursuit(enemy, {...target, id:"preview-pilot", formationAngle:Math.PI, mapWidth:width * 3, mapHeight:height * 3}, speed, range, dt, 1000 + time * 1000);
      enemy.x = clamp(enemy.x, bounds.left, bounds.right);
      enemy.y = clamp(enemy.y, bounds.top, bounds.bottom);
    }
    return {...enemy};
}
