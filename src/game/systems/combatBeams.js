const LASER_BEAM_DURATION = 0.20;
const LASER_BEAM_LENGTH = 130;

function beamPalette(ammoId, blueLaser = false){
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

  function makeBeam({ammoId, fromX, fromY, toX, toY, targetId = null, canReplay = true, blueLaser = false}){
    const palette = beamPalette(ammoId, blueLaser);
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.hypot(dx, dy) || 1;
    return {
      id:Date.now() + Math.random(),
      ammoId,
      targetId,
      canReplay,
      blueLaser,
      fromX,
      fromY,
      toX,
      toY,
      age:0,
      duration:LASER_BEAM_DURATION,
      beamLength:LASER_BEAM_LENGTH,
      distance,
      ...palette
    };
  }

  function add(beam){
    beams.push(makeBeam(beam));
  }

  function update(dt){
    const replayBeams = [];
    for(const beam of beams){
      beam.age += dt;
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
        canReplay:false,
        blueLaser:beam.blueLaser
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
