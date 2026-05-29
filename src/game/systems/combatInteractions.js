import { getServerEnemyId } from "../../multiplayer/enemies.js";

export function createCombatInteractionSystem({
  store,
  getState,
  setState,
  actions,
  cargo,
  getAmmo,
  getAmmoCount,
  showToast,
  updateHud
}){
  let lastTargetLaserSlot = null;

  function findEnemyAt(world){
    const {enemies} = getState();
    let best = null, bestD = Infinity;
    for(const enemy of enemies){
      const d = Math.hypot(world.x-enemy.x, world.y-enemy.y);
      if(d < enemy.radius + 28 && d < bestD){ best = enemy; bestD = d; }
    }
    return best;
  }

  function validSelectedEnemy(){
    const {selectedEnemy, enemies} = getState();
    if(!selectedEnemy) return null;
    const selectedId = getServerEnemyId(selectedEnemy);
    const live = enemies.find(enemy=>getServerEnemyId(enemy) === selectedId && enemy.hp > 0);
    if(!live){
      setState({selectedEnemy:null});
      actions.setActiveLaserSlot(null);
      actions.updateGameActionBar();
      return null;
    }
    setState({selectedEnemy:live});
    return live;
  }

  function clearSelectedEnemy(){
    lastTargetLaserSlot = null;
    setState({selectedEnemy:null});
    actions.setActiveLaserSlot(null);
    actions.updateGameActionBar();
    updateHud();
  }

  function rememberActiveLaserSlot(){
    const slot = actions.getActiveLaserSlot();
    if(slot === null || slot === undefined) return;
    const ammo = getAmmo((store.state.actionSlots || [])[slot]);
    if(ammo?.weaponClass === "laser"){
      lastTargetLaserSlot = slot;
      actions.rememberLaserAmmo?.(ammo);
    }
  }

  function attackSelectedWithActiveLaser(){
    const {selectedEnemy} = getState();
    if(!selectedEnemy) return false;
    const slot = actions.getLaserSlotForAttack?.() ?? lastTargetLaserSlot;
    if(slot === null || slot === undefined) return false;
    const ammo = getAmmo((store.state.actionSlots || [])[slot]);
    if(ammo?.weaponClass !== "laser") return false;
    if(getAmmoCount(ammo.id) <= 0){
      showToast(`${ammo.name} : stock vide.`);
      return false;
    }
    lastTargetLaserSlot = slot;
    actions.rememberLaserAmmo?.(ammo);
    actions.setActiveLaserSlot(slot);
    actions.updateGameActionBar();
    return true;
  }

  function findCargoBoxAt(world){
    return cargo.findCargoBoxAt(world);
  }

  function findGroundMaterialAt(world){
    return cargo.findGroundMaterialAt(world);
  }

  function setCargoDestination(box){
    setState({moveTarget:cargo.setCargoDestination(box)});
    return true;
  }

  function setGroundMaterialDestination(node){
    setState({moveTarget:cargo.setGroundMaterialDestination(node)});
    return true;
  }

  function selectEnemy(enemy){
    setState({selectedEnemy:enemy});
    lastTargetLaserSlot = null;
  }

  return {
    findEnemyAt,
    validSelectedEnemy,
    clearSelectedEnemy,
    rememberActiveLaserSlot,
    attackSelectedWithActiveLaser,
    findCargoBoxAt,
    findGroundMaterialAt,
    setCargoDestination,
    setGroundMaterialDestination,
    selectEnemy
  };
}
