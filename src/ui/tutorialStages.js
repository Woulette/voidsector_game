import { ammoTypes, equipment } from "../data/equipment.js?v=20260726-prismatic1";
import { ships } from "../data/ships.js?v=20260726-imperial2";
import { getCanonicalMapName, getFirmDefinition, getFirmMapName } from "../data/firms.js";
import { getFirmRepresentative } from "../data/firmRepresentatives.js";
import { questCatalog } from "../data/progression.js?v=20260726-ancient1";
import { getTutorialQuestIds } from "../shared/tutorial.js";
import { getRefineryModuleUpgradeMaterials } from "../shared/refineryRules.js";

const EQUIPMENT_BY_ID = new Map(equipment.map(item=>[item.id,item]));
const SHIP_NAMES = new Map(ships.map(ship=>[ship.id,ship.name]));
const QUEST_BY_ID = new Map(questCatalog.map(quest=>[quest.id,quest]));
const CHAPTERS = ["Préparer son départ","Première mission","Préparer le Velox","La raffinerie","Sécuriser sa zone","Explorer le deuxième secteur"];
const REPAIR_ACTION_SELECTOR = equipment.filter(item=>item.effect?.repairBot)
  .map(item=>`[data-action-item-id="${item.id}"]`).join(",");
const ROCKET_TRAINING_PACK_PRICE = Number(ammoTypes.find(ammo=>ammo.id === "rocket_r1")?.price || 0)*100;
const ROCKET_TRAINING_STEPS = new Set(["game_open_quick_shop","game_buy_rockets","game_bind_laser","game_bind_rockets"]);

function questDone(state, id){ return Boolean(state?.completedQuestClaims?.[id]); }
function questStartedOrDone(state, id){ return questDone(state,id) || Boolean(state?.activeQuestIds?.includes(id)); }
function inventoryCount(state, itemId){
  return (state?.inventoryItems || []).reduce((sum,entry)=>sum+(entry.itemId === itemId ? Math.max(1,Number(entry.quantity || 1)) : 0),0);
}
function loadout(state, shipId){ return state?.shipLoadouts?.[shipId] || {}; }
function itemFromUid(state, uid){
  const entry = uid && state?.inventoryItems?.find(item=>item.uid === uid);
  return entry ? EQUIPMENT_BY_ID.get(entry.itemId) : null;
}
function hasRepairDrone(state, shipId = state?.activeShip){
  return (loadout(state,shipId).extras || []).some(uid=>itemFromUid(state,uid)?.effect?.repairBot);
}
function loadoutIsEmpty(state, shipId){
  const selected = loadout(state,shipId);
  return ![...(selected.lasers || []),selected.missileLauncher,selected.rocketLauncher,
    ...(selected.generators || []),...(selected.extras || [])].some(Boolean);
}
function equippedLaserCount(state, shipId){
  return new Set((loadout(state,shipId).lasers || []).filter(uid=>itemFromUid(state,uid)?.category === "canon")).size;
}
function hasRocketLauncher(state, shipId){
  return itemFromUid(state,loadout(state,shipId).rocketLauncher)?.slotType === "rocketLauncher";
}
function veloxReady(state){
  return state?.activeShip === "velox" && equippedLaserCount(state,"velox") >= 3
    && hasRepairDrone(state,"velox") && hasRocketLauncher(state,"velox");
}

// Navigation is confirmed from the rendered view, never just from the click.
function visible(selector){
  if(typeof document === "undefined") return false;
  return [...document.querySelectorAll(selector)].some(element=>{
    if(element.closest?.(".hidden,[hidden]")) return false;
    const page = element.closest?.(".page-view");
    if(page && !page.classList.contains("active")) return false;
    return Boolean(element.getClientRects?.().length);
  });
}
function viewOpen(view){ return visible(`.page-view.active[data-page="${view}"]`); }
function shipOpen(state, shipId){
  return state?.selectedShip === shipId && viewOpen("hangar") && visible("#shipDetailPanel");
}
function questPanelOpen(){ return visible("#spawnInteractionPanel.quest-mode"); }
function quickPanelTabOpen(tab){
  return visible("#combatQuickPanel")
    && visible(`#combatQuickPanel [data-combat-panel-tab="${tab}"].active`)
    && visible(tab === "shop" ? "#combatPanelContent .combat-shop-grid" : "#combatPanelContent .combat-ammo-grid");
}
function trainingSlotAssigned(state,index,ammoId){
  const slots = state?.actionSlotsByShip?.velox || state?.actionSlots || [];
  return state?.activeShip === "velox" && slots[index] === ammoId;
}
function questSelected(id){
  return questPanelOpen() && (visible(`[data-view-quest="${id}"].selected`) || visible(`[data-accept-quest="${id}"]`));
}
function questCounter(state, id, objective, total){
  if(questDone(state,id)) return total;
  const progress = state?.questProgress?.[id];
  const value = typeof progress === "object" && progress !== null
    ? Number(progress[objective] || 0) : Number(progress || 0);
  return Math.min(total,Math.max(0,Number.isFinite(value) ? value : 0));
}
function questMapVisited(state,id,mapName){
  if(questDone(state,id)) return true;
  const quest = QUEST_BY_ID.get(id);
  const objectives = quest?.objectives || [quest?.objective];
  const index = objectives.findIndex(objective=>objective?.type === "visit_map" && getCanonicalMapName(objective.map) === mapName);
  if(index<0) return false;
  const objective = objectives[index];
  const key = objective.id || `visit_map:${objective.map}:${index}`;
  const progress = state?.questProgress?.[id];
  return Boolean(progress && typeof progress === "object" && Number(progress[key] || 0)>=Math.max(1,Number(objective.count || 1)));
}

