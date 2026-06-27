function pushEvent(target, event, limit, extra = {}){
  target.push({...event, ...extra, receivedAt:performance.now()});
  if(target.length > limit) target.splice(0, target.length - limit);
}

function emitQuestRewardLog(event = {}){
  const reward = event.reward || {};
  if(!reward || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("voidsector:combat-log", {detail:{
    kind:"quest",
    enemyName:`Quete : ${event.title || "terminee"}`,
    label:event.auto ? "Recompense automatique" : "Recompense recue",
    credits:Math.max(0, Math.round(Number(reward.credits || 0))),
    premium:Math.max(0, Math.round(Number(reward.premium || 0))),
    xp:Math.max(0, Math.round(Number(reward.xp || 0))),
    at:event.at || Date.now()
  }}));
}

export function installProgressionSocketListeners({socket, multiplayer, emitChange, toast}){
  socket.on("quest:progress", event=>{
    pushEvent(multiplayer.questProgressEvents, event, 80);
    emitChange("quest:progress", event);
  });
  socket.on("quest:fail-progress", event=>{
    pushEvent(multiplayer.questFailureEvents, event, 80);
    emitChange("quest:fail-progress", event);
  });
  socket.on("quest:accepted", event=>{
    pushEvent(multiplayer.questEvents, event, 40, {type:"accepted"});
    toast(event?.title ? `Quete acceptee : ${event.title}` : "Quete acceptee.");
    emitChange("quest:accepted", event);
  });
  socket.on("quest:claimed", event=>{
    pushEvent(multiplayer.questEvents, event, 40, {type:"claimed"});
    emitQuestRewardLog(event);
    toast(event?.title ? `${event.auto ? "Quete terminee" : "Recompense recue"} : ${event.title}` : "Recompense recue.");
    emitChange("quest:claimed", event);
  });
  socket.on("quest:tracked", event=>{
    emitChange("quest:tracked", event);
  });
  socket.on("quest:error", payload=>{
    toast(payload?.message || "Action quete impossible.");
    emitChange("quest:error", payload);
  });
  socket.on("skill:upgraded", event=>{
    toast(event?.skill?.name ? `${event.skill.name} niveau ${event.level} atteint.` : "Competence amelioree.");
    emitChange("skill:upgraded", event);
  });
  socket.on("skill:error", payload=>{
    toast(payload?.message || "Competence impossible.");
    emitChange("skill:error", payload);
  });
  socket.on("portal:unlocked", event=>{
    toast(event?.portal?.name ? `${event.portal.name} deverrouille.` : "Portail deverrouille.");
    emitChange("portal:unlocked", event);
  });
  socket.on("portal:error", payload=>{
    toast(payload?.message || "Portail impossible.", {position:"top-center"});
    emitChange("portal:error", payload);
  });
  socket.on("prestige:performed", event=>{
    toast(`Prestige ${event?.prestige || 0} actif : retour niveau 1.`);
    emitChange("prestige:performed", event);
  });
  socket.on("prestige:error", payload=>{
    toast(payload?.message || "Prestige impossible.");
    emitChange("prestige:error", payload);
  });
  socket.on("profile:title-updated", event=>{
    toast(event?.titleId ? "Titre public mis a jour." : "Titre public retire.");
    emitChange("profile:title-updated", event);
  });
  socket.on("profile:title-error", payload=>{
    toast(payload?.message || "Titre impossible.");
    emitChange("profile:title-error", payload);
  });
}
