import { fmt } from "../../core/utils.js";

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  }[char]));
}

function clampPercent(value, max){
  const safeMax = Number(max) || 0;
  if(safeMax <= 0) return 0;
  return Math.max(0, Math.min(100, (Number(value) || 0) / safeMax * 100));
}

const SAFE_ZONE_NOTICE_MS = 10000;
let safeZoneNoticeKey = "";
let safeZoneNoticeVisibleUntil = 0;

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
  if(!isActive){
    safeZoneNoticeKey = "";
    safeZoneNoticeVisibleUntil = 0;
    notice.classList.toggle("hidden", true);
    return;
  }
  const now = performance.now();
  const key = `${safeArea?.type || "safe"}:${safeArea?.id || safeArea?.label || ""}`;
  if(key !== safeZoneNoticeKey){
    safeZoneNoticeKey = key;
    safeZoneNoticeVisibleUntil = now + SAFE_ZONE_NOTICE_MS;
  }
  notice.classList.toggle("hidden", now > safeZoneNoticeVisibleUntil);
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
  const activeIds = new Set(notices.map(notice=>String(notice.id)));
  Array.from(el.children).forEach(child=>{
    if(!activeIds.has(String(child.dataset.lootId || ""))) child.remove();
  });
  notices.forEach(notice=>{
    const loot = notice.loot || {};
    const opacity = Math.max(0, Math.min(1, Number(notice.remaining || 0) < 2 ? Number(notice.remaining || 0) / 2 : 1));
    let line = Array.from(el.children).find(child=>child.dataset.lootId === String(notice.id));
    if(!line){
      const parts = [];
      if(loot.questTitle) parts.push({kind:"quest", label:loot.questTitle, value:""});
      if(loot.message) parts.push({label:loot.message, value:""});
      if(loot.credits) parts.push({label:"Crédit", value:`+${fmt(loot.credits)}`});
      if(loot.premium) parts.push({label:"Nova", value:`+${fmt(loot.premium)}`});
      if(loot.xp) parts.push({label:"Expérience gagnée", value:`+${fmt(loot.xp)}`});
      if(loot.reputation) parts.push({label:"Réputation gagnée", value:`+${fmt(loot.reputation)}`});
      if(loot.ammo?.length) parts.push(...loot.ammo.map(label=>({label, value:""})));
      if(loot.items?.length) parts.push(...loot.items.map(label=>({label, value:""})));
      if(loot.piece) parts.push({label:loot.piece, value:""});
      if(loot.materials?.length) parts.push({label:"Cargo", value:loot.materials.join(" · ")});
      line = document.createElement("div");
      line.className = "loot-line";
      line.dataset.lootId = String(notice.id);
      const orderedParts = [];
      const takeParts = predicate=>{
        for(let index = 0; index < parts.length; index += 1){
          if(!predicate(parts[index])) continue;
          orderedParts.push(...parts.splice(index, 1));
          index -= 1;
        }
      };
      takeParts(part=>part.kind === "quest");
      takeParts(part=>String(part.label || "").toLowerCase().includes("cr"));
      takeParts(part=>String(part.label || "").toLowerCase() === "nova");
      takeParts(part=>String(part.label || "").toLowerCase().includes("xp") || String(part.label || "").toLowerCase().includes("exp"));
      takeParts(part=>String(part.label || "").toLowerCase().includes("putation"));
      takeParts(part=>String(part.label || "").toLowerCase().includes("detruit"));
      orderedParts.push(...parts);
      line.innerHTML = orderedParts.map(part=>`<div class="${part.kind === "quest" ? "loot-quest-title" : ""}"><span>${escapeHtml(part.label)}</span>${part.value ? `<b>${escapeHtml(part.value)}</b>` : ""}</div>`).join("");
      el.prepend(line);
    }
    line.style.opacity = opacity.toFixed(3);
  });
}