const STORAGE_MATERIALS = getRefineryModuleUpgradeMaterials("storage",2);
const STORAGE_NAMES = {titane_fissure:"Titane",silice_conductrice:"Silice"};
export function getTutorialStorageStatus(state){
  const materials = Object.entries(STORAGE_MATERIALS).map(([id,required])=>({
    id,name:STORAGE_NAMES[id] || id,required,have:Math.max(0,Number(state?.cargoHold?.[id] || 0)),
    disabled:Boolean(state?.refineryProductionDisabled?.[id])
  }));
  const missing = materials.filter(material=>material.have<material.required);
  return {materials,missing,disabledMissing:missing.filter(material=>material.disabled),ready:missing.length===0};
}
function storageProgress(state){
  const {materials,missing,disabledMissing} = getTutorialStorageStatus(state);
  const stock = materials.map(material=>`${material.name} ${Math.floor(material.have)}/${material.required}`).join(" · ");
  if(!missing.length) return `${stock} · Ressources prêtes.`;
  if(disabledMissing.length) return `${stock} · Réactive l'extraction : ${disabledMissing.map(material=>material.name).join(", ")}.`;
  return `${stock} · Extraction active : attends les ressources.`;
}

function navigation(selector,hint,when){ return {selector,hint,...(when ? {when} : {})}; }
function hangarGuide(shipId, target, hint){
  const shipName = SHIP_NAMES.get(shipId) || shipId;
  return [
    ...(target === ".rpg-inventory-grid" ? [navigation('[data-inventory-filter="equipment"]',"Affiche les équipements dans l'inventaire.",state=>shipOpen(state,shipId) && visible('[data-inventory-filter="resources"].active'))] : []),
    ...(target ? [navigation(target,hint,state=>shipOpen(state,shipId))] : []),
    navigation(`.ship-open-button[data-ship-id="${shipId}"]`,`Ouvre l'inventaire de ton ${shipName}.`,state=>state?.selectedShip === shipId),
    navigation(`[data-hangar-select-ship="${shipId}"]`,`Sélectionne ton ${shipName}.`),
    navigation(`[data-ship-id="${shipId}"]`,`Clique sur ton ${shipName}.`),
    navigation("#backToShipsBtn","Reviens à la liste des vaisseaux."),
    navigation('[data-hangar-tab="vaisseau"]',"Ouvre l'onglet Vaisseau."),
    navigation('[data-view="hangar"]',"Ouvre le hangar.")
  ];
}
function shopGuide(product,category,target,hint){
  const [kind,id] = String(product || "").split(":");
  const name = kind === "ship" ? SHIP_NAMES.get(id) : EQUIPMENT_BY_ID.get(id)?.name;
  return [
    ...(target ? [navigation(target,hint)] : []),
    ...(product ? [navigation(`[data-select-shop="${product}"]`,`Clique sur ${name || "l'objet indiqué"}.`)] : []),
    navigation(`[data-filter-shop="${category}"]`,`Ouvre la catégorie ${{vaisseau:"Vaisseaux",canon:"Armes",extra:"Extras"}[category] || category}.`),
    navigation('[data-view="shop"]',"Ouvre le magasin.")
  ];
}
function quickShopGuide(target,hint){
  return [
    ...(target ? [navigation(target,hint)] : []),
    navigation('#combatQuickPanel [data-combat-panel-tab="shop"]',"Ouvre le Magasin de combat."),
    navigation("#combatQuickMenuBtn","Ouvre le menu +.")
  ];
}
function ammoBindingGuide(ammoId,index,label){
  return [
    navigation(`#combatQuickPanel [data-combat-ammo-id="${ammoId}"]`,`Glisse ${label} dans le slot ${index+1}.`,state=>!trainingSlotAssigned(state,index,ammoId)),
    navigation(`#gameActionBar [data-action-index="${index}"]`,`Repère ${label} dans le slot ${index+1}.`,state=>trainingSlotAssigned(state,index,ammoId) && quickPanelTabOpen("ammo")),
    navigation('#combatQuickPanel [data-combat-panel-tab="ammo"]',"Ouvre Munitions."),
    navigation("#combatQuickMenuBtn","Ouvre le menu +.")
  ];
}

