import { ammoTypes, portals } from "../../../src/data/catalog.js";
import { spendCurrency } from "../players/progression.js";

const SPACE_CASTER_COST = 100;
const SPACE_CASTER_REWARDS = [
  {kind:"piece", label:"Piece de portail", amount:1, weight:4},
  {kind:"ammo", id:"ammo_x2", label:"Munitions x2", amount:250, weight:23},
  {kind:"ammo", id:"ammo_x3", label:"Munitions x3", amount:100, weight:12},
  {kind:"ammo", id:"ammo_x4", label:"Munitions x4", amount:35, weight:5},
  {kind:"ammo", id:"rocket_r1", label:"Roquettes R-1", amount:12, weight:27},
  {kind:"ammo", id:"rocket_r2", label:"Roquettes R-2", amount:6, weight:14},
  {kind:"ammo", id:"rocket_r3", label:"Roquettes R-3", amount:2, weight:6},
  {kind:"ammo", id:"missile_m1", label:"Missiles MS-1", amount:5, weight:5},
  {kind:"ammo", id:"missile_m2", label:"Missiles MS-2", amount:2, weight:4}
];

function getPortal(id){
  return portals.find(portal=>portal.id === id) || null;
}

function canDropPortalPiece(profile, portal){
  const completed = Math.max(0, Number(profile.completedPortals?.[portal.id] || 0));
  const pieces = Math.max(0, Number(profile.portalPieces?.[portal.id] || 0));
  return completed > 0 || pieces < Number(portal.piecesRequired || 0);
}

function getRewards(profile, portal){
  return SPACE_CASTER_REWARDS.filter(reward=>reward.kind !== "piece" || canDropPortalPiece(profile, portal));
}

function pickReward(profile, portal){
  const rewards = getRewards(profile, portal);
  const total = rewards.reduce((sum, reward)=>sum + Number(reward.weight || 0), 0);
  let roll = Math.random() * Math.max(1, total);
  for(const reward of rewards){
    roll -= Number(reward.weight || 0);
    if(roll <= 0) return reward;
  }
  return rewards[0];
}

export function runServerSpaceCaster(profile, {portalId, count = 1} = {}){
  const portal = getPortal(String(portalId || ""));
  if(!portal) return {ok:false, reason:"Portail introuvable."};
  const rollCount = [1, 10, 100].includes(Number(count)) ? Number(count) : 1;
  const cost = SPACE_CASTER_COST * rollCount;
  const spend = spendCurrency(profile.player || {}, "premium", cost);
  if(!spend.ok) return {...spend, reason:"Pas assez de NOVA."};
  profile.player = spend.player;
  if(!profile.portalPieces || typeof profile.portalPieces !== "object") profile.portalPieces = {};
  if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
  const summary = new Map();
  for(let i = 0; i < rollCount; i += 1){
    const reward = pickReward(profile, portal);
    const label = reward.kind === "piece" ? `Piece ${portal.name}` : reward.label;
    const img = reward.kind === "piece" ? (portal.pieceImg || portal.img) : ammoTypes.find(ammo=>ammo.id === reward.id)?.img;
    const amount = Math.max(1, Math.round(Number(reward.amount || 1)));
    if(reward.kind === "piece"){
      profile.portalPieces[portal.id] = Math.max(0, Number(profile.portalPieces[portal.id] || 0)) + amount;
    }else{
      profile.ammoInventory[reward.id] = Math.max(0, Number(profile.ammoInventory[reward.id] || 0)) + amount;
    }
    const key = `${reward.kind}:${reward.id || portal.id}`;
    const current = summary.get(key) || {kind:reward.kind, id:reward.id || portal.id, label, amount:0, img};
    current.amount += amount;
    summary.set(key, current);
  }
  return {
    ok:true,
    portal:{id:portal.id, name:portal.name},
    count:rollCount,
    cost:spend.cost,
    baseCost:cost,
    rewards:[...summary.values()]
  };
}
