const MAX_JSON_BODY_BYTES = 16 * 1024;

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
  const message = String(error?.message || "");
  return EXPECTED_AUTH_ERROR_PATTERNS.some(pattern=>pattern.test(message));
}

function publicAuthError(error, fallback){
  return isExpectedAuthError(error) ? String(error.message) : fallback;
}

function allowedOriginsList(allowedOrigin){
  if(allowedOrigin === "*") return "*";
  return Array.isArray(allowedOrigin)
    ? allowedOrigin.map(origin=>String(origin || "").trim()).filter(Boolean)
    : [String(allowedOrigin || "").trim()].filter(Boolean);
}

function corsHeaders(req, allowedOrigin){
  const allowed = allowedOriginsList(allowedOrigin);
  const origin = String(req.headers?.origin || "");
  const headers = {
    "content-type":"application/json; charset=utf-8",
    "vary":"Origin",
    "access-control-allow-methods":"GET,POST,OPTIONS",
    "access-control-allow-headers":"content-type,authorization",
    "access-control-max-age":"600"
  };
  if(allowed === "*"){
    headers["access-control-allow-origin"] = origin || "*";
    return headers;
  }
  if(origin && allowed.includes(origin)){
    headers["access-control-allow-origin"] = origin;
  }
  return headers;
}

function originAllowed(req, allowedOrigin){
  const allowed = allowedOriginsList(allowedOrigin);
  if(allowed === "*") return true;
  const origin = String(req.headers?.origin || "");
  return !origin || allowed.includes(origin);
}

function writeJson(res, statusCode, payload, headers = {}){
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(payload));
}

function bearerToken(req){
  const header = String(req.headers?.authorization || "");
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : "";
}

function readJsonBody(req){
  return new Promise((resolve, reject)=>{
    let raw = "";
    req.setEncoding?.("utf8");
    req.on("data", chunk=>{
      raw += chunk;
      if(raw.length > MAX_JSON_BODY_BYTES){
        reject(new Error("Corps de requete trop volumineux."));
        req.destroy?.();
      }
    });
    req.on("end", ()=>{
      if(!raw.trim()){
        resolve({});
        return;
      }
      try{
        resolve(JSON.parse(raw));
      }catch{
        reject(new Error("JSON invalide."));
      }
    });
    req.on("error", reject);
  });
}

export function createPlatformAuthHttpHandler({
  allowedOrigin = "*",
  registerAccount,
  loginAccount,
  createSession,
  getSessionAccount,
  revokeSessionByToken,
  revokeSessionsForAccount,
  logger,
  onError
} = {}){
  async function authSuccess(account, session){
    return {
      ok:true,
      account,
      token:session?.token || "",
      expiresAt:session?.expiresAt || null
    };
  }

  async function handleRegister(req){
    const payload = await readJsonBody(req);
    const account = await registerAccount(payload);
    const session = await createSession(account.id);
    return authSuccess(account, session);
  }

  async function handleLogin(req){
    const payload = await readJsonBody(req);
    const account = await loginAccount(payload);
    await revokeSessionsForAccount?.(account.id);
    const session = await createSession(account.id);
    return authSuccess(account, session);
  }

  async function handleSession(req){
    const payload = req.method === "POST" ? await readJsonBody(req) : {};
    const token = String(payload?.token || bearerToken(req) || "");
    const result = await getSessionAccount(token);
    if(!result?.account) throw new Error("Session expiree.");
    return {
      ok:true,
      account:result.account,
      token,
      expiresAt:result.expiresAt || null
    };
  }

  async function handleLogout(req){
    const payload = await readJsonBody(req);
    const token = String(payload?.token || bearerToken(req) || "");
    if(token) await revokeSessionByToken(token);
    return {ok:true};
  }

  return async function handlePlatformAuthHttp(req, res){
    const url = new URL(req.url || "/", "http://localhost");
    if(!url.pathname.startsWith("/platform/auth/")) return false;

    const headers = corsHeaders(req, allowedOrigin);
    if(req.method === "OPTIONS"){
      res.writeHead(204, headers);
      res.end();
      return true;
    }
    if(!originAllowed(req, allowedOrigin)){
      writeJson(res, 403, {ok:false, message:"Origine refusee."}, headers);
      return true;
    }

    try{
      if(url.pathname === "/platform/auth/register" && req.method === "POST"){
        writeJson(res, 200, await handleRegister(req), headers);
        return true;
      }
      if(url.pathname === "/platform/auth/login" && req.method === "POST"){
        writeJson(res, 200, await handleLogin(req), headers);
        return true;
      }
      if(url.pathname === "/platform/auth/session" && ["GET", "POST"].includes(req.method)){
        writeJson(res, 200, await handleSession(req), headers);
        return true;
      }
      if(url.pathname === "/platform/auth/logout" && req.method === "POST"){
        writeJson(res, 200, await handleLogout(req), headers);
        return true;
      }
      writeJson(res, 404, {ok:false, message:"Route introuvable."}, headers);
      return true;
    }catch(error){
      if(!isExpectedAuthError(error)){
        logger?.error?.("[platform-auth] request failed", {
          path:url.pathname,
          method:req.method,
          error:error?.stack || error?.message || String(error)
        });
        try{
          onError?.({
            source:"platform-auth",
            eventName:`${req.method} ${url.pathname}`,
            error:error?.stack || error?.message || String(error),
            at:Date.now()
          });
        }catch(logError){
          logger?.warn?.("[platform-auth] error log failed", {
            error:logError?.message || String(logError)
          });
        }
      }
      writeJson(res, 400, {
        ok:false,
        message:publicAuthError(error, "Authentification impossible.")
      }, headers);
      return true;
    }
  };
}
