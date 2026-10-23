function cleanBaseUrl(baseUrl){
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

function authPayload(payload){
  const account = payload?.account || null;
  if(!account) throw new Error("Reponse d'authentification invalide.");
  return {
    account,
    token:payload?.token || "",
    expiresAt:payload?.expiresAt || null,
    session:{
      token:payload?.token || "",
      expiresAt:payload?.expiresAt || null
    }
  };
}

async function readJsonResponse(response){
  const payload = await response.json().catch(()=>({ok:false, message:"Reponse serveur invalide."}));
  if(!response.ok || payload?.ok === false){
    const error = new Error(payload?.message || "Authentification impossible.");
    error.status = Number(response.status || 0);
    error.code = String(payload?.code || "");
    throw error;
  }
  return payload;
}

export function createPlatformAuthClient({baseUrl, fetchImpl = globalThis.fetch, timeoutMs = 8000} = {}){
  const root = cleanBaseUrl(baseUrl);
  if(!root) return null;
  if(typeof fetchImpl !== "function"){
    throw new Error("fetch is required for platform auth.");
  }

  async function request(path, {method = "POST", body = null, token = ""} = {}){
    const headers = {"content-type":"application/json"};
    if(token) headers.authorization = `Bearer ${token}`;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = Math.max(10, Number(timeoutMs || 8000));
    const timer = controller ? setTimeout(()=>controller.abort(), timeout) : null;
    try{
      const response = await fetchImpl(`${root}${path}`, {
        method,
        headers,
        body:body ? JSON.stringify(body) : null,
        signal:controller?.signal
      });
      return await readJsonResponse(response);
    }catch(error){
      if(controller?.signal?.aborted){
        throw new Error("Le service d'authentification met trop de temps a repondre.");
      }
      throw error;
    }finally{
      if(timer) clearTimeout(timer);
    }
  }

  return {
    async register(payload){
      return authPayload(await request("/platform/auth/register", {body:payload}));
    },

    async login(payload){
      return authPayload(await request("/platform/auth/login", {body:payload}));
    },

    async session(token){
      return authPayload(await request("/platform/auth/session", {method:"GET", token}));
    },

    async logout(token){
      if(!token) return {ok:true};
      return request("/platform/auth/logout", {body:{token}});
    }
  };
}
