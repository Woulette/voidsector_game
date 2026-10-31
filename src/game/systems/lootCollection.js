import { LOOT_COLLECTION_DURATION_MS, LOOT_COLLECTION_MOVE_TOLERANCE, LOOT_COLLECTION_TIMEOUT_MS } from "../../shared/lootCollection.js";

function resetVisual(node){
  if(!node) return;
  node.suctionActive = false;
  node.suctionProgress = 0;
  node.renderX = null;
  node.renderY = null;
  node.renderSize = null;
  delete node.suctionStartX;
  delete node.suctionStartY;
  delete node.suctionTargetX;
  delete node.suctionTargetY;
}

/** Presentation and commands only: a server acknowledgement is the sole pickup confirmation. */
export function createLootCollectionController({requestPickup, now = Date.now} = {}){
  let active = null;
  let attemptSequence = 0;

  function cancel({notify = true} = {}){
    if(!active) return false;
    const previous = active;
    active = null;
    resetVisual(previous.node);
    if(notify) requestPickup?.(previous.node.uid, "cancel", previous.attemptId);
    return true;
  }

  function begin(node, player){
    if(!node?.serverControlled || !player || player.isDead || active) return false;
    if(node.expiresAt && Number(node.expiresAt) <= now()) return false;
    const attemptId = `${node.uid}:${now()}:${++attemptSequence}`;
    if(!requestPickup?.(node.uid, "start", attemptId)) return false;
    active = {node, attemptId, startedAt:now(), anchorX:player.x, anchorY:player.y, phase:"collecting"};
    node.suctionStartX = Number(node.x);
    node.suctionStartY = Number(node.y);
    node.suctionActive = true;
    node.suctionProgress = 0;
    return true;
  }

  function update(player){
    if(!active) return false;
    const {node, startedAt, anchorX, anchorY} = active;
    const elapsed = Math.max(0, now() - startedAt);
    if(!player || player.isDead || (Number.isFinite(player.hp) && player.hp <= 0)
      || (node.expiresAt && Number(node.expiresAt) <= now())
      || Math.hypot(player.x - anchorX, player.y - anchorY) > LOOT_COLLECTION_MOVE_TOLERANCE
      || elapsed >= LOOT_COLLECTION_TIMEOUT_MS){
      cancel();
      return false;
    }
    const progress = Math.min(1, elapsed / LOOT_COLLECTION_DURATION_MS);
    const correctionX = Number(player.visualCorrectionOffsetX);
    const correctionY = Number(player.visualCorrectionOffsetY);
    node.suctionTargetX = Number(player.x) + (Number.isFinite(correctionX) ? correctionX : 0);
    node.suctionTargetY = Number(player.y) + (Number.isFinite(correctionY) ? correctionY : 0) + 22;
    // The beam works on a stationary ground target, which dissolves at the end.
    const dissolve = Math.max(0, (progress - .65) / .35);
    node.renderX = node.suctionStartX;
    node.renderY = node.suctionStartY;
    node.renderSize = Math.max(0, Number(node.size || 42) * (1 - dissolve * dissolve));
    node.suctionProgress = progress;
    if(progress === 1 && active.phase === "collecting"){
      active.phase = "awaiting";
      if(!requestPickup?.(node.uid, "finish", active.attemptId)) cancel({notify:false});
    }
    return Boolean(active);
  }

  function handleServerEvent(reason, event = {}){
    if(!active || String(event.id || "") !== String(active.node.uid)) return false;
    if(event.attemptId && event.attemptId !== active.attemptId) return false;
    if(reason === "loot:picked" || reason === "loot:error" || (reason === "loot:collection" && event.status === "cancelled")){
      cancel({notify:false});
      return true;
    }
    return false;
  }

  return {begin, update, cancel, handleServerEvent, getActive:()=>active};
}
