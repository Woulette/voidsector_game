// Each machine keeps its own proportions while the workstation fills its panel.
export const REFINERY_STATION_ART = "assets/refinery/orbital-v3/station-cutout.png";
const SOURCE_WIDTH=1672,SOURCE_HEIGHT=941;
const rawSeparators=[
  [[95,229],[140,231],[180,231],[200,237],[220,240],[240,245],[260,249],[280,250],[300,250],[330,253],[378,269]],
  [[95,341],[140,343],[180,342],[200,348],[220,352],[240,357],[260,362],[280,362],[300,362],[330,363],[378,374]],
  [[95,452],[140,454],[180,453],[200,459],[220,464],[240,469],[260,475],[280,475],[300,474],[330,475],[378,483]],
  [[95,568],[140,570],[180,567],[200,572],[220,576],[240,581],[260,587],[280,587],[300,586],[330,587],[378,590]]
];
const rawClip=index=>{
  const top=index?rawSeparators[index-1]:[[95,100],[378,100]];
  const bottom=index===4?[[95,720],[378,720]]:rawSeparators[index];
  return 'M'+[...top,...[...bottom].reverse()].map(point=>point.join(' ')).join('L')+'Z';
};
const machines={
  cuivre_orbital:{family:"raw",crop:[100,119,278,134],x:16.5,y:13.5,clip:rawClip(0)},
  zinc_spatial:{family:"raw",crop:[100,237,278,126],x:16.5,y:30.5,clip:rawClip(1)},
  nickel_brut:{family:"raw",crop:[100,349,278,127],x:16.5,y:47.5,clip:rawClip(2)},
  titane_fissure:{family:"raw",crop:[100,460,278,128],x:16.5,y:64.5,clip:rawClip(3)},
  silice_conductrice:{family:"raw",crop:[100,575,278,140],x:16.5,y:81.5,clip:rawClip(4)},
  alliage_cuivre_zinc:{family:"middle",crop:[746,156,237,206],x:52,y:23.5},
  catalyseur_quantique:{family:"middle",crop:[745,370,237,175],x:52,y:49.5},
  plaque_nickel_titane:{family:"middle",crop:[741,550,235,176],x:52,y:75.5},
  conducteur_renforce:{family:"advanced",crop:[1068,144,240,271],x:73,y:28.5},
  blindage_composite:{family:"advanced",crop:[1067,449,240,207],x:73,y:65.5},
  noyau_astra:{family:"final",crop:[1410,357,211,205],x:91,y:48.5},
  storage:{family:"utility",crop:[402,698,337,182],x:33,y:88},
  transport:{family:"utility",crop:[870,720,420,162],x:71,y:89}
};
export const REFINERY_STATION_MODULES=Object.freeze(Object.fromEntries(
  Object.entries(machines).map(([id,module])=>[id,Object.freeze({id,...module})])
));
const size=pixels=>`calc(var(--station-unit) * ${pixels})`;
const at=(percent,pixels=0)=>`calc(${percent}% + var(--station-unit) * ${pixels})`;
const geometry=module=>machines[module.id];
export function refineryStationPosition(module){
  const {crop:[,,width,height],x,y}=geometry(module);
  return `--station-x:${at(x,-width/2)};--station-y:${at(y,-height/2)};--station-w:${size(width)};--station-h:${size(height)};--label-x:50%;--label-y:-3px;--label-shift:-50%`;
}
export function refineryStationLinkPlacement(source,target,index,inputCount){
  const a=geometry(source),b=geometry(target),x1=a.x,x2=b.x;
  const y1=a.y,y2=b.y+(index-(inputCount-1)/2)*2;
  const start=y1===y2?50:y1<y2?0:100,end=y1===y2?50:100-start;
  return {style:`left:${x1}%;top:${Math.min(y1,y2)}%;width:${x2-x1}%;height:max(1px,${Math.abs(y2-y1)}%)`,path:`M0,${start} C50,${start} 50,${end} 100,${end}`,arrowY:end};
}
const sourceImage=`<image href="${REFINERY_STATION_ART}" width="${SOURCE_WIDTH}" height="${SOURCE_HEIGHT}"></image>`;
function sprite(id){
  const {crop:[x,y,width,height],x:cx,y:cy,clip}=machines[id];
  const picture=clip?`<defs><clipPath id="rf-sprite-${id}"><path d="${clip}"></path></clipPath></defs><g clip-path="url(#rf-sprite-${id})">${sourceImage}</g>`:sourceImage;
  return `<svg class="rf-station-machine" data-station-machine="${id}" viewBox="${x} ${y} ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style="left:${at(cx,-width/2)};top:${at(cy,-height/2)};width:${size(width)};height:${size(height)}" data-refinery-key="art-machine:${id}">${picture}</svg>`;
}
function pipe(from,to,id){
  const down=(to.y-from.y)*7.6+to.dy-from.dy>=0;
  const start=down?0:100,end=100-start;
  const path=`M0,${start} C45,${start} 55,${end} 100,${end}`;
  const top=down?from:to;
  const dy=down?to.dy-from.dy:from.dy-to.dy;
  return `<svg class="rf-station-pipe" viewBox="0 0 100 100" preserveAspectRatio="none" style="left:${at(from.x,from.dx)};top:${at(top.y,top.dy)};width:${at(to.x-from.x,to.dx-from.dx)};height:max(1px,${at(Math.abs(to.y-from.y),dy)})" aria-hidden="true" data-refinery-key="art-pipe:${id}"><path class="rf-pipe-edge" d="${path}"></path><path class="rf-pipe-metal" d="${path}"></path><path class="rf-pipe-shadow" d="${path}"></path><path class="rf-pipe-ridge" d="${path}"></path><path class="rf-pipe-light" d="${path}"></path></svg>`;
}
const port=(id,x,y)=>{
  const m=machines[id], [left,top,width,height]=m.crop;
  return {x:m.x,y:m.y,dx:x-left-width/2,dy:y-top-height/2};
};
const towerPort=y=>({x:33,y:3+(y-50)/670*82,dx:0,dy:0});
export function refineryStationArtHtml(){
  const raw=Object.keys(machines).slice(0,5);
  const rawPorts=[218,317,430,537,640],towerPorts=[255,345,440,535,620];
  const pipes=[...raw.map((id,i)=>pipe(port(id,372,rawPorts[i]),towerPort(towerPorts[i]),`raw-${i}`)),
    pipe(towerPort(275),port('alliage_cuivre_zinc',753,275),'alloy'),
    pipe(towerPort(449),port('catalyseur_quantique',752,449),'catalyst'),
    pipe(towerPort(615),port('plaque_nickel_titane',750,615),'plate'),
    pipe(port('alliage_cuivre_zinc',977,307),port('conducteur_renforce',1074,306),'conductor'),
    pipe(port('plaque_nickel_titane',970,595),port('blindage_composite',1074,566),'armour'),
    pipe(port('conducteur_renforce',1300,322),port('noyau_astra',1414,425),'core-top'),
    pipe(port('blindage_composite',1299,556),port('noyau_astra',1414,484),'core-bottom'),
    pipe(port('storage',735,782),port('transport',877,775),'transport')].join('');
  const towerPath='M570 55 L608 55 L610 103 L655 113 L704 136 L704 177 L659 196 L631 205 L631 218 L659 227 L659 290 L642 305 L641 320 L641 381 L645 400 L646 429 L643 476 L642 496 L641 541 L641 568 L647 591 L650 640 L637 665 L611 676 L610 704 L620 717 L548 718 L549 679 L514 666 L502 642 L504 596 L510 577 L511 545 L511 511 L503 498 L501 435 L504 411 L511 398 L511 371 L505 356 L498 322 L499 307 L500 280 L498 242 L499 227 L531 217 L539 202 L515 196 L470 179 L466 146 L494 132 L548 116 L565 105 Z';
  return `<div class="rf-station-art" role="img" aria-label="Station orbitale complète, collecteurs à gauche, Alliage, Catalyseur et Plaque au centre, Conducteur et Blindage à droite, Noyau Astra à l’extrémité, Stockage et Transport en bas" data-refinery-key="station-art">${pipes}<svg class="rf-station-tower" viewBox="465 50 245 670" preserveAspectRatio="none" aria-hidden="true" style="left:${at(33,-122.5)};top:3%;width:${size(245)};height:82%"><defs><clipPath id="rf-station-tower-clip"><path d="${towerPath}"></path></clipPath></defs><g clip-path="url(#rf-station-tower-clip)">${sourceImage}</g></svg>${Object.keys(machines).map(sprite).join('')}</div>`;
}
