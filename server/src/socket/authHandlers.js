import { loginAccount, registerAccount } from "../auth/accounts.js";
import { createSession, getSessionAccount, revokeSessionByToken, revokeSessionsForAccount } from "../auth/sessions.js";
import { ensureExternalAccountRecord } from "../storage/authStore.js";

const EXPECTED_AUTH_ERROR_PATTERNS = [
  /^Email invalide\.$/,
  /^Pseudo trop court\.$/,
  /^Mot de passe trop court\.$/,
  /^Email deja utilise\.$/,
  /^Pseudo deja utilise\.$/,
  /^Identifiants invalides\.$/,
  /^Compte banni jusqu'au .+\.$/,
  /^Session expiree\.$/
];

function isExpectedAuthError(error){
  if(error?.code === "SERVER_FULL") return true;
  const message = String(error?.message || "");
  return EXPECTED_AUTH_ERROR_PATTERNS.some(pattern=>pattern.test(message));
}

function authErrorMessage(error, fallback){
  return isExpectedAuthError(error) ? String(error.message) : fallback;
}

export function registerAuthHandlers(socket, context){
  const {
    attachOrResumeAccountSocket,
    emitPlayers,
    guard,
    logger,
    onError,
    players,
    publicAuthPayload,
    syncProfileForPlayer,
    loginAccount:authenticateAccount = loginAccount,
    registerAccount:registerNewAccount = registerAccount,
    getSessionAccount:getAuthSessionAccount = getSessionAccount,
    createSession:createAuthSession = createSession,
    revokeSessionsForAccount:revokeAccountSessions = revokeSessionsForAccount,
    revokeSessionByToken:revokeAuthSessionByToken = revokeSessionByToken,
    ensureExternalAccountRecord:ensureProviderAccountRecord = ensureExternalAccountRecord,
    authProvider = null
  } = context;

  const usesExternalAuthProvider = Boolean(authProvider);
  const provider = authProvider || {
    async register(payload){
      const account = await registerNewAccount(payload);
      const session = await createAuthSession(account.id);
      return {
        account,
        token:session?.token || "",
        expiresAt:session?.expiresAt || null,
        session
      };
    },
    async login(payload){
      const account = await authenticateAccount(payload);
      await revokeAccountSessions(account.id);
      const session = await createAuthSession(account.id);
      return {
        account,
        token:session?.token || "",
        expiresAt:session?.expiresAt || null,
        session
      };
    },
    async session(token){
      const result = await getAuthSessionAccount(token);
      if(!result?.account) throw new Error("Session expiree.");
      return {
        account:result.account,
        token,
        expiresAt:result.expiresAt || null,
        session:{token, expiresAt:result.expiresAt || null}
      };
    },
    async logout(token){
      if(token) await revokeAuthSessionByToken(token);
      return {ok:true};
    }
  };

  function disconnectPreviousAccountSockets(accountId){
    const previousPlayers = [...players.values()].filter(candidate=>
      candidate.id !== socket.id
      && String(candidate.accountId || "") === String(accountId || "")
    );
    for(const candidate of previousPlayers){
      const candidateSocket = socket.nsp?.sockets?.get(candidate.id);
      if(!candidateSocket) continue;
      candidate.gracefulLogout = candidate.clientMode !== "game" || !candidate.state;
      candidateSocket.emit("auth:replaced", {
        message:"Ce compte vient d'etre connecte depuis une autre session.",
        at:Date.now()
      });
      candidateSocket.disconnect(true);
    }
    return previousPlayers.length;
  }

  async function ensureProviderAccount(account){
    if(!usesExternalAuthProvider) return account;
    return await ensureProviderAccountRecord(account) || account;
  }

  function recordUnexpectedAuthError(eventName, error){
    if(isExpectedAuthError(error)) return;
    const player = players.get(socket.id);
    const meta = {
      eventName,
      socketId:socket.id,
      accountId:player?.accountId || null,
      playerId:player?.id || null,
      mapId:player?.state?.mapId ?? player?.mapId ?? null,
      error:error?.stack || error?.message || String(error),
      at:Date.now()
    };
    logger?.error?.("[auth] handler failed", meta);
    try{
      onError?.({source:"auth", ...meta});
    }catch(logError){
      logger?.warn?.("[auth] error log failed", {
        eventName,
        error:logError?.message || String(logError)
      });
    }
  }

  socket.on("auth:register", async payload=>{
    if(!guard("auth:register")) return;
    try{
      if(usesExternalAuthProvider){
        socket.emit("auth:error", {
          message:"La creation du compte se fait uniquement sur Absyrion."
        });
        return;
      }
      const result = await provider.register(payload);
      const account = await ensureProviderAccount(result.account);
      const session = result.session || {token:result.token, expiresAt:result.expiresAt};
      attachOrResumeAccountSocket(socket, account, session);
      socket.emit("auth:success", publicAuthPayload({account, session}));
      syncProfileForPlayer(socket);
    }catch(error){
      recordUnexpectedAuthError("auth:register", error);
      socket.emit("auth:error", {message:authErrorMessage(error, "Inscription impossible.")});
    }
  });

  socket.on("auth:login", async payload=>{
    if(!guard("auth:login")) return;
    try{
      const result = await provider.login(payload);
      const account = await ensureProviderAccount(result.account);
      const session = result.session || {token:result.token, expiresAt:result.expiresAt};
      disconnectPreviousAccountSockets(account.id);
      attachOrResumeAccountSocket(socket, account, session);
      socket.emit("auth:success", publicAuthPayload({account, session}));
      syncProfileForPlayer(socket);
    }catch(error){
      recordUnexpectedAuthError("auth:login", error);
      socket.emit("auth:error", {message:authErrorMessage(error, "Connexion impossible.")});
    }
  });

  socket.on("auth:session", async payload=>{
    if(!guard("auth:session")) return;
    try{
      const token = String(payload?.token || "");
      const result = await provider.session(token);
      const account = await ensureProviderAccount(result.account);
      attachOrResumeAccountSocket(socket, account, result);
      socket.emit("auth:success", publicAuthPayload({
        account,
        session:{token:result.token || token, expiresAt:result.expiresAt}
      }));
      syncProfileForPlayer(socket);
    }catch(error){
      recordUnexpectedAuthError("auth:session", error);
      socket.emit("auth:error", {message:authErrorMessage(error, "Session invalide.")});
    }
  });

  socket.on("auth:logout", async payload=>{
    if(!guard("auth:logout")) return;
    if(payload?.token) await provider.logout(payload.token);
    const player = players.get(socket.id);
    const accountId = player?.accountId || null;
    const accountPlayers = accountId
      ? [...players.values()].filter(candidate=>candidate.accountId === accountId)
      : player ? [player] : [];
    if(accountPlayers.length){
      for(const candidate of accountPlayers){
        const candidateSocket = socket.nsp?.sockets?.get(candidate.id);
        if(!candidateSocket) continue;
        candidate.gracefulLogout = candidate.clientMode !== "game" || !candidate.state;
        candidateSocket.emit("auth:logout", {source:"account"});
        candidateSocket.disconnect(true);
      }
      emitPlayers();
      return;
    }
    socket.emit("auth:logout");
    emitPlayers();
  });
}
