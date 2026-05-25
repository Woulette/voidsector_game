import { fmt } from "../../core/utils.js";

function clampPercent(value, max){
  const safeMax = Number(max) || 0;
  if(safeMax <= 0) return 0;
  return Math.max(0, Math.min(100, (Number(value) || 0) / safeMax * 100));
}

export function updateCombatMeter({metric, value, max, label, mode}){
  const safeValue = Math.max(0, Math.round(Number(value) || 0));
  const safeMax = Math.max(0, Math.round(Number(max) || 0));
  const percent = clampPercent(safeValue, safeMax);
  const text = `${fmt(safeValue)} / ${fmt(safeMax)}`;
  const metricName = metric === "hp" ? "Hp" : metric === "shield" ? "Shield" : "Xp";
  const meter = document.querySelector(`[data-combat-meter="${metric}"]`);
  const fill = document.getElementById(`game${metricName}Fill`);
  const percentEl = document.getElementById(`game${metricName}Percent`);
  const valueEl = document.getElementById(`game${metricName}`);
  const tooltip = document.getElementById(`game${metricName}Tooltip`);
  if(fill) fill.style.width = `${percent}%`;
  if(percentEl) percentEl.textContent = `${Math.round(percent)}%`;
  if(valueEl) valueEl.textContent = text;
  if(tooltip) tooltip.textContent = text;
  if(meter){
    meter.classList.remove("is-numeric");
    meter.title = text;
    meter.setAttribute("aria-label", `Afficher ${label}`);
  }
}

export function updateSafeZoneNotice({safeArea, isActive}){
  const notice = document.getElementById("safeZoneNotice");
  if(!notice) return;
  notice.classList.toggle("hidden", !isActive);
  if(isActive){
    notice.classList.remove("is-radiation");
    notice.querySelector("strong").textContent = "ZONE NON-AGRESSION";
    notice.querySelector("span").textContent = safeArea.type === "portal" ? "Protection active - zone portail" : "Protection active - zone spawn";
  }
}

export function updateTargetPanel(enemy){
  const panel = document.getElementById("gameTargetPanel");
  if(!panel) return;
  if(!enemy){
    panel.classList.add("hidden");
    if(panel.innerHTML) panel.innerHTML = "";
    panel.dataset.targetId = "";
    panel.dataset.hasShield = "";
    return;
  }
  const hp = Math.max(0, Math.ceil(enemy.hp));
  const hpPercent = Math.max(0, Math.min(100, enemy.hp / enemy.maxHp * 100));
  const shieldMax = Math.max(0, Math.ceil(enemy.maxShield || 0));
  const shield = Math.max(0, Math.ceil(enemy.shield ?? shieldMax));
  const hasShield = shieldMax > 0;
  const shieldPercent = hasShield ? Math.max(0, Math.min(100, shield / shieldMax * 100)) : 0;
  panel.classList.remove("hidden");
  if(panel.dataset.targetId !== String(enemy.id) || panel.dataset.hasShield !== String(hasShield)){
    panel.dataset.targetId = String(enemy.id);
    panel.dataset.hasShield = String(hasShield);
    panel.innerHTML = `
      <div class="target-panel-head">
        <h3 data-target-name></h3>
        <b class="target-level-badge">NIV. <span data-target-level></span></b>
        <button class="target-close" type="button" data-target-close aria-label="Fermer la cible">x</button>
      </div>
      <div class="target-bar"><span data-target-hp-fill></span></div>
      <div class="target-health"><span>PV</span><b data-target-hp-text></b></div>
      ${hasShield ? `
        <div class="target-bar target-shield"><span data-target-shield-fill></span></div>
        <div class="target-health target-shield-text"><span>Bouclier</span><b data-target-shield-text></b></div>
      ` : ""}
    `;
  }
  panel.querySelector("[data-target-name]").textContent = enemy.type;
  panel.querySelector("[data-target-hp-fill]").style.width = `${hpPercent}%`;
  panel.querySelector("[data-target-hp-text]").textContent = `${fmt(hp)} / ${fmt(enemy.maxHp)}`;
  if(hasShield){
    panel.querySelector("[data-target-shield-fill]").style.width = `${shieldPercent}%`;
    panel.querySelector("[data-target-shield-text]").textContent = `${fmt(shield)} / ${fmt(shieldMax)}`;
  }
  panel.querySelector("[data-target-level]").textContent = enemy.level;
}

export function updatePoisonStatus(effect){
  const panel = document.getElementById("poisonStatus");
  if(!panel) return;
  const remaining = Math.max(0, Number(effect?.remaining || 0));
  const duration = Math.max(0.1, Number(effect?.duration || effect?.remaining || 0));
  if(remaining <= 0){
    panel.classList.add("hidden");
    return;
  }
  const fill = document.getElementById("poisonStatusFill");
  const timer = document.getElementById("poisonStatusTimer");
  panel.classList.remove("hidden");
  if(fill) fill.style.width = `${Math.max(0, Math.min(100, remaining / duration * 100))}%`;
  if(timer) timer.textContent = `${Math.ceil(remaining)}s`;
}

export function updateLootPopup({notices = []}){
  const el = document.getElementById("lootPopup");
  if(!el) return;
  if(!notices.length){ el.classList.add("hidden"); el.innerHTML = ""; return; }
  el.classList.remove("hidden");
  el.innerHTML = notices.map(notice=>{
    const loot = notice.loot || {};
    const parts = [];
    if(loot.message) parts.push(loot.message);
    if(loot.credits) parts.push(`+${fmt(loot.credits)} CR`);
    if(loot.xp) parts.push(`+${fmt(loot.xp)} XP`);
    if(loot.premium) parts.push(`+${fmt(loot.premium)} NOVA`);
    if(loot.ammo?.length) parts.push(...loot.ammo);
    if(loot.items?.length) parts.push(...loot.items);
    if(loot.piece) parts.push(loot.piece);
    if(loot.materials?.length) parts.push(`Cargo : ${loot.materials.join(" · ")}`);
    const opacity = Math.max(0, Math.min(1, Number(notice.remaining || 0) / Number(notice.duration || 5)));
    return `<div class="loot-line" style="opacity:${opacity.toFixed(3)}">${parts.join(" · ")}</div>`;
  }).join("");
}
