import {drawOrbSentinel,setOrbSprite} from "./orbSprite.js";
import {drawVorakRusher,setVorakArtwork} from "./vorakSprite.js";
import {drawParasite,setParasiteArtwork} from "./parasiteSprite.js";
import {drawAbyssalTracker,setTrackerArtwork} from "./trackerSprite.js";
import {drawEclanite,setEclaniteArtwork} from "./eclaniteSprite.js";
import {ORB_VISUAL_PROFILES} from "../../../src/game/combatData/orbVisuals.js";
import {VORAK_VISUAL_PROFILES,VORAK_THRUSTER_TEXTURE} from "../../../src/game/combatData/vorakVisuals.js";
import {PARASITE_PROFILES} from "./parasiteVisuals.js";
import {TRACKER_VISUAL_PROFILES} from "./trackerVisuals.js";
import {ECLANITE_SOURCE} from "../../../src/game/combatData/eclaniteVisuals.js";

export const isLocomotionSubject=kind=>Object.hasOwn(ORB_VISUAL_PROFILES,kind)
  || Object.hasOwn(VORAK_VISUAL_PROFILES,kind) || Object.hasOwn(PARASITE_PROFILES,kind)
  || Object.hasOwn(TRACKER_VISUAL_PROFILES,kind) || kind === "eclanite";

export function setLocomotionReferenceArtwork(images,engineAtlas){
  for(const [kind,profile] of Object.entries(ORB_VISUAL_PROFILES))setOrbSprite(kind,images[profile.sprite]);
  for(const [kind,profile] of Object.entries(VORAK_VISUAL_PROFILES))setVorakArtwork(kind,images[profile.sprite],engineAtlas || images[VORAK_THRUSTER_TEXTURE]);
  for(const [kind,profile] of Object.entries(PARASITE_PROFILES))setParasiteArtwork(kind,images[profile.sprite]);
  for(const [kind,profile] of Object.entries(TRACKER_VISUAL_PROFILES))setTrackerArtwork(images[profile.sprite],kind);
  setEclaniteArtwork(images[ECLANITE_SOURCE]);
}

export function drawLocomotionReference(ctx,enemy,time,shotAge,dt,state){
  if(Object.hasOwn(ORB_VISUAL_PROFILES,enemy.kind))return drawOrbSentinel(ctx,enemy,time,shotAge,dt,state);
  if(Object.hasOwn(VORAK_VISUAL_PROFILES,enemy.kind))return drawVorakRusher(ctx,enemy,time,shotAge,dt,state);
  if(Object.hasOwn(PARASITE_PROFILES,enemy.kind))return drawParasite(ctx,enemy,time,shotAge,dt,state);
  if(Object.hasOwn(TRACKER_VISUAL_PROFILES,enemy.kind))return drawAbyssalTracker(ctx,enemy,time,shotAge,dt,state);
  return drawEclanite(ctx,enemy,time,shotAge,dt,state);
}
