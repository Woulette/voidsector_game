// Geometry is independent from the DOM so edge directions can be verified at any zoom.
export function projectTutorialMarker(target, bounds, margin = 80){
  if(!target || !bounds) return null;
  const values = [target.screenX,target.screenY,bounds.left,bounds.top,bounds.right,bounds.bottom];
  if(!values.every(Number.isFinite)) return null;
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  if(width <= 0 || height <= 0) return null;
  const insetX = Math.min(margin, width / 4);
  const insetY = Math.min(margin, height / 4);
  const left = bounds.left + insetX, right = bounds.right - insetX;
  const top = bounds.top + insetY, bottom = bounds.bottom - insetY;
  const x = target.screenX, y = target.screenY;
  if(x >= left && x <= right && y >= top && y <= bottom) return {x,y,edge:false,angle:0};
  const cx = (left + right) / 2, cy = (top + bottom) / 2;
  const dx = x - cx, dy = y - cy;
  const scale = Math.min(dx ? (right-cx)/Math.abs(dx) : Infinity, dy ? (bottom-cy)/Math.abs(dy) : Infinity);
  return {x:cx+dx*scale,y:cy+dy*scale,edge:true,angle:Math.atan2(dy,dx)};
}

function visibleElement(selector){
  if(!selector) return null;
  return [...document.querySelectorAll(selector)].find(element=>{
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }) || null;
}

function validRect(rect){
  return rect && [rect.left,rect.right,rect.top,rect.bottom].every(Number.isFinite)
    && rect.right > rect.left && rect.bottom > rect.top;
}
function intersectRect(rect, clip, clipX = true, clipY = true){
  return {
    left:clipX ? Math.max(rect.left,clip.left) : rect.left,
    right:clipX ? Math.min(rect.right,clip.right) : rect.right,
    top:clipY ? Math.max(rect.top,clip.top) : rect.top,
    bottom:clipY ? Math.min(rect.bottom,clip.bottom) : rect.bottom
  };
}
function corner(rect){
  return {x:rect.right-Math.min(6,(rect.right-rect.left)/2),y:rect.top+Math.min(6,(rect.bottom-rect.top)/2)};
}
function pointAtUiCorner(rect, bounds, forceEdge = false){
  const anchor = corner(rect);
  if(!forceEdge && anchor.x >= bounds.left && anchor.x <= bounds.right
    && anchor.y >= bounds.top && anchor.y <= bounds.bottom){
    return {...anchor,edge:false,angle:0,label:"",bounds};
  }
  const width = bounds.right-bounds.left, height = bounds.bottom-bounds.top;
  const insetX = Math.min(24,width/4), insetY = Math.min(24,height/4);
  const x = Math.max(bounds.left+insetX,Math.min(bounds.right-insetX,anchor.x));
  const y = Math.max(bounds.top+insetY,Math.min(bounds.bottom-insetY,anchor.y));
  const dx = anchor.x < bounds.left ? anchor.x-bounds.left : anchor.x > bounds.right ? anchor.x-bounds.right : 0;
  const dy = anchor.y < bounds.top ? anchor.y-bounds.top : anchor.y > bounds.bottom ? anchor.y-bounds.bottom : 0;
  if(dy && (!dx || Math.abs(dy)/height >= Math.abs(dx)/width)){
    return {x,y:dy<0 ? bounds.top+insetY : bounds.bottom-insetY,edge:true,
      angle:dy<0 ? -Math.PI/2 : Math.PI/2,label:dy<0 ? "Plus haut" : "Plus bas",bounds};
  }
  return {x:dx<0 ? bounds.left+insetX : bounds.right-insetX,y,edge:true,
    angle:dx<0 ? Math.PI : 0,label:dx<0 ? "Plus à gauche" : "Plus à droite",bounds};
}

// Clips are ordered from the outermost container to the nearest parent. A
// container outside the viewport must be reached before its contents can scroll.
export function projectTutorialUiMarker(rect, viewport, clips = []){
  if(!validRect(rect) || !validRect(viewport)) return null;
  let bounds = {...viewport};
  for(const {rect:clip,clipX = true,clipY = true} of clips){
    if(!validRect(clip)) continue;
    const next = intersectRect(bounds,clip,clipX,clipY);
    if(!validRect(next)) return pointAtUiCorner(clip,bounds,true);
    bounds = next;
  }
  return pointAtUiCorner(rect,bounds);
}

