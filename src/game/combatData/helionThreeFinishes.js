// Fixed scene lighting: camera movement never changes a rock's material.
function rockLighting(layer,index){
  const x=layer.x*layer.p,y=layer.y*layer.p;
  if(Math.hypot((x-800)/900,(y+200)/800)<1 && index%3!==0)return "violet";
  return index%2===0 ? "copper" : "neutral";
}

const shardPlacements=[
  {x:180,y:-235,w:30,p:.055,rotation:-.30,asset:"splinter"},
  {x:360,y:-135,w:34,p:.060,rotation:-.90,asset:"flake"},
  {x:545,y:-200,w:24,p:.065,rotation:.40,asset:"splinter"},
  {x:440,y:125,w:27,p:.058,rotation:.90,asset:"flake"},
  {x:245,y:220,w:20,p:.055,rotation:1.50,asset:"flake"},
  {x:660,y:40,w:18,p:.060,rotation:-.50,asset:"splinter"}
];
const depositPlacements=[{x:3550,y:-1400,w:42,rotation:-.34},{x:1800,y:1050,w:34,rotation:1.1}];

export function finishHelionThreeScene(scene,assets){
  let rockIndex=0,shardIndex=0,depositIndex=0;
  const images=scene.images.map(layer=>{
    if(layer.kind==="asteroid"){
      const lighting=rockLighting(layer,rockIndex++);
      if(lighting==="neutral")return layer;
      const brightness=layer.p<.5?.59:layer.p>=.8?.66:.64;
      return {...layer,src:assets[lighting],alpha:1,
        filter:`brightness(${brightness}) saturate(${lighting==="violet"?.62:.70})`};
    }
    if(layer.kind==="eclanite-shard"){
      const spec=shardPlacements[shardIndex++];
      return {...layer,src:assets[spec.asset],x:spec.x/spec.p,y:spec.y/spec.p,
        w:spec.w,h:spec.w,p:spec.p,rotation:spec.rotation,alpha:1,
        blend:"source-over",filter:"brightness(1.16) saturate(.90)"};
    }
    if(layer.kind==="crystal"){
      const spec=depositPlacements[depositIndex++];
      return {...layer,...spec,h:spec.w,src:assets.crystalOutcrop,
        alpha:1,filter:"brightness(.85) saturate(.80)"};
    }
    return layer;
  });
  const halos=images.filter(layer=>layer.kind==="eclanite-shard").map(layer=>({
    kind:"shard-halo",effect:"backgroundAsteroids",space:layer.space,x:layer.x,y:layer.y,p:layer.p,
    r:layer.w*1.35,alpha:.22,static:true,point:false,
    colors:{core:"216,192,242",hot:"171,116,214",mid:"112,65,161",haze:"64,30,97"}
  }));
  // Keep solid dark faces beneath the emissive pass, which reveals the native cracks.
  const litImages=images.flatMap(layer=>layer.kind==="eclanite-shard"
    ? [layer,{...layer,kind:"eclanite-emission",blend:"screen",alpha:.55,
      filter:"contrast(2) brightness(1.35) saturate(.95)"}]
    : [layer]);
  return {...scene,
    images:litImages.sort((a,b)=>a.p-b.p),
    backdrops:scene.backdrops.map(layer=>layer.kind==="violet-gas"
      ? {...layer,lightPulse:{period:20,amplitude:.04}}:layer),
    starLights:[...scene.starLights,...halos]
  };
}
