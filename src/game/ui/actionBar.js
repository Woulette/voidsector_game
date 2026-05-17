import { fmt } from "../../core/utils.js";
import { keyCodeToLabel } from "../../core/keybinds.js";

function actionSlotCaption(ammo){
  if(!ammo) return "VIDE";
  if(ammo.weaponClass === "missile") return `${ammo.damageMin}-${ammo.damageMax}`;
  return ammo.weaponClass === "rocket" ? `${ammo.damageMin}-${ammo.damageMax}` : `x${ammo.multiplier}`;
}

function actionSlotHint(ammo){
  if(!ammo) return "+";
  if(ammo.weaponClass === "missile") return "MIS";
  return ammo.weaponClass === "rocket" ? "ROQ" : ammo.short;
}

export function renderActionBarHtml({slots, slotKeybinds, getAmmo, getExtra, getCpu, getFormation, getAmmoCount, missileState}){
  return slots.map((id,index)=>{
    const ammo = getAmmo(id);
    const extra = getExtra(index);
    const cpu = getCpu?.(index);
    const formation = getFormation?.(index);
    const count = ammo ? getAmmoCount(ammo.id) : 0;
    const content = ammo
      ? `${ammo.img ? `<img class="slot-ammo-img" src="${ammo.img}" alt="${ammo.name}">` : `<div class="ammo-glyph" style="--ammo-color:${ammo.color}">${actionSlotHint(ammo)}</div>`}<span class="slot-count">${fmt(count)}</span><span class="slot-name">${actionSlotCaption(ammo)}</span>`
      : extra
        ? `<img src="${extra.img}" alt="${extra.name}"><span class="slot-name">${extra.short || extra.name}</span>`
        : cpu
          ? `<img src="${cpu.img}" alt="${cpu.name}">${missileState?.ammo ? `<span class="slot-count">${fmt(missileState.stock || 0)}</span>` : ""}<span class="slot-name">${missileState?.ammo ? missileState.ammo.short : "CPU Missile"}</span>`
          : formation
            ? `<img src="${formation.img}" alt="${formation.name}"><span class="slot-name">${formation.short || formation.name}</span>`
            : `<span class="no-item">+</span><span class="slot-name">VIDE</span>`;
    return `<div class="action-slot ammo-slot ${extra ? "extra-slot" : ""} ${cpu ? "cpu-slot" : ""} ${formation ? "formation-slot" : ""} ${(ammo || extra || cpu || formation) ? "" : "empty"}" data-action-index="${index}" draggable="${(ammo || extra || cpu || formation) ? "true" : "false"}"><span class="key">${keyCodeToLabel(slotKeybinds?.[index])}</span><div class="cooldown" data-action-cooldown="${index}" style="height:0%"></div>${content}</div>`;
  }).join("");
}

export function updateActionBarDom({root=document, activeLaserSlot, selectedRocketAmmo, repairBotActive, missileState, getAmmo, getExtra, getCpu, getFormation, activeDroneFormation, getRepairState, getAmmoCooldown, getEffectiveAmmoCooldown, getAmmoCount}){
  const slots = root.querySelectorAll(".action-slot");
  slots.forEach((el,index)=>{
    const ammo = getAmmo(index);
    const extra = getExtra(index);
    const cpu = getCpu?.(index);
    const formation = getFormation?.(index);
    const repairState = extra?.effect?.repairBot ? getRepairState() : null;
    const isCpuReady = Boolean(cpu && missileState?.ready);
    const isSelectedRocket = Boolean(selectedRocketAmmo && ammo?.weaponClass === "rocket" && ammo.id === selectedRocketAmmo.id);
    const isSelectedMissile = Boolean(missileState?.ammo && ammo?.weaponClass === "missile" && ammo.id === missileState.ammo.id);
    const isActiveFormation = Boolean(formation && activeDroneFormation === formation.id);
    const isActive = activeLaserSlot === index || isSelectedRocket || isSelectedMissile || Boolean(extra?.effect?.repairBot && repairBotActive) || isCpuReady || isActiveFormation;
    el.classList.toggle("active", isActive);
    el.classList.toggle("empty", !ammo && !extra && !cpu && !formation);
    el.classList.toggle("formation-slot", !!formation);
    el.classList.toggle("ready", !!repairState?.ok || isCpuReady);
    el.classList.toggle("blocked", (!!repairState && !repairState.ok && !repairBotActive) || Boolean(cpu && !missileState?.ready));
    const cd = el.querySelector(".cooldown");
    if(cd && ammo) cd.style.height = `${Math.min(100, getAmmoCooldown(ammo) / getEffectiveAmmoCooldown(ammo) * 100)}%`;
    else if(cd && cpu) cd.style.height = `${Math.max(0, 100 - Math.min(100, Number(missileState?.progress || 0)))}%`;
    else if(cd) cd.style.height = "0%";
    const count = el.querySelector(".slot-count");
    if(count && ammo) count.textContent = fmt(getAmmoCount(ammo.id));
    else if(count && cpu) count.textContent = fmt(missileState?.stock || 0);
    const slotName = el.querySelector(".slot-name");
    if(slotName && cpu) slotName.textContent = missileState?.ammo?.short || "CPU Missile";
    else if(slotName && formation) slotName.textContent = formation.short || formation.name;
  });
}
