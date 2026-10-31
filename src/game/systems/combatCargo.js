import { lootNameWithRarityHtml, lootNameWithRarityText } from "../../ui/lootRarityDisplay.js";
import { getLootCollectionHoverPoint, LOOT_COLLECTION_APPROACH_RADIUS } from "../../shared/lootCollection.js";
import { createLootCollectionController } from "./lootCollection.js";

export function createCombatCargoSystem({
  rewards,
  requestServerLootPickup,
  showToast,
  onCargoChanged,
  particles,
  getMap,
  now = Date.now
}){
  let cargoBoxes = [];
  let groundMaterials = [];
  let pendingCargoBox = null;
  let pendingGroundMaterial = null;
  const DROP_TTL_MS = 60000;
  const collection = createLootCollectionController({requestPickup:requestServerLootPickup, now});

  function clear(){
    collection.cancel();
    cargoBoxes = [];
    groundMaterials = [];
    pendingCargoBox = null;
    pendingGroundMaterial = null;
  }

  function spawnPortalPieceDrop(enemy, portal, source = {}){
    if(!enemy || !portal || source.serverControlled !== true) return null;
    const node = {
      uid:source.uid || `portal_piece_${portal.id}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      kind:"portalPiece",
      portalId:portal.id,
      id:portal.id,
      name:source.name || portal.pieceName || `Fragment ${portal.name}`,
      label:source.label || (portal.pieceUnit === "fragments" ? "FRAGMENT" : "PIÈCE"),
      img:portal.pieceImg || portal.img,
      x:Number(source.x ?? enemy.x) + (source.x === undefined ? (Math.random() - .5) * 70 : 0),
      y:Number(source.y ?? enemy.y) + (source.y === undefined ? (Math.random() - .5) * 70 : 0),
      radius:32,
      size:42,
      phase:Math.random() * Math.PI * 2,
      glow:"rgba(168,85,247,.25)",
      glowCore:"rgba(216,180,254,.55)",
      fallback:"rgba(168,85,247,.86)",
      expiresAt:Number(source.expiresAt || Date.now() + DROP_TTL_MS),
      serverControlled:true
    };
    groundMaterials.push(node);
    return node;
  }

  function spawnServerLootDrop(event = {}){
    if(event.serverControlled !== true) return null;
    const kind = String(event.kind || "");
    const rarityPalette = {
      common:{glow:"rgba(148,163,184,.22)", core:"rgba(226,232,240,.62)", fallback:"rgba(203,213,225,.86)"},
      rare:{glow:"rgba(56,189,248,.22)", core:"rgba(125,211,252,.62)", fallback:"rgba(56,189,248,.86)"},
      veryRare:{glow:"rgba(168,85,247,.24)", core:"rgba(216,180,254,.64)", fallback:"rgba(168,85,247,.86)"},
      elite:{glow:"rgba(249,115,22,.24)", core:"rgba(253,186,116,.66)", fallback:"rgba(249,115,22,.88)"},
      mythic:{glow:"rgba(250,204,21,.26)", core:"rgba(254,240,138,.70)", fallback:"rgba(250,204,21,.90)"}
    };
    const rarityColors = rarityPalette[String(event.rarity || "")] || null;
    const node = {
      uid:event.id || `server_loot_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      kind,
      id:event.materialId || event.ammoId || event.itemId || event.portalId || event.id,
      materialId:event.materialId || null,
      ammoId:event.ammoId || null,
      itemId:event.itemId || null,
      portalId:event.portalId || null,
      rarity:event.rarity || "",
      name:event.name || event.portalName || "Butin serveur",
      label:event.label || (kind === "questItem" ? "QUETE" : kind === "ammo" ? "AMMO" : kind === "item" ? "ITEM" : kind === "material" ? "MAT" : "LOOT"),
      img:event.img || (kind === "questItem" ? "assets/quest_items/contaminated_sample.png" : "assets/equipment/ammo_laser_x2_same_preview.png"),
      amount:Math.max(1, Math.round(Number(event.amount || 1))),
      x:Number(event.x || 0),
      y:Number(event.y || 0),
      radius:32,
      size:42,
      phase:Math.random() * Math.PI * 2,
      glow:rarityColors?.glow || (kind === "item" ? "rgba(250,204,21,.24)" : kind === "ammo" ? "rgba(56,189,248,.20)" : "rgba(34,197,94,.18)"),
      glowCore:rarityColors?.core || (kind === "item" ? "rgba(253,224,71,.58)" : kind === "ammo" ? "rgba(125,211,252,.58)" : "rgba(134,239,172,.52)"),
      fallback:rarityColors?.fallback || (kind === "item" ? "rgba(250,204,21,.86)" : kind === "ammo" ? "rgba(56,189,248,.82)" : "rgba(34,197,94,.78)"),
      expiresAt:Number(event.expiresAt || Date.now() + DROP_TTL_MS),
      serverControlled:true
    };
    groundMaterials.push(node);
    return node;
  }

  function findCargoBoxAt(world){
    return cargoBoxes.find(box=>Math.hypot(world.x - box.x, world.y - box.y) <= box.radius) || null;
  }

  function findGroundMaterialAt(world){
    return groundMaterials.find(node=>Math.hypot(world.x - node.x, world.y - node.y) <= (node.radius || 30)) || null;
  }

  function collectCargoBox(box){
    const index = cargoBoxes.findIndex(entry=>entry.id === box.id);
    if(index < 0) return false;
    cargoBoxes.splice(index, 1);
    pendingCargoBox = null;
    showToast("Cargo local desactive : seuls les butins serveur sont acceptes.");
    return false;
  }

  function setCargoDestination(box){
    collection.cancel();
    pendingCargoBox = box;
    pendingGroundMaterial = null;
    return {x:box.x, y:box.y};
  }

  function collectGroundMaterial(node, player){
    const index = groundMaterials.findIndex(entry=>entry.uid === node.uid);
    if(index < 0) return false;
    if(node.expiresAt && now() >= node.expiresAt){
      groundMaterials.splice(index, 1);
      pendingGroundMaterial = null;
      return false;
    }
    if(node.serverControlled){
      if(collection.begin(node, player)){
        pendingGroundMaterial = null;
        return true;
      }
      return false;
    }
    groundMaterials.splice(index, 1);
    pendingGroundMaterial = null;
    showToast("Butin local refuse : validation serveur requise.");
    return false;
  }

  function setGroundMaterialDestination(node){
    collection.cancel();
    pendingGroundMaterial = node;
    pendingCargoBox = null;
    return getLootCollectionHoverPoint(node, getMap?.());
  }

  function updatePending(player){
    const active = collection.getActive();
    if(active && !groundMaterials.includes(active.node)) collection.cancel();
    if(collection.update(player)) return;
    if(pendingCargoBox){
      const liveCargo = cargoBoxes.find(box=>box.id === pendingCargoBox.id);
      if(!liveCargo) pendingCargoBox = null;
      else if(Math.hypot(player.x - liveCargo.x, player.y - liveCargo.y) <= liveCargo.radius + 24) collectCargoBox(liveCargo);
    }
    if(pendingGroundMaterial){
      const liveMaterial = groundMaterials.find(node=>node.uid === pendingGroundMaterial.uid);
      if(!liveMaterial) pendingGroundMaterial = null;
      else{
        const hover = getLootCollectionHoverPoint(liveMaterial, getMap?.());
        if(Math.hypot(player.x - hover.x, player.y - hover.y) <= LOOT_COLLECTION_APPROACH_RADIUS) collectGroundMaterial(liveMaterial, player);
      }
    }
  }

  function tick(){
    const timestamp = now();
    const before = groundMaterials.length;
    groundMaterials = groundMaterials.filter(node=>!node.expiresAt || node.expiresAt > timestamp);
    if(collection.getActive() && !groundMaterials.includes(collection.getActive().node)) collection.cancel();
    if(pendingGroundMaterial && !groundMaterials.some(node=>node.uid === pendingGroundMaterial.uid)) pendingGroundMaterial = null;
    return before - groundMaterials.length;
  }

  function handleServerEvent(reason, event = {}){
    const node = groundMaterials.find(entry=>String(entry.uid) === String(event.id || ""));
    const pickedPosition = node ? {x:node.renderX ?? node.x, y:node.renderY ?? node.y} : null;
    collection.handleServerEvent(reason, event);
    if(reason !== "loot:picked" || !node) return;
    groundMaterials = groundMaterials.filter(entry=>entry !== node);
    if(pendingGroundMaterial === node) pendingGroundMaterial = null;
    particles?.()?.push({...pickedPosition, life:.25, max:.25, size:18, color:node.glowCore || "rgba(125,211,252,.58)"});
    showToast(`${lootNameWithRarityHtml(node)} récupéré.`, {trustedHtml:true});
    rewards.showLootNotice({piece:lootNameWithRarityText(node)});
    onCargoChanged?.();
  }

  return {
    clear,
    spawnPortalPieceDrop,
    spawnServerLootDrop,
    findCargoBoxAt,
    findGroundMaterialAt,
    collectCargoBox,
    collectGroundMaterial,
    setCargoDestination,
    setGroundMaterialDestination,
    tick,
    updatePending,
    isMovementLocked:()=>false,
    handleServerEvent,
    getCargoBoxes:()=>cargoBoxes,
    setCargoBoxes:value=>{ cargoBoxes = Array.isArray(value) ? value : []; },
    getGroundMaterials:()=>groundMaterials,
    setGroundMaterials:value=>{ groundMaterials = Array.isArray(value) ? value : []; },
    clearPending:()=>{ collection.cancel(); pendingCargoBox = null; pendingGroundMaterial = null; }
  };
}
