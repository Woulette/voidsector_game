export function installMultiplayerDomHandlers({
  connectMultiplayer,
  disconnectMultiplayer,
  createMultiplayerGroup,
  inviteMultiplayerPlayer,
  acceptMultiplayerInvite,
  declineMultiplayerInvite,
  leaveMultiplayerGroup,
  startCoopTestInstance,
  registerAccount,
  loginAccount,
  logoutAccount
}){
  if(window.__voidsectorMultiplayerHandlersInstalled) return;
  window.__voidsectorMultiplayerHandlersInstalled = true;
  document.addEventListener("click", event=>{
    const action = event.target.closest("[data-mp-action]");
    if(action){
      event.preventDefault();
      event.stopPropagation();
      const type = action.dataset.mpAction;
      if(type === "connect"){
        const form = action.closest("[data-mp-form]") || document;
        connectMultiplayer({
          serverUrl:form.querySelector("[data-mp-server-url]")?.value || document.getElementById("mpServerUrl")?.value,
          name:form.querySelector("[data-mp-player-name]")?.value || document.getElementById("mpPlayerName")?.value
        });
      }else if(type === "disconnect") disconnectMultiplayer();
      else if(type === "create-group") createMultiplayerGroup();
      else if(type === "invite") inviteMultiplayerPlayer(action.dataset.playerId);
      else if(type === "accept") acceptMultiplayerInvite(action.dataset.groupId);
      else if(type === "decline") declineMultiplayerInvite(action.dataset.groupId);
      else if(type === "leave-group") leaveMultiplayerGroup();
      else if(type === "start-coop-test") startCoopTestInstance();
    }
    const authAction = event.target.closest("[data-auth-action]");
    if(!authAction) return;
    event.preventDefault();
    event.stopPropagation();
    const authType = authAction.dataset.authAction;
    const authRoot = authAction.closest(".mmo-account-card") || document;
    const serverUrl = authRoot.querySelector("[data-mp-server-url]")?.value || document.getElementById("mpServerUrl")?.value;
    if(authType === "register"){
      registerAccount({
        email:document.getElementById("authRegisterEmail")?.value,
        username:document.getElementById("authRegisterUsername")?.value,
        password:document.getElementById("authRegisterPassword")?.value,
        serverUrl
      });
    }else if(authType === "login"){
      loginAccount({
        login:document.getElementById("authLogin")?.value,
        password:document.getElementById("authPassword")?.value,
        serverUrl
      });
    }else if(authType === "logout") logoutAccount();
  }, true);
}
