import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createTutorialStages } from "../../src/ui/tutorialStages.js";
import { createTutorialGuidance, projectTutorialMarker, projectTutorialUiMarker } from "../../src/ui/tutorialGuidance.js";
import { renderTutorialView,tutorialAbandonMarkup } from "../../src/ui/tutorialView.js";
import { TUTORIAL_STEPS } from "../../src/shared/tutorial.js";
import { createSocketCommands } from "../../src/multiplayer/socketCommands.js";
import { createGameConnectionRecoveryController } from "../../src/app/gameConnectionRecovery.js";

const css = fs.readFileSync(new URL("../../src/styles/tutorial.css",import.meta.url),"utf8");
const authCss = fs.readFileSync(new URL("../../src/styles/auth.css",import.meta.url),"utf8");

function zIndexFor(source,selector){
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const match = source.match(new RegExp(`${escaped}\\s*\\{[^}]*z-index:\\s*(\\d+)`));
  return match ? Number(match[1]) : null;
}
function classList(values=[]){
  const set = new Set(values);
  return {add:value=>set.add(value),remove:value=>set.delete(value),contains:value=>set.has(value),clear:()=>set.clear()};
}
function element(){
  return {classList:classList(["hidden"]),dataset:{},setAttribute(name,value){ this[name]=value; },
    removeAttribute(name){ delete this[name]; },addEventListener(){}};
}
function restoreGlobal(name,original){
  if(original===undefined) delete globalThis[name];
  else globalThis[name]=original;
}

test("visible targets keep their actual coordinates and invalid geometry never produces a marker",()=>{
  const bounds={left:10,top:20,right:1010,bottom:720};
  assert.deepEqual(projectTutorialMarker({screenX:500,screenY:300},bounds),{x:500,y:300,edge:false,angle:0});
  assert.equal(projectTutorialMarker(null,bounds),null);
  assert.equal(projectTutorialMarker({screenX:NaN,screenY:300},bounds),null);
  assert.equal(projectTutorialMarker({screenX:100,screenY:Infinity},bounds),null);
  assert.equal(projectTutorialMarker({screenX:100,screenY:300},{left:1,top:1,right:1,bottom:50}),null);
});

test("off-screen directions remain on the inset screen border and on the ray to the target",()=>{
  for(const bounds of [{left:10,top:20,right:1010,bottom:720},{left:0,top:0,right:180,bottom:140}]){
    const cx=(bounds.left+bounds.right)/2,cy=(bounds.top+bounds.bottom)/2;
    const ix=Math.min(80,(bounds.right-bounds.left)/4),iy=Math.min(80,(bounds.bottom-bounds.top)/4);
    const left=bounds.left+ix,right=bounds.right-ix,top=bounds.top+iy,bottom=bounds.bottom-iy;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1],[4,1],[1,4]]){
      const target={screenX:cx+dx*2000,screenY:cy+dy*2000};
      const marker=projectTutorialMarker(target,bounds);
      assert.equal(marker.edge,true);
      assert.ok(marker.x>=left-1e-8 && marker.x<=right+1e-8);
      assert.ok(marker.y>=top-1e-8 && marker.y<=bottom+1e-8);
      assert.ok(Math.min(Math.abs(marker.x-left),Math.abs(marker.x-right),Math.abs(marker.y-top),Math.abs(marker.y-bottom))<1e-8);
      const cross=(marker.x-cx)*(target.screenY-cy)-(marker.y-cy)*(target.screenX-cx);
      assert.ok(Math.abs(cross)<1e-7,"clamping each coordinate separately would change the indicated direction");
      assert.ok(Math.abs(marker.angle-Math.atan2(dy,dx))<1e-9);
    }
  }
});

