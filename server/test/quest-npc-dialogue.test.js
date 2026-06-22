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
    click(){
      clickHandler?.({preventDefault(){}, target:{closest(){ return null; }}});
    }
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
});
