const CHAT_CHANNELS = new Set(["global", "firm", "guild"]);
const ACTIVE_CHANNELS = new Set(["global"]);
const MAX_CHAT_LENGTH = 220;

function sanitizeChatText(value){
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHAT_LENGTH);
}

function publicChatAuthor(player){
  return {
    id:player?.id || "",
    name:player?.name || "Pilote",
    accountId:player?.accountId || null,
    groupId:player?.groupId || null
  };
}

export function registerChatHandlers(socket, context){
  const {guard, io, players} = context;

  socket.on("chat:send", payload=>{
    if(!guard("chat:send")){
      socket.emit("chat:error", {message:"Message trop rapide.", at:Date.now()});
      return;
    }
    const player = players.get(socket.id);
    if(!player){
      socket.emit("chat:error", {message:"Connexion joueur introuvable.", at:Date.now()});
      return;
    }
    const channel = String(payload?.channel || "global").toLowerCase();
    if(!CHAT_CHANNELS.has(channel)){
      socket.emit("chat:error", {message:"Canal inconnu.", at:Date.now()});
      return;
    }
    if(!ACTIVE_CHANNELS.has(channel)){
      socket.emit("chat:error", {message:"Canal pas encore disponible.", channel, at:Date.now()});
      return;
    }
    const text = sanitizeChatText(payload?.text);
    if(!text){
      socket.emit("chat:error", {message:"Message vide.", at:Date.now()});
      return;
    }
    io.emit("chat:message", {
      id:`chat_${Date.now()}_${socket.id}`,
      channel,
      text,
      author:publicChatAuthor(player),
      at:Date.now()
    });
  });
}
