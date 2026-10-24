import assert from "node:assert/strict";
import test from "node:test";
import { creditCurrencyPacks, novaCurrencyPacks } from "../../src/data/premium.js";
import { getCurrencyPackBonusPercent, renderCurrencyStore } from "../../src/ui/supportStorePanels.js";

const pack = (amount,price = "1,99 EUR")=>({amount,price});
const articles = html=>[...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)].map(match=>match[1]);
const text = html=>html.replace(/<[^>]*>/g, " ").replace(/\s+/g," ").trim();

test("NOVA offers compare their actual quantity per euro with the 1.99 reference", ()=>{
  assert.deepEqual(novaCurrencyPacks.map(offer=>getCurrencyPackBonusPercent(offer,novaCurrencyPacks[0])),[
    0,13.9,24.1,36.5,42.1,50.6
  ]);
});

test("credit comparisons preserve the real slightly lower value of the 5.99 offer", ()=>{
  assert.deepEqual(creditCurrencyPacks.map(offer=>getCurrencyPackBonusPercent(offer,creditCurrencyPacks[0])),[
    0,-0.4,26.7,19.4,27.3,31.3
  ]);
  // Three times the reference quantity costs 5.99 rather than 5.97.
  assert.equal(getCurrencyPackBonusPercent(pack(300,"5,99 EUR"),pack(100)), -0.4);
});

test("computed gains retain precision without overstating either sign or exact boundaries", ()=>{
  const reference = pack(10000);
  assert.equal(getCurrencyPackBonusPercent(pack(11099),reference),10.9);
  assert.equal(getCurrencyPackBonusPercent(pack(11000),reference),10);
  assert.equal(getCurrencyPackBonusPercent(pack(10999),reference),9.9);
  assert.equal(getCurrencyPackBonusPercent(pack(9999),reference),-0.1);
  assert.equal(getCurrencyPackBonusPercent(pack(9990),reference),-0.1);
  assert.equal(getCurrencyPackBonusPercent(pack(9989),reference),-0.2);
  assert.equal(getCurrencyPackBonusPercent(reference,reference),0);
});

test("the comparison uses integer cents and never modifies offers", ()=>{
  const reference = Object.freeze(pack(100,"0,10 EUR"));
  const offer = Object.freeze(pack(330,"0.30 €"));
  assert.equal(getCurrencyPackBonusPercent(offer,reference),10);
  assert.deepEqual(offer,{amount:330,price:"0.30 €"});
  for(const invalid of [pack(0),pack(-10),pack(3.5),pack(100,"0,00 EUR"),pack(100,"gratuit"),null]){
    assert.equal(getCurrencyPackBonusPercent(invalid,reference),null);
    assert.equal(getCurrencyPackBonusPercent(offer,invalid),null);
  }
});

test("the requested highlights stay attached to 24.99 and 99.99 in both currencies", ()=>{
  for(const currency of ["nova","credits"]){
    const cards = articles(renderCurrencyStore({currency}));
    assert.equal(cards.length,6);
    assert.equal(cards.filter(card=>card.includes("Le plus populaire")).length,1);
    assert.equal(cards.filter(card=>card.includes("Le plus rentable")).length,1);
    assert.match(cards[3],/Le plus populaire/);
    assert.match(cards[3],/24,99 €/);
    assert.match(cards[5],/Le plus rentable/);
    assert.match(cards[5],/99,99 €/);
  }
});

test("currency cards keep full quantities and expose the reference and honest rate labels", ()=>{
  const nova = renderCurrencyStore();
  const credits = renderCurrencyStore({currency:"credits"});
  for(const html of [nova,credits]){
    assert.equal((html.match(/class="sc-currency-value /g) || []).length,6);
    assert.match(text(html),/Rendement par euro comparé au pack à 1,99 €/);
    assert.match(html,/arrondi à l’entier inférieur/);
    assert.match(text(html),/Référence · 0 %/);
  }
  assert.match(text(nova),/\+50 % par €/);
  assert.match(credits,/sc-currency-value is-lower-value/);
  assert.match(text(credits),/−1 % par €/);
  for(const html of [nova,credits]){
    const labels = [...html.matchAll(/<small class="sc-currency-value [^"]*"[^>]*>([^<]+)<\/small>/g)].map(match=>match[1]);
    assert.equal(labels.length,6);
    assert.ok(labels.every(label=>!/[,.]/.test(label)));
    assert.equal((html.match(/class="sc-currency-amount"/g) || []).length,6);
  }
  for(const amount of [160000000,330000000]){
    assert.ok(text(credits).replace(/\s/g,"").includes(String(amount)),String(amount));
  }
});
