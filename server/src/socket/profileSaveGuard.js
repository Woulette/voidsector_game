import { waitForProfileSave } from "../players/profilePersistenceResult.js";

export async function confirmProfileSave(socket, result, {
  eventName = "profile:error",
  message = "Sauvegarde temporairement indisponible. Reessaie."
} = {}){
  try{
    await waitForProfileSave(result);
    return true;
  }catch{
    socket?.emit?.(eventName, {message, at:Date.now()});
    return false;
  }
}
