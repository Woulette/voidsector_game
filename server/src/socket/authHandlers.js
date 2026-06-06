import { loginAccount, registerAccount } from "../auth/accounts.js";
import { createSession, getSessionAccount, revokeSessionByToken } from "../auth/sessions.js";

export function registerAuthHandlers(socket, context){
  const {
    attachOrResumeAccountSocket,
    emitPlayers,
    guard,
    players,
    publicAuthPayload,
    syncProfileForPlayer
  } = context;

  socket.on("auth:register", async payload=>{
    if(!guard("auth:register")) return;
    try{
      const account = await registerAccount(payload);
      const session = await createSession(account.id);
      attachOrResumeAccountSocket(socket, account, session);
      socket.emit("auth:success", publicAuthPayload({account, session}));
      syncProfileForPlayer(socket);
    }catch(error){
      socket.emit("auth:error", {message:error?.message || "Inscription impossible."});
    }
  });

  socket.on("auth:login", async payload=>{
    if(!guard("auth:login")) return;
    try{
      const account = await loginAccount(payload);
      const session = await createSession(account.id);
      attachOrResumeAccountSocket(socket, account, session);
      socket.emit("auth:success", publicAuthPayload({account, session}));
      syncProfileForPlayer(socket);
    }catch(error){
      socket.emit("auth:error", {message:error?.message || "Connexion impossible."});
    }
  });

  socket.on("auth:session", async payload=>{
    if(!guard("auth:session")) return;
    try{
      const result = await getSessionAccount(payload?.token);
      if(!result?.account) throw new Error("Session expiree.");
      attachOrResumeAccountSocket(socket, result.account, result);
      socket.emit("auth:success", publicAuthPayload({
        account:result.account,
        session:{token:payload?.token, expiresAt:result.expiresAt}
      }));
      syncProfileForPlayer(socket);
    }catch(error){
      socket.emit("auth:error", {message:error?.message || "Session invalide."});
    }
  });

  socket.on("auth:logout", async payload=>{
    if(!guard("auth:logout")) return;
    if(payload?.token) await revokeSessionByToken(payload.token);
    const player = players.get(socket.id);
    if(player){
      player.accountId = null;
      player.account = null;
      player.sessionExpiresAt = null;
    }
    socket.emit("auth:logout");
    emitPlayers();
  });
}
