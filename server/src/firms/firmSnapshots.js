import { buildPublicPlayerProfile } from "../players/publicProfile.js";

function cleanLookup(value){
  return String(value || "").trim().toLowerCase();
}

export function resolveProfileEntryForRankingRow(profileManager, row = {}){
  if(!profileManager || !row) return null;
  const candidateKeys = [
    row.key,
    String(row.key || "").startsWith("guest:") ? String(row.key).slice("guest:".length) : "",
    row.name && typeof profileManager.profileKey === "function" ? profileManager.profileKey(row.name) : "",
    row.name ? `guest:${cleanLookup(row.name)}` : ""
  ].filter(Boolean);

  for(const key of candidateKeys){
    const entry = profileManager.getProfileEntry?.(key);
    if(entry) return entry;
  }
  return profileManager.findProfileEntryByPilotName?.(row.name) || null;
}

export function enrichFirmSnapshot(profileManager, snapshot){
  if(!snapshot || !Array.isArray(snapshot.individualRanking)) return snapshot;
  return {
    ...snapshot,
    individualRanking:snapshot.individualRanking.map(row=>{
      if(row?.publicProfile) return row;
      const entry = resolveProfileEntryForRankingRow(profileManager, row);
      const publicProfile = entry
        ? buildPublicPlayerProfile({key:entry.key, profile:entry.profile, ranking:row})
        : null;
      return publicProfile ? {...row, publicProfile:{...publicProfile, sourceLabel:"Profil MMO"}} : row;
    })
  };
}
