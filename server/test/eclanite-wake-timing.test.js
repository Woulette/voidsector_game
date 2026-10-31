import test from "node:test";
import assert from "node:assert/strict";
import {createCombatLoop} from "../../src/game/systems/combatLoop.js";
import {drawEnemies} from "../../src/game/render/entities.js";
import {ECLANITE_SOURCE} from "../../src/game/combatData/eclaniteVisuals.js";
import {replaceServerEnemies} from "../../src/multiplayer/socketState.js";
import {syncServerControlledEnemies} from "../../src/multiplayer/enemies.js";
import {createWorldEnemy,publicEnemy} from "../src/world/spawn.js";
import {WORLD_MAPS} from "../src/world/definitions.js";

const mineralPixels=new Uint8ClampedArray(512*512*4);
for(const [cx,cy] of [[256,280],[256,100],[380,200],[390,380],[256,430],[120,380],[120,200]]){
  for(let y=cy-10;y<cy+10;y++)for(let x=cx-8;x<cx+8;x++)mineralPixels.set([180,60,240,255],(y*512+x)*4);
}
function canvasContext(canvas){
  const ctx={canvas,globalAlpha:1,clouds:0,getImageData:()=>({data:mineralPixels}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},createRadialGradient:()=>({addColorStop(){}}),
    drawImage(image){if(image.width===64)this.clouds++;}};
  for(const name of ['transform','clearRect','save','restore','translate','scale','rotate','beginPath','arc','clip','closePath','moveTo','lineTo','ellipse','fill','stroke','fillRect'])ctx[name]=()=>{};
  return ctx;
}

for(const kind of ["eclanite"]){
  for(const [fps,limit] of [[30,0],[60,0],[120,0],[144,0],[240,0],[144,60],[240,60],[240,120]]){
    test(`${kind}: fixed-step loop and server interpolation emit vapor at ${fps} Hz${limit ? ` capped at ${limit} FPS` : ''}`, t=>{
      const original={performance:globalThis.performance,document:globalThis.document,
        requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame,
        setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval};
      try{
        let clock=100000,last=clock,nextFrame,simulationSeconds=0,nextPacketAt=0;
        let enemies=[],cloudDraws=0,maxClouds=0,lastClouds=0,simulationSteps=0,draws=0;
        globalThis.performance={now:()=>clock};
        globalThis.document={hidden:false,createElement(){const canvas={};canvas.getContext=()=>canvas.ctx??=canvasContext(canvas);return canvas;}};
        globalThis.requestAnimationFrame=callback=>{nextFrame=callback;return 1;};
        globalThis.cancelAnimationFrame=()=>{};globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};
        const map=WORLD_MAPS["0"],multiplayer={serverEnemies:new Map()};
        const serverEnemy=createWorldEnemy(map,0,()=>.5,kind);
        Object.assign(serverEnemy,{x:200,y:200,vx:60,vy:0,moving:true});
        const ctx=canvasContext({width:800,height:600});
        const cache={[ECLANITE_SOURCE]:{complete:true,naturalWidth:1024}};
        const loop=createCombatLoop({isRunning:()=>true,getLastTime:()=>last,setLastTime:value=>{last=value;},getFpsLimit:()=>limit,
          update:dt=>{
            simulationSteps++;simulationSeconds+=dt;
            serverEnemy.x=200+Math.min(3,simulationSeconds)*60;
            serverEnemy.vx=simulationSeconds<3 ? 60 : 0;serverEnemy.moving=simulationSeconds<3;
            if(simulationSeconds+1e-8>=nextPacketAt){
              replaceServerEnemies(multiplayer,{mapId:map.id,at:100000+simulationSeconds*1000,enemies:[publicEnemy(serverEnemy)]},"world");
              nextPacketAt+=.1;
            }
            enemies=syncServerControlledEnemies({enemies,multiplayerState:multiplayer,now:clock}).enemies;
          },
          draw:()=>{
            draws++;
            ctx.clouds=0;
            drawEnemies({ctx,camera:{x:0,y:0},cache,enemies,selectedEnemy:null});
            cloudDraws+=ctx.clouds;maxClouds=Math.max(maxClouds,ctx.clouds);lastClouds=ctx.clouds;
          }});
        loop.start(clock);
        for(let frame=1;frame<=fps*7;frame++){
          clock=100000+frame*1000/fps;const callback=nextFrame;callback(clock);
        }
        assert.equal(simulationSteps,420);
        assert.equal(enemies.length,1);assert(enemies[0].serverControlled);
        assert(enemies[0].x>379,'the real interpolator must have moved the Eclanite');
        assert(cloudDraws>0,`${fps} FPS lost every vapor emission between simulation steps`);
        assert(maxClouds<=64,'the per-Eclanite cloud budget remains bounded');
        assert.equal(lastClouds,0,'vapor must fully expire after the authoritative stop');
        t.diagnostic(`${simulationSteps} simulation steps, ${draws} draws, vapor drawn ${cloudDraws} times, max ${maxClouds} clouds`);
      }finally{Object.assign(globalThis,original);}
    });
  }
}

