import { shipCatalog, weaponCatalog, enemyCatalog, engineStyle, engineNotes, styleNames, enemyNotes, DEFAULT_ENGINE_PROFILE, SHIP_ENGINE_PROFILES } from "./catalog.js?v=eclanite-live-1";
import { drawPlayerLayer } from "../../src/game/render/player.js";
import { drawBeams, drawEnemies, drawProjectiles, drawParticles, drawImpactEffects } from "../../src/game/render/entities.js";
import { createCombatBeamSystem } from "../../src/game/systems/combatBeams.js?v=shield-impact-1";
import { createCombatHitResolutionSystem } from "../../src/game/systems/combatHitResolution.js";
import { drawNewEngines, ENGINE_TEXTURE_PATH, setEngineTexture } from "./engines.js?v=enemy-smoke-3";
import { drawEnginesBefore, setEngineTexture as setBeforeEngineTexture } from "./enginesBefore.js?v=enemy-smoke-3";
import { drawEngineBackdrop, ENGINE_BACKDROP_ASSETS } from "./engineBackdrop.js?v=smoke-volume-1";
import { advanceEngineFlight } from "./engineFlight.js";
import { drawNewCreature, CREATURE_PROFILES } from "./creatures.js?v=eclanite-live-1";
import { ECLANITE_SOURCE } from "./eclanite/motion.js";
import { setEclaniteArtwork } from "./eclanite/renderer.js?v=eclanite-live-1";
import {isLocomotionSubject,drawLocomotionReference,setLocomotionReferenceArtwork} from "./locomotionBefore/renderer.js?v=locomotion-1";
import { TRACKER_SPRITE_PATH, setTrackerArtwork } from "./tracker/renderer.js?v=parasite-motion-tracker-arcs-1";
import { TRACKER_BOSS_SOURCE, setTrackerBossArtwork } from "./tracker/boss.js?v=tracker-boss-1";
import { VORAK_SPRITE_PATHS, setVorakArtwork } from "./vorak/renderer.js?v=vorak-boss-1";
import { VORAK_VISUAL_PROFILES, VORAK_THRUSTER_TEXTURE, isVorakKind } from "./vorak/profiles.js";
import { PARASITE_PROFILES } from "./parasite/profiles.js";
import { setParasiteArtwork } from "./parasite/renderer.js?v=parasite-independent-1";
import {drawParasite as drawBeforeParasite,setParasiteArtwork as setBeforeParasiteArtwork} from "./parasite/beforeRenderer.js?v=parasite-independent-1";
import { ORB_SPRITE_PATHS, setOrbSprite } from "./orb/renderer.js?v=orb-live-1";
import { ORB_VISUAL_PROFILES, isOrbKind } from "./orb/profiles.js?v=orb-live-1";
import { orbRotation } from "./orb/motion.js?v=orb-live-1";
import { drawShieldSurface } from "../../src/game/render/shieldSurfaces.js";
import { setCreatureJetTexture } from "./creatureWake.js?v=creatures-clean-2";
import { drawNewShot, drawNewImpact, shotPoint } from "./weapons.js?v=shield-impact-1";
import { createWeaponShots, weaponPhase } from "./weaponSequences.js?v=shield-impact-1";
import { demoTarget, enemyMovement, movementNames } from "./motion.js";
import { background, clamp, smooth, sprite } from "./drawing.js";

