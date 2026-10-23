import {
  createCombatRejectedPayload,
  emitCombatRejectedToPlayer,
  ensureCombatShotId
} from "../combat/enemyHits.js";

export function registerCombatHandlers(socket, context){
  const {
    activateShipAbility,
    applyEnemyHit,
    applyPlayerHit,
    guard,
    pickupLoot,
    players,
    recordCombatResult
  } = context;

  function combatFireAck(result, payload){
    const shotId = ensureCombatShotId(result?.shotId || payload, socket.id);
    if(result?.accepted === true || (result?.ok === true && result?.outcome !== "rejected")){
      return {
        accepted:true,
        shotId,
        ammoRemaining:Math.max(0, Number(result?.ammoRemaining ?? result?.result?.ammoRemaining ?? 0)),
        consumed:Math.max(0, Number(result?.consumed ?? result?.result?.consumed ?? 0)),
        cooldownMs:Math.max(0, Number(result?.cooldownMs ?? result?.result?.cooldownMs ?? 0)),
        cooldownReadyAt:Math.max(0, Number(result?.cooldownReadyAt ?? result?.result?.cooldownReadyAt ?? 0))
      };
    }
    return {
      accepted:false,
      outcome:"rejected",
      shotId,
      reason:String(result?.reason || "Tir refuse par le serveur."),
      reasonCode:String(result?.reasonCode || "COMBAT_REJECTED"),
      retryAfterMs:Math.max(0, Number(result?.retryAfterMs || 0)),
      cooldownReadyAt:Math.max(0, Number(result?.cooldownReadyAt || 0))
    };
  }

  function acknowledge(ack, result, payload){
    if(typeof ack === "function") ack(combatFireAck(result, payload));
  }

  function rejectGuardedCombat(payload, ack){
    const player = players?.get?.(socket.id) || null;
    const shotId = ensureCombatShotId(payload, socket.id);
    const rejection = createCombatRejectedPayload({
      payload,
      player,
      shotId,
      reason:"Commande de tir refusee par le serveur.",
      reasonCode:"REQUEST_REJECTED"
    });
    emitCombatRejectedToPlayer({socket, player, rejection});
    recordCombatResult?.("rejected", rejection.reasonCode);
    acknowledge(ack, {ok:false, ...rejection}, payload);
  }

  socket.on("combat:fire", (payload, ack)=>{
    if(!guard("combat:fire")){
      rejectGuardedCombat(payload, ack);
      return;
    }
    const result = applyEnemyHit(socket, payload);
    recordCombatResult?.(
      result?.accepted === true ? result.outcome : "rejected",
      result?.reasonCode || ""
    );
    acknowledge(ack, result, payload);
  });

  socket.on("combat:fire-player", (payload, ack)=>{
    if(!guard("combat:fire-player")){
      rejectGuardedCombat(payload, ack);
      return;
    }
    const result = applyPlayerHit?.(socket, payload);
    recordCombatResult?.(
      result?.accepted === true ? result.outcome : "rejected",
      result?.reasonCode || ""
    );
    acknowledge(ack, result, payload);
  });

  socket.on("ship:ability-use", payload=>{
    if(!guard("ship:ability-use")) return;
    activateShipAbility?.(String(payload?.abilityId || ""));
  });

  socket.on("loot:pickup", payload=>{
    if(!guard("loot:pickup")) return;
    pickupLoot(socket, payload);
  });
}
