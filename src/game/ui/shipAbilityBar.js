import { keyCodeToLabel } from "../../core/keybinds.js?v=ship-abilities-1";

function escapeAttr(value){
  return String(value ?? "").replace(/[&<>"]/g, char=>({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"})[char]);
}

export function renderShipAbilityBarHtml({states = [], abilityKeybinds = []} = {}){
  return states.slice(0, 3).map((state, index)=>{
    const name = state.shortName || state.name || `Compétence ${index + 1}`;
    const title = state.description || state.name || name;
    return `<button class="ship-ability-slot" data-ship-ability-index="${index}" data-ship-ability-id="${escapeAttr(state.abilityId)}" type="button" title="${escapeAttr(title)}">
      <span class="ship-ability-slot-key">${escapeAttr(keyCodeToLabel(abilityKeybinds[index]))}</span>
      <img src="${escapeAttr(state.icon)}" alt="">
      <span class="ship-ability-slot-name">${escapeAttr(name).toUpperCase()}</span>
      <span class="ship-ability-slot-cooldown"></span>
    </button>`;
  }).join("");
}