const RECOVERY_CHAPTERS = {
  launcher_depart:1,game_hunt_pass:2,game_use_repair_drone:2,
  launcher_equip_three_lasers:3,launcher_depart_velox:3,game_hunt_raiders:5,game_hunt_yellow:6,
  game_open_quick_shop:5,game_buy_rockets:5,game_bind_laser:5,game_bind_rockets:5
};

// Recovery leaves the persistent step untouched. The controller shows this
// temporary objective until the actual profile contains the required loadout.
export function getTutorialRecovery(state,step){
  const chapterIndex = RECOVERY_CHAPTERS[step];
  if(!chapterIndex) return null;
  const huntIndex = {game_hunt_pass:0,game_hunt_raiders:2,game_hunt_yellow:3}[step];
  if(huntIndex !== undefined && questDone(state,getTutorialQuestIds(state?.player?.firmId)[huntIndex])) return null;
  const chapter = {index:chapterIndex,total:CHAPTERS.length,title:CHAPTERS[chapterIndex-1]};
  const fullKit = ["launcher_equip_three_lasers","launcher_depart_velox"].includes(step);
  const rocketTraining = ROCKET_TRAINING_STEPS.has(step);
  const requiresVelox = fullKit || rocketTraining;
  const targetShip = requiresVelox ? "velox" : state?.activeShip || "orion";
  const shipName = SHIP_NAMES.get(targetShip) || targetShip;
  const recovery = (title,objective,message,guideSteps,mode = "launcher")=>({mode,title,objective,message,chapter,guideSteps});
  if(requiresVelox && !state?.ownedShips?.includes("velox")){
    return recovery("Retrouver le Velox","Achète le Velox.",
      "Il manque à ton hangar. Ta progression est conservée.",
      shopGuide("ship:velox","vaisseau",'[data-buy-shop-ship="velox"]',"Achète le Velox."));
  }
  if(requiresVelox && state?.activeShip !== "velox"){
    return recovery("Reprendre le Velox","Active le Velox.",
      "Ouvre son inventaire, puis clique sur ÉQUIPER.",
      hangarGuide("velox","#selectedShipAction","Clique sur ÉQUIPER."));
  }
  const requiredLasers = step === "game_use_repair_drone" ? 0 : fullKit ? 3 : 1;
  const needsLasers = equippedLaserCount(state,targetShip)<requiredLasers;
  const needsRepair = !hasRepairDrone(state,targetShip);
  const needsRocket = (fullKit || rocketTraining) && !hasRocketLauncher(state,targetShip);
  if(!needsLasers && !needsRepair && !needsRocket){
    if(!rocketTraining) return null;
    const refill = (ammoId,multiplier)=>{
      const ammo = ammoTypes.find(item=>item.id === ammoId);
      const amount = Number(ammo.amount || 1)*multiplier;
      const label = `${amount.toLocaleString("fr-FR")} ${ammo.short}`;
      const target = `[data-combat-buy-ammo="${ammoId}"][data-combat-buy-multiplier="${multiplier}"]`;
      return recovery("Recharger les munitions",`Achète le pack de ${label}.`,
        `Stock ${ammo.short} épuisé. Ta progression reste sauvegardée.`,
        quickShopGuide(target,`Achète le pack de ${label}.`),"game");
    };
    if(Number(state?.ammoInventory?.ammo_x1 || 0)<=0) return refill("ammo_x1",1);
    if((Number(state?.tutorial?.rocketTrainingPurchased || 0)>=100 || step === "game_bind_rockets")
      && Number(state?.ammoInventory?.rocket_r1 || 0)<=0) return refill("rocket_r1",100);
    if(step === "game_bind_rockets" && !trainingSlotAssigned(state,0,"ammo_x1")){
      return {...recovery("Rétablir le laser","Remets M-1 dans le slot 1.",
        "Garde ce raccourci laser avant de placer les roquettes.",ammoBindingGuide("ammo_x1",0,"M-1"),"game"),
        dragSourceSelector:'#combatQuickPanel [data-combat-ammo-id="ammo_x1"]',
        dropTargetSelector:'#gameActionBar [data-action-index="0"]'};
    }
    return null;
  }

  const inventory = (state?.inventoryItems || []).map(entry=>EQUIPMENT_BY_ID.get(entry.itemId)).filter(Boolean);
  const laserCount = inventory.filter(item=>item.category === "canon").length;
  const repairOwned = inventory.some(item=>item.effect?.repairBot);
  const rocketOwned = inventory.some(item=>item.slotType === "rocketLauncher");
  const missingItemId = needsLasers && laserCount<requiredLasers ? "laser_mk1"
    : needsRepair && !repairOwned ? "extra_repair_starter"
    : needsRocket && !rocketOwned ? "launcher_rocket_mk1" : "";
  if(missingItemId){
    const item = EQUIPMENT_BY_ID.get(missingItemId);
    const balance = Math.max(0,Number(state?.player?.credits || 0));
    const shortfall = Math.max(0,Number(item.price || 0)-balance);
    const budget = shortfall>0 ? ` Il te manque ${shortfall.toLocaleString("fr-FR")} crédits.` : "";
    return recovery("Remplacer le matériel manquant",`Rachète ${item.name}.`,
      `${shipName} en a besoin pour poursuivre.${budget}`,
      shopGuide(`item:${missingItemId}`,item.shopCategory || item.category,`[data-buy-item="${missingItemId}"]`,`Rachète ${item.name}.`));
  }
  if(step === "launcher_equip_three_lasers") return null;
  const needed = [needsLasers ? `${requiredLasers} laser${requiredLasers>1 ? "s" : ""}` : "",needsRepair ? "le drone de réparation" : "",needsRocket ? "le lance-roquette" : ""].filter(Boolean).join(", ");
  return recovery("Rétablir l'équipement du vaisseau",`Équipe ${needed} sur ${shipName}.`,
    "Tu peux déplacer un objet monté sur un autre vaisseau.",
    hangarGuide(targetShip,".rpg-inventory-grid",`Équipe ${needed} sur ${shipName}.`));
}
function refineryGuide(target,hint){
  const confirmation = target.includes("confirm");
  return [
    ...(confirmation ? [
      navigation("[data-close-refinery-upgrade]","Ferme ce panneau pour réactiver l'extraction.",state=>getTutorialStorageStatus(state).disabledMissing.length>0),
      ...Object.keys(STORAGE_MATERIALS).map(id=>navigation(`[data-toggle-refinery-production="${id}"]`,`Réactive l'extraction de ${STORAGE_NAMES[id]} avec le bouton OFF.`,state=>getTutorialStorageStatus(state).disabledMissing.some(material=>material.id===id))),
      navigation(".sky-stock-row","L'extraction remplit les stocks automatiquement.",state=>{
        const status=getTutorialStorageStatus(state);
        return !status.ready && status.disabledMissing.length===0;
      })
    ] : []),
    navigation(target,hint,confirmation ? state=>getTutorialStorageStatus(state).ready : undefined),
    ...(confirmation ? [navigation('[data-upgrade-refinery-module="storage"]',"Sélectionne le module Stockage.")] : []),
    navigation('[data-refinery-tab="forge"]',"Ouvre l'onglet Raffinerie."),
    navigation('[data-view="refinery"]',"Ouvre la raffinerie.")
  ];
}

