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
  if(!enemy){ panel.classList.add("hidden"); panel.innerHTML = ""; return; }
  panel.classList.remove("hidden");
  panel.innerHTML = `
    <div class="target-panel-head">
      <h3>${enemy.type}</h3>
      <button class="target-close" type="button" data-target-close aria-label="Fermer la cible">×</button>
    </div>
    <div class="target-row"><span>Niveau</span><b>${enemy.level}</b></div>
    <div class="target-row"><span>PV</span><b>${Math.max(0,Math.ceil(enemy.hp))}/${enemy.maxHp}</b></div>
    <div class="target-row"><span>Portée</span><b>${enemy.attackRange || 600}</b></div>
    <div class="target-bar"><span style="width:${Math.max(0,enemy.hp/enemy.maxHp*100)}%"></span></div>
  `;
}

export function updateLootPopup({notices = []}){
  const el = document.getElementById("lootPopup");
  if(!el) return;
  if(!notices.length){ el.classList.add("hidden"); el.innerHTML = ""; return; }
  el.classList.remove("hidden");
  el.innerHTML = notices.map(notice=>{
    const loot = notice.loot || {};
    const parts = [];
    if(loot.credits) parts.push(`+${fmt(loot.credits)} CR`);
    if(loot.xp) parts.push(`+${fmt(loot.xp)} XP`);
    if(loot.premium) parts.push(`+${fmt(loot.premium)} NOVA`);
    if(loot.piece) parts.push(loot.piece);
    if(loot.materials?.length) parts.push(`Cargo : ${loot.materials.join(" · ")}`);
    const opacity = Math.max(0, Math.min(1, Number(notice.remaining || 0) / Number(notice.duration || 5)));
    return `<div class="loot-line" style="opacity:${opacity.toFixed(3)}">${parts.join(" · ")}</div>`;
  }).join("");
}

