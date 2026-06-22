import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("quest reward alignment does not alter monster reward layout", ()=>{
  const hud = fs.readFileSync(path.join(root, "src/game/ui/hud.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "src/styles/game.css"), "utf8");

  assert.match(hud, /loot\.questTitle \? "loot-line loot-line-quest" : "loot-line loot-line-combat"/);
  assert.match(hud, /const text = `\$\{part\.label\}\$\{part\.value \? ` \$\{part\.value\}` : ""\}`/);
  assert.match(css, /\.loot-line\{[^}]*width:350px[^}]*text-align:left/);
  assert.match(css, /\.loot-line div:nth-child\(3\)\{left:55px/);
  assert.match(css, /\.loot-line-combat\{position:relative;left:calc\(46% - 175px\)\}/);
  assert.match(css, /\.loot-line-quest\{[^}]*left:50%;transform:translateX\(-50%\)[^}]*justify-items:center/);
  assert.match(css, /\.loot-line-quest div\{[^}]*width:max-content[^}]*max-width:100%/);
  assert.match(css, /\.loot-line-quest div span\{display:block;text-align:center\}/);
});