const byId = id=>document.getElementById(id);
const query = new URLSearchParams(location.search);
const catalogs = {engines:shipCatalog, weapons:weaponCatalog, enemies:enemyCatalog};
const selected = {engines:"orion", weapons:"rocket_r1", enemies:"drone_pirate"};
const state = {
  mode:catalogs[query.get("mode")] ? query.get("mode") : "engines",
  time:0, path:0, paused:matchMedia("(prefers-reduced-motion: reduce)").matches,
  motion:["cycle", "cruise", "turn", "idle"].includes(query.get("motion")) ? query.get("motion") : "cruise", surface:query.get("surface") === "hull" ? "hull" : "shield", frames:0,
  scenario:["combat", "pursuit", "patrol", "showcase"].includes(query.get("scenario")) ? query.get("scenario") : "combat", playbackRate:1,
  enemyView:["wide","macro"].includes(query.get("view")) ? query.get("view") : "detail",
  decor:["helion1","space"].includes(query.get("decor")) ? query.get("decor") : "helion3"
};
if(catalogs[state.mode].some(entry=>entry.id === query.get("subject"))) selected[state.mode] = query.get("subject");
const images = {};
const camera = {x:0, y:0};
const player = {x:0, y:0, angle:Math.PI / 2, engineAngle:Math.PI / 2, enginePower:0, hp:100, maxHp:100, shield:100, maxShield:100};
let newEngineState = {};
let beforeEngineState = {};
let engineFlightState = {};
let movementStates = {before:{}, after:{}};
let creatureState = {};
const enemyAttackSnapshots = new Map();
let lastTime = null;
let lastSize = "";
const panes = ["before", "after"].map(id=>({
  canvas:byId(id), ctx:byId(id).getContext("2d")
}));
const palettes = new Map();
const nativeImpactPool = [];
const nativeImpactCache = new Map();
const nativeHitVisuals = createCombatHitResolutionSystem({getState:()=>({impactEffects:nativeImpactPool})});
for(const ammo of weaponCatalog.filter(ammo=>ammo.weaponClass === "laser")){
  const beam = createCombatBeamSystem();
  beam.add({ammoId:ammo.id, fromX:0, fromY:0, toX:100, toY:0, canReplay:false});
  palettes.set(ammo.id, beam.getBeams()[0]);
}

function fail(error){
  state.paused = true;
  byId("error").hidden = false;
  byId("error").textContent = `L’aperçu n’a pas pu démarrer : ${error.message}. Recharge cette page depuis le serveur local.`;
  document.body.dataset.ready = "error";
  console.error(error);
}

function resetScene(){
  state.time = 0;
  state.path = 0;
  nativeImpactCache.clear();
  newEngineState = {};
  beforeEngineState = {};
  engineFlightState = {};
  movementStates = {before:{}, after:{}};
  creatureState = {};
  enemyAttackSnapshots.clear();
  player.engineParticleT = 0;
  player.engineTrailVisualTime = undefined;
  player.engineTrailVisualAngle = undefined;
  lastTime = null;
}

