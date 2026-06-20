import { isAuthenticatedGameplaySession } from "../multiplayer/gameplaySession.js";

export const MMO_REQUIRED_MESSAGE = "Compte MMO synchronise requis.";

export function isMmoConnected(multiplayer){
  return isAuthenticatedGameplaySession(multiplayer);
}

export function requireMmoConnection(multiplayer, showToast, message = MMO_REQUIRED_MESSAGE){
  if(isMmoConnected(multiplayer)) return true;
  showToast?.(message);
  return false;
}

export function sendMmoCommand({
  multiplayer,
  send,
  showToast,
  sentMessage = "Commande envoyee au serveur.",
  offlineMessage = MMO_REQUIRED_MESSAGE,
  failedMessage = "Commande serveur impossible."
} = {}){
  if(!requireMmoConnection(multiplayer, showToast, offlineMessage)) return false;
  if(typeof send === "function" && send()){
    showToast?.(sentMessage);
    return true;
  }
  showToast?.(failedMessage);
  return false;
}
