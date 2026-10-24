export const PREMIUM_DAY_MS = 24 * 60 * 60 * 1000;
export const PREMIUM_NOVA_DISCOUNT_RATE = 0.05;
export const PREMIUM_REPAIR_BOT_MULTIPLIER = 1.5;
export const PREMIUM_REFINERY_SHIPMENT_DURATION_MULTIPLIER = 0.5;
export const PREMIUM_LOGOUT_DELAY_MS = 5000;
export const PREMIUM_REWARD_DAYS = 28;
// Preparation: keep the official storefront accessible; set true for the Beta-only launch.
export const BETA_STORE_ONLY = false;

export const premiumFeatureList = [
  "-5% sur tous les prix en NOVA",
  "Transferts raffinerie vers vaisseau 2× plus rapides",
  "Drone de reparation : soin +50%",
  "Deconnexion hors combat reduite a 5 secondes",
  "Portgun premium : teleportation en 5 secondes",
  "Voyage automatique entre les secteurs",
  "Quetes hebdomadaires du relais de quetes",
  "Acces aux futures cartes apres le Core"
];

export const premiumGoldFeatureList = [
  ...premiumFeatureList,
  "Calendrier de recompenses premium mensuel"
];

export const premiumShopPacks = [
  {
    id:"premium_classic_week",
    name:"Pass Premium 7 jours",
    short:"Premium 7J",
    category:"premium",
    tier:"classic",
    img:"assets/store/premium-pass-7.png",
    rarity:"PREMIUM",
    priceType:"real",
    realPrice:"1,99 EUR",
    days:7,
    desc:"Tous les avantages Premium pendant 7 jours, sans calendrier OR.",
    features:premiumFeatureList
  },
  {
    id:"premium_classic_month",
    name:"Pass Premium 30 jours",
    short:"Premium 30J",
    category:"premium",
    tier:"classic",
    img:"assets/store/premium-pass-30.png",
    rarity:"PREMIUM",
    priceType:"real",
    realPrice:"6,99 EUR",
    days:30,
    desc:"Tous les avantages Premium pendant 30 jours, sans calendrier OR.",
    features:premiumFeatureList
  },
  {
    id:"premium_week",
    name:"Pass Premium OR 7 jours",
    short:"Premium OR 7J",
    category:"premium",
    tier:"gold",
    img:"assets/store/premium-pass-7.png",
    rarity:"PREMIUM",
    priceType:"real",
    realPrice:"2,99 EUR",
    days:7,
    desc:"Tous les avantages Premium et le calendrier OR pendant 7 jours.",
    features:premiumGoldFeatureList
  },
  {
    id:"premium_month",
    name:"Pass Premium OR 30 jours",
    short:"Premium OR 30J",
    category:"premium",
    tier:"gold",
    img:"assets/store/premium-pass-30.png",
    rarity:"PREMIUM",
    priceType:"real",
    realPrice:"10,99 EUR",
    days:30,
    desc:"Tous les avantages Premium et le calendrier OR pendant 30 jours.",
    features:premiumGoldFeatureList
  }
];

export const storeTabs = [
  {id:"beta", label:"Bêta", title:"Bêta", subtitle:"Packs Bêta, calendrier de 25 jours et bonus de lancement."},
  {id:"premium", label:"Premium", title:"Pass Premium", subtitle:"Premium et Premium OR, uniquement en euros. Paiement à venir."},
  {id:"currencies", label:"NOVA & Crédits", title:"NOVA et crédits", subtitle:"Consultez les packs de monnaie prévus pour la boutique officielle."},
  {id:"starters", label:"Packs de départ", title:"Packs de départ", subtitle:"Vaisseau, équipement et pass Premium. Paiement en euros à venir."},
  {id:"rewards", label:"Calendrier OR", title:"Calendrier OR", subtitle:"28 récompenses chaque mois pour les comptes Premium OR."}
];

