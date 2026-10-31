import test from "node:test";
import assert from "node:assert/strict";
import {getMapAssetPalette,getMapPaletteSource} from "../../src/shared/firmHomeMapThemes.js";
import {FIRM_SECTOR_THREE_ASSETS} from "../../src/game/combatData/firmSectorThreeAssets.js";
import {applyMapPalettePixels} from "../../src/game/render/mapAssetPalette.js";

test("the violet pocket cannot change opacity or extend beyond Helion's original ellipse",()=>{
  const width=123,height=97;
  const original=new Uint8ClampedArray(width*height*4);
  for(let i=0;i<original.length;i+=4)original.set([183,47,36,(i/4)%256],i);
  for(const assets of Object.values(FIRM_SECTOR_THREE_ASSETS)){
    const theme=getMapAssetPalette(assets.mainNebula),pocket=theme.sourcePocket;
    assert.deepEqual(pocket,{x:.57,y:.51,rx:.36,ry:.29});
    const plain=original.slice(),localized=original.slice();
    applyMapPalettePixels(plain,theme.hue,theme.hueRange);
    applyMapPalettePixels(localized,theme.hue,theme.hueRange,{width,height,pocket});
    let outside=0,centre=0;
    for(let i=0;i<localized.length;i+=4){
      assert.equal(localized[i+3],original[i+3]);
      const pixel=i/4,radius=Math.hypot(((pixel%width+.5)/width-.57)/.36,((Math.floor(pixel/width)+.5)/height-.51)/.29);
      if(radius>=1){assert.deepEqual(localized.slice(i,i+4),plain.slice(i,i+4));outside++;}
      if(radius<=.24){assert.deepEqual(localized.slice(i,i+4),original.slice(i,i+4));centre++;}
    }
    assert(outside>7000&&centre>100);
    assert.equal(getMapPaletteSource(assets.mainNebula),getMapPaletteSource(assets.nebula));
    assert.equal(getMapAssetPalette(assets.nebula).sourcePocket,undefined);
    assert.equal(getMapAssetPalette(assets.planet).sourcePocket,undefined);
  }
});
