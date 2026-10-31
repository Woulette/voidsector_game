// Shared death visual selected in the comparison: A, Souffle plasma.
// Its colours, dimensions and timing are identical for every enemy family.
export const ENEMY_DEATH_EXPLOSION_LIFE = 2.2;
export const ENEMY_DEATH_EXPLOSION_RADIUS = 110;

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1)=>Math.max(a, Math.min(b, v));
const mix = (a, b, t)=>a + (b - a) * t;
const ease = t=>1 - Math.pow(1 - clamp(t), 3);
const smooth = t=>{t = clamp(t); return t * t * (3 - 2 * t);};
const hash = n=>{const h = Math.sin(n * 127.1 + 311.7) * 43758.5453; return h - Math.floor(h);};
const rgba = (rgb, a)=>`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(a)})`;
const blend = (a, b, t)=>a.map((v, i)=>Math.round(mix(v, b[i], clamp(t))));
const WHITE = [255,247,226], ORANGE = [255,113,26], GOLD = [255,195,83];
const textures = new Map();
const sparks = Array.from({length:64}, (_, i)=>({
  angle:hash(i * 4 + 638) * TAU,
  speed:40 + hash(i * 4 + 639) * 150,
  size:.45 + hash(i * 4 + 640) * 2.5,
  life:.28 + hash(i * 4 + 641) * 1.5,
  delay:hash(i + 811) * .045
}));

export function createEnemyDeathExplosion(enemy){
  const x = Number(enemy?.x), y = Number(enemy?.y);
  if(!Number.isFinite(x) || !Number.isFinite(y) || enemy?.isPlayerTarget) return null;
  return {kind:"enemyDeathExplosion", x, y, radius:ENEMY_DEATH_EXPLOSION_RADIUS,
    life:ENEMY_DEATH_EXPLOSION_LIFE, max:ENEMY_DEATH_EXPLOSION_LIFE, visualOnly:true};
}

function noise(x, y, seed){
  const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
  const n = (a, b)=>hash(a * 13.1 + b * 71.7 + seed * 19.4);
  return mix(mix(n(ix,iy), n(ix+1,iy), fx), mix(n(ix,iy+1), n(ix+1,iy+1), fx), fy);
}

function cloudTexture(type, seed){
  const key = `${type}:${seed}`;
  if(textures.has(key)) return textures.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 112;
  const ctx = canvas.getContext("2d"), pixels = ctx.createImageData(112,112);
  for(let y = 0; y < 112; y++) for(let x = 0; x < 112; x++){
    const nx = (x - 55.5) / 55.5, ny = (y - 55.5) / 55.5;
    const n = noise(nx*3+8,ny*3+8,seed)*.58 + noise(nx*7+14,ny*7+14,seed+5)*.27
      + noise(nx*15+24,ny*15+24,seed+9)*.15;
    const d = clamp((1 - Math.hypot(nx,ny)) * 1.85 + n * .83 - .52);
    let color, alpha;
    if(type === "fire"){
      const hot = clamp(d * .82 + n * .38);
      color = hot > .64 ? blend(GOLD, WHITE, (hot - .64) / .36) : blend([180,38,9], ORANGE, hot / .64);
      alpha = Math.pow(d,1.1) * .92;
    }else{
      color = blend([25,32,45], [62,71,87], n * .7 + d * .5);
      alpha = Math.pow(d,1.35) * .68;
    }
    const offset = (y * 112 + x) * 4;
    pixels.data[offset] = color[0]; pixels.data[offset+1] = color[1];
    pixels.data[offset+2] = color[2]; pixels.data[offset+3] = alpha * 255;
  }
  ctx.putImageData(pixels,0,0);
  textures.set(key,canvas);
  return canvas;
}

export function warmEnemyDeathExplosionTextures(){
  if(typeof document === "undefined") return;
  for(let i = 0; i < 5; i++) cloudTexture("fire",i);
  for(let i = 0; i < 4; i++) cloudTexture("smoke",i);
}

function glow(ctx, x, y, radius, color, alpha){
  if(radius <= 0 || alpha <= 0) return;
  const gradient = ctx.createRadialGradient(x,y,0,x,y,radius);
  gradient.addColorStop(0,rgba(color,alpha)); gradient.addColorStop(.2,rgba(color,alpha*.65));
  gradient.addColorStop(.55,rgba(color,alpha*.18)); gradient.addColorStop(1,rgba(color,0));
  ctx.fillStyle = gradient;
  ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
}

