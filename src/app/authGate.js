const REMEMBERED_EMAIL_KEY = "avosoma-login-email";
const LEGACY_REMEMBERED_EMAIL_KEY = "avosomanox-login-email";

function cleanText(value){
  return String(value || "").trim();
}

function setStatus(element, message, state = ""){
  if(!element) return;
  element.textContent = message;
  element.classList.toggle("error", state === "error");
  element.classList.toggle("success", state === "success");
}

function getRememberedEmail(){
  const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
  if(rememberedEmail) return rememberedEmail;
  const legacyEmail = localStorage.getItem(LEGACY_REMEMBERED_EMAIL_KEY) || "";
  if(legacyEmail){
    localStorage.setItem(REMEMBERED_EMAIL_KEY, legacyEmail);
    localStorage.removeItem(LEGACY_REMEMBERED_EMAIL_KEY);
  }
  return legacyEmail;
}

export function isMmoAuthenticated(multiplayer){
  return Boolean(multiplayer?.connected && multiplayer?.auth?.account && multiplayer?.auth?.profileReady);
}

export function createAuthGateController({
  multiplayer,
  loginAccount,
  setAuthRememberEnabled,
  connectStoredSession,
  showToast,
  appMode = "launcher"
} = {}){
  const root = document.getElementById("authGate");
  if(!root){
    return {
      sync(){},
      show(){},
      hide(){},
      isReady:()=>isMmoAuthenticated(multiplayer)
    };
  }

  const loginForm = root.querySelector("#authGateLoginForm");
  const registerForm = root.querySelector("#authGateRegisterForm");
  const tabsRoot = root.querySelector(".auth-tabs");
  const statusEl = root.querySelector("#authGateStatus");
  const connectionStateEl = root.querySelector("[data-auth-connection-state]");
  const emailInput = root.querySelector("#authGateEmail");
  const passwordInput = root.querySelector("#authGatePassword");
  const rememberInput = root.querySelector("#authGateRemember");
  const platformLoginButton = root.querySelector("[data-auth-platform-login]");
  const submitButtons = [...root.querySelectorAll("[data-auth-submit]")];

  const rememberedEmail = getRememberedEmail();
  if(emailInput && rememberedEmail) emailInput.value = rememberedEmail;
  if(rememberInput) rememberInput.checked = multiplayer?.auth?.remember !== false;

  function applyPanelVisibility(hasStoredSession = Boolean(multiplayer?.auth?.token)){
    const mode = root.dataset.authMode === "register" ? "register" : "login";
    root.classList.toggle("auth-platform-session", hasStoredSession && mode === "login");
    if(tabsRoot) tabsRoot.hidden = false;
    if(platformLoginButton) platformLoginButton.hidden = !hasStoredSession || mode !== "login";
    loginForm?.classList.toggle("hidden", mode !== "login" || hasStoredSession);
    registerForm?.classList.toggle("hidden", mode !== "register");
    root.querySelectorAll("[data-auth-gate-mode]").forEach(button=>{
      button.classList.toggle("active", button.dataset.authGateMode === mode);
    });
  }

  function setMode(mode){
    const nextMode = mode === "register" ? "register" : "login";
    root.dataset.authMode = nextMode;
    applyPanelVisibility();
    const target = nextMode === "register" ? registerForm?.querySelector("a") : emailInput;
    window.setTimeout(()=>target?.focus?.(), 0);
  }

  function rememberEmail(email, remember){
    if(remember && email){
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      localStorage.removeItem(LEGACY_REMEMBERED_EMAIL_KEY);
    }else if(!remember){
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      localStorage.removeItem(LEGACY_REMEMBERED_EMAIL_KEY);
    }
  }

  function show(){
    document.body.classList.remove("app-booting");
    document.body.classList.add("auth-locked");
    document.body.classList.remove("auth-ready");
    root.classList.remove("hidden");
  }

  function hide(){
    document.body.classList.remove("app-booting");
    root.classList.add("hidden");
    document.body.classList.remove("auth-locked");
    document.body.classList.add("auth-ready");
  }

  function sync(){
    const ready = isMmoAuthenticated(multiplayer);
    const pending = Boolean(multiplayer?.auth?.pending || multiplayer?.connecting);
    const hasStoredSession = Boolean(multiplayer?.auth?.token);
    const resolvingStoredGameSession = appMode === "game"
      && hasStoredSession
      && !ready
      && !multiplayer?.auth?.error
      && (pending || Boolean(multiplayer?.auth?.account && !multiplayer?.auth?.profileReady));
    applyPanelVisibility(hasStoredSession);
    submitButtons.forEach(button=>{ button.disabled = pending; });
    if(platformLoginButton){
      const mode = root.dataset.authMode === "register" ? "register" : "login";
      platformLoginButton.hidden = !hasStoredSession || ready || mode !== "login";
      platformLoginButton.disabled = pending;
    }
    if(ready){
      hide();
      setStatus(statusEl, `Connecte : ${multiplayer.auth.account.username}.`, "success");
      if(connectionStateEl) connectionStateEl.textContent = "Profil synchronise";
      return true;
    }
    if(resolvingStoredGameSession){
      document.body.classList.add("app-booting");
      document.body.classList.add("auth-locked");
      document.body.classList.remove("auth-ready");
      root.classList.add("hidden");
      if(connectionStateEl) connectionStateEl.textContent = multiplayer?.auth?.account ? "Profil en synchronisation" : "Session en verification";
      setStatus(statusEl, multiplayer?.auth?.account ? "Synchronisation du profil pilote..." : "Connexion avec ta session Absyrion...");
      return false;
    }
    show();
    if(connectionStateEl){
      if(multiplayer?.connected) connectionStateEl.textContent = multiplayer?.auth?.account ? "Profil en synchronisation" : "Serveur connecte";
      else if(multiplayer?.connecting) connectionStateEl.textContent = "Connexion au serveur";
      else if(hasStoredSession) connectionStateEl.textContent = "Session Absyrion disponible";
      else connectionStateEl.textContent = "Connexion requise";
    }
    if(multiplayer?.auth?.error){
      setStatus(statusEl, multiplayer.auth.error, "error");
    }else if(multiplayer?.auth?.account && !multiplayer?.auth?.profileReady){
      setStatus(statusEl, "Synchronisation du profil pilote...");
    }else if(pending){
      setStatus(statusEl, "Connexion au serveur MMO...");
    }else if(hasStoredSession){
      setStatus(statusEl, "Session Absyrion detectee. Clique sur Connexion avec Absyrion pour entrer.");
    }else{
      setStatus(statusEl, "Connecte ton compte Absyrion pour entrer.");
    }
    return false;
  }

  root.addEventListener("click", event=>{
    const modeButton = event.target.closest("[data-auth-gate-mode]");
    if(!modeButton) return;
    event.preventDefault();
    setMode(modeButton.dataset.authGateMode);
  });

  platformLoginButton?.addEventListener("click", event=>{
    event.preventDefault();
    if(!multiplayer?.auth?.token){
      setStatus(statusEl, "Aucune session Absyrion detectee.", "error");
      return;
    }
    const remember = rememberInput?.checked !== false;
    setAuthRememberEnabled?.(remember);
    setStatus(statusEl, "Connexion avec ta session Absyrion...");
    const sent = connectStoredSession?.();
    if(!sent) setStatus(statusEl, "Session Absyrion introuvable. Connecte-toi avec email et mot de passe.", "error");
    sync();
  });

  loginForm?.addEventListener("submit", event=>{
    event.preventDefault();
    const email = cleanText(emailInput?.value).toLowerCase();
    const password = String(passwordInput?.value || "");
    const remember = rememberInput?.checked !== false;
    if(!email.includes("@")){
      setStatus(statusEl, "Entre ton adresse email.", "error");
      return;
    }
    if(!password){
      setStatus(statusEl, "Entre ton mot de passe.", "error");
      return;
    }
    setAuthRememberEnabled?.(remember);
    rememberEmail(email, remember);
    setStatus(statusEl, "Connexion au compte Absyrion...");
    loginAccount?.({login:email, password, serverUrl:multiplayer?.serverUrl});
    sync();
  });

  window.addEventListener("voidsector:multiplayer-change", sync);
  window.addEventListener("voidsector:profile-sync", sync);
  window.addEventListener("voidsector:profile-applied", sync);

  sync();

  return {
    sync,
    show,
    hide,
    isReady:()=>isMmoAuthenticated(multiplayer)
  };
}
