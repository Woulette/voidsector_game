import { isAuthenticatedGameplaySession } from "./gameplaySession.js";

export function createSocialCommands({multiplayer, toast}){
  function emit(event, payload = {}){
    if(!isAuthenticatedGameplaySession(multiplayer)){
      toast("Compte MMO synchronise requis pour utiliser les fonctions sociales.");
      return false;
    }
    multiplayer.socket.emit(event, payload);
    return true;
  }

  return {
    requestSocialSync:()=>emit("social:sync"),
    requestFirmRankingSync:()=>emit("firm:sync"),
    sendFriendRequest:name=>emit("social:friend-request", {name}),
    respondFriendRequest:(key, accept)=>emit("social:friend-response", {key, accept}),
    setSocialCategory:(name, category)=>emit("social:set-category", {name, category}),
    removeSocialRelation:(key, category)=>emit("social:remove", {key, category}),
    sendPrivateMessage:(key, text)=>emit("social:private-message", {key, text})
  };
}
