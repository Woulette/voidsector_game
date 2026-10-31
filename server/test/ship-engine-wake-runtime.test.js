import test from "node:test";
import assert from "node:assert/strict";
import {ships} from "../../src/data/ships.js";
import {drawTexturedShipEngines,ENGINE_TEXTURE_PATH} from "../../src/game/render/shipEngines.js";
import {DEFAULT_ENGINE_PROFILE,SHIP_ENGINE_PROFILES} from "../../src/game/combatData/engineProfiles.js";

test("all nine ships draw the denser smoke through their native engines and fully evaporate after stopping",()=>{
  const previous={performance:globalThis.performance,document:globalThis.document};
  let now=1000;
  function context(canvas){
    const ctx={canvas,globalAlpha:1,clouds:0,
      getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},
      createRadialGradient:()=>({addColorStop(){}}),
      drawImage(image){if(image.width===96 && image.height===96)this.clouds++;}};
    for(const name of ['save','restore','translate','rotate','scale','fillRect'])ctx[name]=()=>{};
    return ctx;
  }
  globalThis.performance={now:()=>now};
  globalThis.document={createElement(){const canvas={};canvas.getContext=()=>canvas.ctx??=context(canvas);return canvas;}};
  try{
    const texture={complete:true,naturalWidth:512,naturalHeight:256},cache={[ENGINE_TEXTURE_PATH]:texture};
    for(const ship of ships){
      const ctx=context({width:800,height:600}),player={x:200,y:200,angle:Math.PI/2,enginePower:1,engineAngle:Math.PI/2,speed:300};
      const draw=()=>drawTexturedShipEngines({ctx,camera:{x:0,y:0},cache,player,ship,defaultProfile:DEFAULT_ENGINE_PROFILE,profiles:SHIP_ENGINE_PROFILES});
      for(let i=0;i<90;i++){now+=1000/60;player.x+=1.5;assert(draw());}
      assert(ctx.clouds>0,ship.id);assert(player.engineVfxState.tracks.every(track=>track.length>0),ship.id);
      const retained=player.engineVfxState.tracks[0][10],vx=retained.vx;
      player.angle+=.7;now+=1000/60;draw();assert.equal(retained.vx,vx);
      player.enginePower=0;
      for(let i=0;i<160;i++){now+=1000/60;draw();}
      assert(player.engineVfxState.tracks.every(track=>track.length===0),ship.id);
    }
  }finally{Object.assign(globalThis,previous);}
});
