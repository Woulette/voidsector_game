import assert from "node:assert/strict";
import test from "node:test";
import { createEquipmentLocationManager } from "../src/players/equipmentLocation.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";
import { createProfileWorldSession } from "../src/players/profileWorldSession.js";

function createManager(){
  return createEquipmentLocationManager({
    io:{sockets:{sockets:new Map()}},
    players:new Map(),
    profileManager:{},
    setPlayerMap(){}
  });
}

test("a never-used ship starts at its base maximum hp", ()=>{
  const {buildFirmSpawnSession} = createManager();
  const session = buildFirmSpawnSession({shipId:"velox", firmId:"astra"});

  assert.equal(session.hp, 15000);
  assert.equal(session.maxHp, 15000);
});

test("switching back to a ship restores its saved hp", ()=>{
  const {buildFirmSpawnSession} = createManager();
  const session = buildFirmSpawnSession({
    shipId:"velox",
    firmId:"astra",
    savedSession:{
      shipId:"velox",
      hp:5000,
      maxHp:15000,
      shield:120,
      maxShield:500
    }
  });

  assert.equal(session.hp, 5000);
  assert.equal(session.maxHp, 15000);
  assert.equal(session.shield, 120);
  assert.equal(session.maxShield, 500);
});

test("ship sessions survive profile sanitization", ()=>{
  const profile = sanitizeProfile({
    shipWorldSessions:{
      velox:{mapId:"0", x:0, y:0, hp:5000, maxHp:15000, shield:0, maxShield:0, shipId:"velox"}
    }
  });

  assert.equal(profile.shipWorldSessions.velox.hp, 5000);
  assert.equal(profile.shipWorldSessions.velox.shipId, "velox");
});

test("saving a ship session keeps other ships isolated and bumps the profile version", ()=>{
  let persisted = 0;
  const profiles = new Map([["Pilot", sanitizeProfile({
    updatedAt:1,
    activeShip:"velox",
    selectedShip:"velox",
    ownedShips:["velox", "astralis"],
    shipWorldSessions:{
      astralis:{mapId:"0", x:-4300, y:3300, hp:900, maxHp:70000, shield:0, maxShield:0, shipId:"astralis", updatedAt:1}
    }
  })]]);
  const manager = createProfileWorldSession({
    profiles,
    persist(){ persisted += 1; },
    getExistingProfile(){ return {key:"Pilot", profile:profiles.get("Pilot")}; }
  });

  const next = manager.saveWorldSession({
    player:{name:"Pilot"},
    state:{mapId:"0", x:-4300, y:3300, hp:3000, maxHp:15000, shield:0, maxShield:0, shipId:"velox"},
    force:true
  });

  assert.equal(persisted, 1);
  assert.ok(next.updatedAt > 1);
  assert.equal(next.shipWorldSessions.velox.hp, 3000);
  assert.equal(next.shipWorldSessions.velox.maxHp, 15000);
  assert.equal(next.shipWorldSessions.astralis.hp, 900);
  assert.equal(next.shipWorldSessions.astralis.maxHp, 70000);
});