function updateInterface(){
  const catalog = catalogs[state.mode];
  const subject = catalog.find(entry=>entry.id === selected[state.mode]);
  const motionReview=state.mode === "enemies" && isLocomotionSubject(subject.kind);
  byId("after-label").textContent=motionReview ? "MOUVEMENTS PUBLIÉS" : "PROPOSITION";
  const family=state.mode === "enemies" && !motionReview ? {boss_raider_astral:"Vorak",boss_cuirasse_nebulaire:"Traqueur"}[subject.kind] : null;
  byId("before-label").textContent=family ? "COMMUN VALIDÉ" : state.mode === "engines" ? "AVANT" : "ACTUEL";
  byId("before-subtitle").textContent=family ? `${family} commun · référence` : state.mode === "engines" ? "Fumée précédente" : "Rendu du jeu local";
  byId("before").setAttribute("aria-label",family ? `${family} commun validé, référence de gabarit` : "Animation actuelle du jeu");
  byId("subject").replaceChildren(...catalog.map(entry=>{
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.name;
    return option;
  }));
  byId("subject").value = subject.id;
  document.querySelectorAll("[data-mode]").forEach(button=>{
    button.setAttribute("aria-selected", String(button.dataset.mode === state.mode));
    button.tabIndex = button.dataset.mode === state.mode ? 0 : -1;
  });
  byId("workspace").setAttribute("aria-labelledby", `tab-${state.mode}`);
  byId("subject-label").textContent = {engines:"Vaisseau", weapons:"Munition", enemies:"Monstre"}[state.mode];
  byId("motion-field").hidden = state.mode !== "engines";
  byId("motion").value = state.motion;
  byId("decor-field").hidden = state.mode !== "engines";
  byId("decor").value = state.decor;
  byId("surface-field").hidden = state.mode === "engines" || state.mode === "enemies" && state.scenario === "patrol";
  byId("surface").value = state.surface;
  byId("scenario-field").hidden = state.mode !== "enemies";
  byId("scenario").value = state.scenario;
  byId("enemy-view-field").hidden = state.mode !== "enemies";
  byId("enemy-view").value = state.enemyView;
  byId("playback-field").hidden = state.mode === "engines";
  byId("playback").value = String(state.playbackRate);
  byId("surface-hint").hidden = state.mode !== "weapons";
  byId("surface-hint").textContent = state.surface === "shield"
    ? "Bouclier actif : il devient visible seulement à la réception du tir, avec un éclair bleu au point de contact, puis disparaît."
    : "Bouclier absent : le tir touche directement le corps du monstre. Le flash se dissipe sans laisser de fissure ni de marque.";
  byId("pause").textContent = state.paused ? "Reprendre l’animation" : "Mettre en pause";
  byId("pause").setAttribute("aria-pressed", String(state.paused));
  if(state.mode === "engines"){
    const style = engineStyle(subject);
    byId("style-label").textContent = styleNames[style];
    byId("description").textContent = `${engineNotes[style]} Fumée plus volumineuse, nuages contrastés qui gonflent puis s’effacent.`;
    byId("before-note").textContent = "Fumée précédente · Même vaisseau, mêmes réacteurs, même décor.";
    byId("after-note").textContent = "Fumée légèrement réduite · Volume conservé · Nuages qui s’évaporent.";
  }else if(state.mode === "weapons"){
    const missile = subject.weaponClass === "missile";
    const rocket = subject.weaponClass === "rocket";
    const m6 = subject.id === "ammo_x6";
    byId("style-label").textContent = m6 ? "B · Filaments croisés retenus" : missile ? "Salve guidée" : rocket ? "Propulsion & combustion" : "Trait lumineux précis";
    byId("description").textContent = m6 ? "Variante B retenue : quatre impulsions noires et blanches en 390 ms, depuis l’avant et ses deux côtés. Une salve toutes les 3 secondes. Le bouclier apparaît uniquement aux impacts." : missile ? "Trois missiles distincts, sillages fins et impacts individuels." : rocket ? "Flamme vive, fumée qui se dilate et impact différent sur coque ou bouclier." : "Vitesse d’origine rétablie : deux passages de 200 ms, longueur 130. Le bouclier apparaît brièvement à la réception des tirs.";
    byId("before-note").textContent = "Projectiles, faisceaux et impacts dessinés par les modules actuels.";
    byId("after-note").textContent = m6 ? "B · Quatre impulsions rapides · Bouclier bleu au contact uniquement." : state.surface === "hull" ? "Impact bref sur le corps · Aucune marque persistante." : "La protection s’allume quand le tir la touche, puis disparaît.";
  }else{
    const [, note] = enemyNotes[subject.kind] || [subject.name, "Effets ambiants et animation du corps ; poursuite actuelle et orientation d’origine conservées."];
    const clean = CREATURE_PROFILES[subject.kind];
    byId("style-label").textContent = clean?.name || "Rendu intégré";
    byId("description").textContent = note;
    byId("before-note").textContent = "Rendu intégré au jeu · Même cadrage et même poursuite.";
    byId("after-note").textContent = isOrbKind(subject.kind) ? subject.kind === "boss_drone_pirate" ? "Modèle validé attribué au boss · Huit grandes branches." : "Orbe de départ compact · Six petites pattes · Fumée conservée." : clean ? "Nouvelle animation du corps et du sillage · Poursuite conservée." : "Monstre suivant à retravailler · Rendu intégré conservé.";
    if(subject.kind === "raider_astral") byId("after-note").textContent = "Nouvelle coque du Vorak commun · Ailes articulées · Deux moteurs et fumée.";
    if(Object.hasOwn(PARASITE_PROFILES,subject.kind)){
      byId("before-label").textContent="AVANT";
      byId("before-subtitle").textContent="Animation précédente";
      byId("before-note").textContent="Même Parasite · Même gabarit · Animation précédente.";
      byId("after-note").textContent="Tentacules plus amples · Rythmes, courbures et pauses indépendants.";
    }
    if(subject.kind === "cuirasse_nebulaire") byId("after-note").textContent = "Traqueur commun publié · Appendices articulés · Arcs électriques · Brume froide.";
    if(family){
      byId("before-note").textContent=`${family} commun validé · Référence de silhouette et de gabarit.`;
      byId("after-note").textContent=family === "Parasite" ? "Corps rond · Couronne de six plaques mobiles · Tentacules segmentés." : "Variante boss · Blindage renforcé · Environ +20 % de gabarit visible.";
    }
    if(subject.kind === "boss_cuirasse_nebulaire") byId("after-note").textContent="Boss publié · Épaules blindées · Crête renforcée · Lames segmentées · Gestes plus lents.";
    if(subject.kind === "eclanite") byId("after-note").textContent="Éclanite publié · Noyau stable · Six fragments indépendants · Éclat au tir · Poussière cristalline.";
    if(motionReview){
      const base=subject.kind.replace(/^boss_/,"");
      const movement={drone_pirate:"Pattes plus ouvertes, articulations plus visibles autour du noyau fixe.",
        raider_astral:"Ailes au débattement plus large, avec deux rythmes légèrement différents.",
        chasseur_spectral:"Tentacules plus amples en mouvement, courbures et étirements indépendants.",
        cuirasse_nebulaire:"Six appendices au débattement renforcé, sans faire tourner le corps.",
        eclanite:"Fragments qui flottent et pivotent plus largement pendant le déplacement."}[base];
      const sizeNote=base === "chasseur_spectral" ? " Taille visuelle +15 % pour le commun et le boss."
        : base === "cuirasse_nebulaire" ? " Taille visuelle +12 % pour le commun et le boss." : "";
      byId("before-label").textContent="ANCIENNE ANIMATION";
      byId("before-subtitle").textContent="Animation précédente, conservée";
      byId("before").setAttribute("aria-label","Animation publiée avant le renforcement des mouvements");
      byId("before-note").textContent="Même monstre · Déplacement identique · Animation et taille précédentes.";
      byId("after-note").textContent=movement+sizeNote;
      byId("description").textContent=movement+sizeNote+" L’amplitude monte avec le déplacement réel et se calme progressivement à l’arrêt. Attaques, poursuite et orientation du corps conservées. Animation validée et publiée en jeu le 25 octobre à 20 h 21.";
    }
  }
  const url = new URL(location.href);
  url.searchParams.set("mode", state.mode);
  url.searchParams.set("subject", subject.id);
  if(state.mode !== "engines") url.searchParams.set("surface", state.surface);
  if(state.mode === "engines"){url.searchParams.set("motion", state.motion);url.searchParams.set("decor",state.decor);}
  if(state.mode === "enemies"){
    url.searchParams.set("scenario", state.scenario);
    url.searchParams.set("view", state.enemyView);
  }
  history.replaceState(null, "", url);
  document.body.dataset.mode = state.mode;
  document.body.dataset.subject = subject.id;
}

