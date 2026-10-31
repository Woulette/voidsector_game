import { clamp, smooth } from "./vfxPrimitives.js";

const textures = new WeakMap();
const GRID = 14;

function canvas(width, height){
  const result = document.createElement("canvas");
  result.width = width;
  result.height = height;
  return result;
}

function prepare(image, channel){
  let channels = textures.get(image);
  if(!channels){ channels = new Map(); textures.set(image, channels); }
  if(channels.has(channel)) return channels.get(channel);
  const size = 256;
  const source = canvas(size, size);
  const ctx = source.getContext("2d", {willReadFrequently:true});
  ctx.drawImage(image, 0, 0, size, size);
  const pixels = ctx.getImageData(0, 0, size, size);
  const mask = canvas(size, size);
  const maskCtx = mask.getContext("2d");
  const light = maskCtx.createImageData(size, size);
  const cells = new Set();
  for(let y = 0; y < size; y++) for(let x = 0; x < size; x++){
    const i = (y * size + x) * 4;
    const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2],a=pixels.data[i+3];
    if(a > 12) cells.add(`${Math.min(GRID-1,Math.floor(x/size*GRID))}:${Math.min(GRID-1,Math.floor(y/size*GRID))}`);
    const dominance = channel === "green" ? g - Math.max(r*.72,b)
      : channel === "red" ? r - Math.max(g,b)
      : channel === "amber" ? Math.min(r,g*1.5)-b : Math.min(b,g*1.7)-r;
    light.data[i] = r;
    light.data[i+1] = g;
    light.data[i+2] = b;
    light.data[i+3] = a * clamp(dominance / 85);
  }
  maskCtx.putImageData(light,0,0);
  const triangles = [];
  for(let y=0;y<GRID;y++) for(let x=0;x<GRID;x++){
    if(!cells.has(`${x}:${y}`)) continue;
    const a=y*(GRID+1)+x, b=a+1, c=a+GRID+1, d=c+1;
    triangles.push([a,b,c],[b,d,c]);
  }
  const texture = {source,mask,triangles,vertices:[],posed:canvas(size,size),emission:canvas(size,size)};
  for(let y=0;y<=GRID;y++) for(let x=0;x<=GRID;x++) texture.vertices.push({u:x/GRID,v:y/GRID});
  channels.set(channel, texture);
  return texture;
}

// Only the peripheral limbs deform. The nucleus stays anchored and the
// movement heading still comes from the existing pursuit system.
export function creatureVertex(u,v,{style,time,power,attack,lagX=0,lagY=0}){
  let x=u, y=v;
  if(style === "organic"){
    const dx=u-.465, dy=v-.545, radius=Math.hypot(dx,dy), a=Math.atan2(dy,dx);
    const limb=smooth((radius-.205)/.255);
    const wave=(Math.sin(time*2.7-radius*13+a*3)*.032 + Math.sin(time*1.8+a*5)*.012)*limb;
    const reach=limb*(attack.flash*.023-attack.charge*.017);
    const breath=Math.sin(time*2.1)*.007*(1-limb);
    x += -Math.sin(a)*wave + dx*(reach+breath) - lagX*limb*.027*power;
    y += Math.cos(a)*wave + dy*(reach+breath) - lagY*limb*.027*power;
  }else if(style === "electric"){
    const side=Math.sign(u-.5), limb=smooth((Math.abs(u-.5)-.12)/.3)*(1-smooth((v-.6)/.24));
    const wave=Math.sin(time*2.5+side*1.6+v*5)*.017*limb;
    x += side*wave + side*attack.charge*.01*limb;
    y += Math.cos(time*2.5+side*1.6+v*4)*.009*limb;
  }
  return {x,y};
}

function triangle(ctx,source,vertices,indices,size){
  const [a,b,c]=indices.map(i=>vertices[i]);
  const su=b.u-a.u, sv=b.v-a.v, tu=c.u-a.u, tv=c.v-a.v;
  const determinant=su*tv-sv*tu;
  const ax=((b.x-a.x)*tv-(c.x-a.x)*sv)/determinant;
  const ay=((b.y-a.y)*tv-(c.y-a.y)*sv)/determinant;
  const bx=((c.x-a.x)*su-(b.x-a.x)*tu)/determinant;
  const by=((c.y-a.y)*su-(b.y-a.y)*tu)/determinant;
  ctx.save();
  ctx.beginPath();
  // Tiny overlap prevents dark antialiasing seams between triangles.
  const cx=(a.x+b.x+c.x)/3, cy=(a.y+b.y+c.y)/3;
  for(const [i,p] of [a,b,c].entries()){
    const dx=p.x-cx,dy=p.y-cy,l=Math.hypot(dx,dy)||1;
    const x=p.x*size+dx/l*.45,y=p.y*size+dy/l*.45;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath(); ctx.clip();
  ctx.transform(ax,ay,bx,by,(a.x-ax*a.u-bx*a.v)*size,(a.y-ay*a.u-by*a.v)*size);
  ctx.drawImage(source,0,0);
  ctx.restore();
}

function pose(texture,options,emissive){
  const vertex=options.vertex || creatureVertex;
  const vertices=texture.vertices.map(p=>({...p,...vertex(p.u,p.v,options)}));
  const layers=emissive ? [[texture.posed,texture.source],[texture.emission,texture.mask]] : [[texture.posed,texture.source]];
  for(const [target,source] of layers){
    const ctx=target.getContext("2d");
    ctx.clearRect(0,0,target.width,target.height);
    for(const indices of texture.triangles) triangle(ctx,source,vertices,indices,target.width);
  }
}

export function drawCreatureBody(ctx,{image,enemy,profile,time,power,attack,angle}){
  const texture=prepare(image,profile.channel);
  const articulated=typeof profile.vertex === "function" || profile.style === "organic" || profile.style === "electric";
  const brightness=(profile.style === "organic" ? .06 : .025) + attack.charge*.28 + attack.flash*1.05;
  let body=texture.source, emission=texture.mask;
  if(articulated){
    const vx=enemy.vx || 0,vy=enemy.vy || 0,speed=Math.hypot(vx,vy)||1;
    pose(texture,{style:profile.style,vertex:profile.vertex,time,power,attack,
      lagX:(vx*Math.cos(angle)+vy*Math.sin(angle))/speed,
      lagY:(-vx*Math.sin(angle)+vy*Math.cos(angle))/speed},brightness>.02);
    body=texture.posed; emission=texture.emission;
  }
  const w=enemy.width,h=enemy.height;
  ctx.drawImage(body,-w/2,-h/2,w,h);
  if(brightness>.02){
    ctx.save();
    ctx.globalCompositeOperation="lighter";
    ctx.globalAlpha=clamp(brightness,0,1);
    ctx.drawImage(emission,-w/2,-h/2,w,h);
    if(attack.flash>.15){
      ctx.globalAlpha=attack.flash*.38;
      ctx.drawImage(emission,-w/2,-h/2,w,h);
    }
    ctx.restore();
  }
}
