import test from "node:test";
import assert from "node:assert/strict";
import { createTutorialWorldGuidance, findTutorialPortalRoute } from "../../src/game/systems/tutorialWorldGuidance.js";
import { MAPS } from "../../src/game/combatData/maps.js";
import { FIRMS, getFirmMapId, getFirmMapName } from "../../src/data/firms.js";

function fixture({maps = MAPS, mapId = 0, firmId = "astra", stations = []} = {}){
  const state = {
    running:true,
    player:{x:0,y:0,hp:4000,maxHp:5000,repairBotActive:true},
    camera:{x:-100,y:-50,zoom:2},
    currentMap:maps.find(map=>String(map.id) === String(mapId)),
    enemies:[],
    firmId,
    tutorialStep:"hunt"
  };
  const guidance = createTutorialWorldGuidance({
    getState:()=>state, maps, getStations:()=>stations,
    getViewport:()=>({left:10,top:20,right:1010,bottom:620}),
    enemyTypes:{drone_pirate:{name:"Orbe sentinelle"},raider_astral:{name:"Vorak rusher"}}
  });
  return {state, snapshot:target=>guidance.getTutorialSnapshot(target)};
}

test("a useful enemy stays selected through movement and closer spawns until it dies", ()=>{
  const f = fixture();
  f.state.enemies = [{id:"first",kind:"drone_pirate",hp:100,x:100,y:0},{id:"second",kind:"drone_pirate",hp:100,x:200,y:0}];
  const target = {type:"enemy",kinds:["drone_pirate"]};
  assert.equal(f.snapshot(target).target.id,"first");
  f.state.enemies[0].x = 500;
  f.state.enemies.push({id:"nearer",kind:"drone_pirate",hp:100,x:2,y:0});
  f.snapshot({type:"player"});
  assert.equal(f.snapshot(target).target.id,"first");
  f.state.enemies[0].hp = 0;
  assert.equal(f.snapshot(target).target.id,"nearer");
});

test("disappearance, useful kinds and objective changes invalidate an old enemy selection", ()=>{
  const f = fixture();
  f.state.enemies = [{id:1,kind:"drone_pirate",hp:100,x:10,y:0},{id:2,kind:"raider_astral",hp:100,x:20,y:0}];
  assert.equal(f.snapshot({type:"enemy",kinds:["raider_astral","drone_pirate"]}).target.id,"1");
  f.state.enemies[1].x = 1;
  assert.equal(f.snapshot({type:"enemy",kinds:["drone_pirate","raider_astral"]}).target.id,"1");
  assert.equal(f.snapshot({type:"enemy",kinds:["raider_astral"]}).target.id,"2");
  f.state.enemies = f.state.enemies.filter(enemy=>enemy.id !== 2);
  assert.equal(f.snapshot({type:"enemy",kinds:["raider_astral"]}).target,null);
  f.state.enemies.push({id:3,kind:"drone_pirate",hp:100,x:1,y:0});
  assert.equal(f.snapshot({type:"enemy",kinds:["drone_pirate"]}).target.id,"3");
  f.state.enemies[0].x = 0;
  f.state.tutorialStep = "different-objective";
  assert.equal(f.snapshot({type:"enemy",kinds:["drone_pirate"]}).target.id,"1");
});

test("unattackable targets are skipped without sorting or changing the enemy array", ()=>{
  const f = fixture();
  f.state.enemies = [{id:"immune",kind:"drone_pirate",hp:100,x:1,y:0,damageImmune:true},{id:"alive",kind:"drone_pirate",hp:100,x:80,y:0}];
  const original = [...f.state.enemies];
  assert.equal(f.snapshot({type:"enemy",kinds:["drone_pirate"]}).target.id,"alive");
  assert.deepEqual(f.state.enemies,original);
});

test("an explicitly empty useful-kind list clears the hunt instead of selecting unrelated enemies", ()=>{
  const f = fixture();
  f.state.enemies = [{id:"orb",kind:"drone_pirate",hp:100,x:10,y:0}];
  assert.equal(f.snapshot({type:"enemy",kinds:["drone_pirate"]}).target.id,"orb");
  assert.equal(f.snapshot({type:"enemy",kinds:[]}).target,null);
  assert.equal(f.snapshot({type:"enemy",kinds:[],mapNumber:2}).target,null);
  assert.equal(f.snapshot({type:"enemy"}).target.id,"orb");
});

