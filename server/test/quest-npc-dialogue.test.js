import assert from "node:assert/strict";
import test from "node:test";
import { getQuest } from "../src/quests/questState.js";
import { createQuestNpcDialogue } from "../../src/game/ui/questNpcDialogue.js";

function createDialogueDom(){
  const nodes = {
    name:{textContent:""},
    line:{
      textContent:"",
      replaceChildren(node){ this.textContent = node?.textContent || ""; }
    }
  };
  const classes = new Set(["hidden"]);
  let clickHandler = null;
  let keyHandler = null;
  let panel = null;
  const classList = {
    add(...names){ names.forEach(name=>classes.add(name)); },
    remove(...names){ names.forEach(name=>classes.delete(name)); },
    contains(name){ return classes.has(name); }
  };
  const createPanel = ()=>({
    className:"",
    classList,
    innerHTML:"",
    style:{setProperty(){}},
    querySelector(selector){
      if(selector === "[data-npc-name]") return nodes.name;
      if(selector === "[data-npc-line]") return nodes.line;
      return null;
    },
    addEventListener(type, handler){
      if(type === "click") clickHandler = handler;
    }
  });
  const gameScreen = {appendChild(element){ panel = element; }};
  const document = {
    addEventListener(type,handler){ if(type === "keydown") keyHandler=handler; },
    createElement(){ return createPanel(); },
    createTextNode(text){ return {textContent:String(text || "")}; },
    getElementById(id){
      if(id === "npcDialoguePanel") return panel;
      if(id === "gameScreen") return gameScreen;
      return null;
    }
  };
  return {
    document,
    line:()=>nodes.line.textContent,
    click(selector = ""){
      clickHandler?.({preventDefault(){}, target:{closest(match){ return selector && match === selector ? {} : null; }}});
    },
    key(key){ keyHandler?.({key,preventDefault(){},stopImmediatePropagation(){},target:{closest(){return null;}}}); }
  };
}

test("Ricky starts the level 5 attack as soon as its final dialogue line appears", t=>{
  const dom = createDialogueDom();
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousAnimationFrame = globalThis.requestAnimationFrame;
  globalThis.document = dom.document;
  globalThis.window = {innerWidth:1280, innerHeight:720, setTimeout(callback){ callback(); }};
  globalThis.requestAnimationFrame = callback=>callback();
  t.after(()=>{
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
    globalThis.requestAnimationFrame = previousAnimationFrame;
  });

  const quest = getQuest("quest_lv5_call_for_help");
  const sent = [];
  const dialogue = createQuestNpcDialogue({
    canvas:{getBoundingClientRect:()=>({left:0, top:0})},
    multiplayer:{connected:true},
    getCamera:()=>({x:0, y:0, zoom:1}),
    getCurrentMap:()=>({name:"Helion-02", questNpcs:[]}),
    getPlayer:()=>({}),
    stopPlayerMovement(){},
    getActiveQuests:()=>[quest],
    getQuestObjectiveProgress(_questId, key){ return key === "portal_coord" ? 1 : 0; },
    getInventoryCount:()=>0,
    progressServerQuest(payload){ sent.push(payload); return true; },
    recordQuestNpcTalk(){},
    saveState(){},
    getSpawnPanelMode:()=>null,
    renderSpawnInteractionPanel(){},
    updateHud(){},
    showToast(){}
  });
  const npc = {id:"astra02_portal_mechanic", name:"Ricky", x:0, y:0, size:120};

  dialogue.interact(npc);
  dom.click();
  dom.click();
  dom.click();
  assert.equal(sent.length, 0);

  dom.click();
  assert.deepEqual(sent, [{
    type:"talk_npc",
    itemId:"",
    npcId:"astra02_portal_mechanic",
    zoneName:"Helion-02"
  }]);

  dom.click();
  dom.click();
  assert.equal(sent.length, 1);
  dom.click("[data-npc-previous]");
  dom.key("Enter");
  dom.key(" ");
  assert.equal(sent.length,1,"rereading a line cannot repeat the already committed quest action");
  dom.key("Escape");
  assert.equal(dom.document.getElementById("npcDialoguePanel").classList.contains("hidden"),true);
});

test("Ricky offers a rescue key through his dialogue only until the first clear", t=>{
  const previousDocument=globalThis.document,previousWindow=globalThis.window,previousAnimationFrame=globalThis.requestAnimationFrame;
  t.after(()=>{globalThis.document=previousDocument;globalThis.window=previousWindow;globalThis.requestAnimationFrame=previousAnimationFrame;});
  for(const scenario of [
    {keys:0,clears:0,portal:0,sent:1,text:/plus de clé/},
    {keys:1,clears:0,portal:0,sent:0,text:/toujours coince/},
    {keys:0,clears:1,portal:0,sent:0,text:/déjà réussi/},
    {keys:0,clears:1,portal:1,sent:1,text:/encore vivant/}
  ]){
    const dom=createDialogueDom(),sent=[];
    globalThis.document=dom.document;
    globalThis.window={innerWidth:1280,innerHeight:720,setTimeout:callback=>callback()};
    globalThis.requestAnimationFrame=callback=>callback();
    const dialogue=createQuestNpcDialogue({
      canvas:{getBoundingClientRect:()=>({left:0,top:0})},multiplayer:{connected:true},
      getCamera:()=>({x:0,y:0,zoom:1}),getCurrentMap:()=>({name:"Helion-02"}),getPlayer:()=>({}),stopPlayerMovement(){},
      getActiveQuests:()=>[getQuest("quest_lv10_sauvons_deadly")],
      getQuestObjectiveProgress:(_questId,key)=>key === "portal" ? scenario.portal : 0,
      getInventoryCount:()=>scenario.keys,getCompletedPortalCount:()=>scenario.clears,
      progressServerQuest:payload=>{sent.push(payload);return true;},saveState(){},getSpawnPanelMode:()=>null,
      renderSpawnInteractionPanel(){},updateHud(){}
    });
    dialogue.interact({id:"astra02_portal_mechanic",name:"Ricky",x:0,y:0,size:120});
    dom.click();assert.match(dom.line(),scenario.text);
    for(let index=0;index<12;index+=1) dom.click();
    assert.equal(sent.length,scenario.sent,JSON.stringify(scenario));
    if(sent.length) assert.equal(sent[0].type,"talk_npc");
  }
});
