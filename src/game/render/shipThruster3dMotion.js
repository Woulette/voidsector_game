export const THRUSTER_WAKE_CAPACITY = 32;
export const THRUSTER_WAKE_STRIDE = 9;
export const THRUSTER_WAKE_LIFETIME = .85;
const EMISSION_PERIOD = 1 / 30;
const clamp = (value,min,max)=>Math.max(min,Math.min(max,value));

export function supportsShipThruster3d(ship){return ship?.id === "orion";}

export function createThrusterMotion(){
  return {points:new Float32Array(THRUSTER_WAKE_CAPACITY * THRUSTER_WAKE_STRIDE),head:0,count:0,
    power:0,bend:0,clock:0,time:null,angle:0,emitter:new Float64Array(3),serial:0};
}

export function advanceThrusterMotion(state,{time,power,angle,emitter,direction,scale=1,enabled=true}){
  let dt = state.time === null ? 0 : time-state.time;
  const jump = Math.hypot(emitter.x-state.emitter[0],emitter.y-state.emitter[1],emitter.z-state.emitter[2]);
  if(dt < 0 || dt > .25 || (state.time !== null && jump > scale * 2)){
    state.count=state.head=0;state.clock=0;state.power=0;state.bend=0;dt=0;
  }
  const target = enabled ? clamp(Number(power)||0,0,1) : 0;
  state.power += (target-state.power) * (1-Math.exp(-dt*(target<state.power ? 12 : 9)));
  const turn = Math.atan2(Math.sin(angle-state.angle),Math.cos(angle-state.angle));
  const bend = dt > 0 ? clamp(-turn/dt*.06,-.6,.6) : 0;
  state.bend += (bend-state.bend)*(1-Math.exp(-dt*9));
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
  state.angle=angle;state.time=time;
  return state;
}
