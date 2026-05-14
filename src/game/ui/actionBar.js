import { fmt } from "../../core/utils.js";
import { keyCodeToLabel } from "../../core/keybinds.js";

function actionSlotCaption(ammo){
  if(!ammo) return "VIDE";
  return ammo.weaponClass === "rocket" ? `${ammo.damageMin}-${ammo.damageMax}` : `x${ammo.multiplier}`;
}

function actionSlotHint(ammo){
  if(!ammo) return "+";
  return ammo.weaponClass === "rocket" ? "ROQ" : ammo.short;
}

export function renderActionBarHtml({slots, slotKeybinds, getAmmo, getExtra, getAmmoCount}){
  return slots.map((id,index)=>{
    const ammo = getAmmo(id);
    const extra = getExtra(index);
    const count = ammo ? getAmmoCount(ammo.id) : 0;
    const content = ammo
      ? `<div class="ammo-glyph" style="--ammo-color:${ammo.color}">${actionSlotHint(ammo)}</div><span class="slot-count">${fmt(count)}</span><span class="slot-name">${actionSlotCaption(ammo)}</span>`
      : extra
        ? `<img src="${extra.img}" alt="${extra.name}"><span class="slot-name">${extra.short || extra.name}</span>`
        : `<span class="no-item">+</span><span class="slot-name">VIDE</span>`;
    return `<div class="action-slot ammo-slot ${extra ? "extra-slot" : ""} ${(ammo || extra) ? "" : "empty"}" data-action-index="${index}" draggable="${(ammo || extra) ? "true" : "false"}"><span class="key">${keyCodeToLabel(slotKeybinds?.[index])}</span><div class="cooldown" data-action-cooldown="${index}" style="height:0%"></div>${content}</div>`;
  }).join("");
}

export function updateActionBarDom({root=document, activeLaserSlot, repairBotActive, getAmmo, getExtra, getRepairState, getAmmoCooldown, getEffectiveAmmoCooldown, getAmmoCount}){
  const slots = root.querySelectorAll(".action-slot");
  slots.forEach((el,index)=>{
    const ammo = getAmmo(index);
    const extra = getExtra(index);
    const repairState = extra?.effect?.repairBot ? getRepairState() : null;
    const isActive = activeLaserSlot === index || Boolean(extra?.effect?.repairBot && repairBotActive);
    el.classList.toggle("active", isActive);
    el.classList.toggle("empty", !ammo && !extra);
    el.classList.toggle("ready", !!repairState?.ok);
    el.classList.toggle("blocked", !!repairState && !repairState.ok && !repairBotActive);
    const cd = el.querySelector(".cooldown");
    if(cd && ammo) cd.style.height = `${Math.min(100, getAmmoCooldown(ammo) / getEffectiveAmmoCooldown(ammo) * 100)}%`;
    else if(cd) cd.style.height = "0%";
    const count = el.querySelector(".slot-count");
    if(count && ammo) count.textContent = fmt(getAmmoCount(ammo.id));
  });
}