test("UI markers keep the real target corner and direct scrolling when that corner is clipped",()=>{
  const viewport={left:0,top:0,right:1000,bottom:800};
  const before=projectTutorialUiMarker({left:400,top:300,right:600,bottom:350},viewport);
  assert.equal(before.edge,false);
  assert.equal(before.x,594);
  assert.equal(before.y,306);
  const after=projectTutorialUiMarker({left:400,top:180,right:600,bottom:230},viewport);
  assert.equal(after.y,before.y-120,"the marker must move exactly with the scrolled target");
  const partial=projectTutorialUiMarker({left:400,top:-100,right:600,bottom:100},viewport);
  assert.equal(partial.edge,true);
  assert.equal(partial.label,"Plus haut");
  assert.equal(partial.angle,-Math.PI/2);
  assert.equal(partial.y,24,"the point must not pretend the clipped corner moved to the visible edge");
  for(const [rect,label,angle] of [
    [{left:400,top:900,right:600,bottom:950},"Plus bas",Math.PI/2],
    [{left:-200,top:300,right:-100,bottom:350},"Plus à gauche",Math.PI],
    [{left:1100,top:300,right:1200,bottom:350},"Plus à droite",0]
  ]){
    const point=projectTutorialUiMarker(rect,viewport);
    assert.equal(point.edge,true);
    assert.equal(point.label,label);
    assert.equal(point.angle,angle);
    assert.ok(point.x>0 && point.x<1000 && point.y>0 && point.y<800);
  }
  assert.equal(projectTutorialUiMarker({left:0,top:0,right:NaN,bottom:30},viewport),null);
});

test("UI scrolling respects nested clipping axes and first guides an off-screen container into view",()=>{
  const viewport={left:0,top:0,right:1000,bottom:800};
  const catalog={rect:{left:200,top:200,right:800,bottom:600},clipX:true,clipY:true};
  const point=projectTutorialUiMarker({left:300,top:700,right:500,bottom:750},viewport,[catalog]);
  assert.equal(point.label,"Plus bas");
  assert.equal(point.y,576,"scroll the inner catalog, not the whole page");
  assert.equal(point.x,494);
  const reached=projectTutorialUiMarker({left:300,top:300,right:500,bottom:350},viewport,[catalog]);
  assert.equal(reached.edge,false);
  assert.equal(reached.y,306);
  const outside=projectTutorialUiMarker({left:300,top:1500,right:500,bottom:1550},viewport,[
    {rect:{left:100,top:900,right:900,bottom:1400}},catalog
  ]);
  assert.equal(outside.y,776,"reach the outer container before attempting its inner scroll");
  assert.equal(outside.label,"Plus bas");
  const onlyX=projectTutorialUiMarker({left:300,top:700,right:500,bottom:750},viewport,[{...catalog,clipY:false}]);
  assert.equal(onlyX.edge,false,"overflow-x alone must not clip vertical content");
  assert.equal(onlyX.y,706);
  const onlyY=projectTutorialUiMarker({left:50,top:300,right:100,bottom:350},viewport,[{...catalog,clipX:false}]);
  assert.equal(onlyY.edge,false,"overflow-y alone must not clip horizontal content");
  assert.equal(onlyY.x,94);
});

function withGuidanceDom(run,{game}={}){
  const originals={document:globalThis.document,window:globalThis.window,getComputedStyle:globalThis.getComputedStyle};
  const listeners=new Map(),frames=new Map();
  let nextFrame=0,scrollCalls=0;
  const labels={b:{textContent:""},small:{textContent:""}};
  const marker={style:{setProperty(name,value){this[name]=value;}},setAttribute(){},
    querySelector:selector=>labels[selector],remove(){this.removed=true;}};
  const classes=classList();
  classes.toggle=(name,force)=>{const next=force ?? !classes.contains(name); next ? classes.add(name) : classes.remove(name); return next;};
  marker.classList=classes;
  Object.defineProperty(marker,"className",{get:()=>marker.classes || "",set:value=>{
    classes.clear();
    marker.classes=value;
    for(const name of value.split(" ")) classes.add(name);
  }});
  const body={append(){}};
  const target={rect:{left:600,top:550,right:760,bottom:600},classList:classList(),parentElement:body,
    getBoundingClientRect(){return {...this.rect,width:this.rect.right-this.rect.left,height:this.rect.bottom-this.rect.top};},
    scrollIntoView(){scrollCalls++;}};
  const guideClasses=classList();
  guideClasses.toggle=(name,force)=>{const next=force ?? !guideClasses.contains(name); next ? guideClasses.add(name) : guideClasses.remove(name);};
  const guide={classList:guideClasses,getBoundingClientRect(){
    const left=guideClasses.contains("tutorial-position-left") ? 18 : 642;
    return {left,right:left+340,top:500,bottom:780};
  }};
  globalThis.document={body,createElement:()=>marker,querySelectorAll:selector=>selector==="#action" ? [target] : [],elementFromPoint:()=>null};
  globalThis.window={innerWidth:1000,innerHeight:800,
    addEventListener(name,fn,options){listeners.set(name,{fn,options});},removeEventListener(name){listeners.delete(name);},
    requestAnimationFrame(fn){const id=++nextFrame;frames.set(id,fn);return id;},cancelAnimationFrame(id){frames.delete(id);}};
  globalThis.getComputedStyle=()=>({display:"block",visibility:"visible",overflow:"visible",overflowX:"visible",overflowY:"visible"});
  const guidance=createTutorialGuidance({guide,game});
  const flush=()=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn());};
  try{run({guidance,guide,target,marker,labels,listeners,frames,flush,scrollCalls:()=>scrollCalls});}
  finally{guidance.destroy();for(const [name,value] of Object.entries(originals)) restoreGlobal(name,value);}
}

