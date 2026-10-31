import { LASER_VISUAL_SPEC, M6_VISUAL_SPEC } from "../../src/game/combatData/weaponVisuals.js";
import { createCombatBeamSystem } from "../../src/game/systems/combatBeams.js";
import { createCombatEnemyImpactSystem } from "../../src/game/systems/combatEnemyImpacts.js";

export const SHIELD_PREVIEW_PERIOD = 3;
export const SHIELD_PREVIEW_START = .38;

export function buildShieldPreviewFrame({time,ammoId,target,from,lethal = false}){
  const age=time-SHIELD_PREVIEW_START;
  const x6=ammoId === "ammo_x6",duration=x6 ? M6_VISUAL_SPEC.travelTime : LASER_VISUAL_SPEC.duration;
  const offsets=x6 ? M6_VISUAL_SPEC.pulseOffsets : [0,LASER_VISUAL_SPEC.duration];
  const enemy={...target,id:"shield-preview",hp:100,shield:100,maxHp:100,maxShield:100};
  const beamSystem=createCombatBeamSystem({getTargetById:()=>enemy});
  const beam={ammoId,fromX:from.x+27,fromY:from.y,toX:target.x,toY:target.y,targetId:enemy.id,
    shieldBefore:lethal ? 0 : 100,canReplay:false};
  beamSystem.add(beam);
  if(!x6 && !lethal) beamSystem.add(beam);
  const shots=beamSystem.getBeams().map((shot,index)=>({...shot,age:age-offsets[index]}));
  const effects=[];
  if(age>=0){
    let now=0;
    const state={currentMap:{id:"preview"},impactEffects:effects};
    const impacts=createCombatEnemyImpactSystem({getState:()=>state,now:()=>now});
    const event={shotId:"preview-hit",attackerId:"preview-pilot",enemyId:enemy.id,mapId:"preview",accepted:true,
      hit:true,damage:lethal ? 1000 : 20,weaponClass:"laser",ammoId,fromX:beam.fromX,fromY:beam.fromY,
      shieldBefore:100,targetDestroyed:lethal};
    impacts.observeShot(event); now=age*1000; impacts.addHit(event,enemy);
    effects.forEach((effect,index)=>{effect.visualAge=age-duration-offsets[index];});
  }
  const deathAge=lethal ? age-duration : -1;
  return {shots,effects,deathAge,targetAlpha:deathAge<0 ? 1 : Math.max(0,1-deathAge/.13),
    phase:age<0 ? "Préparation" : age<duration ? "Trajet du laser" : deathAge>=0 ? "Coup fatal · aucun bouclier"
      : age<offsets.at(-1)+duration+.56 ? "Impact · réaction du bouclier" : "Dissipation terminée"};
}
