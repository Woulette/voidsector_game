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

function escapeAttr(value){
  return String(value ?? "").replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  }[char]));
}

function slotDisplayName({ammo, item, formation}){
  return ammo?.name || item?.name || formation?.name || "Slot vide";
}

export function renderActionBarHtml({slots, slotKeybinds, getAmmo, getExtra, getCpu, getFormation, getAmmoCount, missileState, getSlotState}){
  return slots.map((id,index)=>{
    const state = getSlotState?.(index) || {};
    const ammo = state.ammo || getAmmo(id);
    const item = state.item || null;
    const extra = state.kind === "extra" ? item : getExtra(index);
    const cpu = state.kind === "missileLauncher" ? item : getCpu?.(index);
    const rocketLauncher = state.kind === "rocketLauncher" ? item : null;
    const formation = state.formation || getFormation?.(index);
    const count = ammo ? getAmmoCount(ammo.id) : 0;
    const filled = Boolean(ammo || extra || cpu || rocketLauncher || formation);
    const unavailable = filled && state.available === false;
    const content = ammo
      ? `${ammo.img ? `<img class="slot-ammo-img" src="${ammo.img}" alt="${ammo.name}">` : `<div class="ammo-glyph" style="--ammo-color:${ammo.color}">${actionSlotHint(ammo)}</div>`}<span class="slot-count">${fmt(count)}</span><span class="slot-name">${actionSlotCaption(ammo)}</span>`
      : extra
        ? `<img src="${extra.img}" alt="${extra.name}"><span class="slot-name">${extra.short || extra.name}</span>`
        : cpu
          ? `<img src="${cpu.img}" alt="${cpu.name}">${(!unavailable && missileState?.ammo) ? `<span class="slot-count">${fmt(missileState.stock || 0)}</span>` : ""}<span class="slot-name">${unavailable ? (cpu.short || cpu.name) : missileState?.ammo ? missileState.ammo.short : "CPU Missile"}</span>`
          : rocketLauncher
            ? `<img src="${rocketLauncher.img}" alt="${rocketLauncher.name}"><span class="slot-name">${rocketLauncher.short || rocketLauncher.name}</span>`
            : formation
              ? `<img src="${formation.img}" alt="${formation.name}"><span class="slot-name">${formation.short || formation.name}</span>`
              : `<span class="no-item">+</span><span class="slot-name">VIDE</span>`;
    const title = state.reason || state.name || slotDisplayName({ammo, item:extra || cpu || rocketLauncher, formation});
    return `<div class="action-slot ammo-slot ${extra ? "extra-slot" : ""} ${cpu ? "cpu-slot" : ""} ${rocketLauncher ? "rocket-launcher-slot" : ""} ${formation ? "formation-slot" : ""} ${filled ? "" : "empty"} ${unavailable ? "unavailable blocked" : ""}" data-action-index="${index}" draggable="${filled ? "true" : "false"}" title="${escapeAttr(title)}"><span class="key">${keyCodeToLabel(slotKeybinds?.[index])}</span><div class="cooldown" data-action-cooldown="${index}" style="height:0%"></div>${content}</div>`;
  }).join("");
}

export function updateActionBarDom({root=document, activeLaserSlot, selectedRocketAmmo, repairBotActive, missileState, getAmmo, getExtra, getCpu, getFormation, activeDroneFormation, getRepairState, getAmmoCooldown, getEffectiveAmmoCooldown, getAmmoCount, getSlotState}){
  const slots = root.querySelectorAll(".action-slot");
  slots.forEach((el,index)=>{
    const state = getSlotState?.(index) || {};
    const ammo = state.ammo || getAmmo(index);
    const item = state.item || null;
    const extra = state.kind === "extra" ? item : getExtra(index);
    const cpu = state.kind === "missileLauncher" ? item : getCpu?.(index);
    const rocketLauncher = state.kind === "rocketLauncher" ? item : null;
    const formation = state.formation || getFormation?.(index);
    const available = state.available !== false;
    const repairState = available && extra?.effect?.repairBot ? getRepairState() : null;
    const isCpuReady = Boolean(available && cpu && missileState?.ready);
    const isSelectedRocket = Boolean(selectedRocketAmmo && ammo?.weaponClass === "rocket" && ammo.id === selectedRocketAmmo.id);
    const isSelectedMissile = Boolean(missileState?.ammo && ammo?.weaponClass === "missile" && ammo.id === missileState.ammo.id);
    const isActiveFormation = Boolean(available && formation && activeDroneFormation === formation.id);
    const isActive = available && (activeLaserSlot === index || isSelectedRocket || isSelectedMissile || Boolean(extra?.effect?.repairBot && repairBotActive) || isCpuReady || isActiveFormation);
    const filled = Boolean(ammo || extra || cpu || rocketLauncher || formation);
    el.classList.toggle("active", isActive);
    el.classList.toggle("empty", !filled);
    el.classList.toggle("formation-slot", !!formation);
    el.classList.toggle("rocket-launcher-slot", !!rocketLauncher);
    el.classList.toggle("unavailable", filled && !available);
    el.classList.toggle("ready", available && (!!repairState?.ok || isCpuReady));
    el.classList.toggle("blocked", (filled && !available) || (available && ((!!repairState && !repairState.ok && !repairBotActive) || Boolean(cpu && !missileState?.ready) || Boolean(state.reason && state.usable === false))));
    if(state.reason) el.title = state.reason;
    const cd = el.querySelector(".cooldown");
    if(cd && ammo?.weaponClass === "missile") cd.style.height = "0%";
    else if(cd && ammo) cd.style.height = `${Math.min(100, getAmmoCooldown(ammo) / getEffectiveAmmoCooldown(ammo) * 100)}%`;
    else if(cd && cpu) cd.style.height = `${Math.max(0, 100 - Math.min(100, Number(missileState?.progress || 0)))}%`;
    else if(cd) cd.style.height = "0%";
    const count = el.querySelector(".slot-count");
    if(count && ammo) count.textContent = fmt(getAmmoCount(ammo.id));
    else if(count && cpu) count.textContent = fmt(missileState?.stock || 0);
    const slotName = el.querySelector(".slot-name");
    if(slotName && cpu) slotName.textContent = available ? (missileState?.ammo?.short || "CPU Missile") : (cpu.short || cpu.name);
    else if(slotName && formation) slotName.textContent = formation.short || formation.name;
  });
}
