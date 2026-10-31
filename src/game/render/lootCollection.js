const TAU = Math.PI * 2;
const SOLID_LINE = [];

function finite(value, fallback = 0){
  if(value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function getLootCollectionProgress(node){
  return Math.max(0, Math.min(1, finite(node?.suctionProgress)));
}

// The pickup path may enter the screen before its original world point does.
// These are render bounds only: the node and its collision coordinates stay intact.
export function isLootCollectionVisible({node, camera, width, height, margin = 140}){
  if(!node) return false;
  const x = finite(node.x);
  const y = finite(node.y);
  const padding = Math.max(0, finite(margin));
  const left = finite(camera?.x) - padding;
  const top = finite(camera?.y) - padding;
  const right = finite(camera?.x) + Math.max(0, finite(width)) + padding;
  const bottom = finite(camera?.y) + Math.max(0, finite(height)) + padding;
  if(!node.suctionActive) return x >= left && x <= right && y >= top && y <= bottom;
  const startX = finite(node.suctionStartX, x);
  const startY = finite(node.suctionStartY, y);
  const renderX = finite(node.renderX, x);
  const renderY = finite(node.renderY, y);
  const targetX = finite(node.suctionTargetX, renderX);
  const targetY = finite(node.suctionTargetY, renderY);
  return Math.max(x, startX, renderX, targetX) >= left
    && Math.min(x, startX, renderX, targetX) <= right
    && Math.max(y, startY, renderY, targetY) >= top
    && Math.min(y, startY, renderY, targetY) <= bottom;
}

export function drawLootCollection({ctx, node, camera}){
  if(!node?.suctionActive) return false;
  const progress = getLootCollectionProgress(node);
  if(progress <= 0 || progress >= 1) return false;
  const startX = finite(node.suctionStartX, finite(node.x));
  const startY = finite(node.suctionStartY, finite(node.y));
  const targetX = finite(node.suctionTargetX, finite(node.renderX, startX));
  const targetY = finite(node.suctionTargetY, finite(node.renderY, startY));
  const dx = startX - targetX;
  const dy = startY - targetY;
  const length = Math.hypot(dx, dy);
  const radius = Math.min(22, Math.max(14, finite(node.size, 42) * .45));
  const envelope = Math.min(1, progress / .1, (1 - progress) / .16);
  const incomingAlpha = finite(ctx.globalAlpha, 1);
  const glow = node.glow || "rgba(56,189,248,.22)";
  const core = node.glowCore || node.glow || "rgba(186,230,253,.62)";

  ctx.save();
  try{
    // Emit from the ship toward the ground, with a wider footprint on the loot.
    ctx.translate(targetX - finite(camera?.x), targetY - finite(camera?.y));
    ctx.rotate(Math.atan2(dy, dx));
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = 0;
    ctx.lineCap = "round";
    ctx.setLineDash?.(SOLID_LINE);

    const beam = ctx.createLinearGradient(0, 0, Math.max(1, length), 0);
    beam.addColorStop(0, core);
    beam.addColorStop(.45, glow);
    beam.addColorStop(1, core);
    ctx.globalAlpha = incomingAlpha * envelope * .62;
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(0, -2.5);
    ctx.lineTo(length, -radius);
    ctx.lineTo(length, radius);
    ctx.lineTo(0, 2.5);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = incomingAlpha * envelope * .85;
    ctx.strokeStyle = core;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(length, 0);
    ctx.stroke();

    // Fixed budgets and deterministic phases avoid emitter objects or random bursts.
    for(let index = 0; index < 3; index++){
      const along = (progress * 2 + index / 3) % 1;
      const ringRadius = 3 + radius * along * .65;
      ctx.globalAlpha = incomingAlpha * envelope * Math.sin(along * Math.PI) * .8;
      ctx.beginPath();
      ctx.ellipse(length * along, 0, ringRadius * .25, ringRadius, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = core;
    for(let index = 0; index < 6; index++){
      const along = (progress * 2.2 + index * .173) % 1;
      const cross = Math.sin(index * 2.4 + progress * 6) * (2 + radius * along * .4);
      ctx.globalAlpha = incomingAlpha * envelope * Math.sin(along * Math.PI) * .95;
      ctx.beginPath();
      ctx.arc(length * along, cross, .9 + along * 1.1, 0, TAU);
      ctx.fill();
    }

    ctx.globalAlpha = incomingAlpha * envelope * .6;
    const captureRadius = radius + 12;
    const capture = ctx.createRadialGradient(length, 0, 0, length, 0, captureRadius);
    capture.addColorStop(0, core);
    capture.addColorStop(.4, glow);
    capture.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = capture;
    ctx.beginPath();
    ctx.arc(length, 0, captureRadius, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(length, 0, 5, radius, 0, 0, TAU);
    ctx.stroke();
  }finally{
    ctx.restore();
  }
  return true;
}