function flightPower(){
  if(state.motion === "idle") return {power:0, label:"À l’arrêt"};
  if(state.motion === "cruise") return {power:.88, label:"Vol continu"};
  if(state.motion === "turn") return {power:.85, label:"Virages"};
  const t = state.time % 12;
  if(t < 1.8) return {power:smooth(t / 1.8), label:"Accélération"};
  if(t < 5.3) return {power:.9, label:"Vol stabilisé"};
  if(t < 8.4) return {power:.95, label:"Virage"};
  if(t < 10) return {power:.95 * (1 - smooth((t - 8.4) / 1.6)), label:"Décélération"};
  return {power:0, label:"À l’arrêt"};
}

function paneSize(pane){
  const rect = pane.canvas.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  if(pane.canvas.width !== Math.round(width * ratio) || pane.canvas.height !== Math.round(height * ratio)){
    pane.canvas.width = Math.round(width * ratio);
    pane.canvas.height = Math.round(height * ratio);
  }
  pane.canvas.__renderWidth = width;
  pane.canvas.__renderHeight = height;
  pane.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return {width, height};
}

function nativePlayer(ctx, ship, showEngine){
  drawPlayerLayer({ctx, camera, cache:images, player, ship, drones:[], pilotName:"", defaultProfile:DEFAULT_ENGINE_PROFILE, profiles:SHIP_ENGINE_PROFILES,
    graphicsEffects:{shipEngineTrail:showEngine, combatDrones:false, repairDrone:false}});
}

