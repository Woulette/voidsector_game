import { getCachedCombatImage } from "../combatAssets.js?v=20261022-helion-hub1";
import { drawSectorTravelPortal } from "./sectorPortalVisual.js?v=20261024-sector-portals1";

export const PREPARED_PORTAL_ASSETS = Object.freeze({
  blue:{
    src:"assets/portals/seuil_azuron.png?v=20260726-kharon1",
    haloCore:"rgba(34,211,238,.30)",
    haloMid:"rgba(14,165,233,.12)",
    shadow:"rgba(34,211,238,.88)"
  },
  violet:{
    src:"assets/portals/faille_vesper.png?v=20260726-kharon1",
    haloCore:"rgba(192,132,252,.34)",
    haloMid:"rgba(139,92,246,.14)",
    shadow:"rgba(168,85,247,.92)"
  },
  red:{
    src:"assets/portals/forge_kharon.png?v=20260726-kharon1",
    haloCore:"rgba(251,113,133,.34)",
    haloMid:"rgba(249,115,22,.14)",
    shadow:"rgba(244,63,94,.92)"
  },
  ionis:{
    src:"assets/portals/tempete_ionis.png?v=20260726-kharon1",
    haloCore:"rgba(103,232,249,.34)",
    haloMid:"rgba(14,165,233,.14)",
    shadow:"rgba(34,211,238,.92)"
  },
  emerald:{
    src:"assets/portals/ruche_eclanite.png?v=20260726-kharon1",
    haloCore:"rgba(74,222,128,.32)",
    haloMid:"rgba(16,185,129,.14)",
    shadow:"rgba(34,197,94,.92)"
  },
  void:{
    src:"assets/portals/abime_nox.png?v=20260726-kharon1",
    haloCore:"rgba(129,140,248,.34)",
    haloMid:"rgba(79,70,229,.14)",
    shadow:"rgba(99,102,241,.94)"
  },
  prismatic:{
    src:"assets/portals/nexus_prismatique.png?v=20260726-kharon1",
    haloCore:"rgba(232,121,249,.34)",
    haloMid:"rgba(34,211,238,.14)",
    shadow:"rgba(217,70,239,.94)"
  },
  ancient:{
    src:"assets/portals/sanctuaire_precurseurs.png?v=20260726-kharon1",
    haloCore:"rgba(253,224,71,.34)",
    haloMid:"rgba(245,158,11,.14)",
    shadow:"rgba(250,204,21,.94)"
  },
  eternal:{
    src:"assets/portals/coeur_eternel.png?v=20260726-kharon1",
    haloCore:"rgba(255,255,255,.38)",
    haloMid:"rgba(196,181,253,.16)",
    shadow:"rgba(254,240,138,.96)"
  }
});

function getPreparedPortalAsset(portal){
  if(!portal?.prepared) return null;
  const portalId = String(portal?.portalId || portal?.portal?.id || "");
  return PREPARED_PORTAL_ASSETS[portalId] || null;
}

