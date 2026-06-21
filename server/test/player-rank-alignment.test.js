import assert from "node:assert/strict";
import test from "node:test";
import { getFirmIconDrawY, getRankIconDrawY } from "../../src/game/render/player.js";

test("combat firm icon is vertically centered on the pilot name", ()=>{
  assert.equal(getFirmIconDrawY({firmIconSize:24, nameY:100}), 87);
});

test("combat rank alignment starts at Soldat d'elite", ()=>{
  const common = {
    iconSize:29,
    nameY:100,
    defaultY:81.5,
    visibleCenterRatio:.35
  };

  assert.equal(getRankIconDrawY({
    ...common,
    rankAssetPath:"assets/ranks/05_Soldat_spatial.svg"
  }), common.defaultY);

  assert.equal(getRankIconDrawY({
    ...common,
    rankAssetPath:"assets/ranks/06_Soldat_d_elite.svg"
  }), common.nameY - common.iconSize * common.visibleCenterRatio);
});

test("combat rank alignment follows each insignia visible center", ()=>{
  const nameY = 100;
  const iconSize = 29;
  const highChevronCenter = .35;
  const centeredBadgeCenter = .5;

  const highChevronY = getRankIconDrawY({
    rankAssetPath:"assets/ranks/08_Caporal-chef.svg",
    iconSize,
    nameY,
    defaultY:81.5,
    visibleCenterRatio:highChevronCenter
  });
  const centeredBadgeY = getRankIconDrawY({
    rankAssetPath:"assets/ranks/25_Marechal.svg",
    iconSize,
    nameY,
    defaultY:81.5,
    visibleCenterRatio:centeredBadgeCenter
  });

  assert.equal(highChevronY, nameY - iconSize * highChevronCenter);
  assert.equal(centeredBadgeY, nameY - iconSize * centeredBadgeCenter);
  assert.ok(highChevronY > centeredBadgeY);
});
