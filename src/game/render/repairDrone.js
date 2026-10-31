import { getCachedCombatImage } from "../combatAssets.js?v=20261022-helion-hub1";
import { getRepairDroneVisual } from "../../data/repairDroneVisuals.js";

const animations = new WeakMap();
const TAU = Math.PI * 2;
const finite = (value, fallback = 0)=>Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = value=>Math.max(0, Math.min(1, value));
const circle = (ctx, x, y, radius)=>{ctx.beginPath();ctx.arc(x, y, radius, 0, TAU);};

function armPose(time, side, size){
  const shoulder = {x:side * size * .225, y:-size * .065};
  const elbow = {x:side * size * .38, y:size * .185};
  const originalTip = {x:side * size * .22, y:size * .33};
  const shoulderAngle = Math.sin(time * 3 + side * .9) * .13;
  const elbowAngle = Math.sin(time * 3.8 + side * 1.4) * .15;
  const around = (point,pivot,angle)=>transform(pivot,{x:point.x-pivot.x,y:point.y-pivot.y},angle);
  const tip = around(around(originalTip,elbow,elbowAngle),shoulder,shoulderAngle);
  return {side,shoulder,elbow,shoulderAngle,elbowAngle,tip};
}

function transform(origin, point, angle){
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return {x:origin.x + point.x * cos - point.y * sin, y:origin.y + point.x * sin + point.y * cos};
}

// Pure geometry. World position/corrections are read only; this never changes HP or activity.
export function getRepairDronePose({player, ship = {}, time = 0, elapsed = 1}){
  const t = finite(time);
  const visual = getRepairDroneVisual(player?.extraBonus);
  const scale = visual.size / 66;
  const center = {x:finite(player?.x) + finite(player?.visualCorrectionOffsetX),
    y:finite(player?.y) + finite(player?.visualCorrectionOffsetY)};
  const width = Math.max(40, Math.min(220, finite(ship.renderWidth, 96)));
  const height = Math.max(40, Math.min(220, finite(ship.renderHeight, 96)));
  const deployment = clamp(finite(elapsed) / .24);
  const ease = deployment * deployment * (3 - 2 * deployment);
  // Faster circling with brief, eased reversals to work from another side.
  // A continuous curve keeps the robot and its tools from jumping on a turn.
  const orbit = t * .68 + Math.sin(t * 1.25) * .85 + .6;
  const shipAngle = finite(player?.angle) + finite(ship.renderAngleOffset);
  // These service points belong to the opaque central spine of every ship.
  // Only the robot orbits: rotating the targets around the sprite's box sent
  // the beams into transparent gaps between wings, especially on Razorion.
  const contact = transform(center, {x:0,y:-height * .015}, shipAngle);
  const hullSize = Math.max(width,height);
  const nearRadius = hullSize * .52 + visual.size * .32;
  const retreat = (1-Math.cos(t * 1.85)) / 2;
  const radius = nearRadius * (.78 + .22 * ease) + retreat * Math.max(22,hullSize * .23) * ease;
  const drone = {x:center.x + Math.cos(orbit) * radius,
    y:center.y + Math.sin(orbit) * radius + Math.sin(t * 3.2) * 1.8};
  const angle = Math.atan2(contact.y - drone.y, contact.x - drone.x) - Math.PI / 2;
  const arms = [-1, 1].map(side=>{
    const arm = armPose(t, side, visual.size);
    return {...arm, tip:transform(drone, arm.tip, angle),
      contact:transform(center,{x:0,y:height * (-.015 + side * .025)},shipAngle)};
  });
  return {visual, scale, center, drone, contact, angle, shipAngle, arms, opacity:ease, time:t};
}

function spritePart(ctx,image,size,points){
  ctx.save();ctx.beginPath();
  points.forEach(([u,v],index)=>index?ctx.lineTo((u-.5)*size,(v-.5)*size):ctx.moveTo((u-.5)*size,(v-.5)*size));
  ctx.closePath();ctx.clip();ctx.drawImage(image,-size/2,-size/2,size,size);ctx.restore();
}

export function drawRepairRobotSprite({ctx, image, visual, time = 0, x = 0, y = 0, angle = 0, scale = 1, opacity = 1}){
  const size = visual.size;
  if(!image?.complete || !image.naturalWidth) return false;
  ctx.save();ctx.translate(x, y);ctx.rotate(angle);ctx.scale(scale, scale);ctx.globalAlpha *= opacity;
  // The approved sprite supplies the body AND both metallic arms. Clip each
  // limb around its actual shoulder/elbow; no differently styled vector limbs.
  for(const side of [-1,1]){
    const arm = armPose(time,side,size);
    const mirror = points=>points.map(([u,v])=>[side<0?u:1-u,v]);
    ctx.save();ctx.translate(arm.shoulder.x,arm.shoulder.y);ctx.rotate(arm.shoulderAngle);ctx.translate(-arm.shoulder.x,-arm.shoulder.y);
    spritePart(ctx,image,size,mirror([[0,0],[.29,0],[.29,.61],[.32,.725],[0,.725]]));
    ctx.translate(arm.elbow.x,arm.elbow.y);ctx.rotate(arm.elbowAngle);ctx.translate(-arm.elbow.x,-arm.elbow.y);
    spritePart(ctx,image,size,mirror([[0,.66],[.38,.66],[.38,1],[0,1]]));ctx.restore();
  }
  spritePart(ctx,image,size,[[.29,0],[.71,0],[.71,.61],[.62,1],[.38,1],[.29,.61]]);
  ctx.globalCompositeOperation = "lighter";
  const pulse = .16 + Math.sin(time * 8) * .08;
  circle(ctx,0,-size*.05,size*.028);ctx.fillStyle=`rgba(${visual.rgb},${pulse})`;ctx.fill();
  ctx.restore();
  return true;
}

