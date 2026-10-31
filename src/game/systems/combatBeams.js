import { LASER_VISUAL_SPEC, M6_VISUAL_SPEC } from "../combatData/weaponVisuals.js";
import { getEnemyWeaponContact } from "../combatData/enemyWeaponContact.js";

const LASER_BEAM_DURATION = LASER_VISUAL_SPEC.duration;
const LASER_BEAM_LENGTH = LASER_VISUAL_SPEC.beamLength;

function beamPalette(ammoId, blueLaser = false, variant = ""){
  if(ammoId === "ammo_x6") return {core:"rgba(255,255,255,1)", glow:"rgba(255,255,255,1)", flare:"rgba(0,0,0,1)"};
  if(variant === "spectral_double_shot"){
    return {
      core:"rgba(250,245,255,.99)",
      glow:"rgba(168,85,247,.95)",
      flare:"rgba(217,70,239,.55)"
    };
  }
  if(ammoId === "ammo_x4"){
    return {
      core:"rgba(255,252,220,.98)",
      glow:"rgba(255,222,64,.82)",
      flare:"rgba(255,190,42,.42)"
    };
  }
  if(blueLaser){
    return {
      core:"rgba(225,245,255,.98)",
      glow:"rgba(56,189,248,.86)",
      flare:"rgba(14,165,233,.38)"
    };
  }
  return {
    core:"rgba(255,238,238,.98)",
    glow:"rgba(255,52,52,.78)",
    flare:"rgba(255,80,58,.36)"
  };
}

export function createCombatBeamSystem({getTargetById} = {}){
  let beams = [];

  function clear(){
    beams = [];
  }

  function makeBeam({ammoId, fromX, fromY, toX, toY, targetId = null, canReplay = true, blueLaser = false, variant = "", widthScale = 1, duration = 0, beamLength = 0, passIndex = 0, shieldBefore}){
    const palette = beamPalette(ammoId, blueLaser, variant);
    const target = targetId && getTargetById?.(targetId);
    const contact = getEnemyWeaponContact({target, fromX, fromY, shield:shieldBefore ?? target?.shield});
    if(contact){ toX = contact.x; toY = contact.y; }
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.hypot(dx, dy) || 1;
    return {
      id:Date.now() + Math.random(),
      ammoId,
      targetId,
      canReplay,
      monochrome:ammoId === "ammo_x6",
      blueLaser,
      variant,
      passIndex,
      shieldBefore:shieldBefore ?? target?.shield,
      fromX,
      fromY,
      toX,
      toY,
      age:0,
      duration:Math.max(.08, Number(duration || LASER_BEAM_DURATION)),
      beamLength:Math.max(40, Number(beamLength || LASER_BEAM_LENGTH)),
      widthScale:Math.max(.4, Number(widthScale || 1)),
      distance,
      ...palette
    };
  }

  function add(beam){
    if(beam.ammoId === "ammo_x6"){
      const dx = beam.toX - beam.fromX, dy = beam.toY - beam.fromY;
      const distance = Math.hypot(dx, dy) || 1;
      for(const [index, lateral] of [0, -11, 11, 0].entries()){
        const back = index === 1 || index === 2 ? 6 : 0;
        const pulse = makeBeam({...beam, passIndex:index, canReplay:false, duration:M6_VISUAL_SPEC.travelTime,
          beamLength:distance,
          fromX:beam.fromX - dx / distance * back - dy / distance * lateral,
          fromY:beam.fromY - dy / distance * back + dx / distance * lateral});
        pulse.age = -M6_VISUAL_SPEC.pulseOffsets[index];
        beams.push(pulse);
      }
      return;
    }
    beams.push(makeBeam(beam));
  }

  function update(dt){
    const replayBeams = [];
    for(const beam of beams){
      beam.age += dt;
      const liveTarget = beam.targetId && getTargetById?.(beam.targetId);
      const contact = getEnemyWeaponContact({target:liveTarget, fromX:beam.fromX, fromY:beam.fromY, shield:beam.shieldBefore});
      if(contact){
        beam.toX = contact.x; beam.toY = contact.y;
        beam.distance = Math.hypot(beam.toX - beam.fromX, beam.toY - beam.fromY) || 1;
      }
      if(beam.age < beam.duration || !beam.canReplay || !beam.targetId || !getTargetById) continue;
      const target = getTargetById(beam.targetId);
      if(!target || Number(target.hp || 0) <= 0) continue;
      replayBeams.push(makeBeam({
        ammoId:beam.ammoId,
        fromX:beam.fromX,
        fromY:beam.fromY,
        toX:target.x,
        toY:target.y,
        targetId:beam.targetId,
        shieldBefore:beam.shieldBefore,
        canReplay:false,
        blueLaser:beam.blueLaser,
        variant:beam.variant,
        widthScale:beam.widthScale,
        duration:beam.duration,
        beamLength:beam.beamLength
      }));
    }
    beams = beams.filter(beam=>beam.age < beam.duration);
    beams.push(...replayBeams);
  }

  return {
    clear,
    add,
    update,
    getBeams:()=>beams
  };
}
