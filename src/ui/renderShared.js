import { getRankAssetPath, getShip } from "../core/store.js";

export function statLine(label, value, max=700){
  return `<div class="stat-line"><span>${label}</span><div class="stat-track"><span style="width:${Math.min(100, Number(value)/max*100)}%"></span></div><b>${value}</b></div>`;
}

export function statLabelForItem(item){
  if(item.slotType === "rocketLauncher"){
    return `DÉGÂTS ROQUETTE ${item.stats?.degats || "100%"} · PORTÉE ${item.stats?.portee || 0} · CADENCE ${item.stats?.cadence || "0.00s"}`;
  }
  if(item.slotType === "missileLauncher"){
    return `DÉGÂTS MISSILE ${item.stats?.degats || "100%"} · PORTÉE ${item.stats?.portee || 0} · RECHARGE ${item.stats?.recharge || "0.00s"} · CAPACITÉ ${item.stats?.missiles || 0}`;
  }
  const parts = [];
  for(const [k,v] of Object.entries(item.stats || {})) parts.push(`${k.toUpperCase()} ${typeof v === "number" ? "+"+v : v}`);
  if(item.weapon){
    const min = item.weapon.minDamage ?? item.weapon.damage ?? 0;
    const max = item.weapon.maxDamage ?? item.weapon.damage ?? min;
    parts.unshift(`DÉGÂTS ${min}-${max}`);
    parts.push(`PORTÉE ${item.weapon.range}`);
    parts.push(`AUTO ${item.weapon.cooldown.toFixed(2)}s`);
  }
  if(item.category === "generateur") parts.push("ÉQUIPABLE HANGAR / DRONE");
  if(item.category === "extra") parts.push("ÉQUIPABLE EN SLOT EXTRA");
  return parts.join(" · ");
}

export function locationLabel(equipped){
  if(!equipped) return "Disponible dans l'inventaire";
  if(equipped.location === "drone") return `Équipé sur Drone ${equipped.index+1}`;
  return `Équipé sur ${getShip(equipped.shipId).name}`;
}

export function rankIcon(rankLike, label = "Grade"){
  const asset = getRankAssetPath(rankLike);
  const rankName = typeof rankLike === "string" ? rankLike : rankLike?.name || label;
  return `<img class="rank-icon" src="${asset}" alt="${rankName}" title="${rankName}">`;
}

export function rankInline(rankLike){
  const rankName = typeof rankLike === "string" ? rankLike : rankLike?.name || "Aucun grade";
  return `<span class="rank-inline">${rankIcon(rankLike, rankName)}<span>${rankName}</span></span>`;
}
