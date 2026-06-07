import assert from "node:assert/strict";
import test from "node:test";
import { getPlayerPvpBlockReason } from "../src/combat/playerPvp.js";

test("pvp blocks an attacker below level ten", ()=>{
  assert.equal(
    getPlayerPvpBlockReason({attackerLevel:9, targetLevel:20}),
    "Tu dois atteindre le niveau 10 pour attaquer un joueur."
  );
});

test("pvp protects a target below level ten", ()=>{
  assert.equal(
    getPlayerPvpBlockReason({attackerLevel:20, targetLevel:9}),
    "Ce joueur est protege jusqu'au niveau 10."
  );
});

test("pvp blocks group members and allows eligible opponents", ()=>{
  assert.equal(
    getPlayerPvpBlockReason({sameGroup:true, attackerLevel:20, targetLevel:20}),
    "Tir refuse sur membre du groupe."
  );
  assert.equal(getPlayerPvpBlockReason({attackerLevel:10, targetLevel:10}), "");
});
