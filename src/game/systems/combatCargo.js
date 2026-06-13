export function createCombatCargoSystem({
  addPortalPiece,
  addShipCargoMaterial,
  recordQuestItemPickup,
  getAllRawMaterials,
  getShipCargoCapacity,
  getShipCargoUsed,
  getActiveShipId,
  getSpawnPanelMode,
  fmt,
  rewards,
  requestServerLootPickup,
  saveState,
  showToast,
  onCargoChanged,
  onSpawnPanelRefresh,
  particles
}){
  let cargoBoxes = [];
  let groundMaterials = [];
  let pendingCargoBox = null;
  let pendingGroundMaterial = null;
  let groundMaterialSuction = null;
  const DROP_TTL_MS = 60000;
  const GROUND_MATERIAL_SUCTION_MS = 700;

  function clear(){
    cargoBoxes = [];
    groundMaterials = [];
    pendingCargoBox = null;
    pendingGroundMaterial = null;
    groundMaterialSuction = null;
  }

  function spawnCargoBox(enemy, materials){
    if(!materials?.length) return null;
    const box = {
      id:Date.now() + Math.floor(Math.random() * 10000),
      x:enemy.x + (Math.random() - .5) * 70,
      y:enemy.y + (Math.random() - .5) * 70,
      radius:38,
      materials
    };
    cargoBoxes.push(box);
    return box;
  }

  function spawnPortalPieceDrop(enemy, portal, source = {}){
    if(!enemy || !portal) return null;
    const node = {
      uid:source.uid || `portal_piece_${portal.id}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      kind:"portalPiece",
      portalId:portal.id,
      id:portal.id,
      name:`Piece ${portal.name}`,
      label:"PIECE",
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
      serverControlled:Boolean(source.serverControlled)
    };
    groundMaterials.push(node);
    return node;
  }

  function spawnQuestItemDrop(enemy, item, source = {}){
    if(!enemy || !item?.itemId) return null;
    const node = {
      uid:source.uid || `quest_item_${item.itemId}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      kind:"questItem",
      itemId:item.itemId,
      questId:item.questId || null,
      objectiveId:item.objectiveId || null,
      id:item.itemId,
      name:item.itemName || "Objet de quete",
      label:"QUETE",
      img:item.itemImg || "assets/quest_items/contaminated_sample.png",
      x:Number(source.x ?? enemy.x) + (source.x === undefined ? (Math.random() - .5) * 70 : 0),
      y:Number(source.y ?? enemy.y) + (source.y === undefined ? (Math.random() - .5) * 70 : 0),
      radius:32,
      size:42,
      phase:Math.random() * Math.PI * 2,
      glow:"rgba(34,197,94,.24)",
      glowCore:"rgba(134,239,172,.58)",
      fallback:"rgba(34,197,94,.86)",
      expiresAt:Number(source.expiresAt || Date.now() + DROP_TTL_MS)
    };
    groundMaterials.push(node);
    return node;
  }

  function spawnServerLootDrop(event = {}){
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
      serverControlled:Boolean(event.serverControlled)
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
    const rawMaterials = getAllRawMaterials();
    const labels = [];
    const remainingMaterials = [];
    let addedTotal = 0;
    for(const drop of box.materials || []){
      const result = addShipCargoMaterial(drop.id, drop.amount);
      const material = rawMaterials.find(item=>item.id === drop.id);
      if(result.added > 0){
        labels.push(`${result.added} ${material?.short || drop.id.toUpperCase()}`);
        addedTotal += result.added;
      }
      if(result.remaining > 0) remainingMaterials.push({...drop, amount:result.remaining});
    }
    if(addedTotal <= 0){
      pendingCargoBox = null;
      showToast("Soute pleine.");
      onCargoChanged?.();
      return false;
    }
    if(remainingMaterials.length) box.materials = remainingMaterials;
    else cargoBoxes.splice(index, 1);
    particles().push({x:box.x, y:box.y, life:.42, max:.42, size:26, color:"rgba(34,197,94,.58)"});
    saveState();
    const used = getShipCargoUsed(getActiveShipId());
    const capacity = getShipCargoCapacity(getActiveShipId());
    showToast(`Cargo recupere : ${labels.join(" - ")} (${fmt(used)} / ${fmt(capacity)}).`);
    rewards.showCargoLoot(labels);
    window.dispatchEvent(new CustomEvent("voidsector:combat-log", {detail:{
      kind:"loot",
      enemyName:"Ramassage",
      label:`Cargo : ${labels.join(" - ")}`,
      at:Date.now()
    }}));
    pendingCargoBox = null;
    onCargoChanged?.();
    if(getSpawnPanelMode()) onSpawnPanelRefresh?.(getSpawnPanelMode());
    return true;
  }

  function setCargoDestination(box){
    pendingCargoBox = box;
    pendingGroundMaterial = null;
    return {x:box.x, y:box.y};
  }

  function collectGroundMaterial(node){
    const index = groundMaterials.findIndex(entry=>entry.uid === node.uid);
    if(index < 0) return false;
    if(node.expiresAt && Date.now() >= node.expiresAt){
      groundMaterials.splice(index, 1);
      pendingGroundMaterial = null;
      return false;
    }
    if(node.serverControlled){
      if(requestServerLootPickup?.(node.uid)){
        groundMaterials.splice(index, 1);
        particles().push({x:node.x, y:node.y, life:.42, max:.42, size:28, color:node.glowCore || "rgba(216,180,254,.58)"});
        const amountLabel = Number(node.amount || 1) > 1 ? ` x${node.amount}` : "";
        showToast(`Ramassage serveur : ${node.name}${amountLabel}.`);
        rewards.showLootNotice({piece:`${node.name}${amountLabel} envoye au serveur`});
        pendingGroundMaterial = null;
        onCargoChanged?.();
        return true;
      }
      return false;
    }
    if(node.kind === "portalPiece"){
      addPortalPiece(node.portalId || node.id, 1);
      groundMaterials.splice(index, 1);
      particles().push({x:node.x, y:node.y, life:.42, max:.42, size:28, color:node.glowCore || "rgba(216,180,254,.58)"});
      saveState();
      showToast(`+1 ${node.name}.`);
      rewards.showLootNotice({piece:`+1 ${node.name}`});
      window.dispatchEvent(new CustomEvent("voidsector:combat-log", {detail:{
        kind:"loot",
        enemyName:"Ramassage",
        label:`+1 ${node.name}`,
        at:Date.now()
      }}));
      pendingGroundMaterial = null;
      onCargoChanged?.();
      return true;
    }
    if(node.kind === "questItem"){
      const completed = recordQuestItemPickup?.(node.itemId);
      if(!completed && node.questId){
        pendingGroundMaterial = null;
        showToast("Objet de quete non requis pour le moment.");
        onCargoChanged?.();
        return false;
      }
      groundMaterials.splice(index, 1);
      particles().push({x:node.x, y:node.y, life:.42, max:.42, size:28, color:node.glowCore || "rgba(134,239,172,.58)"});
      saveState();
      showToast(`${node.name} recupere.`);
      rewards.showLootNotice({piece:`${node.name} recupere`});
      window.dispatchEvent(new CustomEvent("voidsector:combat-log", {detail:{
        kind:"loot",
        enemyName:"Ramassage",
        label:`${node.name} recupere`,
        at:Date.now()
      }}));
      pendingGroundMaterial = null;
      onCargoChanged?.();
      if(getSpawnPanelMode()) onSpawnPanelRefresh?.(getSpawnPanelMode());
      return true;
    }
    const result = addShipCargoMaterial(node.id, 1);
    if(result.added <= 0){
      pendingGroundMaterial = null;
      showToast("Soute pleine.");
      onCargoChanged?.();
      return false;
    }
    groundMaterials.splice(index, 1);
    particles().push({x:node.x, y:node.y, life:.36, max:.36, size:24, color:node.glowCore || "rgba(125,211,252,.5)"});
    saveState();
    showToast(`+1 ${node.name} dans la soute.`);
    window.dispatchEvent(new CustomEvent("voidsector:combat-log", {detail:{
      kind:"loot",
      enemyName:"Ramassage",
      label:`+1 ${node.name}`,
      at:Date.now()
    }}));
    pendingGroundMaterial = null;
    onCargoChanged?.();
    return true;
  }

  function beginGroundMaterialSuction(node, player){
    if(!node || !player || groundMaterialSuction) return false;
    groundMaterialSuction = {
      uid:node.uid,
      startedAt:Date.now(),
      startX:Number(node.x || 0),
      startY:Number(node.y || 0),
      startSize:Number(node.size || 42),
      nextParticleAt:0
    };
    node.suctionActive = true;
    player.vx = 0;
    player.vy = 0;
    player.enginePower = 0;
    return true;
  }

  function updateGroundMaterialSuction(player){
    if(!groundMaterialSuction || !player) return false;
    const node = groundMaterials.find(entry=>entry.uid === groundMaterialSuction.uid);
    if(!node){
      groundMaterialSuction = null;
      pendingGroundMaterial = null;
      return false;
    }
    const elapsed = Date.now() - groundMaterialSuction.startedAt;
    const progress = Math.max(0, Math.min(1, elapsed / GROUND_MATERIAL_SUCTION_MS));
    const eased = 1 - Math.pow(1 - progress, 3);
    node.x = groundMaterialSuction.startX + (player.x - groundMaterialSuction.startX) * eased;
    node.y = groundMaterialSuction.startY + (player.y - groundMaterialSuction.startY) * eased;
    node.renderSize = Math.max(5, groundMaterialSuction.startSize * (1 - eased * .82));
    node.suctionProgress = progress;
    player.vx = 0;
    player.vy = 0;
    player.enginePower = 0;
    if(elapsed >= groundMaterialSuction.nextParticleAt){
      groundMaterialSuction.nextParticleAt = elapsed + 70;
      const angle = Math.random() * Math.PI * 2;
      const radius = 18 + Math.random() * 20;
      particles().push({
        x:node.x + Math.cos(angle) * radius,
        y:node.y + Math.sin(angle) * radius,
        vx:(player.x - node.x) * 1.8,
        vy:(player.y - node.y) * 1.8,
        life:.24,
        max:.24,
        size:2 + Math.random() * 3,
        color:node.glowCore || "rgba(125,211,252,.72)"
      });
    }
    if(progress < 1) return true;
    node.suctionActive = false;
    node.renderSize = null;
    groundMaterialSuction = null;
    collectGroundMaterial(node);
    return false;
  }

  function setGroundMaterialDestination(node){
    if(groundMaterialSuction) return null;
    pendingGroundMaterial = node;
    pendingCargoBox = null;
    return {x:node.x, y:node.y};
  }

  function updatePending(player){
    if(updateGroundMaterialSuction(player)) return;
    if(pendingCargoBox){
      const liveCargo = cargoBoxes.find(box=>box.id === pendingCargoBox.id);
      if(!liveCargo) pendingCargoBox = null;
      else if(Math.hypot(player.x - liveCargo.x, player.y - liveCargo.y) <= liveCargo.radius + 24) collectCargoBox(liveCargo);
    }
    if(pendingGroundMaterial){
      const liveMaterial = groundMaterials.find(node=>node.uid === pendingGroundMaterial.uid);
      if(!liveMaterial) pendingGroundMaterial = null;
      else if(Math.hypot(player.x - liveMaterial.x, player.y - liveMaterial.y) <= (liveMaterial.radius || 30) + 24){
        if(liveMaterial.kind === "material") beginGroundMaterialSuction(liveMaterial, player);
        else collectGroundMaterial(liveMaterial);
      }
    }
  }

  function tick(){
    const now = Date.now();
    const before = groundMaterials.length;
    groundMaterials = groundMaterials.filter(node=>!node.expiresAt || node.expiresAt > now);
    if(pendingGroundMaterial && !groundMaterials.some(node=>node.uid === pendingGroundMaterial.uid)) pendingGroundMaterial = null;
    return before - groundMaterials.length;
  }

  return {
    clear,
    spawnCargoBox,
    spawnPortalPieceDrop,
    spawnQuestItemDrop,
    spawnServerLootDrop,
    findCargoBoxAt,
    findGroundMaterialAt,
    collectCargoBox,
    collectGroundMaterial,
    setCargoDestination,
    setGroundMaterialDestination,
    tick,
    updatePending,
    isMovementLocked:()=>Boolean(groundMaterialSuction),
    getCargoBoxes:()=>cargoBoxes,
    setCargoBoxes:value=>{ cargoBoxes = Array.isArray(value) ? value : []; },
    getGroundMaterials:()=>groundMaterials,
    setGroundMaterials:value=>{ groundMaterials = Array.isArray(value) ? value : []; },
    clearPending:()=>{ pendingCargoBox = null; pendingGroundMaterial = null; groundMaterialSuction = null; }
  };
}
