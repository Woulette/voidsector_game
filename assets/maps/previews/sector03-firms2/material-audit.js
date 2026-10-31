import {getCachedCombatImage} from "/src/game/combatAssets.js";
import {getMapPaletteSource} from "/src/shared/firmHomeMapThemes.js";

async function image(cache,src){
  const loaded=getCachedCombatImage(cache,src);
  if(!loaded.complete)await new Promise((resolve,reject)=>{
    loaded.addEventListener("load",resolve,{once:true});
    loaded.addEventListener("error",reject,{once:true});
  });
  if(!cache[src]?.naturalWidth)throw Error("Missing image: "+src);
  return cache[src];
}
function pixels(img){
  const canvas=document.createElement("canvas");
  canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0);
  return ctx.getImageData(0,0,canvas.width,canvas.height);
}
function bounds(frame){
  let left=frame.width,top=frame.height,right=-1,bottom=-1;
  for(let pixel=0;pixel<frame.width*frame.height;pixel++)if(frame.data[pixel*4+3]>=128){
    const x=pixel%frame.width,y=Math.floor(pixel/frame.width);
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  return [left,top,right+1,bottom+1];
}

export async function auditSectorMaterials(maps){
  const reference=maps.find(map=>map.id===2).parallaxScene;
  const referenceLayers=[...reference.backdrops,...reference.images];
  const report={reference:"Helion-03",alphaMismatches:0,geometryMismatches:0,variants:[]};
  for(const map of maps.filter(map=>[22,32,42].includes(map.id))){
    const cache={},seen=new Set(),result={name:map.name,layers:0,textures:[]};
    const layers=[...map.parallaxScene.backdrops,...map.parallaxScene.images];
    for(let index=0;index<layers.length;index++){
      const layer=layers[index],original=referenceLayers[index];
      const {src,...settings}=layer,{src:referenceSrc,...referenceSettings}=original;
      if(JSON.stringify(settings)!==JSON.stringify(referenceSettings))report.geometryMismatches++;
      result.layers++;
      if(layer.kind==="star"||seen.has(src))continue;
      seen.add(src);
      if(getMapPaletteSource(src)!==referenceSrc)throw Error("Different silhouette: "+src);
      const a=pixels(await image(cache,referenceSrc)),b=pixels(await image(cache,src));
      if(a.width!==b.width||a.height!==b.height)throw Error("Different dimensions: "+src);
      let alphaMismatches=0;
      for(let i=3;i<a.data.length;i+=4)if(a.data[i]!==b.data[i])alphaMismatches++;
      report.alphaMismatches+=alphaMismatches;
      result.textures.push({kind:layer.kind,src,width:b.width,height:b.height,
        referenceBounds:bounds(a),variantBounds:bounds(b),alphaMismatches});
    }
    report.variants.push(result);
  }
  report.pass=!report.alphaMismatches&&!report.geometryMismatches;
  return report;
}
