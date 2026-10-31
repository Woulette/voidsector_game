import assert from "node:assert/strict";
import test from "node:test";
import { getPreparedDungeonPortalForMap } from "../../src/game/systems/preparedDungeonPortal.js";
import { createGroupCommands } from "../../src/multiplayer/groupCommands.js";

test("prepared Astra portal accepts numeric map id zero", ()=>{
  const preparedPortal = {
    mapId:"0",
    portalId:"blue",
    portal:{id:"blue", name:"Le Seuil d'Azuron"},
    x:-3780,
    y:2780
  };

  const renderedPortal = getPreparedDungeonPortalForMap(preparedPortal, {
    id:0,
    name:"Helion-01"
  });

  assert.equal(renderedPortal?.portalId, "blue");
  assert.equal(renderedPortal?.prepared, true);
  assert.equal(renderedPortal?.dungeonPortal, true);
  assert.equal(renderedPortal?.x, -3780);
  assert.equal(renderedPortal?.y, 2780);
  assert.equal(getPreparedDungeonPortalForMap(preparedPortal, {id:1}), null);
});

test("leaving a group keeps the account-owned prepared portal", ()=>{
  const emitted = [];
  const preparedPortal = {mapId:"0", portalId:"blue"};
  const multiplayer = {
    connected:true,
    socket:{emit:(event, payload)=>emitted.push({event, payload})},
    auth:{account:{id:"account-1"}, profileReady:true},
    preparedPortal,
    serverEnemies:new Map(),
    serverEnemyDefinitions:new Map(),
    portalBeacons:[],
    rickyCinematicEvents:[]
  };
  const commands = createGroupCommands({
    multiplayer,
    toast(){},
    emitChange(){}
  });

  commands.leaveMultiplayerGroup();

  assert.equal(emitted[0]?.event, "group:leave");
  assert.equal(multiplayer.preparedPortal, preparedPortal);
});
