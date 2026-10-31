import { getCachedCombatImage } from "../combatAssets.js?v=20261022-helion-hub1";
import { clamp } from "./vfxPrimitives.js";
import { advanceEngineWake, drawEngineWake } from "./shipEngineWake.js";
import { projectShipEnginePorts } from "./ship3dProjection.js";

export const ENGINE_TEXTURE_PATH = "assets/vfx/thruster-plasma-v2.webp";
const FRAME_COUNT = 8;
const COLUMNS = 4;
const ROOT_Y = 4 / 128;
const coloredAtlases = new Map();
const nozzleLayouts = new Map();
let sourceAtlas = null;

export function setEngineTexture(image){
  if(!image?.naturalWidth || !image?.naturalHeight) throw new Error("Texture des réacteurs indisponible");
  sourceAtlas = image;
  coloredAtlases.clear();
  nozzleLayouts.clear();
}

function nozzleLayout(ship, image, profile){
  if(nozzleLayouts.has(ship.id)) return nozzleLayouts.get(ship.id);
  if(!image?.naturalWidth) return profile.ports;
  const canvas = document.createElement("canvas");
  canvas.width = ship.renderWidth || 96;
  canvas.height = ship.renderHeight || 96;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const ports = profile.ports.map(port=>{
    const centerX = Math.round(canvas.width / 2 + port.x);
    const start = Math.max(0, Math.floor(canvas.height / 2 + port.y - 20));
    const end = Math.min(canvas.height - 1, Math.ceil(canvas.height / 2 + port.y + 24));
    // Some combat sprites extend behind their original exhaust coordinates
    // (notably Velox and Astralis). Search both sides of the old port so the
    // bright root cannot remain hidden under the opaque hull.
    for(let y = end; y >= start; y--){
      const hits = [];
      for(let x = Math.max(0, centerX - 2); x <= Math.min(canvas.width - 1, centerX + 2); x++){
        if(pixels[(y * canvas.width + x) * 4 + 3] > 190) hits.push(x);
      }
      if(hits.length){
        const x = hits.reduce((sum, value)=>sum + value, 0) / hits.length;
        return {...port, x:x - canvas.width / 2, y:y - canvas.height / 2 + .6};
      }
    }
    return port;
  });
  nozzleLayouts.set(ship.id, ports);
  return ports;
}

function tintedAtlas(ship, profile){
  if(coloredAtlases.has(ship.id)) return coloredAtlases.get(ship.id);
  const canvas = document.createElement("canvas");
  canvas.width = sourceAtlas.naturalWidth;
  canvas.height = sourceAtlas.naturalHeight;
  const context = canvas.getContext("2d");
  context.drawImage(sourceAtlas, 0, 0);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const middle = profile.colors.mid.split(",").map(Number);
  const core = profile.colors.core.split(",").map(Number);
  for(let offset = 0; offset < image.data.length; offset += 4){
    if(!image.data[offset + 3]) continue;
    const luminance = (image.data[offset] * .2126 + image.data[offset + 1] * .7152 + image.data[offset + 2] * .0722) / 255;
    const hot = clamp((luminance - .3) / .48) ** .85;
    const exposure = .58 + luminance * .5;
    for(let channel = 0; channel < 3; channel++){
      image.data[offset + channel] = (middle[channel] + (core[channel] - middle[channel]) * hot) * exposure;
    }
    image.data[offset + 3] = Math.min(255, image.data[offset + 3] * 1.12);
  }
  context.putImageData(image, 0, 0);
  coloredAtlases.set(ship.id, canvas);
  return canvas;
}

export function engineJetSpec(ship, port, power, bend){
  const style = engineStyle(ship);
  const nominalLength = style === "heavy" ? 46 : style === "interceptor" ? 42 : 40;
  const nominalWidth = style === "heavy" ? 23 : style === "interceptor" ? 17 : 20;
  const size = Math.sqrt(port.size || 1);
  const length = clamp(nominalLength * size * (port.length || 1), 28, 56) * (.3 + power * .7) * Math.sqrt(power);
  const width = clamp(nominalWidth * size * Math.sqrt(port.width || 1), 12, 27) * (.65 + Math.sqrt(power) * .35);
  return {width, height:length / (1 - ROOT_Y), curve:clamp(bend, -1, 1) * length * .42};
}

function jetPoint(jet, portion){
  return {x:jet.curve * portion * portion, y:portion * jet.height - ROOT_Y * jet.height - 1};
}

function drawFrame(ctx, atlas, index, jet, opacity){
  if(opacity <= .001) return;
  const frameWidth = atlas.width / COLUMNS;
  const frameHeight = atlas.height / 2;
  ctx.globalAlpha = opacity;
  const strips = 16;
  // Crop only transparent side padding, then warp the texture in small strips.
  // Its root stays fixed at the nozzle while the far end bends into the turn.
  for(let strip = 0; strip < strips; strip++){
    const a = jetPoint(jet, strip / strips), b = jetPoint(jet, (strip + 1) / strips);
    const height = Math.hypot(b.x - a.x, b.y - a.y);
    ctx.save();
    ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
    ctx.rotate(Math.atan2(a.x - b.x, b.y - a.y));
    ctx.drawImage(atlas,
      (index % COLUMNS) * frameWidth + frameWidth * .12,
      Math.floor(index / COLUMNS) * frameHeight + strip * frameHeight / strips,
      frameWidth * .76, frameHeight / strips,
      -jet.width / 2, -height / 2 - .2, jet.width, height + .4);
    ctx.restore();
  }
}