export function createTutorialStages({playerName = "pilote",firmId = "astra"} = {}){
  const firm = getFirmDefinition(firmId);
  const representative = getFirmRepresentative(firm.id);
  const [passQuest,storageQuest,raiderQuest,yellowQuest] = getTutorialQuestIds(firm.id);
  const homeMap = getFirmMapName(firm.id,1);
  const secondMap = getFirmMapName(firm.id,2);
  const yellowQuestDefinition = QUEST_BY_ID.get(yellowQuest);
  const yellowKillZones = new Set((yellowQuestDefinition?.objectives || []).filter(objective=>objective.type === "kill")
    .flatMap(objective=>objective.zones || [objective.zone]).filter(Boolean).map(getCanonicalMapName));
  const yellowKillMapNumbers = [1,2].filter(number=>yellowKillZones.has(getFirmMapName(firm.id,number)));
  const yellowVisitDone = state=>questMapVisited(state,yellowQuest,secondMap);
  const yellowEnemies = state=>({type:"enemy",firmId:firm.id,mapNumbers:yellowKillMapNumbers,kinds:[
    ...(questCounter(state,yellowQuest,"orbes",5)<5 ? ["drone_pirate"] : []),
    ...(questCounter(state,yellowQuest,"vorak",5)<5 ? ["raider_astral"] : [])
  ]});
  const chapters = CHAPTERS;
  const stage = (chapter,mode,title,objective,extra = {})=>({
    mode,title,objective,message:objective,
    chapter:{index:chapter,total:chapters.length,title:chapters[chapter-1]},
    ...extra
  });
  const station = {type:"station",id:"quests",firmId:firm.id,mapNumber:1};
  const hq = {type:"hq",firmId:firm.id,mapNumber:1};
  const questGuidance = id=>[
    navigation(`[data-accept-quest="${id}"]`,"Accepte la mission."),
    navigation(`[data-view-quest="${id}"]`,"Sélectionne la mission indiquée.")
  ];
  const relayStage = (chapter,id)=>stage(chapter,"game","Relais de quêtes",`Ouvre le relais de quêtes sur ${homeMap}.`,{
    world:station,arrowMode:"world-anchor",condition:state=>questPanelOpen() || questStartedOrDone(state,id)
  });
  const selectQuest = (chapter,id,title)=>stage(chapter,"game","Choisir sa mission",`Sélectionne « ${title} ».`,{
    selector:`[data-view-quest="${id}"]`,guideSteps:questGuidance(id),world:station,
    condition:state=>questStartedOrDone(state,id) || questSelected(id)
  });
  const acceptQuest = (chapter,id)=>stage(chapter,"game","Accepter sa mission","Accepte la mission au relais de quêtes.",{
    selector:`[data-accept-quest="${id}"]`,guideSteps:questGuidance(id),world:station,
    condition:state=>questStartedOrDone(state,id)
  });
  const returnToHq = chapter=>stage(chapter,"game","Retour au quartier général",`Retourne au QG sur ${homeMap}.`,{
    world:hq,arrowMode:"player-direction",condition:(_state,snapshot)=>Boolean(snapshot?.atDestinationMap) && Number(snapshot?.target?.distance ?? Infinity)<520
  });
  return {
    launcher_orion:stage(1,"launcher","Bienvenue chez "+firm.label,"Sélectionne ton Orion, puis ouvre son inventaire.",{
      dialogue:true,handoff:true,selector:'[data-ship-id="orion"]',guideSteps:hangarGuide("orion"),
      message:`Bienvenue, ${playerName}. Je suis ${representative.name}, ${representative.title}.`,
      condition:state=>shipOpen(state,"orion")
    }),
    launcher_ship_gift:stage(1,"launcher","Ton équipement de départ","Découvre ton équipement de départ.",{
      manual:true,message:"L'Orion possède déjà un laser et un drone de réparation."
    }),
    launcher_inventory:stage(1,"launcher","L'inventaire","Repère ton inventaire.",{
      manual:true,selector:".rpg-inventory-grid",guideSteps:hangarGuide("orion",".rpg-inventory-grid","Repère ton inventaire."),
      message:"Équipe un objet par double-clic ou glisse-le vers un emplacement."
    }),
    launcher_unequip_all:stage(1,"launcher","Changer d'équipement","Repère le bouton Tout déséquiper.",{
      manual:true,selector:"#unequipAllShipBtn",guideSteps:hangarGuide("orion","#unequipAllShipBtn","Repère le bouton Tout déséquiper."),
      message:"Tu l'utiliseras pour changer de vaisseau. Garde ton équipement pour ce premier vol."
    }),
    launcher_depart:stage(1,"launcher","Premier départ","Clique sur DÉPART.",{
      message:`Tu rejoindras ${homeMap}, la base de ${firm.label}.`,
      selector:"#startGameBtn",guideSteps:[navigation("#startGameBtn","Clique sur DÉPART.")],
      condition:(_state,snapshot)=>Boolean(snapshot?.player)
    }),
    game_base_intro:stage(2,"game","Le quartier général de "+firm.label,"Repère ta station.",{
      manual:true,dialogue:true,message:`${homeMap} est la base de ${firm.label}. Clique dans l'espace pour te déplacer.`
    }),
    game_quest_camera:stage(2,"game","Ton relais de quêtes","Repère le relais de quêtes.",{
      manual:true,world:station,preview:station,previewDuration:3500,
      message:"Clique dessus pour lire les missions et leurs récompenses."
    }),
    game_open_quests_1:relayStage(2,passQuest),
    game_select_pass:selectQuest(2,passQuest,"Un passe droit ?"),
    game_accept_pass:acceptQuest(2,passQuest),
    game_hunt_pass:stage(2,"game","Premier combat",`Détruis 3 Orbes sentinelles sur ${homeMap}.`,{
      world:{type:"enemy",kinds:["drone_pirate"],firmId:firm.id,mapNumber:1},arrowMode:"player-direction",
      message:"Double-clique sur une Orbe pour tirer. Échap annule la cible.",
      condition:state=>questDone(state,passQuest),
      progress:state=>`${questCounter(state,passQuest,"kill:drone_pirate:0",3)}/3 Orbes sentinelles`
    }),
    game_repair_drone_intro:stage(2,"game","Réparer son vaisseau","Mets-toi hors combat.",{
      manual:true,dialogue:true,message:"Le drone répare ta coque. Si elle est intacte, tu peux poursuivre directement."
    }),
    game_use_repair_drone:stage(2,"game","Réparation de la coque","Active ton drone de réparation.",{
      message:"Utilise la barre d'actions. Si ta coque est intacte, tu passes à la suite.",
      selector:REPAIR_ACTION_SELECTOR,
      guideSteps:[navigation(REPAIR_ACTION_SELECTOR,"Active le drone de réparation.")],
      condition:(state,snapshot)=>hasRepairDrone(state) && Boolean(snapshot?.player?.repairBotActive || (Number(snapshot?.player?.maxHp)>0 && Number(snapshot?.player?.hp)>=Number(snapshot.player.maxHp))),
      progress:(_state,snapshot)=>snapshot?.player?.repairBotActive ? "Réparation en cours" : "Reste hors combat pour réparer."
    }),
    game_return_hq_1:returnToHq(2),
    launcher_open_shop:stage(3,"launcher","Le magasin","Ouvre le magasin.",{
      selector:'[data-view="shop"]',condition:()=>viewOpen("shop")
    }),
    launcher_select_velox:stage(3,"launcher","Choisir le Velox","Sélectionne le Velox.",{
      selector:'[data-select-shop="ship:velox"]',guideSteps:shopGuide("ship:velox","vaisseau"),
      condition:state=>Boolean(state?.ownedShips?.includes("velox")) || visible('[data-select-shop="ship:velox"].selected')
    }),
    launcher_buy_velox:stage(3,"launcher","Acheter le Velox","Achète le Velox.",{
      message:"Il est plus rapide et possède trois emplacements laser.",
      selector:'[data-buy-shop-ship="velox"]',guideSteps:shopGuide("ship:velox","vaisseau",'[data-buy-shop-ship="velox"]',"Achète le Velox."),
      condition:state=>Boolean(state?.ownedShips?.includes("velox"))
    }),
    launcher_open_weapons:stage(3,"launcher","Les armes","Ouvre la catégorie Armes.",{
      selector:'[data-filter-shop="canon"]',guideSteps:shopGuide(null,"canon"),
      condition:()=>viewOpen("shop") && visible('[data-filter-shop="canon"].active')
    }),
    launcher_select_laser:stage(3,"launcher","Choisir un deuxième laser","Sélectionne le Canon Laser MK-I.",{
      selector:'[data-select-shop="item:laser_mk1"]',guideSteps:shopGuide("item:laser_mk1","canon"),
      condition:state=>inventoryCount(state,"laser_mk1")>=2 || visible('[data-select-shop="item:laser_mk1"].selected')
    }),
    launcher_buy_laser:stage(3,"launcher","Acheter le deuxième laser","Achète un Canon Laser MK-I.",{
      message:"Il complétera tes deux autres lasers pour le Velox.",
      selector:'[data-buy-item="laser_mk1"]',guideSteps:shopGuide("item:laser_mk1","canon",'[data-buy-item="laser_mk1"]',"Achète un seul Canon Laser MK-I."),
      condition:state=>inventoryCount(state,"laser_mk1")>=2
    }),
    launcher_open_hangar:stage(3,"launcher","Retour au hangar","Retourne au hangar.",{
      selector:'[data-view="hangar"]',condition:()=>viewOpen("hangar")
    }),
    launcher_open_orion:stage(3,"launcher","Libérer l'équipement de l'Orion","Ouvre l'inventaire de l'Orion.",{
      selector:'[data-ship-id="orion"]',guideSteps:hangarGuide("orion"),
      condition:state=>loadoutIsEmpty(state,"orion") || shipOpen(state,"orion")
    }),
    launcher_unequip_orion:stage(3,"launcher","Transférer son équipement","Déséquipe entièrement l'Orion.",{
      message:"Ses objets rejoindront l'inventaire pour être placés sur le Velox.",
      selector:"#unequipAllShipBtn, [data-unequip-all-confirm]",
      guideSteps:[navigation("[data-unequip-all-confirm]","Confirme le déséquipement de l'Orion.",state=>state?.selectedShip === "orion"),...hangarGuide("orion","#unequipAllShipBtn","Déséquipe l'Orion.")],
      condition:state=>loadoutIsEmpty(state,"orion")
    }),
    launcher_open_velox:stage(3,"launcher","Préparer le Velox","Ouvre l'inventaire du Velox.",{
      selector:'[data-ship-id="velox"]',guideSteps:hangarGuide("velox"),condition:state=>shipOpen(state,"velox")
    }),
    launcher_equip_velox:stage(3,"launcher","Activer le Velox","Clique sur ÉQUIPER pour activer le Velox.",{
      selector:"#selectedShipAction",guideSteps:hangarGuide("velox","#selectedShipAction","Active le Velox."),condition:state=>state?.activeShip === "velox"
    }),
    launcher_equip_three_lasers:stage(3,"launcher","Équiper le Velox","Équipe le Velox pour le combat.",{
      message:"Ajoute trois lasers, le drone de réparation et le lance-roquette.",
      selector:".rpg-inventory-grid",guideSteps:hangarGuide("velox",".rpg-inventory-grid","Double-clique sur un objet pour l'équiper."),
      condition:veloxReady,
      progress:state=>`${Math.min(3,equippedLaserCount(state,"velox"))}/3 lasers · Drone ${hasRepairDrone(state,"velox") ? "✓" : "à équiper"} · Lance-roquette ${hasRocketLauncher(state,"velox") ? "✓" : "à équiper"}`
    }),
    launcher_depart_velox:stage(3,"launcher","Vol à bord du Velox","Clique sur DÉPART.",{
      selector:"#startGameBtn",condition:(_state,snapshot)=>Boolean(snapshot?.player)
    }),
    game_open_quests_2:relayStage(4,storageQuest),
    game_select_storage:selectQuest(4,storageQuest,"Un choix rationelle"),
    game_accept_storage:acceptQuest(4,storageQuest),
    launcher_open_refinery:stage(4,"launcher","La raffinerie","Ouvre la raffinerie.",{
      selector:'[data-view="refinery"]',condition:()=>viewOpen("refinery")
    }),
    launcher_upgrade_storage:stage(4,"launcher","Améliorer le stockage","Clique sur AMÉLIORER pour le Stockage.",{
      selector:'[data-upgrade-refinery-module="storage"]',guideSteps:refineryGuide('[data-upgrade-refinery-module="storage"]',"Ouvre l'amélioration du module Stockage."),
      condition:state=>questDone(state,storageQuest) || visible('[data-confirm-refinery-module-upgrade="storage"]'),progress:storageProgress
    }),
    launcher_launch_storage_upgrade:stage(4,"launcher","Lancer l'amélioration","Lance l'amélioration du stockage.",{
      message:"Le lancement valide la mission : inutile d'attendre la fin.",
      selector:'[data-confirm-refinery-module-upgrade="storage"]',guideSteps:refineryGuide('[data-confirm-refinery-module-upgrade="storage"]',"Lance l'amélioration du stockage."),
      condition:state=>questDone(state,storageQuest),progress:storageProgress
    }),
    game_open_quests_3:relayStage(5,raiderQuest),
    game_select_raiders:selectQuest(5,raiderQuest,"Pulvérisé à la racine"),
    game_accept_raiders:acceptQuest(5,raiderQuest),
    game_open_quick_shop:stage(5,"game","Le menu de combat","Ouvre le Magasin de combat.",{
      message:"Le Velox a sa propre barre. Tes canons sont équipés : préparons ses raccourcis.",
      selector:'#combatQuickPanel [data-combat-panel-tab="shop"]',guideSteps:quickShopGuide(),
      condition:()=>quickPanelTabOpen("shop")
    }),
    game_buy_rockets:stage(5,"game","Acheter des roquettes","Achète le pack de 100 Roquettes R-1.",{
      message:`Prix de base : ${ROCKET_TRAINING_PACK_PRICE.toLocaleString("fr-FR")} crédits.`,
      selector:'[data-combat-buy-ammo="rocket_r1"][data-combat-buy-multiplier="100"]',
      guideSteps:quickShopGuide('[data-combat-buy-ammo="rocket_r1"][data-combat-buy-multiplier="100"]',"Achète le pack de 100 Roquettes R-1."),
      condition:state=>Number(state?.tutorial?.rocketTrainingPurchased || 0)>=100,
      progress:state=>`${Math.min(100,Math.max(0,Number(state?.tutorial?.rocketTrainingPurchased || 0)))}/100 R-1 achetées`
    }),
    game_bind_laser:stage(5,"game","Préparer le laser","Glisse M-1 dans le slot 1.",{
      message:"M-1 est la munition de ton laser. Dépose-la dans la barre du bas.",
      selector:'#combatQuickPanel [data-combat-ammo-id="ammo_x1"]',
      dragSourceSelector:'#combatQuickPanel [data-combat-ammo-id="ammo_x1"]',
      dropTargetSelector:'#gameActionBar [data-action-index="0"]',
      guideSteps:ammoBindingGuide("ammo_x1",0,"M-1"),
      condition:state=>quickPanelTabOpen("ammo") && trainingSlotAssigned(state,0,"ammo_x1") && Number(state?.ammoInventory?.ammo_x1 || 0)>0
    }),
    game_bind_rockets:stage(5,"game","Préparer les roquettes","Glisse R-1 dans le slot 2.",{
      message:"Choisis la Roquette R-1, puis dépose-la dans la barre du bas.",
      selector:'#combatQuickPanel [data-combat-ammo-id="rocket_r1"]',
      dragSourceSelector:'#combatQuickPanel [data-combat-ammo-id="rocket_r1"]',
      dropTargetSelector:'#gameActionBar [data-action-index="1"]',
      guideSteps:ammoBindingGuide("rocket_r1",1,"R-1"),
      condition:state=>quickPanelTabOpen("ammo") && trainingSlotAssigned(state,0,"ammo_x1") && trainingSlotAssigned(state,1,"rocket_r1")
        && Number(state?.ammoInventory?.ammo_x1 || 0)>0 && Number(state?.ammoInventory?.rocket_r1 || 0)>0
    }),
    game_hunt_raiders:stage(5,"game","Sécuriser les routes",`Détruis 3 Vorak rushers sur ${homeMap}.`,{
      message:"Facultatif : glisse le drone depuis Extras vers le slot 9.",
      world:{type:"enemy",kinds:["raider_astral"],firmId:firm.id,mapNumber:1},arrowMode:"player-direction",condition:state=>questDone(state,raiderQuest),
      progress:state=>`${questCounter(state,raiderQuest,"kill:raider_astral:0",3)}/3 Vorak rushers`
    }),
    game_return_hq_2:returnToHq(5),
    game_open_quests_4:relayStage(6,yellowQuest),
    game_yellow_explain:stage(6,"game","La mission de fin d'initiation","Découvre la mission jaune.",{
      manual:true,dialogue:true,message:`Elle termine ce palier : combats et passage vers ${secondMap}.`
    }),
    game_accept_yellow:acceptQuest(6,yellowQuest),
    game_reach_map_2:stage(6,"game","Le deuxième secteur",`Rejoins ${secondMap}.`,{
      world:state=>yellowVisitDone(state) ? yellowEnemies(state) : {type:"map2",firmId:firm.id,mapNumber:2},arrowMode:"player-direction",
      message:"Approche du portail indiqué, puis appuie sur J.",
      condition:(state,snapshot)=>yellowVisitDone(state) || getCanonicalMapName(snapshot?.mapName) === secondMap
    }),
    game_hunt_yellow:stage(6,"game","Mettre ses acquis en pratique","Termine les combats de la mission.",{
      message:`Chasse les cibles restantes sur ${homeMap} ou ${secondMap}.`,
      world:yellowEnemies,arrowMode:"player-direction",condition:state=>questDone(state,yellowQuest),
      progress:state=>`${questCounter(state,yellowQuest,"orbes",5)}/5 Orbes · ${questCounter(state,yellowQuest,"vorak",5)}/5 Vorak`
    }),
    game_tutorial_complete:stage(6,"game","Initiation terminée","Termine ta formation.",{
      manual:true,dialogue:true,message:`Bien joué, ${playerName}. Le commandement de ${firm.label} t'a réservé un cadeau.`
    }),
    game_open_gift:stage(6,"game","Le cadeau du commandement","Ouvre ton cadeau.",{
      gift:true,message:"Un Laser MK-III t'attend."
    })
  };
}
