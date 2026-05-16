export function createCombatCargoSystem({
  addShipCargoMaterial,
  getAllRawMaterials,
  getShipCargoCapacity,
  getShipCargoUsed,
  getActiveShipId,
  getSpawnPanelMode,
  fmt,
  rewards,
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

  function clear(){
    cargoBoxes = [];
    groundMaterials = [];
    pendingCargoBox = null;
    pendingGroundMaterial = null;
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
    pendingGroundMaterial = null;
    onCargoChanged?.();
    return true;
  }

  function setGroundMaterialDestination(node){
    pendingGroundMaterial = node;
    pendingCargoBox = null;
    return {x:node.x, y:node.y};
  }

  function updatePending(player){
    if(pendingCargoBox){
      const liveCargo = cargoBoxes.find(box=>box.id === pendingCargoBox.id);
      if(!liveCargo) pendingCargoBox = null;
      else if(Math.hypot(player.x - liveCargo.x, player.y - liveCargo.y) <= liveCargo.radius + 24) collectCargoBox(liveCargo);
    }
    if(pendingGroundMaterial){
      const liveMaterial = groundMaterials.find(node=>node.uid === pendingGroundMaterial.uid);
      if(!liveMaterial) pendingGroundMaterial = null;
      else if(Math.hypot(player.x - liveMaterial.x, player.y - liveMaterial.y) <= (liveMaterial.radius || 30) + 24) collectGroundMaterial(liveMaterial);
    }
  }

  return {
    clear,
    spawnCargoBox,
    findCargoBoxAt,
    findGroundMaterialAt,
    collectCargoBox,
    collectGroundMaterial,
    setCargoDestination,
    setGroundMaterialDestination,
    updatePending,
    getCargoBoxes:()=>cargoBoxes,
    setCargoBoxes:value=>{ cargoBoxes = Array.isArray(value) ? value : []; },
    getGroundMaterials:()=>groundMaterials,
    setGroundMaterials:value=>{ groundMaterials = Array.isArray(value) ? value : []; },
    clearPending:()=>{ pendingCargoBox = null; pendingGroundMaterial = null; }
  };
}