export const betaLaunchMessage = "Pendant la beta, ces packs a prix reduit servent a tester vite le contenu. Tous les joueurs qui contribuent recevront un pack gratuit lors du lancement officiel, adapte au pack beta achete.";

// Keep these historical purchase IDs stable when pack names or contents change.
export const betaPacks = [
  {
    id:"beta_valkyrie",
    name:"Pack Beta Valkyrie",
    price:"1,49 EUR",
    tag:"BETA I",
    img:"assets/ships/Valkyrie.png?v=20260726-kharon1",
    desc:"Pack beta abordable pour demarrer les tests avec un vrai vaisseau de progression.",
    officialReward:"Lancement officiel : 1 semaine Premium offerte.",
    contents:[
      {label:"Vaisseau Valkyrie", quantity:"x1", img:"assets/ships/Valkyrie.png?v=20260726-kharon1", kind:"ship"},
      {label:"Canon Laser MK-III", quantity:"x5", img:"assets/equipment/laser_mk3_slot_v2.png", kind:"equipment"},
      {label:"Munition M-3", quantity:"x50 000", img:"assets/equipment/ammo_laser_x3_same_preview.png", kind:"ammo"},
      {label:"Generateur A II", quantity:"x3", img:"assets/equipment/generator_shield_omega.png", kind:"equipment"}
    ]
  },
  {
    id:"beta_astralis",
    name:"Pack Beta Razorion",
    price:"4,99 EUR",
    tag:"BETA II",
    img:"assets/ships/Razorion.png",
    desc:"Pack beta avance pour tester un Razorion bien equipe et une reserve NOVA de depart.",
    officialReward:"Lancement officiel : 1 mois Premium offert.",
    contents:[
      {label:"Vaisseau Razorion", quantity:"x1", img:"assets/ships/Razorion.png", kind:"ship"},
      {label:"Canon Laser MK-IV", quantity:"x5", img:"assets/equipment/laser_mk4_slot_v2.png", kind:"equipment"},
      {label:"Canon Laser MK-III", quantity:"x3", img:"assets/equipment/laser_mk3_slot_v2.png", kind:"equipment"},
      {label:"Generateur A II", quantity:"x5", img:"assets/equipment/generator_shield_omega.png", kind:"equipment"},
      {label:"Generateur Vitesse II", quantity:"x5", img:"assets/equipment/generator_speed_mk2.png", kind:"equipment"},
      {label:"Munition M-4", quantity:"x20 000", img:"assets/equipment/ammo_laser_x4_same_preview.png", kind:"ammo"},
      {label:"NOVA", quantity:"25 000", img:"assets/icons/premium.svg", kind:"premium"}
    ]
  },
  {
    id:"beta_commander",
    name:"Pack Beta Astralis",
    price:"9,99 EUR",
    tag:"BETA III",
    img:"assets/ships/Astralis.png",
    desc:"Pack beta complet avec un Astralis equipe et de quoi tester le contenu haut niveau.",
    officialReward:"Lancement officiel : 1 mois Premium + pack equivalent a 9,99 EUR sur version officielle.",
    contents:[
      {label:"Vaisseau Astralis", quantity:"x1", img:"assets/ships/Astralis.png", kind:"ship"},
      {label:"Munition M-4", quantity:"x50 000", img:"assets/equipment/ammo_laser_x4_same_preview.png", kind:"ammo"},
      {label:"NOVA", quantity:"50 000", img:"assets/icons/premium.svg", kind:"premium"},
      {label:"Canon Laser MK-IV", quantity:"x10", img:"assets/equipment/laser_mk4_slot_v2.png", kind:"equipment"},
      {label:"Generateur Vitesse II", quantity:"x10", img:"assets/equipment/generator_speed_mk2.png", kind:"equipment"},
      {label:"Generateur A II", quantity:"x10", img:"assets/equipment/generator_shield_omega.png", kind:"equipment"},
      {label:"Drone de Reparation Rouge", quantity:"x1", img:"assets/equipment/drone_repair_red.png", kind:"equipment"}
    ]
  }
];