test("projection keeps actual offscreen coordinates, names and viewport for edge guidance", ()=>{
  const f = fixture();
  f.state.enemies = [{id:"far",kind:"drone_pirate",hp:100,x:1000,y:-1000}];
  const result = f.snapshot({type:"enemy",kinds:["drone_pirate"]});
  assert.equal(result.target.screenX,2210);
  assert.equal(result.target.screenY,-1880);
  assert.equal(result.target.onScreen,false);
  assert.equal(result.target.name,"Orbe sentinelle");
  assert.equal(result.player.screenX,210);
  assert.equal(result.player.hp,4000);
  assert.equal(result.player.maxHp,5000);
  assert.equal(result.player.screenY,120);
  assert.deepEqual(result.viewport,{left:10,top:20,right:1010,bottom:620,width:1000,height:600});
  assert.equal(result.canvas,result.viewport);
});

test("an empty hunt still exposes the player projection and full viewport", ()=>{
  const f = fixture();
  const result = f.snapshot({type:"enemy",kinds:["drone_pirate"]});
  assert.equal(result.target,null);
  assert.equal(result.player.screenX,210);
  assert.equal(result.viewport.width,1000);
  f.state.running = false;
  assert.equal(f.snapshot({type:"player"}),null);
});

test("every firm targets its own map 2 even while currently visiting another firm's map 1", ()=>{
  for(const firm of FIRMS){
    const wrongFirm = FIRMS.find(other=>other.id !== firm.id);
    const f = fixture({firmId:firm.id,mapId:wrongFirm.baseMapId});
    const result = f.snapshot({type:"map2"});
    assert.equal(result.destinationMapId,getFirmMapId(firm.id,2));
    assert.equal(result.destinationMapName,getFirmMapName(firm.id,2));
    assert.equal(result.atDestinationMap,false);
    assert.equal(result.target.route,true);
    assert.equal(result.target.routeMapIds.at(-1),getFirmMapId(firm.id,2));
  }
});

test("another firm's map 2 is not a successful tutorial map transfer", ()=>{
  const f = fixture({firmId:"cyan",mapId:1});
  const result = f.snapshot({type:"map2"});
  assert.equal(result.atDestinationMap,false);
  assert.equal(result.target.destinationReached,false);
  assert.equal(result.destinationMapName,"Nereid-02");
  f.state.currentMap = MAPS.find(map=>map.id === 21);
  assert.equal(f.snapshot({type:"map2"}).target.destinationReached,true);
});

test("returning to HQ uses the correct portal; reaching that waypoint is not reaching HQ", ()=>{
  const f = fixture({mapId:1});
  let result = f.snapshot({type:"hq"});
  assert.equal(result.destinationMapId,0);
  assert.equal(result.target.nextMapId,0);
  f.state.player.x = result.target.x;
  f.state.player.y = result.target.y;
  result = f.snapshot({type:"hq"});
  assert.equal(result.target.distance,0);
  assert.equal(result.target.destinationReached,false);
  assert.equal(result.atDestinationMap,false);
  f.state.currentMap = MAPS.find(map=>map.id === 0);
  Object.assign(f.state.player,f.state.currentMap.spawn);
  result = f.snapshot({type:"hq"});
  assert.equal(result.target.destinationReached,true);
  assert.equal(result.target.route,false);
});

test("station targets use the live station coordinates and route home before selecting a station", ()=>{
  const station = {id:"quests",x:123,y:456,title:"RELAIS DE QUETES"};
  const f = fixture({stations:[station]});
  const result = f.snapshot({type:"station",id:"quests"});
  assert.equal(result.target.name,"RELAIS DE QUETES");
  assert.equal(result.target.x,123);
  assert.equal(result.target.y,456);
  f.state.currentMap = MAPS.find(map=>map.id === 1);
  assert.equal(f.snapshot({type:"station",id:"quests"}).target.type,"portal");
  assert.equal(f.snapshot({type:"station",id:"quests"}).destinationMapId,0);
});

test("an explicit hunting map number routes to the pilot's sector before selecting enemies", ()=>{
  const f = fixture({firmId:"verte",mapId:0});
  f.state.enemies = [{id:"wrong-map",kind:"drone_pirate",hp:100,x:0,y:0}];
  const result = f.snapshot({type:"enemy",kinds:["drone_pirate"],mapNumber:2});
  assert.equal(result.target.type,"portal");
  assert.equal(result.destinationMapId,41);
  assert.equal(result.target.routeMapIds.at(-1),41);
});

