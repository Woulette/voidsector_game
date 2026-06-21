const TARGET_SPRITE_OCCUPANCY = Object.freeze({
  drone_pirate:.50,
  boss_drone_pirate:.50,
  raider_astral:.59,
  boss_raider_astral:.84,
  cuirasse_nebulaire:.80,
  boss_cuirasse_nebulaire:.80,
  shared_orb:.80,
  shared_rusher:.84
});

export function getEntityTargetSelectionRadius(entity, padding = 12){
  const occupancy = TARGET_SPRITE_OCCUPANCY[String(entity?.kind || "")];
  if(Number.isFinite(occupancy)){
    const spriteDiameter = Math.max(
      Number(entity?.width || 72),
      Number(entity?.height || 72)
    ) * occupancy;
    return spriteDiameter / 2 + Math.max(0, Number(padding || 0));
  }
  const visualRadius = Math.max(
    Number(entity?.radius || 0),
    Number(entity?.width || 72) / 2,
    Number(entity?.height || 72) / 2
  );
  return visualRadius + Math.max(0, Number(padding || 0));
}

export function drawTargetSelectionOverlay({ctx, x, y, radius}){
  const safeRadius = Math.max(20, Number(radius || 0));
  const pulse = .5 + Math.sin(performance.now() / 120) * .5;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.strokeStyle = `rgba(34,197,94,${.58 + pulse * .25})`;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "rgba(34,197,94,.82)";
  ctx.shadowBlur = 12 + pulse * 8;
  ctx.setLineDash([14, 9]);
  ctx.lineDashOffset = -performance.now() / 55;
  ctx.beginPath();
  ctx.arc(0, 0, safeRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(134,239,172,.92)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, safeRadius + 5, -Math.PI / 3, Math.PI / 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, safeRadius + 5, Math.PI * .66, Math.PI * 1.33);
  ctx.stroke();
  ctx.restore();
}
