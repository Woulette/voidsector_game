import * as THREE from "../../../vendor/three-r187/three.module.js";
import { GLTFLoader } from "../../../vendor/three-r187/GLTFLoader.js";
import { RoomEnvironment } from "../../../vendor/three-r187/RoomEnvironment.js";
import { WORLD_MODELS_3D } from "../../data/worldModels3d.js";
import { advanceShipFlightMotion, getShipFlightPose } from "./ship3dProjection.js";
import { configureWorld3dCamera, worldPointToScene } from "./world3dProjection.js";
import { projectMapSceneryLayer } from "./mapSceneryProjection.js?v=20261018-helion-depth1";
import { sampleWorld3dBeam } from "./world3dBeams.js";

const planetVertex = `varying vec3 vNormal;varying vec3 vPoint;
  void main(){vNormal=normalize(mat3(modelMatrix)*normal);vPoint=position;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const planetFragment = `varying vec3 vNormal;varying vec3 vPoint;
  float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){float a=.5,v=0.0;for(int i=0;i<5;i++){v+=noise(p)*a;p=p*2.07+vec3(11.7,3.1,9.2);a*=.5;}return v;}
  void main(){vec3 p=normalize(vPoint);float terrain=fbm(p*7.0);
    vec3 dark=vec3(.045,.009,.018),rust=vec3(.43,.075,.035),sand=vec3(.74,.25,.075);
    vec3 albedo=mix(dark,rust,smoothstep(.3,.64,terrain));albedo=mix(albedo,sand,smoothstep(.59,.78,terrain));
    float cloud=fbm(p*19.0+vec3(3.0));albedo+=vec3(.12,.065,.045)*smoothstep(.62,.77,cloud);
    float day=max(0.0,dot(normalize(vNormal),normalize(vec3(-.65,.8,.6))));
    vec3 color=albedo*(.10+day*1.8);color+=vec3(.35,.025,.004)*pow(max(0.0,.42-terrain),3.0)*8.0;
    gl_FragColor=vec4(color,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function seedRandom(seed){return ()=>{seed = (seed * 1664525 + 1013904223) >>> 0;return seed / 4294967296;};}
function positionAt(object,x,y,height=0){const p=worldPointToScene({x,y,height});object.position.set(p.x,p.y,p.z);}

export function createWorld3dRenderer(){
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});
  renderer.setPixelRatio(1);renderer.setClearColor(0x05040b,1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;renderer.toneMappingExposure = .95;
  const surface = renderer.domElement;
  surface.setAttribute("aria-hidden","true");surface.dataset.sector3d = "true";
  Object.assign(surface.style,{position:"absolute",inset:"0",width:"100%",height:"100%",pointerEvents:"none",zIndex:"0"});
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1,1,1,-1,.1,30000);
  const pmrem = new THREE.PMREMGenerator(renderer),room = new RoomEnvironment();
  const environment = pmrem.fromScene(room,.04);scene.environment = environment.texture;scene.environmentIntensity = .85;
  room.dispose();pmrem.dispose();
  const key = new THREE.DirectionalLight(0xffebdb,1.8);key.position.set(-3000,5000,-2000);
  const fill = new THREE.DirectionalLight(0x7fcfff,.9);fill.position.set(3000,2000,3000);
  scene.add(key,fill,new THREE.HemisphereLight(0xcbdfff,0x20151f,.7));
  const loader = new GLTFLoader(),textureLoader = new THREE.TextureLoader();
  const models = new Map(),actors = new Map(),sharedResources = new WeakSet();
  const beamGeometry = new THREE.CylinderGeometry(1,1,1,8,1,true);
  const beamCore = new THREE.InstancedMesh(beamGeometry,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}),256);
  const beamGlow = new THREE.InstancedMesh(beamGeometry,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.34,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}),256);
  beamCore.frustumCulled=beamGlow.frustumCulled=false;beamCore.count=beamGlow.count=0;
  beamCore.instanceMatrix.setUsage(THREE.DynamicDrawUsage);beamGlow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(beamGlow,beamCore);
  let frameBeams=[];
  const matrix = new THREE.Object3D();
  let lost = false,canvas = null,previousBackground = "",view = null,frame = 0,map = null;
  let pixelWidth = 0,pixelHeight = 0,decor = null;
  surface.addEventListener("webglcontextlost",event=>{event.preventDefault();lost=true;});
  surface.addEventListener("webglcontextrestored",()=>{lost=false;});

  function loadModel(id){
    if(models.has(id)) return models.get(id);
    const entry = {status:"loading",template:null};models.set(id,entry);
    const definition = WORLD_MODELS_3D[id];
    loader.load(definition.url,gltf=>{
      const asset = gltf.scene,bounds = new THREE.Box3().setFromObject(asset);
      const dimensions = bounds.getSize(new THREE.Vector3()),center = bounds.getCenter(new THREE.Vector3());
      const scale = Number(definition.displayScale || 1) / Math.max(dimensions.x,dimensions.z);
      asset.position.sub(center);
      const normalized = new THREE.Group();normalized.add(asset);normalized.scale.setScalar(scale);
      const bank = new THREE.Group();bank.add(normalized);
      const yaw = new THREE.Group();yaw.add(bank);
      asset.traverse(object=>{
        if(!object.isMesh) return;
        sharedResources.add(object.geometry);
        for(const material of Array.isArray(object.material) ? object.material : [object.material]){
          sharedResources.add(material);
          if(material.normalScale) material.normalScale.multiplyScalar(.65);
          for(const channel of ["map","normalMap","metalnessMap","roughnessMap"]){
            if(material[channel]) material[channel].anisotropy = Math.min(4,renderer.capabilities.getMaxAnisotropy());
          }
        }
      });
      entry.template = yaw;entry.status = "ready";
    },undefined,error=>{
      entry.status = "error";
      console.warn(`[Avosoma] Modèle du secteur indisponible : ${id}.`,error);
    });
    return entry;
  }

  function buildDecor(currentMap,stations,portals){
    const root = new THREE.Group();scene.add(root);
    const layers = [...(currentMap.parallaxScene?.backdrops || []),...(currentMap.parallaxScene?.images || [])];
    const sprites = [];
    for(const layer of layers){
      if(layer.kind === "planet" || layer.kind === "asteroid") continue;
      if(!layer.src) continue;
      const texture = textureLoader.load(layer.src);texture.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(layer.w,layer.h),new THREE.MeshBasicMaterial({
        map:texture,transparent:true,opacity:layer.alpha ?? 1,depthWrite:false,
        blending:layer.blend === "screen" ? THREE.AdditiveBlending : THREE.NormalBlending
      }));
      root.add(mesh);sprites.push({mesh,layer});
    }
    const planetLayer = layers.find(layer=>layer.kind === "planet");
    let planet = null;
    if(planetLayer){
      planet = new THREE.Mesh(new THREE.SphereGeometry(planetLayer.w/2,64,40),new THREE.ShaderMaterial({vertexShader:planetVertex,fragmentShader:planetFragment}));
      root.add(planet);
    }
    const rocks = layers.filter(layer=>layer.kind === "asteroid");
    const rockGeometry = new THREE.IcosahedronGeometry(1,2);
    const random = seedRandom(71031),vertices=rockGeometry.attributes.position;
    for(let i=0;i<vertices.count;i++){
      const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i);
      const scale=.84+.17*Math.sin(x*9+y*7+z*11);
      vertices.setXYZ(i,x*scale,y*scale,z*scale);
    }
    rockGeometry.computeVertexNormals();
    const grain = new Uint8Array(64*64*4);
    for(let i=0;i<64*64;i++){
      const value=Math.round(80+random()*140);
      grain.set([value,value,value,255],i*4);
    }
    const bump = new THREE.DataTexture(grain,64,64);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.needsUpdate=true;
    const rockMaterial = new THREE.MeshStandardMaterial({color:0x3b3230,roughness:.94,metalness:.08,bumpMap:bump,bumpScale:.045,envMapIntensity:.25});
    const asteroids = new THREE.InstancedMesh(rockGeometry,rockMaterial,Math.max(1,rocks.length));
    asteroids.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    asteroids.frustumCulled = false;
    const rockStates = rocks.map(layer=>({layer,angle:random()*Math.PI*2,scale:.65+random()*.6}));
    root.add(asteroids);
    const starPositions = new Float32Array(1000*3),starColors = new Float32Array(1000*3);
    for(let i=0;i<1000;i++){
      starPositions[i*3]=(random()-.5)*15000;starPositions[i*3+1]=0;starPositions[i*3+2]=(random()-.5)*15000;
      const value=.25+random()*.65;starColors.set([value*.8,value*.86,value],i*3);
    }
    const starsGeometry = new THREE.BufferGeometry();starsGeometry.setAttribute("position",new THREE.BufferAttribute(starPositions,3));starsGeometry.setAttribute("color",new THREE.BufferAttribute(starColors,3));
    const stars = new THREE.Points(starsGeometry,new THREE.PointsMaterial({size:1.3,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.7,depthWrite:false}));root.add(stars);
    const hub = new THREE.Group();root.add(hub);
    const placeholder = new THREE.Mesh(new THREE.TorusGeometry(.43,.05,8,64),new THREE.MeshStandardMaterial({color:0x4e535d,roughness:.6,metalness:.75}));
    placeholder.rotation.x=-Math.PI/2;hub.add(placeholder);hub.scale.setScalar(currentMap.spawn.visual?.width || 1100);
    const hubPoint = currentMap.spawn.visual || currentMap.spawn;positionAt(hub,hubPoint.x,hubPoint.y,-70);
    const stationNodes = stations.map(station=>{
      const group = new THREE.Group();root.add(group);positionAt(group,station.x,station.y,0);
      const metal = new THREE.MeshStandardMaterial({color:0x444b57,metalness:.65,roughness:.55});
      const body = new THREE.Mesh(new THREE.CylinderGeometry(75,110,65,12),metal);group.add(body);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(20,30,95,8),metal);tower.position.y=80;group.add(tower);
      const light = new THREE.Mesh(new THREE.TorusGeometry(74,3,6,40),new THREE.MeshBasicMaterial({color:station.id === "quests" ? 0x7edce9 : 0xf1b66a}));
      light.rotation.x=Math.PI/2;light.position.y=40;group.add(light);
      for(let i=0;i<4;i++){
        const panel = new THREE.Mesh(new THREE.BoxGeometry(60,5,32),metal);panel.position.set(Math.cos(i*Math.PI/2)*118,10,Math.sin(i*Math.PI/2)*118);panel.rotation.y=-i*Math.PI/2;group.add(panel);
      }
      return {group,station,loaded:false};
    });
    const portalNodes = createPortalNodes(root,portals);
    return {root,sprites,planet,planetLayer,asteroids,rockStates,stars,hub,hubLoaded:false,stationNodes,portalNodes,portalSignature:portalSignature(portals)};
  }

  function disposeDecor(root){
    root.traverse(object=>{
      if(object.geometry && !sharedResources.has(object.geometry)) object.geometry.dispose();
      for(const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []){
        if(sharedResources.has(material)) continue;
        for(const texture of Object.values(material)) if(texture?.isTexture) texture.dispose();
        material.dispose();
      }
    });
  }

  function portalSignature(portals){
    return JSON.stringify(portals.map(({x,y,r,closed,prepared,azuronGate,rickyPortal})=>[x,y,r,closed,prepared,azuronGate,rickyPortal]));
  }

  function createPortalNodes(root,portals){
    return portals.filter(portal=>!portal.prepared && !portal.azuronGate).map(portal=>{
      const group=new THREE.Group();positionAt(group,portal.x,portal.y);root.add(group);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(portal.r || 95,9,10,64),new THREE.MeshStandardMaterial({color:portal.closed ? 0x3f282c : 0x314154,metalness:.8,roughness:.3}));group.add(ring);
      const glow=new THREE.Mesh(new THREE.TorusGeometry((portal.r || 95)-8,2.5,6,64),new THREE.MeshBasicMaterial({color:portal.closed ? 0x913d46 : portal.rickyPortal ? 0x95fb87 : 0x68cce7}));group.add(glow);
      const inner = new THREE.Mesh(new THREE.CircleGeometry((portal.r || 95)-12,48),new THREE.MeshBasicMaterial({color:portal.closed ? 0x401923 : 0x153c75,transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false}));group.add(inner);
      return {group,inner};
    });
  }

  function updateDecor(){
    const zoom=view.camera.zoom || 1,width=view.width/zoom,height=view.height/zoom;
    const projection = layer=>projectMapSceneryLayer({layer,camera:view.camera,viewWidth:width,viewHeight:height,defaultParallax:.1});
    for(const {mesh,layer} of decor.sprites){
      const point=projection(layer);positionAt(mesh,view.camera.x+point.x,view.camera.y+point.y,-6200+Number(layer.p || .1)*4200);
      mesh.quaternion.copy(camera.quaternion);mesh.rotateZ(-Number(layer.rotation || 0));
      mesh.visible = !layer.effect || view.graphicsEffects[layer.effect] !== false;
    }
    if(decor.planet){
      const point=projection(decor.planetLayer);positionAt(decor.planet,view.camera.x+point.x,view.camera.y+point.y,-4200);
      decor.planet.rotation.y=performance.now()/150000;
    }
    decor.rockStates.forEach(({layer,angle,scale},index)=>{
      const point=projection(layer),p=worldPointToScene({x:view.camera.x+point.x,y:view.camera.y+point.y,height:-2100+layer.p*2000});
      matrix.position.set(p.x,p.y,p.z);matrix.rotation.set(angle,angle*.7+performance.now()/120000,angle*.3);matrix.scale.set(layer.w*.5,layer.w*.42*scale,layer.w*.5);matrix.updateMatrix();
      decor.asteroids.setMatrixAt(index,matrix.matrix);
    });
    decor.asteroids.instanceMatrix.needsUpdate=true;decor.asteroids.visible=view.graphicsEffects.backgroundAsteroids !== false;
    positionAt(decor.stars,view.camera.x*.98+width/2,view.camera.y*.98+height/2,-7000);
    const headquarters=loadModel("headquarters");
    if(headquarters.status === "ready" && !decor.hubLoaded){
      decor.hub.clear();decor.hub.add(headquarters.template.clone(true));decor.hubLoaded=true;
    }
    for(const node of decor.stationNodes){
      const entry=loadModel(node.station.id);
      if(entry.status === "ready" && !node.loaded){
        node.group.clear();node.group.add(entry.template.clone(true));
        node.group.scale.setScalar(node.station.assetWidth || 350);node.loaded=true;
      }
    }
    for(const {inner} of decor.portalNodes) inner.material.opacity=.25+Math.sin(performance.now()/550)*.06;
  }

  function begin(options){
    view=options;frame++;
    if(canvas !== options.canvas){
      hide();canvas=options.canvas;previousBackground=canvas.style.background;
      canvas.parentElement.insertBefore(surface,canvas);
      canvas.style.position="relative";canvas.style.zIndex="1";
    }
    canvas.style.background="transparent";surface.style.display="block";
    const ratio=Math.min(2,Math.max(1,options.dpr || 1));
    const w=Math.round(options.width*ratio),h=Math.round(options.height*ratio);
    if(w !== pixelWidth || h !== pixelHeight){renderer.setSize(w,h,false);pixelWidth=w;pixelHeight=h;}
    configureWorld3dCamera(camera,{x:options.camera.x,y:options.camera.y,zoom:options.camera.zoom || 1,width:options.width,height:options.height});
    if(map !== options.currentMap){
      if(decor){
        scene.remove(decor.root);
        disposeDecor(decor.root);
      }
      map=options.currentMap;decor=buildDecor(map,options.stations,options.portals);
      if(WORLD_MODELS_3D.drone_pirate.enabled !== false) loadModel("drone_pirate");
      loadModel("raider_astral");
    }
    const signature=portalSignature(options.portals);
    if(signature !== decor.portalSignature){
      for(const {group} of decor.portalNodes){decor.root.remove(group);disposeDecor(group);}
      decor.portalNodes=createPortalNodes(decor.root,options.portals);decor.portalSignature=signature;
    }
    for(const actor of actors.values()) actor.object.visible=false;
    frameBeams=[];beamCore.count=beamGlow.count=0;
    updateDecor();canvas.dataset.world3d="ready";
  }

  function enqueueShip({key:actorKey,template,position,size,pose,steeringAngle=pose.angle}){
    let actor=actors.get(actorKey);
    if(!actor || actor.template !== template){
      if(actor) scene.remove(actor.object);
      actor={template,object:template.clone(true),motion:{}};actors.set(actorKey,actor);scene.add(actor.object);
    }
    actor.lastFrame=frame;actor.object.visible=true;
    actor.position=position;actor.pose=pose;actor.steeringAngle=steeringAngle;
    positionAt(actor.object,position.x,position.y);
    actor.object.scale.setScalar(size);actor.object.rotation.y=pose.yaw;
    actor.object.children[0].rotation.set(pose.pitch,0,pose.roll);
  }

  function enqueueEnemy({enemy,position,size,angle}){
    const definition=WORLD_MODELS_3D[enemy.kind];
    if(!definition || definition.enabled === false) return false;
    const entry=loadModel(enemy.kind);
    if(entry.status !== "ready") return false;
    const actorKey=`enemy:${enemy.id}`;
    const motion=actors.get(actorKey)?.motion || {};
    advanceShipFlightMotion(motion,angle,performance.now()/1000);
    const pose=getShipFlightPose({angle:motion.angle,roll:motion.roll});
    enqueueShip({key:actorKey,template:entry.template,position,size,pose,steeringAngle:angle});
    actors.get(actorKey).motion=motion;actors.get(actorKey).targetId=enemy.id;
    return true;
  }

  function enqueueBeams(beams){
    const accepted=new Set();
    for(const beam of beams){
      if(frameBeams.length>=256 || !sampleWorld3dBeam(beam)) continue;
      frameBeams.push(beam);accepted.add(beam);
    }
    return accepted;
  }

  const beamStart=new THREE.Vector3(),beamEnd=new THREE.Vector3(),beamDirection=new THREE.Vector3();
  const beamHead=new THREE.Vector3(),beamTail=new THREE.Vector3(),beamUp=new THREE.Vector3(0,1,0);
  const beamColor=new THREE.Color();
  const beamBankEuler=new THREE.Euler(),beamYawEuler=new THREE.Euler();
  function setBeamColor(instances,index,css,fade){
    const values=String(css || "rgb(255,255,255)").match(/[\d.]+/g) || [255,255,255];
    beamColor.setRGB(Number(values[0])/255,Number(values[1])/255,Number(values[2])/255,THREE.SRGBColorSpace).multiplyScalar(fade);
    instances.setColorAt(index,beamColor);
  }
  function updateBeams(){
    let index=0;
    for(const beam of frameBeams){
      const sampled=sampleWorld3dBeam(beam);
      if(!sampled) continue;
      const start=worldPointToScene({x:beam.fromX,y:beam.fromY}),end=worldPointToScene({x:beam.toX,y:beam.toY});
      beamStart.set(start.x,start.y,start.z);beamEnd.set(end.x,end.y,end.z);
      // Keep the muzzle on the banked hull; the authoritative hit and target stay untouched.
      let source=null,nearest=90;
      for(const actor of actors.values()){
        if(!actor.object.visible) continue;
        const distance=Math.hypot(actor.position.x-beam.fromX,actor.position.y-beam.fromY);
        if(distance<nearest){nearest=distance;source=actor;}
      }
      if(source){
        const dx=beam.fromX-source.position.x,dy=beam.fromY-source.position.y;
        const cos=Math.cos(source.steeringAngle),sin=Math.sin(source.steeringAngle);
        beamStart.set(dx*cos+dy*sin,0,-dx*sin+dy*cos)
          .applyEuler(beamBankEuler.set(source.pose.pitch,0,source.pose.roll))
          .applyEuler(beamYawEuler.set(0,source.pose.yaw,0)).add(source.object.position);
      }
      beamHead.copy(beamStart).lerp(beamEnd,sampled.head);beamTail.copy(beamStart).lerp(beamEnd,sampled.tail);
      beamDirection.subVectors(beamHead,beamTail);
      const length=Math.max(.001,beamDirection.length());beamDirection.divideScalar(length);
      matrix.position.copy(beamHead).add(beamTail).multiplyScalar(.5);
      matrix.quaternion.setFromUnitVectors(beamUp,beamDirection);
      matrix.scale.set(1.05*sampled.width,length,1.05*sampled.width);matrix.updateMatrix();beamCore.setMatrixAt(index,matrix.matrix);
      matrix.scale.set(2.6*sampled.width,length,2.6*sampled.width);matrix.updateMatrix();beamGlow.setMatrixAt(index,matrix.matrix);
      setBeamColor(beamCore,index,beam.core,sampled.fade);setBeamColor(beamGlow,index,beam.glow,sampled.fade);
      index++;
    }
    beamCore.count=beamGlow.count=index;
    if(index){beamCore.instanceMatrix.needsUpdate=beamGlow.instanceMatrix.needsUpdate=true;beamCore.instanceColor.needsUpdate=beamGlow.instanceColor.needsUpdate=true;}
  }

  function finish(){
    for(const [id,actor] of actors){if(frame-actor.lastFrame>60){scene.remove(actor.object);actors.delete(id);}}
    updateBeams();renderer.render(scene,camera);
    canvas.dataset.world3dDrawCalls=String(renderer.info.render.calls);
    canvas.dataset.world3dTriangles=String(renderer.info.render.triangles);
    canvas.dataset.world3dActors=String([...actors.values()].filter(actor=>actor.object.visible).length);
    canvas.dataset.world3dHeadquarters=decor.hubLoaded ? "ready" : "loading";
    canvas.dataset.world3dServices=String(decor.stationNodes.filter(node=>node.loaded).length);
    canvas.dataset.world3dBeams=String(beamCore.count);
    if(frame % 12 === 0){
      // Screen anchors let local QA compare the hulls with the existing click targets.
      const zoom=view.camera.zoom || 1;
      canvas.dataset.world3dTargets=JSON.stringify([...actors.values()].filter(actor=>actor.targetId && actor.object.visible).map(actor=>({
        id:actor.targetId,x:(actor.position.x-view.camera.x)*zoom,y:(actor.position.y-view.camera.y)*zoom
      })));
    }
  }
  function hide(){surface.style.display="none";if(canvas){canvas.style.background=previousBackground;canvas.dataset.world3d="disabled";}}
  return {begin,finish,hide,enqueueShip,enqueueEnemy,enqueueBeams,isContextLost:()=>lost || renderer.getContext().isContextLost()};
}