function uiGeometry(element){
  const rect = element.getBoundingClientRect(), clips = [];
  for(let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement){
    const style = getComputedStyle(parent);
    const clipsAxis = value=>/^(auto|scroll|hidden|clip)$/.test(value);
    const clipX = clipsAxis(style.overflowX || style.overflow);
    const clipY = clipsAxis(style.overflowY || style.overflow);
    if(!clipX && !clipY) continue;
    const outer = parent.getBoundingClientRect();
    const left = outer.left+(parent.clientLeft || 0), top = outer.top+(parent.clientTop || 0);
    clips.push({rect:{left,top,right:left+(parent.clientWidth ?? outer.width),bottom:top+(parent.clientHeight ?? outer.height)},clipX,clipY});
  }
  const point = projectTutorialUiMarker(rect,{left:0,top:0,right:window.innerWidth,bottom:window.innerHeight},clips.reverse());
  return {point,visible:point && intersectRect(rect,point.bounds)};
}

export function createTutorialGuidance({game,guide}){
  const marker = document.createElement("div");
  marker.className = "tutorial-marker hidden";
  marker.setAttribute("aria-hidden","true");
  marker.innerHTML = '<span class="tutorial-marker-shape"></span><span class="tutorial-marker-label"><b></b><small></small></span>';
  document.body.append(marker);
  const name = marker.querySelector("b"), distance = marker.querySelector("small");
  let highlighted = null, dropTarget = null, layoutStep = "", lastUpdate = null, frame = null;
  let worldFrame = null, worldHint = "";

  function highlightDropTarget(next){
    if(dropTarget === next) return;
    dropTarget?.classList.remove("tutorial-drop-target");
    dropTarget = next;
    dropTarget?.classList.add("tutorial-drop-target");
  }

  function highlight(next){
    if(highlighted === next) return;
    highlighted?.classList.remove("tutorial-highlight");
    highlighted = next;
    highlighted?.classList.add("tutorial-highlight");
  }
  function hide(){
    lastUpdate = null;
    worldFrame = null;
    worldHint = "";
    if(frame !== null){ window.cancelAnimationFrame(frame); frame = null; }
    highlight(null);
    highlightDropTarget(null);
    marker.classList.add("hidden");
  }
  function place(point, label, detail = "", ui = false){
    const labelBelow = !ui && !point.edge && point.y < 76;
    const classes = `tutorial-marker${point.edge ? " edge" : ""}${ui ? " ui-target" : " world-target"}${labelBelow ? " label-below" : point.y > window.innerHeight/2 ? " label-above" : ""}`;
    if(marker.className !== classes) marker.className = classes;
    const x = `${point.x}px`, y = `${point.y}px`, angle = `${point.angle || 0}rad`;
    if(marker.style.left !== x) marker.style.left = x;
    if(marker.style.top !== y) marker.style.top = y;
    marker.style.setProperty("--marker-angle",angle);
    if(name.textContent !== label) name.textContent = label;
    if(distance.textContent !== detail) distance.textContent = detail;
  }
  function markerRect(point){
    return {left:point.x-90,right:point.x+90,top:point.y-65,bottom:point.y+65};
  }
  function avoidGuide(areas){
    if(!guide || guide.classList.contains("hidden")) return;
    const overlap = rect=>areas.filter(validRect).reduce((sum,area)=>sum
      +Math.max(0,Math.min(area.right,rect.right)-Math.max(area.left,rect.left))
      *Math.max(0,Math.min(area.bottom,rect.bottom)-Math.max(area.top,rect.top)),0);
    const before = overlap(guide.getBoundingClientRect());
    if(!before) return;
    const wasLeft = guide.classList.contains("tutorial-position-left");
    guide.classList.toggle("tutorial-position-left",!wasLeft);
    if(overlap(guide.getBoundingClientRect()) >= before) guide.classList.toggle("tutorial-position-left",wasLeft);
  }
  function update(definition, state, step){
    lastUpdate = [definition,state,step];
    worldFrame = null;
    if(layoutStep !== step){ layoutStep = step; worldHint = ""; guide?.classList.remove("tutorial-position-left"); }
    const world = typeof definition.world === "function" ? definition.world(state) : definition.world;
    const snapshot = game?.getTutorialSnapshot?.(world || {type:"player"}) || null;
    const candidates = definition.guideSteps || (definition.selector ? [{selector:definition.selector,hint:definition.objective}] : []);
    highlightDropTarget(definition.dragSourceSelector && visibleElement(definition.dragSourceSelector)
      ? visibleElement(definition.dropTargetSelector) : null);
    for(const candidate of candidates){
      if(candidate.when && !candidate.when(state)) continue;
      const target = visibleElement(candidate.selector);
      if(!target) continue;
      highlight(target);
      const {point,visible} = uiGeometry(target);
      if(point){
        avoidGuide([visible,point.edge ? markerRect(point) : {left:point.x-12,right:point.x+12,top:point.y-12,bottom:point.y+12}]);
        place(point,point.label,point.edge ? "Fais défiler" : "",true);
      }else{
        marker.classList.add("hidden");
      }
      return {snapshot,instruction:candidate.hint || definition.objective,hint:""};
    }
    highlight(null);
    worldFrame = world ? {snapshot,world,definition} : null;
    // The slow tick selects destinations and validates progress. Only an actual
    // canvas draw moves a world marker, including when the game is capped at 30 FPS.
    if(unsubscribeFrame && world && snapshot?.target) return {snapshot,hint:worldHint};
    return renderWorld(snapshot,world,definition);
  }
  function renderWorld(snapshot,world,definition){
    highlight(null);
    const canvasBounds = snapshot?.canvas || snapshot?.viewport;
    const actionBar = visibleElement("#gameActionBar")?.getBoundingClientRect();
    const bounds = canvasBounds && {...canvasBounds,bottom:actionBar ? Math.min(canvasBounds.bottom,actionBar.top) : canvasBounds.bottom};
    let point = world && projectTutorialMarker(snapshot?.target,bounds);
    const statusRect = point?.edge && visibleElement(".combat-status")?.getBoundingClientRect();
    if(statusRect && point.x-90 < statusRect.right && point.x+90 > statusRect.left
      && point.y-60 < statusRect.bottom && point.y+60 > statusRect.top){
      // Keep the arrow's direction, but leave the health and shield meters clear.
      const below = statusRect.bottom+70;
      point = below <= bounds.bottom-80 ? {...point,y:below}
        : {...point,x:Math.min(bounds.right-90,statusRect.right+110)};
    }
    if(point){
      const target = snapshot.target;
      // Visible enemies already have their combat marker. Only keep the
      // direction arrow while a mission target is outside the usable viewport.
      if(target.type === "enemy" && !point.edge){
        marker.classList.add("hidden");
        return {snapshot,hint:""};
      }
      if(!point.edge) point = {...point,y:point.y-44,angle:Math.PI/2};
      avoidGuide([markerRect(point)]);
      // A target behind a window is not visible to the player even if it is on the canvas.
      const occluder = document.elementFromPoint?.(point.edge ? point.x : target.screenX,point.edge ? point.y : target.screenY);
      const windowPanel = occluder?.closest?.("#combatChatPanel,#spawnInteractionPanel,.tutorial-guide");
      const close = windowPanel?.querySelector("[data-chat-close],#spawnPanelClose,[data-tutorial-collapse]");
      if(close){
        if(windowPanel === guide && close.getAttribute("aria-expanded") === "false"){
          marker.classList.add("hidden");
          return {snapshot,hint:"Déplace ton vaisseau pour dégager la cible."};
        }
        highlight(close);
        marker.classList.add("hidden");
        return {snapshot,hint:windowPanel === guide ? "Réduis le guide pour dégager la cible." : "Ferme cette fenêtre pour voir la cible indiquée."};
      }
      const units = `${Math.round(Math.max(0,target.distance || 0)).toLocaleString("fr-FR")} m`;
      place(point,target.name || (world.type === "enemy" ? "Cible de mission" : "Destination"),units);
      return {snapshot,hint:target.route ? `Rejoins ${target.destinationMapName} par le portail indiqué.` : ""};
    }
    marker.classList.add("hidden");
    return {snapshot,hint:world?.type === "enemy" ? "Recherche d'une cible de mission…" : definition.fallbackHint || ""};
  }
  function onGameFrame(){
    if(!worldFrame || document.hidden) return;
    const {snapshot,world,definition} = worldFrame;
    const rendered = game.getTutorialRenderSnapshot(snapshot);
    worldHint = renderWorld(rendered,world,definition).hint || "";
  }
  const unsubscribeFrame = game?.getTutorialRenderSnapshot
    ? game.subscribeTutorialFrame?.(onGameFrame) : null;
  function onViewportChange(){
    if(!lastUpdate || frame !== null) return;
    frame = window.requestAnimationFrame(()=>{
      frame = null;
      if(lastUpdate) update(...lastUpdate);
    });
  }
  window.addEventListener("scroll",onViewportChange,{capture:true,passive:true});
  window.addEventListener("resize",onViewportChange,{passive:true});
  return {update,hide,destroy(){
    hide();
    unsubscribeFrame?.();
    window.removeEventListener("scroll",onViewportChange,true);
    window.removeEventListener("resize",onViewportChange);
    marker.remove();
  }};
}
