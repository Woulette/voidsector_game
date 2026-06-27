function cleanBaseUrl(baseUrl){
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

function authPayload(payload){
  const account = payload?.account || null;
  if(!account) throw new Error("Session expiree.");
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
    throw new Error(payload?.message || "Authentification impossible.");
  }
  return payload;
}

export function createPlatformAuthClient({baseUrl, fetchImpl = globalThis.fetch} = {}){
  const root = cleanBaseUrl(baseUrl);
  if(!root) return null;
  if(typeof fetchImpl !== "function"){
    throw new Error("fetch is required for platform auth.");
  }

  async function request(path, {method = "POST", body = null, token = ""} = {}){
    const headers = {"content-type":"application/json"};
    if(token) headers.authorization = `Bearer ${token}`;
    const response = await fetchImpl(`${root}${path}`, {
      method,
      headers,
      body:body ? JSON.stringify(body) : null
    });
    return readJsonResponse(response);
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
