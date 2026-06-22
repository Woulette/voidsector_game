function escapeHtml(value = ""){
  return String(value).replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  })[char]);
}

function durationLabel(milliseconds){
  const totalSeconds = Math.max(0, Math.ceil(Number(milliseconds || 0) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor(totalSeconds % 86400 / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  if(days > 0) return `${days} j ${hours} h`;
  if(hours > 0) return `${hours} h ${minutes} min`;
  if(minutes > 0) return `${minutes} min ${seconds} s`;
  return `${seconds} s`;
}

function sourceRemaining(source, snapshotGeneratedAt, now){
  if(source?.mode === "connected"){
    return Math.max(0, Number(source.remainingMs || 0) - Math.max(0, Number(now) - Number(snapshotGeneratedAt || now)));
  }
  return Math.max(0, Number(source?.endsAt || 0) - Number(now));
}

function sourceModeLabel(source){
  return source?.countsOffline
    ? "Temps réel · continue hors ligne"
    : "Temps connecté · pause hors ligne";
}

function shortestRemaining(sources, generatedAt, now){
  return sources.reduce((shortest, source)=>{
    const remaining = sourceRemaining(source, generatedAt, now);
    return shortest === null || remaining < shortest ? remaining : shortest;
  }, null) || 0;
}

function sourceDisplayLabel(source){
  return source?.series === "S1" ? "Booster S1" : "Booster S2";
}

export function renderCombatBoostersPanel(snapshot, now = Date.now(), expandedType = ""){
  const boosterSnapshot = snapshot?.personal?.boosters || {};
  const generatedAt = Number(boosterSnapshot.generatedAt || snapshot?.generatedAt || now);
  const items = (Array.isArray(boosterSnapshot.items) ? boosterSnapshot.items : [])
    .map(item=>({
      ...item,
      sources:(Array.isArray(item.sources) ? item.sources : [])
        .filter(source=>sourceRemaining(source, generatedAt, now) > 0)
    }))
    .filter(item=>item.sources.length);
  if(!items.length){
    return `<div class="combat-booster-empty">
      <div class="combat-booster-empty-mark">B</div>
      <strong>Aucun booster actif</strong>
      <span>Les S1 s'achètent au magasin. Les S2 et boosters spéciaux proviennent de la boutique, des événements ou des saisons de firme.</span>
    </div>`;
  }
  return `<div class="combat-booster-panel-content">
    <div class="combat-booster-guide">
      <span><b>S1</b> 5 h connectées par unité</span>
      <span><b>S2</b> 24 h réelles par unité</span>
    </div>
    <div class="combat-booster-list">
      ${items.map(item=>{
        const expanded = item.id === expandedType;
        const totalPercent = item.sources.reduce((sum, source)=>sum + Number(source.percent || 0), 0);
        const nextExpiration = shortestRemaining(item.sources, generatedAt, now);
        return `<article class="combat-booster-row ${expanded ? "expanded" : ""}" style="--booster-color:${escapeHtml(item.color || "#7dd3fc")}">
          <div class="combat-booster-row-main">
            <div class="combat-booster-canister"><img src="${escapeHtml(item.asset)}" alt=""><span>${item.sources.length}</span></div>
            <div class="combat-booster-row-copy">
              <strong>${escapeHtml(item.label)}</strong>
              <b>+${Math.round(totalPercent * 100)}%</b>
            </div>
            <time class="combat-booster-next-expiration">${durationLabel(nextExpiration)}</time>
            <button type="button" class="combat-booster-expand" data-toggle-booster-detail="${escapeHtml(item.id)}" aria-label="Détails">${expanded ? "−" : "›"}</button>
          </div>
          ${expanded ? `<div class="combat-booster-source-list">
            ${item.sources.map(source=>`<div class="combat-booster-source">
              <img src="${escapeHtml(source.asset || item.asset)}" alt="">
              <div><b>${sourceDisplayLabel(source)}</b><span>${escapeHtml(sourceModeLabel(source))}</span></div>
              <strong>+${Math.round(Number(source.percent || 0) * 100)}%</strong>
              <time>${durationLabel(sourceRemaining(source, generatedAt, now))}</time>
            </div>`).join("")}
          </div>` : ""}
        </article>`;
      }).join("")}
    </div>
    <p class="combat-booster-offline-note"><b>Cumul :</b> les pourcentages de séries différentes s'additionnent. Plusieurs unités identiques prolongent uniquement leur durée.</p>
  </div>`;
}
