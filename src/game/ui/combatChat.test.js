import test from "node:test";
import assert from "node:assert/strict";
import { isCombatChatOpen } from "./combatChat.js";

test("combat chat defaults to open for missing or legacy layout state", ()=>{
  assert.equal(isCombatChatOpen(), true);
  assert.equal(isCombatChatOpen({width:520, height:270}), true);
});

test("combat chat respects an explicit open preference", ()=>{
  assert.equal(isCombatChatOpen({open:true}), true);
  assert.equal(isCombatChatOpen({open:false}), false);
});
