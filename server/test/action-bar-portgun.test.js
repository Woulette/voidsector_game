import assert from "node:assert/strict";
import test from "node:test";
import { renderActionBarHtml } from "../../src/game/ui/actionBar.js";

test("Portgun action slot displays remaining teleportation fluid charges", ()=>{
  const portgun = {
    id:"pistou_portgun",
    name:"Pistou Portgun",
    short:"Portgun",
    img:"assets/items/pistou_portgun.png",
    effect:{portgun:true}
  };
  const html = renderActionBarHtml({
    slots:[portgun.id],
    slotKeybinds:["Digit1"],
    getAmmo:()=>null,
    getExtra:()=>null,
    getCpu:()=>null,
    getFormation:()=>null,
    getAmmoCount:()=>0,
    missileState:null,
    getSlotState:()=>({kind:"extra", item:portgun, available:true, usable:true, chargeCount:12})
  });

  assert.match(html, /slot-count">12</);
  assert.match(html, /slot-name">Portgun</);
});
