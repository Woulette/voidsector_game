import { fmt } from "../core/utils.js";
import { getRarityLabel, rarityClass } from "../shared/rarities.js";
import { MAX_S1_BOOSTER_UNITS, getS1BoosterPurchaseBlockReason, getS1BoosterUnitCount } from "../shared/firmBoosters.js";
import { getShopCurrencyPrice } from "../shared/shopPricing.js";
import { getReputationShopSurcharge } from "../shared/reputation.js";
import { isPremiumActive, isPremiumGoldActive, premiumRemainingLabel } from "../data/premium.js?v=20261024-boutique3";
import { shopProductKey } from "./shopCatalog.js?v=20261024-boutique3";

const finiteCount = n=>Math.max(0, Math.floor(Number(n) || 0));
const boosterLabel = {damage:"dégâts", shield:"bouclier", hull:"vie", credits:"crédits"};
const stat = (label,value,icon="info")=>({label,value:String(value),icon});
const durationLabel = ms=>ms > 0 ? `${fmt(Math.floor(ms/3_600_000))} h ${Math.floor(ms%3_600_000/60_000)} min` : "Inactif";

export function createShopProductModel(product, {
  state = {}, inventoryCount = ()=>0, ammoCount = ()=>0, shipLock = ()=>"", dronePrice = null, multiplier = 1
} = {}){
  const data = product.data, player = state.player || {};
  const {kind,id} = product;
  const count = finiteCount(kind === "ammo" ? ammoCount(id) : kind === "drone" ? state.ownedDroneCount : inventoryCount(id));
  const quantities = kind === "ammo" || id === "teleportation_fluid";
  const quantity = quantities && [1,10,100,1000].includes(Number(multiplier)) ? Number(multiplier) : 1;
  const units = finiteCount(kind === "ammo" ? data.amount : 1) * quantity;
  const owned = kind === "ship" ? Boolean(state.ownedShips?.includes(id))
    : kind === "droneFormation" ? Boolean(state.ownedDroneFormations?.includes(id))
    : kind === "booster" ? Number(state.boosters?.s1?.[data.type]?.remainingMs || 0) > 0
    : kind === "premiumPack" ? false : count > 0;
  const active = kind === "ship" ? state.activeShip === id : kind === "droneFormation" ? state.activeDroneFormation === id : false;
  let lock = kind === "ship" ? shipLock(data) : "";
  let baseUnit = finiteCount(data.price), subtitle = "", badge = "", stats = [], facts = [], note = "", features = [];
  let action = {attribute:"data-buy-item", value:id, label:"Acheter", disabled:false};
  let status = owned ? `${fmt(count)} possédé${count > 1 ? "s" : ""}` : "Disponible";
  let priceLabel = quantities ? "Prix du lot" : "Prix unitaire";
  if(kind === "ship"){
    const s = data.stats || {};
    subtitle = data.className; badge = "Vaisseau";
    stats = [stat("Vie",fmt(s.vie),"hull"),stat("Vitesse",fmt(s.vitesse),"speed"),stat("Soute",fmt(s.cargo),"cargo"),stat("Lasers",fmt(s.maxLasers),"weapon"),stat("Générateurs",fmt(s.maxGenerators),"generator"),stat("Extras",fmt(s.maxExtras || 3),"extra"),stat("Lance-roquettes",fmt(s.maxRocketLaunchers ?? 1),"rocket"),stat("Lance-missiles",fmt(s.maxMissileLaunchers ?? 1),"rocket")];
    if(Number(s.damageMultiplier || 1) > 1) stats.push(stat("Dégâts",`×${fmt(s.damageMultiplier)}`,"weapon"));
    if(data.special) stats.push(stat("Spécial",data.special,"star"));
    note = data.special ? "" : "Aucun système spécial de série.";
    status = active ? "Actif" : owned ? "Possédé" : "Disponible";
    priceLabel = "Prix du vaisseau";
    action = {attribute:"data-buy-shop-ship",value:id,label:active ? "Vaisseau actif" : owned ? "Déjà possédé" : "Acheter le vaisseau",disabled:owned};
  }else if(kind === "ammo"){
    subtitle = data.weaponClass === "rocket" ? "Roquette" : data.weaponClass === "missile" ? "Missile" : "Munition laser";
    badge = subtitle;status = `Stock : ${fmt(count)}`;
    stats = data.weaponClass === "laser" ? [stat("Multiplicateur",`×${data.multiplier}`,"weapon"),stat("Pack",`${fmt(data.amount)} unités`,"ammo")]
      : [stat("Dégâts",`${fmt(data.damageMin)}–${fmt(data.damageMax)}`,"weapon"),stat("Portée","Lanceur","rocket")];
    stats.push(stat("Stock",fmt(count),"cargo"));
    facts = [`${fmt(data.amount)} unité${data.amount > 1 ? "s" : ""} par lot`, data.weaponClass === "laser" ? `Dégâts ×${data.multiplier}` : `Dégâts ${fmt(data.damageMin)}–${fmt(data.damageMax)}`];
    action = {attribute:"data-buy-ammo",value:id,label:"Acheter les munitions",disabled:false};
  }else if(kind === "drone"){
    badge = "Drone";subtitle = "1 emplacement · laser ou générateur";
    const next = count < data.maxStandardOwned ? (dronePrice?.(count) ?? Math.round(data.basePrice*Math.pow(2,count))) : null;
    baseUnit = finiteCount(next); lock = next === null ? `Limite de ${data.maxStandardOwned} drones standards atteinte.` : "";
    status = `${fmt(count)} drone${count > 1 ? "s" : ""} possédé${count > 1 ? "s" : ""}`;
    stats = [stat("Drones standards",`${Math.min(count,data.maxStandardOwned)} / ${data.maxStandardOwned}`,"drone"),stat("Capacité totale",data.maxOwned,"drone"),stat("Emplacement","1 par drone","cargo"),stat("Compatibilité","Laser / générateur","weapon")];
    note = "Deux places réservées aux futurs drones spéciaux à fabriquer. Prix doublé à chaque achat.";
    facts = [`${fmt(count)} / ${data.maxStandardOwned} standards`,"Prix progressif"];
    priceLabel = "Prochain drone";
    action = {attribute:"data-buy-combat-drone",value:"",label:lock ? "Limite atteinte" : "Acheter le drone",disabled:Boolean(lock)};
  }else if(kind === "droneFormation"){
    badge = "Formation";subtitle = "Formation de drones";
    stats = [stat("Bonus",data.stats.bonus,"check"),stat("Malus",data.stats.malus,"info")];
    facts = [data.stats.bonus,data.stats.malus];
    status = active ? "Active" : owned ? "Possédée" : "Disponible";
    action = {attribute:"data-buy-drone-formation",value:id,label:active ? "Formation active" : owned ? "Activer la formation" : "Acheter la formation",disabled:active};
  }else if(kind === "booster"){
    const remaining = Number(state.boosters?.s1?.[data.type]?.remainingMs || 0);
    const reserve = getS1BoosterUnitCount(state.boosters,data.type);
    subtitle = `+${Math.round(data.percent*100)} % ${boosterLabel[data.type] || data.type} · 5 h`;badge = "Booster S1";
    lock = getS1BoosterPurchaseBlockReason(state.boosters,data.type);
    status = remaining > 0 ? `${fmt(reserve)} en réserve` : "Inactif";
    stats = [stat("Bonus",`+${Math.round(data.percent*100)} % ${boosterLabel[data.type] || data.type}`,"booster"),stat("Durée","5 h par unité","clock"),stat("Réserve",`${fmt(reserve)} / ${fmt(MAX_S1_BOOSTER_UNITS)}`,"cargo"),stat("Temps restant",durationLabel(remaining),"clock")];
    facts = ["1 booster · 5 h",`${fmt(reserve)} / ${fmt(MAX_S1_BOOSTER_UNITS)} en réserve`];
    note = "Les achats prolongent la réserve sans augmenter le bonus. Durée consommée pendant la connexion.";
    action = {attribute:"data-buy-booster",value:id,label:"Acheter 1 booster",disabled:Boolean(lock)};
  }else if(kind === "premiumPack"){
    const gold = data.tier === "gold";
    badge = gold ? "Premium OR" : "Premium";subtitle = `${data.days} jours · ${gold ? "Calendrier OR inclus" : "Sans calendrier OR"}`;
    status = gold ? (isPremiumGoldActive(player) ? "Premium OR actif" : "Non actif") : isPremiumActive(player) ? premiumRemainingLabel(player) : "Non actif";
    stats = [stat("Durée",`${data.days} jours`,"clock"),stat("Calendrier OR",gold ? "Inclus" : "Non inclus","calendar"),stat("Statut",status,"premium")];
    features = data.features || [];facts = [`${data.days} jours`,gold ? "Calendrier OR inclus" : "Sans calendrier OR"];
    note = "Paiement uniquement en euros. L’achat sera disponible ultérieurement.";
    priceLabel = "Prix du pass";
    action = {attribute:null,value:"",label:"Paiement à venir",disabled:true};
  }else{
    badge = product.category === "canon" ? "Arme" : product.category === "generateur" ? "Générateur" : "Extra";
    subtitle = data.slotType === "rocketLauncher" ? "Lance-roquettes" : data.slotType === "missileLauncher" ? "Lance-missiles" : badge;
    if(data.weapon){
      const w = data.weapon;
      stats.push(stat("Dégâts",`${w.minDamage ?? w.damage ?? 0}–${w.maxDamage ?? w.damage ?? 0}`,"weapon"),stat("Portée",w.range,"rocket"),stat("Cadence",`${Number(w.cooldown).toFixed(2)} s`,"clock"));
    }else if(data.slotType === "rocketLauncher"){
      stats.push(stat("Dégâts roquette",data.stats.degats,"weapon"),stat("Portée",data.stats.portee,"rocket"),stat("Cadence",data.stats.cadence,"clock"));
    }else if(data.slotType === "missileLauncher"){
      stats.push(stat("Dégâts missile",data.stats.degats,"weapon"),stat("Portée",data.stats.portee,"rocket"),stat("Recharge",data.stats.recharge,"clock"),stat("Capacité",data.stats.missiles,"ammo"),stat("Recharge totale",data.stats.rechargeTotale,"clock"));
    }else if(data.category === "generateur"){
      const s = data.stats || {};
      if(s.bouclier)stats.push(stat("Bouclier",`+${fmt(s.bouclier)}`,"shield"));
      if(s.regen)stats.push(stat("Régénération",`+${fmt(s.regen)} / s`,"regen"));
      if(s.absorption)stats.push(stat("Absorption",s.absorption,"shield"));
      if(s.vitesse)stats.push(stat("Vitesse",`+${fmt(s.vitesse)}`,"speed"));
      stats.push(stat("Emplacement","Vaisseau / drone","cargo"));
    }else stats.push(stat("Effet",data.stats?.extra || "Bonus passif","extra"));
    if(data.category === "extra")stats.push(stat("Emplacement","Extra de vaisseau","cargo"));
    facts = stats.slice(0,2).map(s=>`${s.label} ${s.value}`);
    stats.push(stat("Stock",fmt(count),"cargo"));
    if(state.tutorial?.status === "active" && state.tutorial.step === "launcher_select_laser" && id === "laser_mk1"){
      action.disabled = true;
    }
  }
  if(lock)status = lock;
  if(quantities)priceLabel = quantity > 1 ? `Total · ${fmt(quantity)} lots` : "Prix du lot";
  const priceType = data.priceType || "credits";
  const realMoney = priceType === "real";
  const euroAmount = realMoney ? Math.max(0,Number(String(data.realPrice || "").replace(/ EUR$/, "").replace(",", ".")) || 0) : 0;
  const unitPrice = realMoney ? euroAmount : getShopCurrencyPrice(priceType,baseUnit,player);
  const basePrice = realMoney ? euroAmount : baseUnit*quantity, price = realMoney ? euroAmount : getShopCurrencyPrice(priceType,basePrice,player);
  const balance = Number(player[priceType === "premium" ? "premium" : "credits"] || 0);
  const activating = kind === "droneFormation" && owned;
  const paidAction = !realMoney && !(kind === "ship" && owned) && !activating;
  const insufficient = paidAction && balance < price;
  const surcharge = realMoney ? 0 : getReputationShopSurcharge(player);
  const premiumDiscount = priceType === "premium" && isPremiumActive(player);
  const pricingNote = surcharge
    ? `Réputation : +${surcharge} %${premiumDiscount ? " · Remise Premium : 5 %" : " sur les prix"}.`
    : premiumDiscount ? "Remise Premium de 5 % appliquée." : "";
  action.disabled ||= Boolean(lock || insufficient);
  return {key:shopProductKey(product),id,kind,category:product.category,data,name:data.name,description:data.desc,subtitle,badge,
    rarity:getRarityLabel(data),rarityClass:rarityClass(data),image:data.img,owned,active,status,lock,stats,facts,note,features,
    priceType,unitPrice,baseUnitPrice:baseUnit,price,basePrice,priceLabel,insufficient,activating,action,
    pricingNote,
    quantities,quantity,units,stock:count,searchTerms:`${data.short || ""} ${data.weaponClass || ""}`};
}
