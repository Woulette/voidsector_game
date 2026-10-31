export const THRUSTER_WAKE_CAPACITY = 32;
export const THRUSTER_WAKE_STRIDE = 9;
export const THRUSTER_WAKE_LIFETIME = .85;
const EMISSION_PERIOD = 1 / 30;
const clamp = (value,min,max)=>Math.max(min,Math.min(max,value));

export function supportsShipThruster3d(ship){return ship?.id === "orion";}

export function createThrusterMotion(){
  return {points:new Float32Array(THRUSTER_WAKE_CAPACITY * THRUSTER_WAKE_STRIDE),head:0,count:0,
    power:0,clock:0,time:null,emitter:new Float64Array(3),serial:0};
}

export function advanceThrusterMotion(state,{time,power,emitter,direction,scale=1,enabled=true}){
  let dt = state.time === null ? 0 : time-state.time;
  const jump = Math.hypot(emitter.x-state.emitter[0],emitter.y-state.emitter[1],emitter.z-state.emitter[2]);
  if(dt < 0 || dt > .25 || (state.time !== null && jump > scale * 2)){
    state.count=state.head=0;state.clock=0;state.power=0;dt=0;
  }
  const target = enabled ? clamp(Number(power)||0,0,1) : 0;
  state.power += (target-state.power) * (1-Math.exp(-dt*(target<state.power ? 12 : 9)));
  const points=state.points;
  for(let i=0;i<state.count;i++){
    const offset=((state.head+i)%THRUSTER_WAKE_CAPACITY)*THRUSTER_WAKE_STRIDE;
    points[offset]+=points[offset+6]*dt;points[offset+1]+=points[offset+7]*dt;points[offset+2]+=points[offset+8]*dt;
    points[offset+3]+=dt;
  }
  while(state.count && points[state.head*THRUSTER_WAKE_STRIDE+3] >= THRUSTER_WAKE_LIFETIME){
    state.head=(state.head+1)%THRUSTER_WAKE_CAPACITY;state.count--;
  }
  if(!enabled){state.count=0;state.clock=0;}
  else if(state.power > .04 && dt > 0){
    state.clock+=dt;
    while(state.clock >= EMISSION_PERIOD){
      state.clock-=EMISSION_PERIOD;
      const age=state.clock,mix=clamp(1-age/dt,0,1);
      const index=((state.head+state.count)%THRUSTER_WAKE_CAPACITY)*THRUSTER_WAKE_STRIDE;
      const speed=scale*.20;
      points[index]=state.emitter[0]+(emitter.x-state.emitter[0])*mix+direction.x*speed*age;
      points[index+1]=state.emitter[1]+(emitter.y-state.emitter[1])*mix+direction.y*speed*age;
      points[index+2]=state.emitter[2]+(emitter.z-state.emitter[2])*mix+direction.z*speed*age;
      points[index+3]=age;points[index+4]=state.power;points[index+5]=(state.serial++%97)/97;
      points[index+6]=direction.x*speed;points[index+7]=direction.y*speed;points[index+8]=direction.z*speed;
      if(state.count < THRUSTER_WAKE_CAPACITY) state.count++;
      else state.head=(state.head+1)%THRUSTER_WAKE_CAPACITY;
    }
  }else state.clock=0;
  state.emitter[0]=emitter.x;state.emitter[1]=emitter.y;state.emitter[2]=emitter.z;
  state.time=time;
  return state;
}

export function configureThrusterPlume(state,inverse,worldOffset){
  state.plumeLength=.12+Math.sqrt(state.power)*.33;
  const end=.388+state.plumeLength,points=state.points;
  let x=0,y=0,previousX=0,previousY=0,previousZ=.61;
  // Follow the young wake in the current hull frame. Never extrapolate an
  // angular-rate bend beyond the smoke or follow an old, folded-back wisp.
  for(let i=state.count-1;end>.61 && i>=0;i--){
    const index=((state.head+i)%THRUSTER_WAKE_CAPACITY)*THRUSTER_WAKE_STRIDE;
    if(points[index+3]>.25) break;
    const px=points[index]-(worldOffset?.x || 0),py=points[index+1]-(worldOffset?.y || 0),pz=points[index+2]-(worldOffset?.z || 0);
    const localX=inverse[0]*px+inverse[4]*py+inverse[8]*pz+inverse[12];
    const localY=inverse[1]*px+inverse[5]*py+inverse[9]*pz+inverse[13]+.008;
    const localZ=inverse[2]*px+inverse[6]*py+inverse[10]*pz+inverse[14];
    if(localZ<previousZ-.002) break;
    if(localZ<=previousZ+.0001) continue;
    const mix=clamp((end-previousZ)/(localZ-previousZ),0,1);
    x=previousX+(localX-previousX)*mix;y=previousY+(localY-previousY)*mix;
    if(localZ>=end) break;
    previousX=localX;previousY=localY;previousZ=localZ;
  }
  const distance=Math.hypot(x,y),limit=state.plumeLength*.3;
  const factor=distance>limit ? limit/distance : 1;
  state.plumeCurveX=x*factor;state.plumeCurveY=y*factor;
  state.plumeCurve=distance*factor;
  state.plumeRotation=distance>1e-6 ? Math.atan2(y,x) : 0;
  state.plumeWidth=.18+Math.abs(state.plumeCurve);
  state.plumeBend=state.plumeCurve/state.plumeWidth;
  return state;
}
