import { getFirmRepresentative } from "../data/firmRepresentatives.js";
import { getFirmDefinition } from "../data/firms.js";
import { TUTORIAL_STEPS } from "../shared/tutorial.js";

export function escapeTutorialHtml(value = ""){
  return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
}

export function renderTutorialView({tutorial,definition,firmId,appMode,collapsed}){
  const e = escapeTutorialHtml;
  const firm = getFirmDefinition(firmId), representative = getFirmRepresentative(firmId);
  const chapter = definition.chapter || {index:1,total:6,title:"Formation"};
  const away = definition.mode !== appMode;
  const progress = Math.round((TUTORIAL_STEPS.indexOf(tutorial.step)+1)/TUTORIAL_STEPS.length*100);
  const destination = definition.mode === "game" ? "le vol" : "le tableau de bord";
  const objective = away ? `Rejoins ${destination}.` : definition.objective || definition.title || "Suis le repère.";
  const message = away ? "Ta formation continue dans l'autre onglet." : definition.message;
  const help = message && message !== objective ? message : "";
  const action = away
    ? `<button type="button" data-tutorial-travel>Rejoindre ${destination} <span aria-hidden="true">↗</span></button>`
    : definition.gift
      ? '<button type="button" data-tutorial-gift>Recevoir le Laser MK-III</button>'
      : definition.manual ? '<button type="button" data-tutorial-next>Continuer <span aria-hidden="true">→</span></button>' : "";
  return `<header class="tutorial-header">
    <img src="${e(representative.asset)}" alt="" class="tutorial-avatar">
    <div><span>FORMATION · ${e(firm.label)}</span><b>${e(representative.name)}</b></div>
    <button type="button" class="tutorial-collapse" data-tutorial-collapse aria-label="${collapsed ? "Développer" : "Réduire"} le guide" aria-expanded="${!collapsed}">${collapsed ? "+" : "−"}</button>
  </header>
  <div class="tutorial-meter" role="progressbar" aria-label="Parcours du tutoriel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="width:${progress}%"></i></div>
  <div class="tutorial-body${collapsed ? " hidden" : ""}">
    <div class="tutorial-chapter"><span>${e(chapter.title)}</span><b>${chapter.index} / ${chapter.total}</b></div>
    <div class="tutorial-objective"><span>À FAIRE</span><h2 data-tutorial-objective>${e(objective)}</h2></div>
    ${help ? `<p class="tutorial-copy">${e(help)}</p>` : ""}
    <p class="tutorial-progress hidden" data-tutorial-progress role="status"></p>
    <p class="tutorial-hint hidden" data-tutorial-hint></p>
    <p class="tutorial-status hidden" data-tutorial-status role="status"></p>
    ${action ? `<div class="tutorial-actions">${action}</div>` : ""}
  </div>
  <footer class="tutorial-footer"><span title="${e(objective)}">${collapsed ? e(objective) : "Sauvegardé"}</span><button type="button" data-tutorial-close>Abandonner</button></footer>`;
}

export const tutorialAbandonMarkup = `<section class="tutorial-abandon-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorialAbandonTitle" aria-describedby="tutorialAbandonCopy">
  <span>QUITTER LA FORMATION</span><h2 id="tutorialAbandonTitle">Abandonner le tutoriel ?</h2>
  <p id="tutorialAbandonCopy">Cet abandon est définitif pour ce pilote. Tu ne pourras pas reprendre le tutoriel, même après une reconnexion. Les récompenses déjà reçues restent acquises.</p>
  <p>Pour faire une pause, tu peux simplement fermer le jeu : ta progression sera conservée.</p>
  <div><button type="button" data-tutorial-keep>Continuer le tutoriel</button><button type="button" data-tutorial-abandon>Abandonner définitivement</button></div>
</section>`;