function drawPreparedPortalAsset({ctx, portal, now, image, asset, simplified = false}){
  const radius = Number(portal.r || 115);
  const pulse = simplified ? 1 : 1 + Math.sin(now / 520) * .025;
  const size = radius * 2.5 * pulse;

  ctx.save();
  ctx.translate(portal.x, portal.y);
  if(!simplified){
    const halo = ctx.createRadialGradient(0, 0, radius * .18, 0, 0, radius * 1.9);
    halo.addColorStop(0, asset.haloCore);
    halo.addColorStop(.48, asset.haloMid);
    halo.addColorStop(1, "rgba(2,8,23,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = asset.shadow;
    ctx.shadowBlur = 26;
  }
  ctx.drawImage(image, -size / 2, -size / 2, size, size);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPortalVisual({ctx, portal, now}){
  const safeR = portal.safeRadius || Math.max(180, (portal.r || 90) * 2.2);
  const pulse = .92 + Math.sin(now / 430) * .08;

  const field = ctx.createRadialGradient(portal.x, portal.y, 10, portal.x, portal.y, safeR);
  field.addColorStop(0, "rgba(147,197,253,.20)");
  field.addColorStop(.36, "rgba(56,189,248,.10)");
  field.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(portal.x, portal.y, safeR, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(portal.x, portal.y);
  ctx.scale(.78, 1.12);

  const coreR = (portal.r || 95) * 1.02;
  const voidGrad = ctx.createRadialGradient(0, 0, coreR * .10, 0, 0, coreR * 1.04);
  voidGrad.addColorStop(0, "rgba(1,8,20,.96)");
  voidGrad.addColorStop(.58, "rgba(4,17,38,.88)");
  voidGrad.addColorStop(1, "rgba(15,23,42,.12)");
  ctx.fillStyle = voidGrad;
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  ctx.fill();

  for(let layer = 0; layer < 2; layer++){
    const radius = coreR * (1.06 + layer * .14) * pulse;
    const offset = now / (layer ? -900 : 740);
    const segments = layer ? 22 : 28;
    ctx.lineWidth = layer ? 5 : 7;
    ctx.strokeStyle = layer ? "rgba(125,211,252,.46)" : "rgba(191,219,254,.78)";
    ctx.shadowColor = layer ? "rgba(56,189,248,.52)" : "rgba(147,197,253,.85)";
    ctx.shadowBlur = layer ? 14 : 24;
    for(let i = 0; i < segments; i += 2){
      const a0 = offset + i / segments * Math.PI * 2;
      const a1 = offset + (i + .95) / segments * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, a0, a1);
      ctx.stroke();
    }
  }

  ctx.shadowBlur = 0;
  ctx.lineWidth = 9;
  ctx.strokeStyle = "rgba(71,85,105,.92)";
  ctx.beginPath();
  ctx.arc(0, 0, coreR * 1.34, 0, Math.PI * 2);
  ctx.stroke();

  const shardCount = 34;
  ctx.lineWidth = 3;
  for(let i = 0; i < shardCount; i++){
    const a = i / shardCount * Math.PI * 2 + Math.sin(now / 1700 + i) * .04;
    const outer = coreR * (1.36 + (i % 4) * .035);
    const inner = coreR * (1.10 + (i % 5) * .025);
    ctx.strokeStyle = i % 3 ? "rgba(56,189,248,.52)" : "rgba(203,213,225,.54)";
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(191,219,254,.94)";
  for(let i = 0; i < 18; i++){
    const a = i * 2.399 + now / 1800;
    const d = coreR * (.18 + ((i * 37) % 100) / 100 * .62);
    const s = 1.2 + (i % 4) * .45;
    ctx.globalAlpha = .38 + (i % 5) * .10;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a * 1.18) * d, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if(portal.damaged){
    ctx.globalCompositeOperation = "source-over";
    ctx.rotate(-.34);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(248,113,113,.88)";
    ctx.shadowColor = "rgba(239,68,68,.75)";
    ctx.shadowBlur = 18;
    for(let i = 0; i < 4; i++){
      const y = coreR * (-.56 + i * .34);
      ctx.beginPath();
      ctx.moveTo(-coreR * .92, y);
      ctx.lineTo(-coreR * .35, y + 16);
      ctx.lineTo(coreR * .06, y - 10);
      ctx.lineTo(coreR * .78, y + 12);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.rotate(.34);
    ctx.fillStyle = "rgba(248,113,113,.94)";
    for(let i = 0; i < 7; i++){
      const a = now / 380 + i * 1.71;
      const d = coreR * (1.06 + (i % 3) * .16);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a * 1.12) * d, 3 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawSimplifiedPortal({ctx, portal}){
  const radius = portal.r || 95;
  ctx.save();
  ctx.translate(portal.x, portal.y);
  ctx.scale(.78, 1.12);
  ctx.fillStyle = "rgba(1,8,20,.92)";
  ctx.strokeStyle = portal.damaged ? "rgba(248,113,113,.82)" : "rgba(125,211,252,.78)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawMapPortals({ctx, cache = {}, currentMap, getMapPortals, simplified = false, player, portalTransition}){
  const now = performance.now();
  for(const portal of getMapPortals(currentMap)){
    const safeR = portal.safeRadius || Math.max(180, (portal.r || 90) * 2.2);
    const preparedAsset = getPreparedPortalAsset(portal);
    const preparedImage = preparedAsset ? getCachedCombatImage(cache, preparedAsset.src) : null;
    if(preparedImage?.complete && Number(preparedImage.naturalWidth || 0) > 0){
      drawPreparedPortalAsset({ctx, portal, now, image:preparedImage, asset:preparedAsset, simplified});
    }else if(drawSectorTravelPortal({ctx,cache,portal,player,transition:portalTransition,now,simplified})){
      // The approved travel gate uses the real transfer state; prepared portals retain their own art.
    }else if(simplified){
      drawSimplifiedPortal({ctx, portal});
    }else{
      drawPortalVisual({ctx, portal, now});
    }
    ctx.fillStyle = "#e9d5ff";
    ctx.font = "700 16px Rajdhani, Arial";
    if(portal.closed){
      ctx.fillText(portal.label || "PORTAIL FERME", portal.x - 78, portal.y - safeR - 16);
      continue;
    }
    ctx.fillText(`${portal.displayLabel || portal.label} · APPUIE J`, portal.x - 92, portal.y - safeR - 16);
  }
}