test("guidance follows scrolling without scrolling for the player and avoids the guide on either side",()=>{
  withGuidanceDom(({guidance,guide,target,marker,labels,listeners,frames,flush,scrollCalls})=>{
    const definition={objective:"Choisis le vaisseau.",guideSteps:[{selector:"#action",hint:"Ouvre la fiche du Velox."}]};
    const result=guidance.update(definition,{},"select");
    assert.equal(result.instruction,"Ouvre la fiche du Velox.");
    assert.equal(result.hint,"");
    assert.equal(marker.style.left,"754px");
    assert.equal(guide.classList.contains("tutorial-position-left"),true);
    assert.equal(listeners.get("scroll").options.capture,true);
    assert.equal(listeners.get("scroll").options.passive,true);
    target.rect={left:100,top:550,right:200,bottom:600};
    listeners.get("scroll").fn();
    listeners.get("resize").fn();
    assert.equal(frames.size,1,"scroll and resize share one animation frame");
    flush();
    assert.equal(marker.style.left,"194px");
    assert.equal(guide.classList.contains("tutorial-position-left"),false);
    for(let i=0;i<3;i++) guidance.update(definition,{},"select");
    assert.equal(guide.classList.contains("tutorial-position-left"),false,"a free position must remain stable");
    target.rect={left:100,top:900,right:200,bottom:950};
    listeners.get("scroll").fn();flush();
    assert.equal(labels.b.textContent,"Plus bas");
    assert.equal(labels.small.textContent,"Fais défiler");
    assert.equal(scrollCalls(),0);
    guidance.hide();
    listeners.get("scroll").fn();
    assert.equal(frames.size,0,"hidden guidance must not reappear after a scroll");
    guidance.update(definition,{},"select");
    listeners.get("scroll").fn();
    guidance.destroy();
    assert.equal(listeners.size,0);
    assert.equal(frames.size,0);
    assert.equal(marker.removed,true);
  });
});

test("world destinations use a downward arrow above their anchor while visible enemies stay unmarked",()=>{
  const snapshot={viewport:{left:0,top:0,right:1000,bottom:800},
    target:{type:"station",name:"Relais Cygnus",distance:120,screenX:500,screenY:300}};
  withGuidanceDom(({guidance,marker,labels})=>{
    const definition={objective:"Rejoins le relais.",world:{type:"station"}};
    guidance.update(definition,{},"station");
    assert.equal(marker.classList.contains("world-target"),true);
    assert.equal(marker.classList.contains("edge"),false);
    assert.equal(marker.style.left,"500px");
    assert.equal(marker.style.top,"256px");
    assert.equal(marker.style["--marker-angle"],`${Math.PI/2}rad`);
    assert.equal(labels.b.textContent,"Relais Cygnus");
    snapshot.target.screenY=80;
    guidance.update(definition,{},"station");
    assert.equal(marker.style.top,"36px");
    assert.equal(marker.classList.contains("label-below"),true,"labels near the top must remain on screen");
    snapshot.target={type:"enemy",name:"Orbe",distance:120,screenX:500,screenY:300};
    guidance.update({world:{type:"enemy"}}, {},"hunt");
    assert.equal(marker.classList.contains("hidden"),true);
    snapshot.target.screenX=1800;
    guidance.update({world:{type:"enemy"}}, {},"hunt");
    assert.equal(marker.classList.contains("hidden"),false);
    assert.equal(marker.classList.contains("world-target"),true);
    assert.equal(marker.classList.contains("edge"),true,"keep the direction arrow for an off-screen enemy");
  },{game:{getTutorialSnapshot:()=>snapshot}});
});