const betaSpecialRewardByDay = {
  5:{day:5, label:"3 cles du portail Deadly", reward:{itemCounts:{portal_anchor_key:3}}},
  10:{day:10, label:"50 000 munitions M-4", reward:{ammo:{ammo_x4:50000}}},
  15:{day:15, label:"Vaisseau premium aleatoire", reward:{shipRandom:{label:"1 vaisseau aleatoire : Vesperion, Nyxaris ou Asterion", shipIds:["vesperion", "nyxaris", "asterion"]}}},
  20:{day:20, label:"100 000 NOVA", reward:{premium:100000}},
  25:{day:25, label:"10 Laser MK-IV", reward:{itemCounts:{laser_mk4:10}}}
};

export const betaRewardCalendar = Array.from({length:25}, (_, index)=>{
  const day = index + 1;
  return betaSpecialRewardByDay[day] || {day, label:"5 000 NOVA", reward:{premium:5000}};
}).map(entry=>({
  day:entry.day,
  label:entry.label,
  reward:entry.reward
}));

export function normalizeBetaPackPurchases(value = []){
  const validIds = new Set(betaPacks.map(pack=>pack.id));
  return [...new Set((Array.isArray(value) ? value : [])
    .map(id=>String(id || ""))
    .filter(id=>validIds.has(id)))];
}

export function hasBetaPackPurchase(profile = {}, id = ""){
  return normalizeBetaPackPurchases(profile?.betaPackPurchases).includes(String(id || ""));
}

export function normalizeBetaRewardState(value = {}){
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const claimedDays = [...new Set((Array.isArray(source.claimedDays) ? source.claimedDays : [])
    .map(day=>Math.floor(Number(day || 0)))
    .filter(day=>day >= 1 && day <= betaRewardCalendar.length))]
    .sort((a, b)=>a - b);
  return {
    claimedDays,
    lastClaimDate:String(source.lastClaimDate || ""),
    randomShipRewards:source.randomShipRewards && typeof source.randomShipRewards === "object" && !Array.isArray(source.randomShipRewards)
      ? {...source.randomShipRewards}
      : {}
  };
}

