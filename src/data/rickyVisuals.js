export const RICKY_SAUCER_ASSET = "assets/ships/npc/ricky-saucer-v2.png";

export function isRickyNpc(npc = {}){
  const id = String(npc.npcId || npc.id || "");
  return id === "ricky_companion" || id.endsWith("02_portal_mechanic");
}

export const RICKY_SHOT_VISUAL_FIELDS = Object.freeze(["clientAimAngle", "clientAimUntil", "clientLaserShotAt", "clientRocketShotAt", "clientSpellAt", "clientMuzzleSide"]);