test("world markers follow rendered frames between tutorial ticks and stop following during UI guidance",()=>{
  const snapshot={viewport:{left:0,top:0,right:1000,bottom:800},
    target:{type:"station",name:"Relais",distance:120,screenX:500,screenY:300}};
  let drawFrame,unsubscribed=false,selected=0,projected=0,rendered=snapshot;
  const game={
    getTutorialSnapshot(){selected++;return snapshot;},
    getTutorialRenderSnapshot(){projected++;return rendered;},
    subscribeTutorialFrame(callback){drawFrame=callback;return ()=>{unsubscribed=true;};}
  };
  withGuidanceDom(({guidance,marker,frames})=>{
    const definition={world:{type:"station"}};
    guidance.update(definition,{},"relay");
    drawFrame();
    assert.equal(marker.style.left,"500px");
    for(let i=1;i<=6;i++){
      rendered={...snapshot,target:{...snapshot.target,screenX:500-i*3.25,screenY:300+i*.4}};
      drawFrame();
      assert.equal(parseFloat(marker.style.left),rendered.target.screenX);
      assert.equal(parseFloat(marker.style.top),rendered.target.screenY-44);
    }
    assert.equal(selected,1,"six drawn frames must not reselect routes or targets");
    assert.equal(projected,7);
    assert.equal(frames.size,0,"world movement has no independent animation loop");
    guidance.update(definition,{},"relay");
    assert.equal(marker.style.left,"480.5px","a tick between draws must not move the arrow ahead of the canvas");
    guidance.update({selector:"#action"},{},"menu");
    drawFrame();
    assert.equal(projected,7,"UI controls must not be replaced by the previous world destination");
    assert.equal(marker.classList.contains("ui-target"),true);
    guidance.update(definition,{},"relay");
    rendered=null;drawFrame();
    assert.equal(marker.classList.contains("hidden"),true,"a dead target or changed map clears the old arrow");
    guidance.hide();
    rendered=snapshot;drawFrame();
    assert.equal(marker.classList.contains("hidden"),true);
    guidance.destroy();
    assert.equal(unsubscribed,true);
  },{game});
});

test("every active step retains an accessible abandon action even when collapsed or in the other window",()=>{
  const stages=createTutorialStages({playerName:"Nova",firmId:"cyan"});
  const originalDocument=globalThis.document;
  delete globalThis.document;
  try{
    for(const step of TUTORIAL_STEPS){
      const definition=stages[step];
      for(const collapsed of [true,false]) for(const appMode of ["game","launcher"]){
        const html=renderTutorialView({tutorial:{step,status:"active"},definition,firmId:"cyan",appMode,collapsed});
        assert.match(html,/<footer[^>]*>[\s\S]*<button[^>]*data-tutorial-close[^>]*>Abandonner<\/button><\/footer>/);
        assert.ok(!/<footer[^>]*class="[^"]*hidden/.test(html),step);
        assert.match(html,new RegExp(`aria-expanded="${!collapsed}"`));
        assert.match(html,/role="progressbar"/);
        const progress=Number(html.match(/aria-valuenow="(\d+)"/)[1]);
        assert.ok(progress>=0 && progress<=100,step);
        assert.equal(html.includes("data-tutorial-next"),definition.manual===true && definition.mode===appMode,step);
        assert.equal(html.includes("data-tutorial-gift"),definition.gift===true && definition.mode===appMode,step);
        assert.equal(html.includes("data-tutorial-travel"),definition.mode!==appMode,step);
      }
    }
  }finally{ restoreGlobal("document",originalDocument); }
});

