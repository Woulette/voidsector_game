import assert from "node:assert/strict";
import test from "node:test";
import { RICKY_SAUCER_ASSET } from "../../src/data/rickyVisuals.js";
import { MAPS } from "../../src/game/combatData.js";
import { getQuestObjectiveImage } from "../../src/game/ui/questObjectiveVisuals.js";
import { sampleRickySaucerAnimation } from "../../src/game/render/rickySaucer.js";
import { installWorldSocketListeners } from "../../src/multiplayer/worldSocketListeners.js";

test("the four firm NPCs and their quest portraits use the same saucer artwork",()=>{
  for(const name of ["Helion-02","Nereid-02","Aureon-02","Sylva-02"]){
    const npc=MAPS.find(map=>map.name===name).questNpcs[0];
    assert.equal(npc.npcImg,RICKY_SAUCER_ASSET,name);
    assert.equal(getQuestObjectiveImage({type:"talk_npc",npcId:npc.id}),RICKY_SAUCER_ASSET);
  }
  assert.equal(getQuestObjectiveImage({type:"talk_npc",npcId:"other_npc",npcImg:"other.png"}),"other.png");
});

test("saucer shots and healing animate only after a confirmed event and finish on time",()=>{
  const idle=sampleRickySaucerAnimation({},1000);
  assert.equal(idle.laser+idle.rocket+idle.casting,0);
  const ally={hp:35000,shield:5000,clientLaserShotAt:1000,clientRocketShotAt:1000,clientSpellAt:1000};
  const before=structuredClone(ally);
  const active=sampleRickySaucerAnimation(ally,1100);
  assert(active.laser>0 && active.rocket>0 && active.casting>0 && active.recoil>0);
  const ended=sampleRickySaucerAnimation(ally,3000);
  assert.equal(ended.laser+ended.rocket+ended.casting+ended.recoil,0);
  assert.deepEqual(ally,before,"the renderer cannot modify combat stats or cooldowns");
});

test("incoming companion snapshots preserve current visual impulses while replacing authoritative stats",()=>{
  const handlers=new Map();
  const multiplayer={playerId:"pilot",portalAlly:{id:"ricky_companion",hp:200,clientAimAngle:1,clientAimUntil:4000,clientLaserShotAt:2500},rickyHealEvents:[]};
  installWorldSocketListeners({socket:{on:(name,handler)=>handlers.set(name,handler)},multiplayer,replaceServerEnemies(){},emitChange(){},toast(){}});
  handlers.get("coop:enemies")({instanceId:"test",portal:{id:"ricky"},ally:{id:"ricky_companion",hp:100,shield:50,x:80,y:120},enemies:[]});
  assert.equal(multiplayer.portalAlly.hp,100);
  assert.equal(multiplayer.portalAlly.x,80);
  assert.equal(multiplayer.portalAlly.clientLaserShotAt,2500);
  handlers.get("portal:ricky-heal")({beacon:{id:"heal",x:10,y:20}});
  assert(multiplayer.portalAlly.clientSpellAt>0);
  handlers.get("coop:enemies")({instanceId:"test",portal:{id:"ricky"},ally:{id:"different_ally",hp:90},enemies:[]});
  assert.equal(multiplayer.portalAlly.clientLaserShotAt,undefined);
  assert.equal(multiplayer.portalAlly.clientSpellAt,undefined);
});
