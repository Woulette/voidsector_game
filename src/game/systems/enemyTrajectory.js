function hashText(value){
  let hash = 2166136261;
  for(const char of String(value || "")){
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomUnit(key){
  return hashText(key) / 4294967296;
}

const ENGAGEMENT_PHASE_CROSSING = "crossing";
const ENGAGEMENT_PHASE_HOLDING = "holding";

export function getEnemyRepathDelayMs(enemy, baseMs = 700){
  const spread = hashText(enemy?.id) % 161 - 80;
  return Math.max(300, Number(baseMs || 700) + spread);
}

export function resetEnemyEngagement(enemy){
  if(!enemy) return;
  enemy.engagementTargetId = "";
  enemy.engagementAngle = null;
  enemy.engagementRadiusRatio = null;
  enemy.engagementPhase = "";
}

function assignEngagementRoute(enemy, {targetId, targetX, targetY, attackRange, decisionIndex}){
  const key = `${enemy?.id || "enemy"}:${targetId}:${decisionIndex}`;
  const enemyX = Number(enemy?.x || 0);
  const enemyY = Number(enemy?.y || 0);
  const dx = targetX - enemyX;
  const dy = targetY - enemyY;
  const distance = Math.hypot(dx, dy);
  const fallbackAngle = randomUnit(`${key}:fallback-angle`) * Math.PI * 2;
  enemy.engagementTargetId = targetId;
  enemy.engagementAngle = distance > .001 ? Math.atan2(dy, dx) : fallbackAngle;
  enemy.engagementRadiusRatio = .52 + randomUnit(`${key}:radius`) * .14;
  enemy.engagementPhase = distance > Number(attackRange || 360)
    ? ENGAGEMENT_PHASE_CROSSING
    : ENGAGEMENT_PHASE_HOLDING;
}

export function isEnemyEngagementCrossing(enemy){
  return enemy?.engagementPhase === ENGAGEMENT_PHASE_CROSSING;
}

export function isEnemyEngagementHolding(enemy){
  return enemy?.engagementPhase === ENGAGEMENT_PHASE_HOLDING;
}

export function completeEnemyEngagement(enemy){
  if(!enemy) return;
  enemy.engagementPhase = ENGAGEMENT_PHASE_HOLDING;
}

export function getEnemyEngagementPoint(enemy, target, attackRange, decisionIndex = 0){
  const targetId = String(target?.id || "target");
  const targetX = Number(target?.x || 0);
  const targetY = Number(target?.y || 0);
  const safeAttackRange = Number(attackRange || 360);
  const needsPlacement = String(enemy?.engagementTargetId || "") !== targetId
    || !Number.isFinite(Number(enemy?.engagementAngle))
    || !Number.isFinite(Number(enemy?.engagementRadiusRatio))
    || !enemy?.engagementPhase;
  if(needsPlacement){
    assignEngagementRoute(enemy, {
      targetId,
      targetX,
      targetY,
      attackRange:safeAttackRange,
      decisionIndex
    });
  }else if(
    enemy.engagementPhase === ENGAGEMENT_PHASE_HOLDING
    && Math.hypot(targetX - Number(enemy?.x || 0), targetY - Number(enemy?.y || 0)) > safeAttackRange
  ){
    assignEngagementRoute(enemy, {
      targetId,
      targetX,
      targetY,
      attackRange:safeAttackRange,
      decisionIndex
    });
  }
  const angle = Number(enemy.engagementAngle);
  const radiusRatio = Number(enemy.engagementRadiusRatio);
  const radius = Math.max(110, safeAttackRange * radiusRatio);
  return {
    x:targetX + Math.cos(angle) * radius,
    y:targetY + Math.sin(angle) * radius,
    angle,
    radius,
    crossesTargetCenter:isEnemyEngagementCrossing(enemy),
    phase:enemy.engagementPhase
  };
}
