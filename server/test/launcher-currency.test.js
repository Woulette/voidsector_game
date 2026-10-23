import test from "node:test";
import assert from "node:assert/strict";
import { formatLauncherCurrency, updateLauncherCurrency } from "../../src/ui/launcherCurrency.js";

const space = "\u202f";
const grouped = value=>value.replaceAll(" ", space);

test("launcher balances keep every digit from zero to the maximum safe integer", ()=>{
  const examples = [
    [0, "0", "normal", 1],
    [228635, "228 635", "normal", 6],
    [100_000_000, "100 000 000", "normal", 9],
    [100_000_000_000, "100 000 000 000", "long", 12],
    [Number.MAX_SAFE_INTEGER, "9 007 199 254 740 991", "huge", 16]
  ];
  for(const [value, expected, size, digits] of examples){
    assert.deepEqual(formatLauncherCurrency(value), {
      text:grouped(expected), fullText:grouped(expected), digits, size
    });
  }
});

test("integer strings and bigint balances never lose precision through Number", ()=>{
  const expected = grouped("123 456 789 012 345 678 901");
  assert.equal(formatLauncherCurrency("123456789012345678901").text, expected);
  assert.equal(formatLauncherCurrency(123456789012345678901n).text, expected);
  assert.equal(formatLauncherCurrency("0000100000000000.99").text, grouped("100 000 000 000"));
});

test("missing or invalid balances have a readable zero fallback", ()=>{
  for(const value of [undefined, null, NaN, Infinity, -Infinity, -123, -10n, "invalid", "", "-1"]){
    assert.equal(formatLauncherCurrency(value).text, "0");
  }
  assert.equal(formatLauncherCurrency(228635.99).text, grouped("228 635"));
});

test("balance updates expose exact amount in visible text, tooltip and accessible name", ()=>{
  const attrs = new Map();
  const element = {
    dataset:{},
    setAttribute(name, value){ attrs.set(name, value); }
  };
  updateLauncherCurrency(element, 100_000_000_000, "crédits");
  assert.equal(element.textContent, grouped("100 000 000 000"));
  assert.equal(element.title, `${grouped("100 000 000 000")} crédits`);
  assert.equal(attrs.get("aria-label"), element.title);
  assert.deepEqual(element.dataset, {currencySize:"long", currencyDigits:"12"});

  // A later server correction must also restore the normal font size.
  updateLauncherCurrency(element, 228635, "NOVA");
  assert.equal(element.textContent, grouped("228 635"));
  assert.equal(element.title, `${grouped("228 635")} NOVA`);
  assert.equal(attrs.get("aria-label"), element.title);
  assert.deepEqual(element.dataset, {currencySize:"normal", currencyDigits:"6"});
});

test("a missing launcher element does not interrupt other profile rendering", ()=>{
  assert.equal(updateLauncherCurrency(null, 100_000_000, "crédits").text, grouped("100 000 000"));
});