test("a hunt allowed in sectors one and two keeps guiding remaining enemies after returning home for every firm",()=>{
  for(const firm of FIRMS){
    const f=fixture({firmId:firm.id,mapId:getFirmMapId(firm.id,2)});
    const target={type:"enemy",mapNumbers:[1,2],kinds:["raider_astral"],objectiveId:`yellow-${firm.id}`};
    f.state.enemies=[{id:"sector-two-vorak",kind:"raider_astral",hp:100,x:25,y:0}];
    const inSecond=f.snapshot(target);
    assert.equal(inSecond.target.type,"enemy");
    assert.equal(inSecond.destinationMapId,getFirmMapId(firm.id,2));
    f.state.currentMap=MAPS.find(map=>map.id===getFirmMapId(firm.id,1));
    f.state.enemies=[
      {id:"finished-kind",kind:"drone_pirate",hp:100,x:1,y:0},
      {id:"remaining-vorak",kind:"raider_astral",hp:100,x:80,y:0}
    ];
    const returned=f.snapshot(target);
    assert.equal(returned.destinationMapId,getFirmMapId(firm.id,1));
    assert.equal(returned.atDestinationMap,true);
    assert.equal(returned.target.type,"enemy");
    assert.equal(returned.target.id,"remaining-vorak");
    assert.equal(returned.target.route,false,"a completed sector visit must not force another portal crossing");
    assert.equal(f.snapshot({...target,kinds:[]}).target,null);
  }
});

test("allowed hunting sectors never select enemies in another firm and route through existing open portals",()=>{
  for(const firm of FIRMS){
    const other=FIRMS.find(candidate=>candidate.id!==firm.id);
    const f=fixture({firmId:firm.id,mapId:other.baseMapId});
    f.state.enemies=[{id:"wrong-firm-vorak",kind:"raider_astral",hp:100,x:0,y:0}];
    const result=f.snapshot({type:"enemy",firmId:other.id,mapNumbers:[1,2],kinds:["raider_astral"]});
    assert.equal(result.target.type,"portal");
    assert.equal(result.destinationMapId,firm.baseMapId);
    assert.equal(result.target.routeMapIds.at(-1),firm.baseMapId);
    assert.ok(f.state.currentMap.portals.some(portal=>portal.targetMap===result.target.nextMapId && !portal.closed && !portal.locked));
  }
  const f=fixture();
  f.state.enemies=[{id:"local",kind:"raider_astral",hp:100,x:1,y:0}];
  assert.equal(f.snapshot({type:"enemy",mapNumbers:[],kinds:["raider_astral"]}).target,null);
  assert.equal(f.snapshot({type:"enemy",mapNumbers:[21],kinds:["raider_astral"]}).target,null,
    "Astra sector 21 must not accidentally resolve to the numeric ID of Nereid-01");
});

test("a multi-sector hunt can use its second allowed destination when the preferred sector has no open route",()=>{
  const blocked={id:"blocked",x:10,y:0,targetMap:0,closed:true};
  const open={id:"open",x:100,y:0,targetMap:1};
  const maps=[
    {id:0,name:"Helion-01",portals:[]},
    {id:1,name:"Helion-02",portals:[]},
    {id:2,name:"Helion-03",portals:[blocked,open]}
  ];
  const f=fixture({maps,mapId:2});
  f.state.enemies=[{id:"outside-objective",kind:"raider_astral",hp:100,x:0,y:0}];
  const target={type:"enemy",mapNumbers:[1,2],kinds:["raider_astral"]};
  const result=f.snapshot(target);
  assert.equal(result.destinationMapId,1);
  assert.equal(result.target.id,"open");
  assert.deepEqual(result.target.routeMapIds,[2,1]);
  open.locked=true;
  assert.equal(f.snapshot(target).target,null,"do not invent a route or target enemies outside the quest zones");
});

test("routes handle map zero, cycles, closed exits, shortest paths and unreachable destinations", ()=>{
  const direct = {x:100,y:0,targetMap:0};
  const maps = [
    {id:0,name:"home",portals:[]},
    {id:1,portals:[{x:1,y:0,targetMap:2},direct]},
    {id:2,portals:[{x:0,y:0,targetMap:1},{x:0,y:0,targetMap:0}]},
    {id:3,portals:[]}
  ];
  assert.equal(findTutorialPortalRoute({currentMap:maps[1],destinationMapId:0,maps}).portal,direct);
  assert.equal(findTutorialPortalRoute({currentMap:maps[1],destinationMapId:3,maps}),null);
  direct.closed = true;
  assert.deepEqual(findTutorialPortalRoute({currentMap:maps[1],destinationMapId:0,maps}).mapIds,[1,2,0]);
});