test("tutorial rendering escapes player-derived text before HTML insertion",()=>{
  const attack='<img src=x onerror="alert(1)">';
  const definition=createTutorialStages({playerName:attack}).launcher_orion;
  const html=renderTutorialView({tutorial:{step:"launcher_orion"},definition,firmId:"astra",appMode:"launcher",collapsed:false});
  assert.ok(html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"));
  assert.ok(!html.includes(attack));
});

test("permanent abandonment is a separately described modal with distinct confirm and keep actions",()=>{
  assert.match(tutorialAbandonMarkup,/role="dialog"/);
  assert.match(tutorialAbandonMarkup,/aria-modal="true"/);
  const title=tutorialAbandonMarkup.match(/aria-labelledby="([^"]+)"/)[1];
  const description=tutorialAbandonMarkup.match(/aria-describedby="([^"]+)"/)[1];
  assert.ok(tutorialAbandonMarkup.includes(`id="${title}"`));
  assert.ok(tutorialAbandonMarkup.includes(`id="${description}"`));
  assert.equal((tutorialAbandonMarkup.match(/data-tutorial-abandon/g)||[]).length,1);
  assert.equal((tutorialAbandonMarkup.match(/data-tutorial-keep/g)||[]).length,1);
  assert.match(tutorialAbandonMarkup,/définitif/);
  assert.match(tutorialAbandonMarkup,/reconnexion/);
  assert.match(tutorialAbandonMarkup,/fermer le jeu/);
});

test("tutorial transport preserves step and revision and emits nothing without an authenticated profile",()=>{
  const calls=[];
  const multiplayer={connected:true,socket:{emit:(...args)=>calls.push(args)},auth:{account:{id:"account1"},profileReady:true}};
  const commands=createSocketCommands({multiplayer});
  const payload={kind:"advance",currentStep:"launcher_buy_velox",revision:27};
  assert.equal(commands.updateTutorial(payload),true);
  assert.deepEqual(calls,[["tutorial:update",payload]]);
  assert.equal(commands.updateTutorial({kind:"claim-reward",currentStep:"game_open_gift",revision:0}),true);
  assert.equal(calls[1][1].revision,0);
  multiplayer.auth.profileReady=false;
  assert.equal(commands.updateTutorial(payload),false);
  multiplayer.auth.profileReady=true;
  multiplayer.connected=false;
  assert.equal(commands.updateTutorial(payload),false);
  assert.equal(calls.length,2);
});

test("disconnect recovery suppresses guidance and shows its overlay without changing tutorial progress",()=>{
  const originalDocument=globalThis.document;
  const root=element(),status=element(),reconnect=element(),close=element();
  const elements={gameDisconnectOverlay:root,gameDisconnectStatus:status,gameReconnectBtn:reconnect,gameCloseBtn:close};
  const tutorial={status:"active",step:"game_hunt_raiders",revision:19};
  const before=JSON.stringify(tutorial);
  globalThis.document={body:{classList:classList()},getElementById:id=>elements[id]};
  let suspended=0;
  try{
    const recovery=createGameConnectionRecoveryController({appMode:"game",multiplayer:{auth:{profileReady:true,account:{id:"p"}}},
      isGameRunning:()=>true,suspendGame:()=>suspended++,resumeGame(){},getAuthToken:()=>"saved-token",reconnect:()=>true,
      disconnect(){},windowRef:{addEventListener(){},close(){}}});
    recovery.show("network");
    assert.equal(recovery.isActive(),true);
    assert.equal(document.body.classList.contains("game-disconnect-active"),true);
    assert.equal(root.classList.contains("hidden"),false);
    assert.equal(root["aria-hidden"],"false");
    assert.equal(suspended,1);
    recovery.hide();
    assert.equal(document.body.classList.contains("game-disconnect-active"),false);
    assert.equal(root.classList.contains("hidden"),true);
    assert.equal(root["aria-hidden"],"true");
    assert.equal(JSON.stringify(tutorial),before);
  }finally{ restoreGlobal("document",originalDocument); }
});

test("disconnect overlay visually takes precedence over every tutorial surface",()=>{
  const recoveryZ=zIndexFor(authCss,".game-disconnect-overlay");
  assert.ok(Number.isFinite(recoveryZ));
  for(const selector of [".tutorial-guide",".tutorial-marker",".tutorial-abandon-backdrop",".tutorial-reward-overlay"]){
    const tutorialZ=zIndexFor(css,selector);
    assert.ok(Number.isFinite(tutorialZ),`missing layer for ${selector}`);
    assert.ok(recoveryZ>tutorialZ,selector);
    const hiddenBlocks=[...css.matchAll(/([^{}]*body\.game-disconnect-active[^{}]*)\{([^}]*)\}/g)];
    assert.ok(hiddenBlocks.some(([,selectors,rules])=>selectors.includes(selector) && /display:\s*none\s*!important/.test(rules)),selector);
  }
});
