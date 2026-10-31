import { drawEnemies } from "../../src/game/render/entities.js";
import { getEnemyRenderRotation } from "../../src/data/enemyVisuals.js";
import { clamp, glow, smooth } from "./drawing.js";
import { drawCreatureBody } from "./creatureRig.js?v=creatures-clean-2";
import { drawCreatureWake } from "./creatureWake.js?v=creatures-clean-2";
import { drawOrbSentinel } from "./orb/renderer.js?v=orb-live-1";
import { isOrbKind } from "./orb/profiles.js?v=orb-live-1";
import { drawVorakRusher } from "./vorak/renderer.js?v=vorak-boss-1";
import { isVorakKind } from "./vorak/profiles.js";
import { drawParasite } from "./parasite/renderer.js?v=parasite-independent-1";
import { isParasiteKind } from "./parasite/profiles.js";
import { drawAbyssalTracker } from "./tracker/renderer.js?v=parasite-motion-tracker-arcs-1";
import { drawTrackerBoss } from "./tracker/boss.js?v=tracker-boss-1";
import { drawEclanite } from "./eclanite/renderer.js?v=eclanite-live-1";

// One visual owner for these proposals; legacy idle/attack transforms must
// not be applied on top of this rig.
export const CREATURE_PROFILES = {
  drone_pirate:{name:"Orbe commun · six petites pattes", style:"ion", rgb:"70,201,255", channel:"blue", life:1.1, width:7, radius:.22},
  boss_drone_pirate:{name:"Boss Orbe · huit branches", style:"ion", rgb:"70,201,255", channel:"blue", life:1.1, width:7, radius:.22},
  raider_astral:{name:"Vorak commun · intercepteur articulé"},
  boss_raider_astral:{name:"Boss Vorak · intercepteur blindé"},
  chasseur_spectral:{name:"Parasite commun · six tentacules souples"},
  boss_chasseur_spectral:{name:"Boss Parasite · couronne organique"},
  cuirasse_nebulaire:{name:"Traqueur · base bleue sélectionnée"},
  boss_cuirasse_nebulaire:{name:"Boss Traqueur · épaules blindées et lames segmentées"},
  eclanite:{name:"Éclanite · noyau minéral et six fragments vivants"},
  cuirasse_ambre:{name:"Cuirasse · moteurs lourds", style:"jet", rgb:"255,155,35", channel:"amber", life:1.75, width:10, radius:.35,
    nozzles:[{x:.125,y:.64,dy:1},{x:.81,y:.64,dy:1}]}
};

export function creatureAttack(age){
  const charge = age >= -.3 && age < 0 ? smooth((age + .3) / .3) : 0;
  const flash = age >= 0 && age < .42 ? Math.exp(-age * 9) : 0;
  return {charge, flash};
}

export function drawNewCreature(ctx, enemy, image, time, shotAge, dt, state){
  const profile = CREATURE_PROFILES[enemy.kind];
  if(!profile){
    drawEnemies({ctx, camera:{x:0,y:0}, cache:{[enemy.img]:image}, enemies:[enemy], selectedEnemy:null});
    return;
  }
  if(!image?.naturalWidth) return;
  if(enemy.kind === "eclanite"){
    state.eclanite??={};
    drawEclanite(ctx,enemy,time,shotAge,dt,state.eclanite);
    return;
  }
  if(enemy.kind === "boss_cuirasse_nebulaire"){
    state.trackerBoss??={};
    drawTrackerBoss(ctx,enemy,time,shotAge,dt,state.trackerBoss);
    return;
  }
  if(enemy.kind === "cuirasse_nebulaire"){
    state.tracker??={};
    drawAbyssalTracker(ctx,enemy,time,shotAge,dt,state.tracker);
    return;
  }
  if(isParasiteKind(enemy.kind)){
    state.parasite??={};
    drawParasite(ctx,enemy,time,shotAge,dt,state.parasite);
    return;
  }
  if(isVorakKind(enemy.kind)){
    state.vorak??={};
    drawVorakRusher(ctx,enemy,time,shotAge,dt,state.vorak);
    return;
  }
  if(isOrbKind(enemy.kind)){
    state.orb??={};
    drawOrbSentinel(ctx,enemy,time,shotAge,dt,state.orb);
    return;
  }
  const angle = getEnemyRenderRotation(enemy.kind, enemy.angle);
  if(dt>0 && state.motionTime!==time){
    const previous=state.motionPosition;
    state.velocity=previous ? {vx:(enemy.x-previous.x)/dt,vy:(enemy.y-previous.y)/dt}
      : {vx:enemy.vx || 0,vy:enemy.vy || 0};
    state.motionPosition={x:enemy.x,y:enemy.y};
    state.motionTime=time;
  }
  // The workshop clamps its arena. A blocked mob must not emit propulsion
  // just because the AI's requested velocity still points beyond the wall.
  const visualEnemy={...enemy,...state.velocity};
  const speed = Math.hypot(visualEnemy.vx || 0, visualEnemy.vy || 0);
  const power = clamp(speed / 65);
  const attack = creatureAttack(shotAge);
  drawCreatureWake(ctx, {enemy:visualEnemy, profile, angle, time, dt, power, state});
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(angle);
  const organic = profile.style === "organic";
  const coreY = organic ? enemy.height * .045 : 0;
  glow(ctx, 0, coreY, enemy.width * (organic ? .52 : .3), `rgba(${profile.rgb},1)`,
    .11 + attack.charge * .18 + attack.flash * (organic ? .62 : .3));
  drawCreatureBody(ctx, {image, enemy:visualEnemy, profile, time, power, attack, angle});
  if(organic) glow(ctx, -enemy.width * .025, coreY, enemy.width * .16,
    `rgba(${profile.rgb},1)`, .12 + attack.flash * .7 + attack.charge * .22);
  ctx.restore();
}
