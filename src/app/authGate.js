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
  registerAccount,
  setAuthRememberEnabled,
  connectMultiplayer,
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
  const statusEl = root.querySelector("#authGateStatus");
  const connectionStateEl = root.querySelector("[data-auth-connection-state]");
  const emailInput = root.querySelector("#authGateEmail");
  const passwordInput = root.querySelector("#authGatePassword");
  const rememberInput = root.querySelector("#authGateRemember");
  const registerEmailInput = root.querySelector("#authGateRegisterEmail");
  const registerUsernameInput = root.querySelector("#authGateRegisterUsername");
  const registerPasswordInput = root.querySelector("#authGateRegisterPassword");
  const registerConfirmInput = root.querySelector("#authGateRegisterConfirm");
  const submitButtons = [...root.querySelectorAll("[data-auth-submit]")];

  const rememberedEmail = getRememberedEmail();
  if(emailInput && rememberedEmail) emailInput.value = rememberedEmail;
  if(registerEmailInput && rememberedEmail) registerEmailInput.value = rememberedEmail;
  if(rememberInput) rememberInput.checked = multiplayer?.auth?.remember !== false;

  function setMode(mode){
    const nextMode = mode === "register" ? "register" : "login";
    root.dataset.authMode = nextMode;
    loginForm?.classList.toggle("hidden", nextMode !== "login");
    registerForm?.classList.toggle("hidden", nextMode !== "register");
    root.querySelectorAll("[data-auth-gate-mode]").forEach(button=>{
      button.classList.toggle("active", button.dataset.authGateMode === nextMode);
    });
    const target = nextMode === "register" ? registerEmailInput : emailInput;
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
    root.classList.toggle("hidden", appMode === "game");
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
    submitButtons.forEach(button=>{ button.disabled = pending; });
    if(ready){
      hide();
      setStatus(statusEl, `Connecte : ${multiplayer.auth.account.username}.`, "success");
      if(connectionStateEl) connectionStateEl.textContent = "Profil synchronise";
      return true;
    }
    if(document.body.classList.contains("app-booting") && multiplayer?.auth?.token && pending){
      root.classList.add("hidden");
      return false;
    }
    show();
    if(connectionStateEl){
      if(multiplayer?.connected) connectionStateEl.textContent = multiplayer?.auth?.account ? "Profil en synchronisation" : "Serveur connecte";
      else if(multiplayer?.connecting) connectionStateEl.textContent = "Connexion au serveur";
      else connectionStateEl.textContent = "Connexion requise";
    }
    if(multiplayer?.auth?.error){
      setStatus(statusEl, multiplayer.auth.error, "error");
    }else if(multiplayer?.auth?.account && !multiplayer?.auth?.profileReady){
      setStatus(statusEl, "Synchronisation du profil pilote...");
    }else if(pending){
      setStatus(statusEl, "Connexion au serveur MMO...");
    }else if(multiplayer?.auth?.token){
      setStatus(statusEl, "Session sauvegardee detectee.");
    }else{
      setStatus(statusEl, "Connecte ton compte pour entrer.");
    }
    return false;
  }

  root.addEventListener("click", event=>{
    const modeButton = event.target.closest("[data-auth-gate-mode]");
    if(!modeButton) return;
    event.preventDefault();
    setMode(modeButton.dataset.authGateMode);
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
    setStatus(statusEl, "Connexion au compte...");
    loginAccount?.({login:email, password, serverUrl:multiplayer?.serverUrl});
    sync();
  });

  registerForm?.addEventListener("submit", event=>{
    event.preventDefault();
    const email = cleanText(registerEmailInput?.value).toLowerCase();
    const username = cleanText(registerUsernameInput?.value);
    const password = String(registerPasswordInput?.value || "");
    const confirm = String(registerConfirmInput?.value || "");
    const remember = rememberInput?.checked !== false;
    if(!email.includes("@")){
      setStatus(statusEl, "Entre une adresse email valide.", "error");
      return;
    }
    if(username.length < 3){
      setStatus(statusEl, "Le pseudo doit faire au moins 3 caracteres.", "error");
      return;
    }
    if(password.length < 8){
      setStatus(statusEl, "Le mot de passe doit faire au moins 8 caracteres.", "error");
      return;
    }
    if(password !== confirm){
      setStatus(statusEl, "Les mots de passe ne correspondent pas.", "error");
      return;
    }
    setAuthRememberEnabled?.(remember);
    rememberEmail(email, remember);
    setStatus(statusEl, "Creation du compte...");
    registerAccount?.({email, username, password, serverUrl:multiplayer?.serverUrl});
    sync();
  });

  window.addEventListener("voidsector:multiplayer-change", sync);
  window.addEventListener("voidsector:profile-sync", sync);
  window.addEventListener("voidsector:profile-applied", sync);

  if(multiplayer?.auth?.token && !multiplayer?.connected && !multiplayer?.connecting){
    connectMultiplayer?.({name:multiplayer.name});
  }
  sync();

  return {
    sync,
    show,
    hide,
    isReady:()=>isMmoAuthenticated(multiplayer)
  };
}
