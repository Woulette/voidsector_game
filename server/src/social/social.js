import { ships } from "../../../src/data/ships.js";
import { getFirmDefinition, normalizeFirmId } from "../../../src/data/firms.js";
import { WORLD_MAPS } from "../world/definitions.js";

const AWAY_AFTER_MS = 5 * 60 * 1000;

function unique(list){
  return [...new Set((Array.isArray(list) ? list : []).map(String).filter(Boolean))];
}

function remove(list, key){
  return unique(list).filter(entry=>entry !== key);
}

function add(list, key){
  return unique([...remove(list, key), key]);
}

export function createSocialManager({io, players, profileManager}){
  function keyForPlayer(player){
    return player ? profileManager.profileKeyForPlayer(player) : "";
  }

  function socketsForKey(key){
    return [...players.values()].filter(player=>keyForPlayer(player) === key);
  }

  function livePlayerForKey(key){
    const candidates = socketsForKey(key);
    return candidates.find(player=>player.clientMode === "game" && player.connected !== false && player.state)
      || candidates.find(player=>player.connected !== false)
      || null;
  }

  function publicContact(key, now = Date.now()){
    const entry = profileManager.getProfileEntry(key);
    if(!entry) return null;
    const profile = entry.profile;
    const live = livePlayerForKey(key);
    const gameLive = live?.clientMode === "game" && live?.state ? live : socketsForKey(key).find(player=>player.clientMode === "game" && player.connected !== false && player.state);
    const lastUpdate = Number(gameLive?.state?.updatedAt || 0);
    const status = gameLive && now - lastUpdate < AWAY_AFTER_MS ? "online" : live ? "away" : "offline";
    const firm = getFirmDefinition(profile?.player?.firmId || "astra");
    const ship = ships.find(entry=>entry.id === String(gameLive?.state?.shipId || profile?.activeShip || ""));
    const map = WORLD_MAPS[String(gameLive?.state?.mapId ?? "")];
    return {
      key,
      name:String(profile?.player?.name || "Pilote"),
      firmId:firm.id,
      firmLabel:firm.label,
      status,
      playerId:gameLive?.id || null,
      mapId:gameLive?.state?.mapId ?? null,
      mapName:map?.name || (gameLive?.state?.mapId != null ? String(gameLive.state.mapId) : "Hors ligne"),
      shipId:String(gameLive?.state?.shipId || profile?.activeShip || ""),
      shipName:ship?.name || String(gameLive?.state?.shipId || profile?.activeShip || "Inconnu"),
      level:Math.max(1, Number(profile?.player?.level || 1))
    };
  }

  function publicSocialForPlayer(player){
    const ownKey = keyForPlayer(player);
    const profile = profileManager.getProfileForPlayer(player);
    const social = profile?.social || {};
    const contacts = keys=>unique(keys).map(key=>publicContact(key)).filter(Boolean);
    const firmId = normalizeFirmId(profile?.player?.firmId || "astra");
    const firmMembers = profileManager.listProfileEntries()
      .filter(entry=>entry.key !== ownKey && normalizeFirmId(entry.profile?.player?.firmId || "astra") === firmId)
      .map(entry=>publicContact(entry.key))
      .filter(Boolean)
      .sort((a, b)=>a.name.localeCompare(b.name, "fr"));
    return {
      friends:contacts(social.friends),
      incoming:contacts(social.incoming),
      outgoing:contacts(social.outgoing),
      enemies:contacts(social.enemies),
      ignored:contacts(social.ignored),
      firmId,
      firmMembers:firmMembers.slice(0, 250)
    };
  }

  function emitSocialForKey(key){
    for(const player of socketsForKey(key)){
      io.to(player.id).emit("social:update", publicSocialForPlayer(player));
    }
  }

  function emitSocialForPlayer(player){
    if(player?.accountId) emitSocialForKey(keyForPlayer(player));
  }

  function findTarget(player, name){
    if(!player?.accountId) return {ok:false, reason:"Connecte ton compte pour utiliser les fonctions sociales."};
    const target = profileManager.findProfileEntryByPilotName(name);
    if(!target) return {ok:false, reason:"Joueur introuvable."};
    const ownKey = keyForPlayer(player);
    if(target.key === ownKey) return {ok:false, reason:"Tu ne peux pas te cibler toi-meme."};
    return {ok:true, ownKey, targetKey:target.key, targetProfile:target.profile};
  }

  function sendFriendRequest(player, name){
    const found = findTarget(player, name);
    if(!found.ok) return found;
    const ownProfile = profileManager.getProfileForPlayer(player);
    if(ownProfile?.social?.friends?.includes(found.targetKey)) return {ok:false, reason:"Ce joueur est deja ton ami."};
    if(found.targetProfile?.social?.ignored?.includes(found.ownKey)) return {ok:false, reason:"Demande impossible."};
    profileManager.updateProfileByKey(found.ownKey, profile=>{
      profile.social.outgoing = add(profile.social.outgoing, found.targetKey);
      profile.social.enemies = remove(profile.social.enemies, found.targetKey);
      profile.social.ignored = remove(profile.social.ignored, found.targetKey);
    });
    profileManager.updateProfileByKey(found.targetKey, profile=>{
      profile.social.incoming = add(profile.social.incoming, found.ownKey);
    });
    emitSocialForKey(found.ownKey);
    emitSocialForKey(found.targetKey);
    return {ok:true};
  }

  function respondFriendRequest(player, targetKey, accept){
    if(!player?.accountId) return {ok:false, reason:"Connecte ton compte pour utiliser les fonctions sociales."};
    const ownKey = keyForPlayer(player);
    const ownProfile = profileManager.getProfileForPlayer(player);
    if(!ownProfile?.social?.incoming?.includes(targetKey)) return {ok:false, reason:"Demande introuvable."};
    profileManager.updateProfileByKey(ownKey, profile=>{
      profile.social.incoming = remove(profile.social.incoming, targetKey);
      if(accept){
        profile.social.friends = add(profile.social.friends, targetKey);
        profile.social.enemies = remove(profile.social.enemies, targetKey);
        profile.social.ignored = remove(profile.social.ignored, targetKey);
      }
    });
    profileManager.updateProfileByKey(targetKey, profile=>{
      profile.social.outgoing = remove(profile.social.outgoing, ownKey);
      if(accept){
        profile.social.friends = add(profile.social.friends, ownKey);
        profile.social.enemies = remove(profile.social.enemies, ownKey);
        profile.social.ignored = remove(profile.social.ignored, ownKey);
      }
    });
    emitSocialForKey(ownKey);
    emitSocialForKey(targetKey);
    return {ok:true};
  }

  function setCategory(player, name, category){
    const found = findTarget(player, name);
    if(!found.ok) return found;
    if(!["enemies", "ignored"].includes(category)) return {ok:false, reason:"Categorie inconnue."};
    profileManager.updateProfileByKey(found.ownKey, profile=>{
      profile.social[category] = add(profile.social[category], found.targetKey);
      profile.social[category === "enemies" ? "ignored" : "enemies"] = remove(
        profile.social[category === "enemies" ? "ignored" : "enemies"],
        found.targetKey
      );
      profile.social.friends = remove(profile.social.friends, found.targetKey);
      profile.social.incoming = remove(profile.social.incoming, found.targetKey);
      profile.social.outgoing = remove(profile.social.outgoing, found.targetKey);
    });
    profileManager.updateProfileByKey(found.targetKey, profile=>{
      profile.social.friends = remove(profile.social.friends, found.ownKey);
      profile.social.incoming = remove(profile.social.incoming, found.ownKey);
      profile.social.outgoing = remove(profile.social.outgoing, found.ownKey);
    });
    emitSocialForKey(found.ownKey);
    emitSocialForKey(found.targetKey);
    return {ok:true};
  }

  function removeRelation(player, targetKey, category){
    if(!player?.accountId) return {ok:false, reason:"Connecte ton compte pour utiliser les fonctions sociales."};
    const ownKey = keyForPlayer(player);
    if(!["friends", "enemies", "ignored", "outgoing"].includes(category)) return {ok:false, reason:"Categorie inconnue."};
    profileManager.updateProfileByKey(ownKey, profile=>{
      profile.social[category] = remove(profile.social[category], targetKey);
    });
    if(category === "friends" || category === "outgoing"){
      profileManager.updateProfileByKey(targetKey, profile=>{
        profile.social.friends = remove(profile.social.friends, ownKey);
        profile.social.incoming = remove(profile.social.incoming, ownKey);
      });
    }
    emitSocialForKey(ownKey);
    emitSocialForKey(targetKey);
    return {ok:true};
  }

  function sendPrivateMessage(player, targetKey, text){
    if(!player?.accountId) return {ok:false, reason:"Connecte ton compte pour utiliser les fonctions sociales."};
    const ownKey = keyForPlayer(player);
    const ownProfile = profileManager.getProfileForPlayer(player);
    const target = profileManager.getProfileEntry(targetKey);
    const message = String(text || "").replace(/\s+/g, " ").trim().slice(0, 220);
    if(!target || !message) return {ok:false, reason:"Message prive invalide."};
    if(target.profile?.social?.ignored?.includes(ownKey)) return {ok:false, reason:"Message prive refuse."};
    if(!ownProfile?.social?.friends?.includes(targetKey)) return {ok:false, reason:"Ajoute ce joueur en ami avant de lui ecrire."};
    const payload = {
      id:`private_${Date.now()}_${player.id}`,
      channel:"private",
      text:message,
      author:{name:ownProfile?.player?.name || player.name, key:ownKey},
      target:{name:target.profile?.player?.name || "Pilote", key:targetKey},
      at:Date.now()
    };
    for(const targetPlayer of socketsForKey(targetKey)) io.to(targetPlayer.id).emit("social:private-message", payload);
    io.to(player.id).emit("social:private-message", payload);
    return {ok:true};
  }

  return {
    emitSocialForPlayer,
    publicSocialForPlayer,
    removeRelation,
    respondFriendRequest,
    sendFriendRequest,
    sendPrivateMessage,
    setCategory
  };
}