function drawRepairBeam(ctx, from, to, time, side, opacity){
  const dx = to.x - from.x, dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const normal = {x:-dy / length, y:dx / length};
  const pulse = .7 + Math.sin(time * 16 + side * 2) * .18;
  const bend = Math.sin(time * 7 + side) * 1.9;
  const control = {x:(from.x+to.x)/2+normal.x*bend,y:(from.y+to.y)/2+normal.y*bend};
  ctx.save();ctx.globalCompositeOperation = "lighter";ctx.globalAlpha *= opacity;
  ctx.lineCap = "round";
  ctx.beginPath();ctx.moveTo(from.x,from.y);
  ctx.quadraticCurveTo(control.x,control.y,to.x,to.y);
  ctx.strokeStyle = `rgba(47,232,178,${pulse * .12})`;ctx.lineWidth = 5;ctx.stroke();
  ctx.strokeStyle = `rgba(102,249,213,${pulse * .72})`;ctx.lineWidth = 1.25;ctx.stroke();
  ctx.strokeStyle = `rgba(224,255,244,${pulse * .68})`;ctx.lineWidth = .48;ctx.stroke();
  for(let i = 0; i < 3; i++){
    const progress = (time * 1.4 + i / 3 + (side + 1) * .12) % 1;
    const rest = 1-progress;
    circle(ctx,rest*rest*from.x+2*rest*progress*control.x+progress*progress*to.x,
      rest*rest*from.y+2*rest*progress*control.y+progress*progress*to.y,.85);
    ctx.fillStyle = "rgba(214,255,232,.82)";ctx.fill();
  }
  // Short sparks stay on the hull instead of filling the viewport with health crosses.
  for(let i = 0; i < 4; i++){
    const age = (time * 2.7 + i * .25 + side * .11 + 1) % 1;
    const angle = i * 2.4 + time * .18;
    const travel = age * (4 + i * .8);
    const x = to.x + Math.cos(angle) * travel, y = to.y + Math.sin(angle) * travel;
    ctx.strokeStyle = `rgba(211,255,193,${(1-age) * .75})`;ctx.lineWidth = .85;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(angle)*1.7,y+Math.sin(angle)*1.7);ctx.stroke();
  }
  circle(ctx,to.x,to.y,1.4+pulse*.8);ctx.fillStyle = "rgba(226,255,224,.9)";ctx.fill();
  ctx.restore();
}

function drawHullWork(ctx, pose, screen){
  const {x,y} = screen(pose.contact);
  ctx.save();ctx.translate(x,y);ctx.rotate(pose.shipAngle);ctx.globalAlpha *= pose.opacity;
  ctx.globalCompositeOperation = "lighter";
  for(let row = -2; row <= 2; row++){
    const pulse = (Math.sin(pose.time * 4 - row * .8) + 1) / 2;
    ctx.fillStyle = `rgba(91,244,183,${.035 + pulse * .13})`;
    ctx.fillRect(-2.8,row * 1.8,4 + pulse * 1.6,.8);
  }
  ctx.restore();
}

export function drawRepairDrone({ctx, camera = {}, cache, player, ship = {}, time = performance.now() / 1000}){
  if(!player?.repairBotActive || player.isDead || finite(player.hp) <= 0
    || (finite(player.maxHp)>0 && finite(player.hp)>=finite(player.maxHp)) || player.extraBonus?.repairBot === false){
    if(player) animations.delete(player);
    return false;
  }
  const now = finite(time);
  let animation = animations.get(player);
  if(!animation || now < animation.lastAt || now - animation.lastAt > .5){
    animation = {startedAt:now - 1 / 60, lastAt:now};
    animations.set(player,animation);
  }
  animation.lastAt = now;
  const pose = getRepairDronePose({player,ship,time:now,elapsed:now-animation.startedAt});
  // Match drawRotatedImage's rounded screen origin, including camera motion.
  const cx = pose.center.x-finite(camera.x), cy = pose.center.y-finite(camera.y);
  const snap = {x:Math.round(cx)-cx,y:Math.round(cy)-cy};
  const screen = point=>({x:point.x-finite(camera.x)+snap.x,y:point.y-finite(camera.y)+snap.y});
  const image = getCachedCombatImage(cache,pose.visual.body);
  if(!image?.complete || !image.naturalWidth) return false;
  drawHullWork(ctx,pose,screen);
  for(const arm of pose.arms) drawRepairBeam(ctx,screen(arm.tip),screen(arm.contact),now,arm.side,pose.opacity);
  const position = screen(pose.drone);
  drawRepairRobotSprite({ctx,image,visual:pose.visual,time:now,x:position.x,y:position.y,angle:pose.angle,opacity:pose.opacity});
  return true;
}
