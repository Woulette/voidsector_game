export function sessionAuthErrorPayload(error){
  const message = String(error?.message || "");
  const status = Number(error?.status || error?.statusCode || 0);
  const temporary = status === 408 || status === 429 || status >= 500;
  const base = {action:"session"};

  if(error?.code === "SERVER_FULL"){
    return {...base, code:"SERVER_FULL", message, retryable:true};
  }
  if(!temporary && /^Compte banni jusqu'au .+\.$/.test(message)){
    return {...base, code:"AUTH_ACCOUNT_BANNED", message, retryable:false};
  }
  if(!temporary && (
    status === 401
    || error?.code === "AUTH_SESSION_INVALID"
    || /^Session (?:expir[ée]e|invalide)\.$/i.test(message)
  )){
    return {...base, code:"AUTH_SESSION_INVALID", message:"Session expiree.", retryable:false};
  }
  return {
    ...base,
    code:"AUTH_SERVICE_UNAVAILABLE",
    message:"Le service de connexion est temporairement indisponible. Réessaie dans quelques instants.",
    retryable:true
  };
}
