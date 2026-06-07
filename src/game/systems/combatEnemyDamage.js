export function createCombatEnemyDamageSystem({
  isServerControlledEnemy,
  getServerEnemyId,
  sendServerEnemyHit,
  sendServerPlayerHit
}){
  function damage(enemy, amount, context = {}){
    const incoming = Math.max(0, Number(amount || 0));
    enemy.recentHitTimer = 4;
    if(enemy?.isPlayerTarget){
      if(enemy.canAttack === false) return false;
      sendServerPlayerHit?.(enemy.playerId, {
        ...context,
        clientAimX:Number(enemy.x || 0),
        clientAimY:Number(enemy.y || 0),
        targetRadius:Number(enemy.radius || 0)
      });
      return false;
    }
    if(isServerControlledEnemy(enemy)){
      sendServerEnemyHit(getServerEnemyId(enemy), {
        ...context,
        clientAimX:Number(enemy.x || 0),
        clientAimY:Number(enemy.y || 0),
        targetRadius:Number(enemy.radius || 0)
      });
      return false;
    }
    const maxShield = Number(enemy.maxShield || 0);
    if(maxShield > 0 && enemy.shield > 0){
      const absorbRatio = Math.max(0, Math.min(1, Number(enemy.shieldAbsorbRatio ?? 0.8)));
      const shieldPart = incoming * absorbRatio;
      let hullPart = incoming - shieldPart;
      const absorbed = Math.min(enemy.shield, shieldPart);
      enemy.shield -= absorbed;
      hullPart += shieldPart - absorbed;
      if(hullPart > 0) enemy.hp -= hullPart;
      return true;
    }
    enemy.hp -= incoming;
    return true;
  }

  return {damage};
}
