import { clamp, mix } from "./vfxPrimitives.js";

const SAMPLE_PERIOD = 1 / 45;
const MAX_SAMPLES = 72;
const wakeTextures = new Map();

// Samples keep their emission direction. Turning the ship must not rotate
// exhaust that has already left the nozzle. Velocity is the preview camera's
// travel velocity (zero for world coordinates); samples have bounded lifetime.
export function advanceEngineWake(state, emitters, velocity, dt, power, lifetime){
  state.tracks ??= emitters.map(()=>[]);
  state.sampleTime ??= 0;
  state.serial ??= 0;
  for(const track of state.tracks){
    for(const point of track){
      point.age += dt;
      point.x += (point.vx - velocity.x) * dt;
      point.y += (point.vy - velocity.y) * dt;
    }
    while(track.length && track[0].age >= track[0].life) track.shift();
  }
  if(power > .04 && dt > 0){
    state.sampleTime += dt;
    while(state.sampleTime >= SAMPLE_PERIOD){
      state.sampleTime -= SAMPLE_PERIOD;
      const age = state.sampleTime;
      const serial = state.serial++;
      emitters.forEach((emitter, index)=>{
        const previous = state.emitters?.[index] || emitter;
        const amount = clamp(1 - age / dt);
        const vx = mix(previous.dx, emitter.dx, amount) * 28;
        const vy = mix(previous.dy, emitter.dy, amount) * 28;
        const track = state.tracks[index];
        track.push({x:mix(previous.x, emitter.x, amount) + (vx - velocity.x) * age,
          y:mix(previous.y, emitter.y, amount) + (vy - velocity.y) * age,
          vx, vy, age, life:lifetime, width:emitter.width, power,
          serial, seed:noise(serial + index * 137)});
        if(track.length > MAX_SAMPLES) track.shift();
      });
    }
  }else if(power <= .04){
    state.sampleTime = 0;
  }
  state.emitters = emitters.map(emitter=>({...emitter}));
  return state.tracks;
}

const noise = n=>{const value=Math.sin(n * 127.1 + 311.7) * 43758.5453;return value-Math.floor(value);};

// The cloud expands after emission; old clouds retain their world direction.
export function engineWakeCloudSpec(point){
  const age = clamp(point.age / point.life), seed = point.seed ?? .5;
  const width = point.width * (2.65 + age * 3.6);
  const opacity = Math.min(1, point.age / .075) * (1-age) ** 1.15 * point.power * .80;
  return {width, height:width * (.8 + seed * .13), opacity,
    rotation:seed * Math.PI * 2 + age * (seed-.5) * .8,
    offset:(seed-.5) * point.width * age * .7};
}

function wakeTexture(color, lit){
  const key = `${color}:${lit}`;
  if(wakeTextures.has(key)) return wakeTextures.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext("2d");
  const rgb = color.split(",").map(value=>Math.round(lit ? 175 + Number(value)*.30 : 70 + Number(value)*.38)).join(",");
  for(const [x,y,r,strength] of [[47,48,43,.68],[32,42,29,.34],[62,36,28,.38],[57,62,28,.32]]){
    const gradient = ctx.createRadialGradient(x,y,0,x,y,r);
    gradient.addColorStop(0, `rgba(${rgb},${strength})`);
    gradient.addColorStop(.35, `rgba(${rgb},${strength*.72})`);
    gradient.addColorStop(.72, `rgba(${rgb},${strength*.23})`);
    gradient.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,96,96);
  }
  wakeTextures.set(key, canvas);
  return canvas;
}

export function drawEngineWake(ctx, tracks, color){
  if(!tracks.some(track=>track.length)) return;
  const body = wakeTexture(color, false), light = wakeTexture(color, true);
  const density = 1 / Math.sqrt(Math.max(1, tracks.length * .40));
  ctx.save();
  for(const track of tracks){
    for(const point of track){
      // Stable decimation bounds rendering to at most 72 draws per nozzle.
      if(point.serial % 2) continue;
      const cloud = engineWakeCloudSpec(point);
      if(cloud.opacity <= 0) continue;
      const length = Math.hypot(point.vx,point.vy) || 1;
      ctx.save();
      ctx.translate(point.x - point.vy/length * cloud.offset, point.y + point.vx/length * cloud.offset);
      ctx.rotate(cloud.rotation);
      // A tinted body provides contrast over bright nebulae; the soft lit core
      // keeps that same smoke readable in empty space without an additive wash.
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = cloud.opacity * density;
      ctx.drawImage(body,-cloud.width/2,-cloud.height/2,cloud.width,cloud.height);
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = cloud.opacity * density * .54;
      ctx.drawImage(light,-cloud.width*.41,-cloud.height*.41,cloud.width*.82,cloud.height*.82);
      ctx.restore();
    }
  }
  ctx.restore();
}
