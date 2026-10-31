export function createSceneLoadingScreen(canvas){
  const screen = document.createElement("div");
  screen.dataset.sceneLoadingScreen = "true";
  screen.setAttribute("role", "status");
  screen.setAttribute("aria-live", "polite");
  Object.assign(screen.style, {position:"absolute",inset:"0",zIndex:"2147483646",display:"none",
    alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"18px",
    background:"radial-gradient(ellipse at center, #10243b 0%, #040911 70%)",color:"#dff5ff",
    fontFamily:"Rajdhani, Arial, sans-serif",pointerEvents:"auto"});
  const brand = document.createElement("strong");brand.textContent = "AVOSOMA";
  Object.assign(brand.style, {fontSize:"32px",letterSpacing:"8px",color:"#7dd3fc"});
  const label = document.createElement("div");
  Object.assign(label.style, {fontSize:"18px",textAlign:"center",padding:"0 24px"});
  const retry = document.createElement("button");retry.type="button";retry.textContent="Réessayer";
  Object.assign(retry.style, {display:"none",padding:"10px 24px",cursor:"pointer"});
  screen.append(brand,label,retry);canvas.parentElement.append(screen);
  return {
    show:({currentMap})=>{
      canvas.dataset.sceneLoading = "loading";canvas.setAttribute("aria-busy","true");
      label.textContent = `Préparation du secteur ${currentMap?.name || ""}…`;
      retry.style.display="none";screen.style.display="flex";
    },
    hide:()=>{
      screen.style.display="none";canvas.dataset.sceneLoading="ready";canvas.setAttribute("aria-busy","false");
    },
    onError:(error, retryLoading)=>{
      console.warn("[Avosoma] Préparation de la scène interrompue.",error);
      canvas.dataset.sceneLoading="error";
      label.textContent="Le secteur n’a pas pu être chargé. Vérifie ta connexion puis réessaie.";
      retry.style.display="block";retry.onclick=retryLoading;
    }
  };
}
