function escapeAttr(value){
  return String(value ?? "").replace(/[&<>"]/g, char=>({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"})[char]);
}

export function renderNpcAbilityBarHtml({states = []} = {}){
  return states.slice(0, 3).map((state, index)=>{
    const owner = state.ownerName || "PNJ";
    const name = state.shortName || state.name || `Soutien ${index + 1}`;
    const title = `${owner} · ${state.description || state.name || name}`;
    return `<button class="npc-ability-slot" data-npc-ability-index="${index}" data-npc-ability-id="${escapeAttr(state.abilityId)}" type="button" title="${escapeAttr(title)}">
      <span class="npc-ability-slot-owner">${escapeAttr(owner).toUpperCase()}</span>
      <img src="${escapeAttr(state.icon)}" alt="">
      <span class="npc-ability-slot-name">${escapeAttr(name).toUpperCase()}</span>
      <span class="npc-ability-slot-cooldown"></span>
    </button>`;
  }).join("");
}
