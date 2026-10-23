import { hasCompletedProgressionPortal, PROGRESSION_UNLOCKS, STELLAR_SYSTEM_TITLE } from "../../../src/shared/progressionUnlocks.js";

export const STELLAR_SYSTEM_TITLE_ID = STELLAR_SYSTEM_TITLE.id;
export const STELLAR_SYSTEM_TITLE_NAME = STELLAR_SYSTEM_TITLE.name;
export const STELLAR_SYSTEM_TITLE_DAMAGE_MULTIPLIER = STELLAR_SYSTEM_TITLE.damageMultiplier;
export const STELLAR_SYSTEM_TITLE_ORNAMENT_ID = STELLAR_SYSTEM_TITLE.ornamentId;

export const PROFILE_TITLE_NAMES = Object.freeze({
  [STELLAR_SYSTEM_TITLE_ID]:STELLAR_SYSTEM_TITLE_NAME
});

export function isProfileTitleUnlocked(profile, titleId){
  return String(titleId || "") === STELLAR_SYSTEM_TITLE_ID
    && hasCompletedProgressionPortal(profile, PROGRESSION_UNLOCKS.stellarSystemTitle.portalId);
}

export function sanitizeProfileTitleState(profile){
  if(!profile?.player || typeof profile.player !== "object") return {titleId:null, visible:true};
  const titleId = String(profile.player.activeTitleId || "");
  profile.player.activeTitleId = isProfileTitleUnlocked(profile, titleId) ? titleId : null;
  profile.player.titleVisible = profile.player.titleVisible !== false;
  return {
    titleId:profile.player.activeTitleId,
    visible:profile.player.titleVisible
  };
}

export function applyProfileTitleSelection(profile, {titleId, visible} = {}){
  if(!profile?.player || typeof profile.player !== "object") return {ok:false, reason:"Profil joueur invalide."};
  if(titleId !== undefined){
    const nextTitleId = String(titleId || "");
    if(nextTitleId && !isProfileTitleUnlocked(profile, nextTitleId)){
      return {ok:false, reason:`Terminez ${PROGRESSION_UNLOCKS.stellarSystemTitle.portalName} pour équiper ce titre.`};
    }
    profile.player.activeTitleId = nextTitleId || null;
  }
  if(visible !== undefined) profile.player.titleVisible = visible !== false;
  const sanitized = sanitizeProfileTitleState(profile);
  return {ok:true, ...sanitized};
}

export function getActiveProfileTitleName(profile){
  const player = profile?.player || {};
  if(player.titleVisible === false || !isProfileTitleUnlocked(profile, player.activeTitleId)) return null;
  return PROFILE_TITLE_NAMES[player.activeTitleId] || null;
}

export function getEquippedProfileTitleDamageMultiplier(profile){
  return isProfileTitleUnlocked(profile, profile?.player?.activeTitleId)
    ? STELLAR_SYSTEM_TITLE_DAMAGE_MULTIPLIER
    : 1;
}

export function getUnlockedProfileTitleEntitlements(profile){
  if(!isProfileTitleUnlocked(profile, STELLAR_SYSTEM_TITLE_ID)) return [];
  return [{
    id:STELLAR_SYSTEM_TITLE_ID,
    name:STELLAR_SYSTEM_TITLE_NAME,
    ornamentId:STELLAR_SYSTEM_TITLE_ORNAMENT_ID,
    damageMultiplier:STELLAR_SYSTEM_TITLE_DAMAGE_MULTIPLIER
  }];
}
