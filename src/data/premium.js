export const PREMIUM_DAY_MS = 24 * 60 * 60 * 1000;
export const PREMIUM_NOVA_DISCOUNT_RATE = 0.05;
export const PREMIUM_REPAIR_BOT_MULTIPLIER = 1.5;
export const PREMIUM_REFINERY_SHIPMENT_DURATION_MULTIPLIER = 0.5;
export const PREMIUM_LOGOUT_DELAY_MS = 5000;
export const PREMIUM_REWARD_DAYS = 28;

export const premiumFeatureList = [
  "-5% sur tous les prix en NOVA",
  "Transferts raffinerie vers vaisseau 50% plus rapides",
  "Drone de reparation : soin +50%",
  "Deconnexion hors combat reduite a 5 secondes",
  "Portgun premium : teleportation en 5 secondes",
  "Quetes hebdomadaires du relais de quetes",
  "Acces aux futures cartes apres le Core",
  "Calendrier de recompenses premium mensuel"
];

export const premiumShopPacks = [
  {
    id:"premium_week",
    name:"Pass Premium 7 jours",
    short:"Premium 7J",
    category:"premium",
    img:"assets/icons/premium_pass_7.svg",
    rarity:"PREMIUM",
    priceType:"premium",
    price:20000,
    realPrice:"3,99 EUR",
    days:7,
    desc:"Active le statut premium pendant 7 jours.",
    features:premiumFeatureList
  },
  {
    id:"premium_month",
    name:"Pass Premium 30 jours",
    short:"Premium 30J",
    category:"premium",
    img:"assets/icons/premium_pass_30.svg",
    rarity:"PREMIUM",
    priceType:"premium",
    price:75000,
    realPrice:"14,99 EUR",
    days:30,
    desc:"Active le statut premium pendant 30 jours.",
    features:premiumFeatureList
  }
];

export const storeTabs = [
  {id:"premium", label:"Pack Premium", title:"Packs Premium", subtitle:"Pass premium achetables en euros ou en NOVA dans le magasin."},
  {id:"currencies", label:"Nova / Credit", title:"Nova et Credits", subtitle:"Packs de monnaie a brancher au prestataire de paiement."},
  {id:"starters", label:"Starter Pack", title:"Starter Packs", subtitle:"Packs de depart a definir avec vaisseau, lasers et extras."},
  {id:"rewards", label:"Recompense Premium", title:"Recompenses Premium", subtitle:"Calendrier mensuel de 28 jours reserve aux comptes premium."}
];

export const novaCurrencyPacks = [
  {id:"nova_5000", name:"Pack Nova I", price:"1,99 EUR", amount:5000, tag:"NOVA", img:"assets/icons/premium.svg", desc:"Petit pack Nova pour soutenir le jeu."},
  {id:"nova_15000", name:"Pack Nova II", price:"5,99 EUR", amount:15000, tag:"NOVA", img:"assets/icons/premium.svg", desc:"Pack Nova de confort."},
  {id:"nova_35000", name:"Pack Nova III", price:"10,99 EUR", amount:35000, tag:"NOVA", img:"assets/icons/premium.svg", desc:"Reserve Nova intermediaire."},
  {id:"nova_75000", name:"Pack Nova IV", price:"24,99 EUR", amount:75000, tag:"NOVA", img:"assets/icons/premium.svg", desc:"Gros pack Nova pour progresser vite."},
  {id:"nova_160000", name:"Pack Nova V", price:"49,99 EUR", amount:160000, tag:"NOVA", img:"assets/icons/premium.svg", desc:"Reserve Nova avancee."},
  {id:"nova_330000", name:"Pack Nova VI", price:"99,99 EUR", amount:330000, tag:"NOVA", img:"assets/icons/premium.svg", desc:"Pack soutien maximum."}
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
      {label:"Pass Premium 7 jours", quantity:"x1", img:"assets/icons/premium_pass_7.svg", kind:"premium"},
      {label:"Vaisseau Razorion", quantity:"x1", img:"assets/ships/Razorion.png", kind:"ship"},
      {label:"Canon Laser MK-III", quantity:"x8", img:"assets/equipment/laser_mk3_slot_v2.png", kind:"equipment"},
      {label:"Munition M-3", quantity:"x30 000", img:"assets/equipment/ammo_laser_x3_same_preview.png", kind:"ammo"}
    ]
  },
  {
    id:"starter_astra_3d",
    name:"Pack Astra 3D Test",
    price:"15,99 EUR",
    tag:"STARTER",
    img:"assets/ships/Astra 3D Test.png",
    ship:"Astra 3D Test",
    desc:"Pack avance avec Astra 3D Test, lasers MK-IV/MK-III et premium 30 jours.",
    status:"Paiement bientot",
    contents:[
      {label:"Pass Premium 30 jours", quantity:"x1", img:"assets/icons/premium_pass_30.svg", kind:"premium"},
      {label:"Vaisseau Astra 3D Test", quantity:"x1", img:"assets/ships/Astra 3D Test.png", kind:"ship"},
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
  {day:24, label:"Cle d'ancrage", reward:{itemCounts:{portal_anchor_key:1}}},
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
    subtitle:"Packs vaisseau, lasers et extras a definir plus tard.",
    offers:starterPacks
  },
  {
    id:"rewards",
    title:"Recompenses premium",
    subtitle:"28 recompenses mensuelles reservees aux comptes premium.",
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
  const days = Math.max(0, Number(pack.days || 0));
  const start = Math.max(Number(now || Date.now()), getPremiumUntil(player));
  const until = start + days * PREMIUM_DAY_MS;
  player.premiumUntil = until;
  player.premiumActive = true;
  return until;
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
  const todayKey = premiumRewardDateKey(now);
  const claimedToday = rewardState.lastClaimDate === todayKey;
  const canClaim = premiumActive && !completed && !claimedToday;
  let reason = "";
  if(completed) reason = "Calendrier premium termine pour ce mois.";
  else if(!premiumActive) reason = "Premium requis.";
  else if(claimedToday) reason = "Recompense deja reclamee aujourd'hui.";
  return {
    state:rewardState,
    monthKey:rewardState.monthKey,
    claimedDays:rewardState.claimedDays,
    claimedCount,
    nextDay,
    reward:premiumRewardCalendar[nextDay - 1] || null,
    premiumActive,
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
