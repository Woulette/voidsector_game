import { skills } from "../data/catalog.js";
import { canAfford, getSkillLevel, getSkillUpgradeData, priceLabel, store } from "../core/store.js";
export function renderSkills(){
  const grids = document.querySelectorAll("[data-skill-grid], #skillGrid");
  if(!grids.length) return;
  const html = skills.map(skill=>{
    const level = getSkillLevel(skill.id);
    const maxLevel = Number(skill.maxLevel || skill.levels.length || 0);
    const next = getSkillUpgradeData(skill.id);
    const currentBonus = skill.levels.slice(0, level).map(step=>step.label).join(" · ");
    const can = !!next && store.state.player.skillPoints >= Number(next.skillPoints || 0) && canAfford(next.priceType, next.price);
    const price = next ? priceLabel(next.priceType, next.price) : "MAX";
    return `<article class="skill-card branch ${skill.theme || ""} ${level >= maxLevel ? "unlocked" : ""}">
      <div class="skill-card-head">
        <div class="skill-icon">${skill.icon}</div>
        <div>
          <h3>${skill.name}</h3>
          <small>Niveau ${level}/${maxLevel}</small>
        </div>
      </div>
      <p>${skill.desc}</p>
      <div class="skill-progress-row"><span>Progression</span><span>${level}/${maxLevel}</span></div>
      <div class="mini-bar"><span style="width:${maxLevel ? (level / maxLevel) * 100 : 0}%"></span></div>
      <div class="skill-bonus-box">
        <strong>Bonus actuels</strong>
        <small>${currentBonus || "Aucun bonus actif pour le moment."}</small>
      </div>
      <div class="skill-next-box">
        <strong>${next ? `Niveau ${level + 1}` : "Compétence terminée"}</strong>
        <small>${next ? `${next.label} · ${next.skillPoints} pt${next.skillPoints > 1 ? "s" : ""} · ${price}` : "Tous les paliers sont débloqués."}</small>
      </div>
      <button class="blue-button small" data-unlock-skill="${skill.id}" ${!next || !can ? "disabled" : ""}>${next ? `Améliorer (${price})` : "MAX"}</button>
    </article>`;
  }).join("");
  grids.forEach(grid=>{ grid.innerHTML = html; });
}