export function getBetaRewardDateKey(now = Date.now()){
  const date = new Date(Number(now || Date.now()));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getBetaRewardStatus(profile = {}, now = Date.now()){
  const state = normalizeBetaRewardState(profile?.betaRewardState);
  const claimedCount = state.claimedDays.length;
  const completed = claimedCount >= betaRewardCalendar.length;
  const nextDay = completed ? betaRewardCalendar.length : claimedCount + 1;
  const todayKey = getBetaRewardDateKey(now);
  const claimedToday = state.lastClaimDate === todayKey;
  const canClaim = !completed && !claimedToday;
  let reason = "";
  if(completed) reason = "Calendrier beta termine.";
  else if(claimedToday) reason = "Recompense beta deja reclamee aujourd'hui.";
  return {
    state,
    claimedDays:state.claimedDays,
    claimedCount,
    nextDay,
    reward:betaRewardCalendar[nextDay - 1] || null,
    claimedToday,
    canClaim,
    completed,
    reason
  };
}

export function claimBetaRewardState(profile = {}, now = Date.now()){
  const status = getBetaRewardStatus(profile, now);
  if(!status.canClaim) return {ok:false, reason:status.reason || "Recompense beta indisponible.", status};
  const nextState = {
    ...status.state,
    claimedDays:[...status.claimedDays, status.nextDay],
    lastClaimDate:getBetaRewardDateKey(now)
  };
  profile.betaRewardState = nextState;
  return {
    ok:true,
    day:status.nextDay,
    reward:status.reward,
    state:nextState,
    status:{...status, state:nextState, claimedDays:nextState.claimedDays, claimedCount:nextState.claimedDays.length, canClaim:false, claimedToday:true}
  };
}

export const novaCurrencyPacks = [
  {id:"nova_5000", name:"Pack Nova I", price:"1,99 EUR", amount:3500, tag:"NOVA", img:"assets/icons/premium.svg", desc:"Petit pack Nova pour soutenir le jeu."},
  {id:"nova_15000", name:"Pack Nova II", price:"5,99 EUR", amount:12000, tag:"NOVA", img:"assets/icons/premium.svg", desc:"Pack Nova de confort."},
  {id:"nova_35000", name:"Pack Nova III", price:"10,99 EUR", amount:24000, tag:"NOVA", img:"assets/icons/premium.svg", desc:"Reserve Nova intermediaire."},
  {id:"nova_75000", name:"Pack Nova IV", price:"24,99 EUR", amount:60000, tag:"NOVA", img:"assets/icons/premium.svg", desc:"Gros pack Nova pour progresser vite."},
  {id:"nova_160000", name:"Pack Nova V", price:"49,99 EUR", amount:125000, tag:"NOVA", img:"assets/icons/premium.svg", desc:"Reserve Nova avancee."},
  {id:"nova_330000", name:"Pack Nova VI", price:"99,99 EUR", amount:265000, tag:"NOVA", img:"assets/icons/premium.svg", desc:"Pack soutien maximum."}
];

export const creditCurrencyPacks = [
  {id:"credits_5000000", name:"Pack Credits I", price:"1,99 EUR", amount:5000000, tag:"CR", img:"assets/icons/credits.svg", desc:"Petit pack credits pour demarrer vite."},
  {id:"credits_15000000", name:"Pack Credits II", price:"5,99 EUR", amount:15000000, tag:"CR", img:"assets/icons/credits.svg", desc:"Pack credits de confort."},
  {id:"credits_35000000", name:"Pack Credits III", price:"10,99 EUR", amount:35000000, tag:"CR", img:"assets/icons/credits.svg", desc:"Reserve credits intermediaire."},
  {id:"credits_75000000", name:"Pack Credits IV", price:"24,99 EUR", amount:75000000, tag:"CR", img:"assets/icons/credits.svg", desc:"Gros pack credits pour les achats couteux."},
  {id:"credits_160000000", name:"Pack Credits V", price:"49,99 EUR", amount:160000000, tag:"CR", img:"assets/icons/credits.svg", desc:"Reserve credits avancee."},
  {id:"credits_330000000", name:"Pack Credits VI", price:"99,99 EUR", amount:330000000, tag:"CR", img:"assets/icons/credits.svg", desc:"Pack credits maximum."}
];

export const starterPacks = [
  {
    id:"starter_razorion",
    name:"Pack Razorion",
    price:"5,99 EUR",
    tag:"STARTER",
    img:"assets/ships/Razorion.png",
    ship:"Razorion",
    desc:"Pack offensif pour demarrer avec un Razorion equipe en MK-III.",
    status:"Paiement bientot",
    contents:[
      {label:"Pass Premium 7 jours", quantity:"x1", img:"assets/store/premium-pass-7.png", kind:"premium"},
      {label:"Vaisseau Razorion", quantity:"x1", img:"assets/ships/Razorion.png", kind:"ship"},
      {label:"Canon Laser MK-III", quantity:"x8", img:"assets/equipment/laser_mk3_slot_v2.png", kind:"equipment"},
      {label:"Munition M-3", quantity:"x30 000", img:"assets/equipment/ammo_laser_x3_same_preview.png", kind:"ammo"}
    ]
  },
  {
    id:"starter_astralis",
    name:"Pack Astralis",
    price:"15,99 EUR",
    tag:"STARTER",
    img:"assets/ships/Astralis.png",
    ship:"Astralis",
    desc:"Pack avance avec Astralis, lasers MK-IV/MK-III et premium 30 jours.",
    status:"Paiement bientot",
    contents:[
      {label:"Pass Premium 30 jours", quantity:"x1", img:"assets/store/premium-pass-30.png", kind:"premium"},
      {label:"Vaisseau Astralis", quantity:"x1", img:"assets/ships/Astralis.png", kind:"ship"},
      {label:"Canon Laser MK-IV", quantity:"x3", img:"assets/equipment/laser_mk4_slot_v2.png", kind:"equipment"},
      {label:"Canon Laser MK-III", quantity:"x7", img:"assets/equipment/laser_mk3_slot_v2.png", kind:"equipment"},
      {label:"Munition M-3", quantity:"x80 000", img:"assets/equipment/ammo_laser_x3_same_preview.png", kind:"ammo"}
    ]
  }
];

export function normalizeStarterPackPurchases(value = []){
  const validIds = new Set(starterPacks.map(pack=>pack.id));
  return [...new Set((Array.isArray(value) ? value : [])
    .map(id=>String(id || ""))
    .map(id=>id === "starter_astra_3d" ? "starter_astralis" : id)
    .filter(id=>validIds.has(id)))];
}

export function hasStarterPackPurchase(profile = {}, id = ""){
  return normalizeStarterPackPurchases(profile?.starterPackPurchases).includes(String(id || ""));
}

export function markStarterPackPurchased(profile = {}, id = ""){
  const packId = String(id || "");
  if(!starterPacks.some(pack=>pack.id === packId)) return false;
  const purchases = normalizeStarterPackPurchases(profile.starterPackPurchases);
  if(purchases.includes(packId)) return false;
  profile.starterPackPurchases = [...purchases, packId];
  return true;
}

export const premiumRewardCalendar = [
  {day:1, label:"Credits de depart", reward:{credits:25000}},
  {day:2, label:"Munitions M-1", reward:{ammo:{ammo_x1:2500}}},
  {day:3, label:"Nova bonus", reward:{premium:300}},
  {day:4, label:"Roquettes R-1", reward:{ammo:{rocket_r1:75}}},
  {day:5, label:"Credits", reward:{credits:50000}},
  {day:6, label:"Fluide de Teleportation", reward:{itemCounts:{teleportation_fluid:2}}},
  {day:7, label:"Coffre Nova", reward:{premium:750, ammo:{ammo_x2:1000}}},
  {day:8, label:"Munitions M-2", reward:{ammo:{ammo_x2:1500}}},
  {day:9, label:"Credits", reward:{credits:75000}},
  {day:10, label:"Missiles R-1", reward:{ammo:{missile_m1:50}}},
  {day:11, label:"Nova bonus", reward:{premium:500}},
  {day:12, label:"Roquettes R-2", reward:{ammo:{rocket_r2:50}}},
  {day:13, label:"Credits", reward:{credits:100000}},
  {day:14, label:"Pack combat", reward:{premium:1000, ammo:{ammo_x2:2000, rocket_r2:75}}},
  {day:15, label:"Munitions M-3", reward:{ammo:{ammo_x3:1000}}},
  {day:16, label:"Credits", reward:{credits:150000}},
  {day:17, label:"Fluide de Teleportation", reward:{itemCounts:{teleportation_fluid:3}}},
  {day:18, label:"Nova bonus", reward:{premium:800}},
  {day:19, label:"Missiles R-2", reward:{ammo:{missile_m2:30}}},
  {day:20, label:"Munitions M-4", reward:{ammo:{ammo_x4:750}}},
  {day:21, label:"Coffre premium", reward:{premium:1500, credits:200000}},
  {day:22, label:"Roquettes R-3", reward:{ammo:{rocket_r3:40}}},
  {day:23, label:"Credits", reward:{credits:250000}},
  {day:24, label:"Cle portail Deadly", reward:{itemCounts:{portal_anchor_key:1}}},
  {day:25, label:"Nova bonus", reward:{premium:1200}},
  {day:26, label:"Munitions avancees", reward:{ammo:{ammo_x4:1200, missile_m2:40}}},
  {day:27, label:"Credits", reward:{credits:350000}},
  {day:28, label:"Grande prime premium", reward:{premium:2500, credits:500000, ammo:{ammo_x4:2000, rocket_r3:75}}}
];

export const realMoneyShopSections = [
  {
    id:"premium",
    title:"Packs Premium",
    subtitle:"Activation directe du statut premium.",
    offers:premiumShopPacks.map(pack=>({
      ...pack,
      id:`real_${pack.id}`,
      sourcePackId:pack.id,
      price:pack.realPrice,
      tag:`${pack.days} jours`,
      status:"Paiement bientot"
    }))
  },
  {
    id:"currencies",
    title:"Nova et credits",
    subtitle:"Packs de monnaie a brancher au prestataire de paiement.",
    offers:[...novaCurrencyPacks, ...creditCurrencyPacks]
  },
  {
    id:"starters",
    title:"Starter packs",
    subtitle:"Packs de départ avec vaisseau, équipement et pass Premium.",
    offers:starterPacks
  },
  {
    id:"rewards",
    title:"Calendrier OR",
    subtitle:"28 recompenses mensuelles reservees aux comptes Premium OR.",
    offers:premiumRewardCalendar
  }
];

export function getPremiumPack(id){
  return premiumShopPacks.find(pack=>pack.id === String(id || "")) || null;
}

function normalizePlayer(value){
  return value?.player && typeof value.player === "object" ? value.player : value;
}

export function getPremiumUntil(value){
  const player = normalizePlayer(value) || {};
  const until = Number(player.premiumUntil || 0);
  return Number.isFinite(until) ? Math.max(0, until) : 0;
}

export function isPremiumActive(value, now = Date.now()){
  const player = normalizePlayer(value) || {};
  const until = getPremiumUntil(player);
  if(until > Number(now || Date.now())) return true;
  return player.premiumActive === true && until <= 0;
}

// Missing Gold expiry means a subscription bought before the two tiers existed.
// An explicit zero belongs to a classic subscription and must stay explicit.
export function getPremiumGoldUntil(value){
  const player = normalizePlayer(value) || {};
  if(player.premiumGoldUntil === undefined) return getPremiumUntil(player);
  const until = Number(player.premiumGoldUntil);
  return Number.isFinite(until) ? Math.max(0, until) : 0;
}

export function isPremiumGoldActive(value, now = Date.now()){
  const player = normalizePlayer(value) || {};
  if(!isPremiumActive(player, now)) return false;
  if(player.premiumGoldUntil === undefined) return true;
  return getPremiumGoldUntil(player) > Number(now || Date.now());
}

export function getPremiumRemainingMs(value, now = Date.now()){
  return Math.max(0, getPremiumUntil(value) - Number(now || Date.now()));
}

export function getNovaDiscountedPrice(price, value, now = Date.now()){
  const base = Math.max(0, Math.round(Number(price || 0)));
  if(base <= 0 || !isPremiumActive(value, now)) return base;
  return Math.max(0, Math.ceil(base * (1 - PREMIUM_NOVA_DISCOUNT_RATE)));
}

export function hasNovaDiscount(price, value, now = Date.now()){
  const base = Math.max(0, Math.round(Number(price || 0)));
  return getNovaDiscountedPrice(base, value, now) < base;
}

export function applyPremiumPackToPlayer(player, pack, now = Date.now()){
  if(!player || !pack) return 0;
  const days = Number(pack.days || 0);
  if(!Number.isFinite(days) || days <= 0) return getPremiumUntil(player);
  const timestamp = Number(now || Date.now());
  const previousGoldUntil = getPremiumGoldUntil(player);
  const until = Math.max(timestamp, getPremiumUntil(player)) + days * PREMIUM_DAY_MS;
  const goldUntil = pack.tier === "classic"
    ? previousGoldUntil
    : Math.max(timestamp, previousGoldUntil) + days * PREMIUM_DAY_MS;
  player.premiumGoldUntil = goldUntil;
  player.premiumUntil = Math.max(until, goldUntil);
  player.premiumActive = true;
  return player.premiumUntil;
}

export function premiumRemainingLabel(value, now = Date.now()){
  const remaining = getPremiumRemainingMs(value, now);
  if(remaining <= 0) return "Inactif";
  const days = Math.floor(remaining / PREMIUM_DAY_MS);
  const hours = Math.floor((remaining % PREMIUM_DAY_MS) / (60 * 60 * 1000));
  if(days > 0) return `${days}j ${hours}h`;
  const minutes = Math.ceil(remaining / (60 * 1000));
  return `${minutes}m`;
}

function pad2(value){
  return String(value).padStart(2, "0");
}

export function premiumRewardMonthKey(now = Date.now()){
  const date = new Date(Number(now || Date.now()));
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function premiumRewardDateKey(now = Date.now()){
  const date = new Date(Number(now || Date.now()));
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function normalizePremiumRewardState(value = {}, now = Date.now()){
  const monthKey = premiumRewardMonthKey(now);
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  if(source.monthKey !== monthKey){
    return {monthKey, claimedDays:[], lastClaimDate:""};
  }
  const claimedDays = [...new Set((Array.isArray(source.claimedDays) ? source.claimedDays : [])
    .map(day=>Math.floor(Number(day || 0)))
    .filter(day=>day >= 1 && day <= PREMIUM_REWARD_DAYS))]
    .sort((a, b)=>a - b);
  return {
    monthKey,
    claimedDays,
    lastClaimDate:String(source.lastClaimDate || "")
  };
}

export function getPremiumRewardStatus(profile = {}, now = Date.now()){
  const rewardState = normalizePremiumRewardState(profile?.premiumRewardState, now);
  const claimedCount = rewardState.claimedDays.length;
  const nextDay = Math.min(PREMIUM_REWARD_DAYS, claimedCount + 1);
  const completed = claimedCount >= PREMIUM_REWARD_DAYS;
  const premiumActive = isPremiumActive(profile?.player ? profile.player : profile, now);
  const premiumGoldActive = isPremiumGoldActive(profile?.player ? profile.player : profile, now);
  const todayKey = premiumRewardDateKey(now);
  const claimedToday = rewardState.lastClaimDate === todayKey;
  const canClaim = premiumGoldActive && !completed && !claimedToday;
  let reason = "";
  if(completed) reason = "Calendrier premium termine pour ce mois.";
  else if(!premiumGoldActive) reason = "Premium OR requis.";
  else if(claimedToday) reason = "Recompense deja reclamee aujourd'hui.";
  return {
    state:rewardState,
    monthKey:rewardState.monthKey,
    claimedDays:rewardState.claimedDays,
    claimedCount,
    nextDay,
    reward:premiumRewardCalendar[nextDay - 1] || null,
    premiumActive,
    premiumGoldActive,
    claimedToday,
    canClaim,
    completed,
    reason
  };
}

export function claimPremiumRewardState(profile = {}, now = Date.now()){
  const status = getPremiumRewardStatus(profile, now);
  if(!status.canClaim) return {ok:false, reason:status.reason || "Recompense premium indisponible.", status};
  const nextState = {
    monthKey:status.monthKey,
    claimedDays:[...status.claimedDays, status.nextDay],
    lastClaimDate:premiumRewardDateKey(now)
  };
  profile.premiumRewardState = nextState;
  return {
    ok:true,
    day:status.nextDay,
    reward:status.reward,
    state:nextState,
    status:{...status, state:nextState, claimedDays:nextState.claimedDays, claimedCount:nextState.claimedDays.length, canClaim:false, claimedToday:true}
  };
}
