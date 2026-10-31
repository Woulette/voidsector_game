export function npcDialogueMarkup(){
  return `<section class="npc-dialogue-box" role="dialog" aria-label="Conversation avec Ricky">
    <header class="npc-dialogue-head">
      <div class="npc-dialogue-speaker"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h5"/></svg><strong data-npc-name>Ricky</strong></div>
      <span class="npc-dialogue-topic" data-npc-topic></span>
      <button type="button" class="npc-dialogue-close" aria-label="Fermer le dialogue" title="Fermer · Échap">×</button>
    </header>
    <div class="npc-dialogue-message"><p><span class="npc-dialogue-measure" data-npc-measure aria-hidden="true"></span><span class="npc-dialogue-typed"><span data-npc-line></span><i class="npc-dialogue-cursor" aria-hidden="true"></i></span></p></div>
    <footer class="npc-dialogue-footer"><div class="npc-dialogue-reading"><span data-npc-counter></span><span class="npc-dialogue-pages" data-npc-pages aria-hidden="true"></span></div>
      <div class="npc-dialogue-actions"><button type="button" data-npc-previous aria-label="Réplique précédente" title="Réplique précédente · ←"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button><button type="button" class="npc-dialogue-next" data-npc-next title="Lire la suite · Entrée ou Espace"><span data-npc-next-label>Continuer</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 6 6-6 6m7-12 6 6-6 6"/></svg></button></div>
    </footer>
    <span class="npc-dialogue-hint" data-npc-hint>À ton rythme</span>
    <svg class="npc-dialogue-tail" viewBox="0 0 68 40" aria-hidden="true"><path class="npc-dialogue-tail-fill" d="M2 0H64C54 10 42 16 42 36C28 30 18 16 2 0Z"/><path class="npc-dialogue-tail-edge" d="M2 0C18 16 28 30 42 36C42 16 54 10 64 0"/></svg>
  </section>`;
}

export function updateNpcDialogueView(panel, state, typing){
  const text = (selector,value)=>{const node=panel.querySelector(selector);if(node) node.textContent=value;};
  text("[data-npc-name]",state.npc?.name || "PNJ");
  text("[data-npc-topic]",state.questTitle || "Conversation");
  text("[data-npc-counter]",`${state.index + 1} / ${state.lines.length}`);
  text("[data-npc-measure]",state.lines[state.index]);
  text("[data-npc-next-label]",typing ? "Tout lire" : state.index < state.lines.length - 1 ? "Continuer" : "Terminer");
  text("[data-npc-hint]",typing ? "Clique pour afficher toute la réplique" : "Prends le temps de lire");
  const previous=panel.querySelector("[data-npc-previous]");
  if(previous) previous.disabled=state.index === 0;
  const pages=panel.querySelector("[data-npc-pages]");
  if(pages) pages.innerHTML=state.lines.map((_line,index)=>`<i class="${index === state.index ? "current" : index < state.index ? "read" : ""}"></i>`).join("");
  const cursor=panel.querySelector(".npc-dialogue-cursor");
  if(cursor) cursor.hidden=!typing;
}
