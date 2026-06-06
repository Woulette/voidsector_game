export function createCombatEnemyDamageSystem({
  isServerControlledEnemy,
  getServerEnemyId,
  sendServerEnemyHit
}){
  function damage(enemy, amount, context = {}){
    const incoming = Math.max(0, Number(amount || 0));
    enemy.recentHitTimer = 4;
    if(isServerControlledEnemy(enemy)){
      sendServerEnemyHit(getServerEnemyId(enemy), incoming, {...context, serverCalculated:true});
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