function drawShipEngineJets(ctx, player, ship, time, dt, state, bend, shipImage, profile, flightPose){
  if(!sourceAtlas) return;
  const style = engineStyle(ship);
  const heavy = style === "heavy";
  const fast = style === "interceptor";
  const target = clamp(player.enginePower);
  state.power ??= target;
  const response = target < state.power ? 12 : heavy ? 5.5 : fast ? 17 : 11;
  state.power += (target - state.power) * (1 - Math.exp(-dt * response));
  const power = state.power;
  state.bend ??= bend;
  state.bend += (bend - state.bend) * (1 - Math.exp(-dt * 9));
  const ports = projectShipEnginePorts(nozzleLayout(ship, shipImage, profile), flightPose);
  const jets = ports.map(port=>engineJetSpec(ship, port, power, state.bend));
  const cos = Math.cos(player.angle), sin = Math.sin(player.angle);
  const emitters = ports.map((port, index)=>{
    const jet = jets[index];
    const point = jetPoint(jet, .66), ahead = jetPoint(jet, .60);
    const dx = point.x - ahead.x, dy = point.y - ahead.y;
    const length = Math.hypot(dx, dy) || 1;
    return {x:player.x + (port.x + point.x) * cos - (port.y + point.y) * sin,
      y:player.y + (port.x + point.x) * sin + (port.y + point.y) * cos,
      dx:(dx * cos - dy * sin) / length, dy:(dx * sin + dy * cos) / length,
      width:jet.width * .72};
  });
  const tracks = advanceEngineWake(state, emitters, {x:0, y:0}, dt, power, heavy ? 1.4 : fast ? 1.12 : 1.25);
  drawEngineWake(ctx, tracks, profile.colors.particle);
  if(power < .025) return;
  const atlas = tintedAtlas(ship, profile);
  const framesPerSecond = heavy ? 19 : fast ? 27 : 23;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.globalCompositeOperation = "lighter";
  ports.forEach((port, index)=>{
    const jet = jets[index];
    const phase = (time * framesPerSecond + index * 2.37) % FRAME_COUNT;
    const first = Math.floor(phase);
    const blend = phase - first;
    const opacity = .62 + Math.sqrt(power) * .36;
    ctx.save();
    ctx.translate(port.x, port.y);
    drawFrame(ctx, atlas, first, jet, opacity * (1 - blend));
    drawFrame(ctx, atlas, (first + 1) % FRAME_COUNT, jet, opacity * blend);
    ctx.restore();
  });
  ctx.restore();
}

function engineStyle(ship){
  if(["helion_titan", "vesperion"].includes(ship.id)) return "heavy";
  if(["velox", "razorion"].includes(ship.id)) return "interceptor";
  return "ion";
}

export function isTexturedShipEngineReady(){
  return Boolean(sourceAtlas?.naturalWidth);
}

export function drawTexturedShipEngines({ctx, camera, cache, player, ship, defaultProfile, profiles, flightPose = null}){
  const texture = getCachedCombatImage(cache, ENGINE_TEXTURE_PATH);
  if(!texture?.complete || !texture.naturalWidth) return false;
  if(texture !== sourceAtlas) setEngineTexture(texture);
  const own = profiles[ship.id] || {};
  const profile = {...defaultProfile, ...own, colors:{...defaultProfile.colors, ...own.colors}};
  const state = player.engineVfxState ??= {};
  const now = performance.now() / 1000;
  const position = {x:Number(player.x || 0) + Number(player.visualCorrectionOffsetX || 0),
    y:Number(player.y || 0) + Number(player.visualCorrectionOffsetY || 0)};
  const gap = state.lastTime === undefined ? 0 : now - state.lastTime;
  const jump = state.previousPosition ? Math.hypot(position.x - state.previousPosition.x, position.y - state.previousPosition.y) : 0;
  if(state.shipId !== ship.id || gap > .25 || jump > Math.max(180, Number(player.speed || 300) * .35)){
    for(const key of Object.keys(state)) delete state[key];
    state.shipId = ship.id;
  }
  const dt = state.lastTime === undefined ? 1 / 60 : clamp(now - state.lastTime, 0, .05);
  const angle = Number(player.angle || 0);
  const delta = state.lastAngle === undefined ? 0 : Math.atan2(Math.sin(angle - state.lastAngle), Math.cos(angle - state.lastAngle));
  const lag = Math.atan2(Math.sin(Number(player.engineAngle ?? angle) - angle), Math.cos(Number(player.engineAngle ?? angle) - angle));
  const bend = clamp((dt > 0 ? delta / dt : 0) * .42 - lag * .65, -1, 1);
  ctx.save();
  ctx.translate(-Number(camera.x || 0), -Number(camera.y || 0));
  drawShipEngineJets(ctx, {...player, ...position}, ship, now, dt, state, bend,
    getCachedCombatImage(cache, ship.combatImg || ship.img), profile, flightPose);
  ctx.restore();
  state.lastAngle = angle;
  state.lastTime = now;
  state.previousPosition = position;
  return true;
}
