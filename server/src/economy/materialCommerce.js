import { MATERIAL_COMMERCE_ORDER, getMaterialCommerceUnitPrice, getMaterialCommerceValue } from "../../../src/shared/materialCommerce.js";
import { FIRMS, getFirmIdFromMapName, normalizeFirmId } from "../../../src/data/firms.js";
import { WORLD_MAPS } from "../world/definitions.js";
import { getRawMaterial, getShipCargo } from "./refineryProfile.js";

function normalizeSaleAmount(amount){
  return Math.max(0, Math.floor(Number(amount || 0)));
}

function ensureEconomyProfile(profile){
  if(!profile.player || typeof profile.player !== "object") profile.player = {};
  if(!profile.shipCargo || typeof profile.shipCargo !== "object") profile.shipCargo = {};
}

export function getServerMaterialCommerceAccess(profile, player){
  if(!player?.state) return {ok:false, reason:"Vente de materiaux autorisee uniquement en jeu, dans les zones de ta firme."};
  const profileFirmId = String(profile?.player?.firmId || "").trim().toLowerCase();
  if(profile?.player?.firmSelected !== true || !FIRMS.some(firm=>firm.id === profileFirmId)){
    return {ok:false, reason:"Selectionne d'abord ta firme avant de vendre des materiaux."};
  }
  const map = WORLD_MAPS[String(player.state.mapId ?? "")];
  const mapFirmId = map?.firmId || getFirmIdFromMapName(map?.name);
  const playerFirmId = normalizeFirmId(profileFirmId);
  if(!mapFirmId || normalizeFirmId(mapFirmId) !== playerFirmId){
    return {ok:false, reason:"Vente de materiaux autorisee uniquement dans les zones de ta firme."};
  }
  return {ok:true, mapId:String(map.id), firmId:playerFirmId};
}

function getCommerceCargo(profile, shipId){
  const activeShipId = String(profile.activeShip || "");
  const requestedShipId = String(shipId || activeShipId);
  if(activeShipId && requestedShipId && requestedShipId !== activeShipId){
    return {ok:false, reason:"Soute du vaisseau actif uniquement."};
  }
  const resolvedShipId = activeShipId || requestedShipId;
  const cargo = getShipCargo(profile, resolvedShipId);
  if(!cargo) return {ok:false, reason:"Soute du vaisseau introuvable."};
  return {ok:true, cargo, shipId:resolvedShipId};
}

function sellOneMaterial(profile, materialId, amount, {all = false, shipId = ""} = {}){
  const id = String(materialId || "");
  const material = getRawMaterial(id);
  if(!material) return {ok:false, reason:"Materiau inconnu."};
  const unitPrice = getMaterialCommerceUnitPrice(id);
  if(unitPrice <= 0) return {ok:false, reason:"Materiau non vendu ici."};
  const cargoState = getCommerceCargo(profile, shipId);
  if(!cargoState.ok) return cargoState;
  const cargo = cargoState.cargo;
  const owned = normalizeSaleAmount(cargo[id]);
  const requested = all ? owned : normalizeSaleAmount(amount);
  if(requested <= 0) return {ok:false, reason:"Quantite invalide."};
  if(owned < requested) return {ok:false, reason:"Stock insuffisant."};
  const credits = getMaterialCommerceValue(id, requested);
  ensureEconomyProfile(profile);
  cargo[id] = owned - requested;
  return {
    ok:true,
    material:{id:material.id, name:material.name || material.id, short:material.short || material.id},
    amount:requested,
    unitPrice,
    credits,
    shipId:cargoState.shipId || ""
  };
}

export function sellServerCommerceMaterials(profile, {materialId, amount, all = false, shipId = ""} = {}){
  if(!profile) return {ok:false, reason:"Profil introuvable."};
  ensureEconomyProfile(profile);
  const id = String(materialId || "");
  const sellEverything = (all === true && !id) || id === "all";
  if(!sellEverything){
    const result = sellOneMaterial(profile, id, amount, {all:Boolean(all), shipId});
    if(!result.ok) return result;
    profile.player.credits = Math.max(0, Number(profile.player.credits || 0)) + result.credits;
    return result;
  }
  const entries = [];
  let credits = 0;
  let soldAmount = 0;
  for(const id of MATERIAL_COMMERCE_ORDER){
    const result = sellOneMaterial(profile, id, 0, {all:true, shipId});
    if(!result.ok) continue;
    entries.push(result);
    credits += result.credits;
    soldAmount += result.amount;
  }
  if(!entries.length) return {ok:false, reason:"Aucun materiau vendable."};
  profile.player.credits = Math.max(0, Number(profile.player.credits || 0)) + credits;
  return {ok:true, all:true, entries, credits, amount:soldAmount, shipId:String(profile.activeShip || shipId || "")};
}
