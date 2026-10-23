import { sendMmoCommand } from "./mmoGate.js";
import { createServerActionBurstQueue } from "./serverActionBurstQueue.js?v=20260726-economy-burst1";

export function createProgressionActions({
  multiplayer,
  store,
  getPortal,
  isPortalUnlocked,
  runServerSpaceCaster,
  unlockServerPortal,
  upgradeServerSkill,
  showToast
}){
  const spaceCasterQueue = createServerActionBurstQueue({
    onSendFailure:()=>showToast("Connexion perdue : lancement Space Caster annule.")
  });

  function runSpaceCaster(id, count = 1){
    const portal = getPortal(id);
    if(!portal) return;
    const rollCount = [1, 10, 100].includes(Number(count)) ? Number(count) : 1;
    store.state.selectedPortalCasterId = portal.id;
    sendMmoCommand({
      multiplayer,
      send:()=>spaceCasterQueue.enqueue({
        channel:"space-caster:run",
        key:`${portal.id}:${rollCount}`,
        send:repeat=>runServerSpaceCaster?.({portalId:portal.id, count:rollCount, repeat})
      }),
      showToast,
      sentMessage:"Lancement Space Caster pris en compte.",
      failedMessage:"Space Caster impossible."
    });
  }

  function unlockPortalWithPieces(id){
    const portal = getPortal(id);
    if(!portal) return;
    if(isPortalUnlocked(id)) return showToast(`${portal.name} est deja deverrouille.`);
    sendMmoCommand({
      multiplayer,
      send:()=>unlockServerPortal?.({id, method:"pieces"}),
      showToast,
      sentMessage:"Deverrouillage du portail envoye au serveur.",
      failedMessage:"Deverrouillage du portail impossible."
    });
  }

  function unlockSkill(id){
    sendMmoCommand({
      multiplayer,
      send:()=>upgradeServerSkill?.(id),
      showToast,
      sentMessage:"Amelioration envoyee au serveur.",
      failedMessage:"Impossible d'ameliorer cette competence."
    });
  }

  return {runSpaceCaster, unlockPortalWithPieces, unlockSkill};
}
