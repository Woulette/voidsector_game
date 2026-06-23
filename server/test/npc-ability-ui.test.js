import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { renderNpcAbilityBarHtml } from "../../src/game/ui/npcAbilityBar.js";

test("Ricky support uses a compact dedicated NPC ability slot", ()=>{
  const html = renderNpcAbilityBarHtml({
    states:[{
      abilityId:"ricky_heal_beacon",
      ownerName:"Ricky",
      name:"Balise de soin",
      shortName:"BALISE",
      description:"Restaure la coque.",
      icon:"assets/icons/medical_cross.svg"
    }]
  });

  assert.match(html, /data-npc-ability-index="0"/);
  assert.match(html, />RICKY<\/span>/);
  assert.match(html, />BALISE<\/span>/);
  assert.match(html, /medical_cross\.svg/);
});

test("NPC ability bar renders up to three abilities", ()=>{
  const states = Array.from({length:4}, (_, index)=>({
    abilityId:`npc-ability-${index}`,
    ownerName:"Ricky",
    name:`Soutien ${index}`,
    icon:"assets/icons/medical_cross.svg"
  }));
  const html = renderNpcAbilityBarHtml({states});
  assert.equal((html.match(/class="npc-ability-slot"/g) || []).length, 3);
});

test("NPC and ship ability slots share their size and stay vertically separated", ()=>{
  const css = fs.readFileSync(new URL("../../src/styles/hangar.css", import.meta.url), "utf8");
  assert.match(css, /\.ship-ability-slot\{[^}]*width:58px;height:54px/);
  assert.match(css, /\.npc-ability-slot\{[^}]*width:58px;height:54px/);
  assert.match(css, /\.ship-ability-bar\{[^}]*bottom:114px/);
  assert.match(css, /\.npc-ability-bar\.above-ship-abilities\{bottom:174px\}/);
});