function cloud(ctx, type, x, y, radius, angle, alpha, seed, squash = 1){
  if(alpha <= 0 || radius <= 0) return;
  ctx.save(); ctx.translate(x,y); ctx.rotate(angle); ctx.globalAlpha *= clamp(alpha);
  ctx.drawImage(cloudTexture(type,seed),-radius,-radius*squash,radius*2,radius*2*squash);
  ctx.restore();
}

function line(ctx, x1, y1, x2, y2, color, width, alpha){
  if(alpha <= 0) return;
  ctx.strokeStyle = rgba(color,alpha); ctx.lineWidth = width; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
}

function drawSmoke(ctx, t, reduced){
  if(t < .1) return;
  const age = t - .1, fade = smooth(age/.32) * Math.pow(1-clamp(age/2.1),1.3) * 1.18;
  const count = reduced ? 5 : 13;
  for(let i = 0; i < count; i++){
    const angle = hash(i+22) * TAU, distance = (12+hash(i+81)*24) * ease(age/1.3) * 1.12;
    const radius = 12 + age * (12+hash(i+91)*12);
    cloud(ctx,"smoke",Math.cos(angle)*distance,Math.sin(angle)*distance-age*4,radius,
      angle+age*.1,fade,i%4,.8+hash(i+51)*.35);
  }
}

function drawSparks(ctx, t, reduced){
  const count = reduced ? 12 : sparks.length;
  for(let i = 0; i < count; i++){
    const p = sparks[i], age = t - p.delay;
    if(age < 0 || age > p.life) continue;
    const travel = p.speed * (1-Math.exp(-age*2.5)) / 2.5 * 1.22;
    const tail = p.speed * Math.exp(-age*2.5) * .025 * 1.22;
    const alpha = Math.pow(1-age/p.life,1.2), angle = p.angle + Math.sin(i*1.7)*age*.06;
    const x = Math.cos(angle)*travel, y = Math.sin(angle)*travel, color = i%5 === 0 ? WHITE : GOLD;
    line(ctx,x-Math.cos(angle)*tail,y-Math.sin(angle)*tail,x,y,color,p.size*.55,alpha);
    if(!reduced && i%3 === 0) glow(ctx,x,y,2.5+p.size,color,alpha*.36);
  }
}

export function drawEnemyDeathExplosion(ctx, effect, {showExplosions = true, showSparksSmoke = true, reduced = false} = {}){
  const t = Number(effect?.max) - Number(effect?.life);
  if(!Number.isFinite(t) || t < 0 || t >= ENEMY_DEATH_EXPLOSION_LIFE
    || (!showExplosions && !showSparksSmoke)) return;
  ctx.save(); ctx.translate(effect.x,effect.y); ctx.globalCompositeOperation = "source-over";
  if(showSparksSmoke) drawSmoke(ctx,t,reduced);
  ctx.globalCompositeOperation = "lighter";
  if(showExplosions){
    glow(ctx,0,0,30+ease(t/.3)*71,ORANGE,Math.exp(-t*4)*.55);
    for(let i = 0; i < (reduced ? 6 : 13); i++){
      const age = t - hash(i+991)*.08;
      if(age < 0) continue;
      const angle = hash(i+41)*TAU, distance = (12+hash(i+24)*40)*ease(age/.42);
      const radius = 7 + (12+hash(i+39)*19)*ease(age/.25);
      const fade = Math.exp(-age*(3.6+hash(i+22)*2))*smooth(age/.035);
      cloud(ctx,"fire",Math.cos(angle)*distance,Math.sin(angle)*distance,radius,angle+age*.3,
        fade,i%5,.8+hash(i+14)*.45);
    }
    glow(ctx,0,0,9+ease(t/.15)*32,WHITE,Math.exp(-t*6)*.96);
    if(t < .25){
      const strength = Math.exp(-t*18);
      glow(ctx,0,0,14,GOLD,strength);
      line(ctx,-90,0,90,0,ORANGE,.8,strength*.55);
      line(ctx,-22,0,22,0,WHITE,1.8,strength*.95);
    }
    ctx.save(); ctx.scale(1,.88); ctx.beginPath(); ctx.arc(0,0,12+ease(t/.46)*64,0,TAU);
    ctx.strokeStyle = rgba(ORANGE,Math.exp(-t*8)*.4); ctx.lineWidth = 1.3; ctx.stroke(); ctx.restore();
  }
  if(showSparksSmoke) drawSparks(ctx,t,reduced);
  ctx.restore();
}

// Generate the nine small shared textures during an idle browser slice.
if(typeof document !== "undefined" && typeof requestIdleCallback === "function"){
  requestIdleCallback(warmEnemyDeathExplosionTextures,{timeout:1500});
}