function renderEngines(pane, width, height, proposed, dt){
  const ship = shipCatalog.find(entry=>entry.id === selected.engines);
  const flight = flightPower();
  const phase = state.path;
  player.x = width * .59 + Math.sin(phase) * Math.min(width * .09, 40);
  player.y = height * .47 + Math.cos(phase * 1.4) * 17;
  player.angle = engineFlightState.angle;
  player.engineAngle = engineFlightState.engineAngle;
  player.vx = engineFlightState.vx;
  player.vy = engineFlightState.vy;
  player.enginePower = flight.power;
  drawEngineBackdrop(pane.ctx,width,height,state.decor,engineFlightState,images,state.path);
  if(proposed){
    drawNewEngines(pane.ctx, player, ship, state.time, dt, newEngineState, engineFlightState.bend, images[ship.combatImg || ship.img]);
  }else{
    drawEnginesBefore(pane.ctx,player,ship,state.time,dt,beforeEngineState,engineFlightState.bend,images[ship.combatImg || ship.img]);
  }
  nativePlayer(pane.ctx, ship, false);
  if(proposed && flight.power === 0 && newEngineState.tracks?.some(track=>track.length)) return "À l’arrêt · Dissipation du sillage";
  return flight.label;
}

function targetBody(ctx, target, shipTarget, surface){
  const image = images[shipTarget ? "assets/ships/Orion.png" : enemyCatalog[0].img];
  sprite(ctx, image, target.x, target.y, shipTarget ? 92 : 82, shipTarget ? 92 : 82, shipTarget ? (target.angle ?? -Math.PI / 2) : 0);
  if(shipTarget && surface === "shield"){
    ctx.save();
    ctx.strokeStyle = "rgba(98,174,213,.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 43, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function currentShot(ctx, shot){
  if(shot.age < 0 || shot.age > shot.duration + .46) return;
  const progress = clamp(shot.age / shot.duration);
  if(shot.age < shot.duration){
    if(shot.kind === "laser" && !shot.enemyKind){
      drawBeams({ctx, camera, beams:[{...shot.palette, monochrome:shot.monochrome, fromX:shot.fromX, fromY:shot.fromY, toX:shot.toX, toY:shot.toY,
        age:shot.age, duration:shot.duration, passIndex:shot.passIndex, distance:Math.hypot(shot.toX - shot.fromX, shot.toY - shot.fromY), beamLength:130}]});
    }else{
      const p = shotPoint(shot, progress);
      const previous = shotPoint(shot, Math.max(0, progress - .015));
      const trail = Array.from({length:6}, (_, i)=>{
        const elapsed = Math.max(0, shot.age - (5 - i) * .025);
        const point = shotPoint(shot, elapsed / shot.duration);
        return {...point, life:.34 - (5 - i) * .025, max:.34};
      });
      drawProjectiles({ctx, camera, cache:images, bullets:[{...shot, ...p, r:shot.enemyKind ? 5 : 10, kind:shot.enemyKind ? undefined : shot.kind,
        elapsed:shot.age, angle:Math.atan2(p.y - previous.y, p.x - previous.x), trail}]});
    }
    if(shot.age < .16 && !shot.monochrome) drawParticles({ctx, camera, particles:[{kind:shot.enemyKind ? "enemyAttack" : "muzzle", x:shot.fromX, y:shot.fromY, life:.16 - shot.age, max:.16, size:16, color:shot.particle}]});
  }else{
    if(!shot.enemyKind){drawNewImpact(ctx,shot,state.surface); return;}
    const key = `${state.mode}:${selected[state.mode]}:${shot.sequence}:${shot.seed}`;
    if(!nativeImpactCache.has(key)){
      // Use the game's actual visual factory, including its sparks, smoke,
      // radius and duration. This isolated state has no gameplay callbacks.
      nativeHitVisuals.spawnImpactEffect(shot.enemyKind ? "laser" : shot.kind, {x:shot.toX, y:shot.toY, color:shot.particle || shot.color});
      nativeImpactCache.set(key, nativeImpactPool.pop());
      if(nativeImpactCache.size > 12) nativeImpactCache.delete(nativeImpactCache.keys().next().value);
    }
    const template = nativeImpactCache.get(key);
    const life = template.max - (shot.age - shot.duration);
    if(life > 0) drawImpactEffects({ctx, camera, impactEffects:[{...template, x:shot.toX, y:shot.toY, life}]});
  }
}

function renderWeapons(pane, width, height, proposed){
  const ctx = pane.ctx;
  background(ctx, width, height, state.time, 0);
  const ammo = weaponCatalog.find(entry=>entry.id === selected.weapons);
  const from = {x:Math.max(64, width * .18), y:height * .52};
  const target = {x:width - Math.max(66, width * .18), y:height * .52};
  sprite(ctx, images["assets/ships/Orion.png"], from.x, from.y, 96, 96, Math.PI / 2);
  targetBody(ctx, target, false, state.surface);
  const shots = createWeaponShots({ammo, origin:{...from, angle:Math.PI / 2}, target, time:state.time, proposed, palette:palettes.get(ammo.id), surface:state.surface});
  for(const shot of shots){
    const originalLaserTravel=shot.kind === "laser" && !shot.monochrome && shot.age < shot.duration;
    proposed && !originalLaserTravel ? drawNewShot(ctx, shot, state.time, images, state.surface) : currentShot(ctx, shot);
  }
  return weaponPhase(ammo, state.time, proposed);
}

function renderEnemies(pane, width, height, proposed, dt){
  const ctx = pane.ctx;
  const selection = enemyCatalog.find(entry=>entry.id === selected.enemies);
  const motionReview=isLocomotionSubject(selection.kind);
  const commonKind = !motionReview && {boss_raider_astral:"raider_astral",boss_cuirasse_nebulaire:"cuirasse_nebulaire"}[selection.kind];
  const familyReference = !proposed && Boolean(commonKind);
  const subject = familyReference ? enemyCatalog.find(entry=>entry.kind === commonKind) : selection;
  const newVisual = proposed || familyReference;
  const movementScenario=state.scenario === "showcase" ? "patrol" : state.scenario;
  const target = demoTarget(state.time, width, height, movementScenario);
  const movement = enemyMovement({subject, time:state.time, dt, width, height, scenario:movementScenario, proposed,
    state:proposed ? movementStates.after : movementStates.before});
  const {x, y} = movement;
  const zoom = state.enemyView === "macro" ? 3 : state.enemyView === "detail" ? 2 : 1;
  const viewX = state.enemyView !== "wide" ? x - width * .35 / zoom : 0;
  const viewY = state.enemyView !== "wide" ? y - height * .5 / zoom : 0;
  background(ctx, width, height, state.time, 6, {x:viewX * zoom, y:viewY * zoom});
  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(-viewX,-viewY);
  const period = Math.max(1.65, subject.attackCooldown);
  const travelTime = .62;
  const age = state.scenario === "patrol" ? -10 : state.time % period - .38;
  const enemy = {...subject, ...movement, id:"vfx-demo-enemy", aggro:state.scenario !== "patrol",
    attackT:Math.max(0, .22 - Math.max(0, age)) * (age >= 0 ? 1 : 0), recentHitTimer:0};
  if(state.scenario !== "patrol") targetBody(ctx, target, true, isOrbKind(subject.kind) ? "hull" : state.surface);
  if(!proposed && motionReview)drawLocomotionReference(ctx,enemy,state.time,age,dt,movementStates.before.referenceRig??={});
  else if(newVisual) drawNewCreature(ctx, enemy, images[subject.img], state.time, age, dt,
    proposed ? creatureState : (movementStates.before.familyRig??={}));
  else if(Object.hasOwn(PARASITE_PROFILES,subject.kind)){
    drawBeforeParasite(ctx,enemy,state.time,age,dt,movementStates.before.parasiteRig??={});
  }else{
    const nativeState=movementStates.before;
    nativeState.visualEnemy??={};
    Object.assign(nativeState.visualEnemy,enemy);
    drawEnemies({ctx, camera, cache:images, enemies:[nativeState.visualEnemy], selectedEnemy:null});
  }
  if(state.scenario === "patrol"){
    ctx.restore();
    return isOrbKind(subject.kind) ? `${orbRotation(state.time).phase} · Sillage de déplacement`
      : `${movementNames[subject.kind] || "Patrouille"} · Sillage de déplacement`;
  }
  if(age >= 0){
    const sequence = Math.floor(state.time / period);
    const key = `${proposed}:${subject.kind}:${sequence}`;
    if(!enemyAttackSnapshots.has(key)){
      const a = Math.atan2(target.y - y, target.x - x);
      const muzzle = proposed && isOrbKind(subject.kind) ? 0 : subject.width * .22;
      enemyAttackSnapshots.set(key, {fromX:x + Math.cos(a) * muzzle, fromY:y + Math.sin(a) * muzzle});
      if(enemyAttackSnapshots.size > 24) enemyAttackSnapshots.delete(enemyAttackSnapshots.keys().next().value);
    }
    const snapshot = enemyAttackSnapshots.get(key);
    if(age >= travelTime && !snapshot.impactTarget) snapshot.impactTarget = {...target};
    const impactTarget = snapshot.impactTarget || target;
    const incoming = Math.atan2(snapshot.fromY - impactTarget.y, snapshot.fromX - impactTarget.x);
    const shot = {kind:"laser", enemyKind:subject.kind, fromX:snapshot.fromX, fromY:snapshot.fromY,
      toX:impactTarget.x + Math.cos(incoming) * 43, toY:impactTarget.y + Math.sin(incoming) * 43,
      targetCenter:impactTarget, age, duration:travelTime, curve:0, color:subject.color, particle:subject.particle, seed:4, sequence};
    if(isOrbKind(subject.kind) && state.surface === "shield" && age>=travelTime){
      if(age<travelTime+.56) drawShieldSurface(ctx,{x:impactTarget.x,y:impactTarget.y,radius:43,angle:incoming,
        progress:(age-travelTime)/.56,style:"hex"});
    }else newVisual ? drawNewShot(ctx, shot, state.time, images, state.surface) : currentShot(ctx, shot);
  }
  ctx.restore();
  const attackPhase = age < 0 ? "Préparation du tir" : age < .18 ? isVorakKind(subject.kind) ? "Éclat du canon" : "Éclat du noyau" : age < travelTime ? "Attaque" : age < travelTime + .46 ? "Impact" : "Déplacement";
  return isOrbKind(subject.kind) ? `${orbRotation(state.time).phase} · ${attackPhase}` : attackPhase;
}

function render(dt = 0){
  let phase = "";
  const sizeSignature = panes.map(pane=>`${pane.canvas.clientWidth}x${pane.canvas.clientHeight}`).join(":");
  if(sizeSignature !== lastSize){newEngineState = {}; beforeEngineState = {}; movementStates = {before:{}, after:{}}; creatureState = {}; enemyAttackSnapshots.clear(); lastSize = sizeSignature;}
  if(state.mode === "engines") advanceEngineFlight(engineFlightState, {
    ship:shipCatalog.find(entry=>entry.id === selected.engines), motion:state.motion,
    time:state.time, path:state.path, power:flightPower().power, dt
  });
  panes.forEach((pane, index)=>{
    if(pane.canvas.parentElement.hidden) return;
    const {width, height} = paneSize(pane);
    if(state.mode === "engines"){
      const zoom = Math.min(1.6, width / 340);
      pane.ctx.save();
      pane.ctx.scale(zoom, zoom);
      phase = renderEngines(pane, width / zoom, height / zoom, index === 1, dt);
      pane.ctx.restore();
    }
    else if(state.mode === "weapons") phase = renderWeapons(pane, width, height, index !== 0);
    else phase = renderEnemies(pane, width, height, index === 1, dt);
  });
  byId("phase").textContent = state.paused ? "Animation en pause" : phase;
  state.frames++;
}

function tick(now){
  const dt = lastTime === null ? 1 / 60 : clamp((now - lastTime) / 1000, 0, .05);
  lastTime = now;
  try{
    if(!state.paused && !document.hidden){
      const elapsed = dt * (state.mode !== "engines" ? state.playbackRate : 1);
      state.time += elapsed;
      state.path += elapsed * flightPower().power * .8;
      render(elapsed);
    }
    requestAnimationFrame(tick);
  }catch(error){fail(error);}
}

byId("subject").addEventListener("change", event=>{
  selected[state.mode] = event.target.value;
  resetScene(); updateInterface(); render();
});
byId("motion").addEventListener("change", event=>{
  state.motion = event.target.value;
  // Stopping or steering must preserve exhaust already emitted. Only the
  // scripted full cycle restarts its timeline and clears the comparison.
  if(state.motion === "cycle") resetScene();
  else lastTime = null;
  updateInterface(); render();
});
byId("surface").addEventListener("change", event=>{state.surface = event.target.value; resetScene(); updateInterface(); render();});
byId("decor").addEventListener("change", event=>{state.decor = event.target.value; updateInterface(); render();});
byId("scenario").addEventListener("change", event=>{state.scenario = event.target.value; resetScene(); updateInterface(); render();});
byId("enemy-view").addEventListener("change", event=>{state.enemyView = event.target.value; updateInterface(); render();});
byId("playback").addEventListener("change", event=>{state.playbackRate = Number(event.target.value); updateInterface(); render();});
byId("pause").addEventListener("click", ()=>{state.paused = !state.paused; lastTime = null; updateInterface(); if(state.paused) byId("phase").textContent = "Animation en pause";});
document.querySelectorAll("[data-mode]").forEach((button, index, buttons)=>{
  button.addEventListener("click", ()=>{state.mode = button.dataset.mode; resetScene(); updateInterface(); render();});
  button.addEventListener("keydown", event=>{
    if(!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus(); buttons[next].click();
  });
});
new ResizeObserver(()=>{if(document.body.dataset.ready === "true") render();}).observe(byId("workspace"));

const paths = [...new Set([
  ...shipCatalog.map(ship=>ship.combatImg || ship.img),
  ...enemyCatalog.map(enemy=>enemy.img),
  ...weaponCatalog.map(ammo=>ammo.projectileImg).filter(Boolean),
  ENGINE_TEXTURE_PATH,
  TRACKER_SPRITE_PATH,
  TRACKER_BOSS_SOURCE,
  ECLANITE_SOURCE,
  ...VORAK_SPRITE_PATHS,
  VORAK_THRUSTER_TEXTURE,
  ...Object.values(PARASITE_PROFILES).map(profile=>profile.sprite),
  ...ENGINE_BACKDROP_ASSETS,
  ...ORB_SPRITE_PATHS,
  "assets/ships/Orion.png"
])];

try{
  await Promise.all(paths.map(path=>new Promise((resolve, reject)=>{
    const image = new Image();
    images[path] = image;
    image.onload = resolve;
    image.onerror = ()=>reject(new Error(`image introuvable : ${path}`));
    image.src = path;
  })));
  setEngineTexture(images[ENGINE_TEXTURE_PATH]);
  setBeforeEngineTexture(images[ENGINE_TEXTURE_PATH]);
  setTrackerArtwork(images[TRACKER_SPRITE_PATH]);
  setTrackerBossArtwork(images[TRACKER_BOSS_SOURCE]);
  setEclaniteArtwork(images[ECLANITE_SOURCE]);
  setLocomotionReferenceArtwork(images,images[ENGINE_TEXTURE_PATH]);
  for(const [kind,profile] of Object.entries(PARASITE_PROFILES)){
    setParasiteArtwork(kind,images[profile.sprite]);setBeforeParasiteArtwork(kind,images[profile.sprite]);
  }
  for(const [kind,profile] of Object.entries(VORAK_VISUAL_PROFILES)) setVorakArtwork(kind,images[profile.sprite],images[ENGINE_TEXTURE_PATH]);
  for(const [kind,profile] of Object.entries(ORB_VISUAL_PROFILES)) setOrbSprite(kind,images[profile.sprite]);
  setCreatureJetTexture(images[ENGINE_TEXTURE_PATH]);
  updateInterface();
  render(1 / 60);
  document.body.dataset.ready = "true";
  requestAnimationFrame(tick);
}catch(error){fail(error);}
