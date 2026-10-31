import { profileIcon } from "./profileIcons.js?v=20261023-profilemilestones1";
import { profileMilestoneEmblem } from "./profileMilestoneEmblems.js?v=20261023-profilemilestones1";

const html = value=>String(value ?? "").replace(/[&<>"']/g, char=>({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[char]);
const fmt = value=>Math.max(0, Number(value) || 0).toLocaleString("fr-FR");
const focusAttributes = ["data-profile-title-toggle", "data-profile-title-visibility", "data-profile-ascension-review", "data-profile-ascension-back", "data-prestige", "data-profile-milestone-close"];

export function renderProfileMilestoneCards(model){
  const titles = model.titles;
  const active = titles.activeTitle;
  const status = model.ascension;
  return `<button type="button" class="pm-card pm-title-card${active ? " equipped" : ""}" data-profile-milestone-open="titles" aria-haspopup="dialog"><span class="pm-card-art">${profileMilestoneEmblem("title", "title-card")}</span><span class="pm-card-copy"><span class="pm-card-eyebrow">Distinctions du pilote <b>${titles.unlockedCount} / ${titles.total}</b></span><strong>Collection de titres</strong><span class="pm-card-preview">${active ? html(active.name) : titles.unlockedCount ? "Un titre disponible à équiper" : "Découvrez les distinctions à débloquer"}</span><small>${active ? `${html(active.status)} · +${active.bonus} % dégâts` : `${titles.unlockedCount} titre${titles.unlockedCount > 1 ? "s" : ""} débloqué${titles.unlockedCount > 1 ? "s" : ""}`}</small></span><span class="pm-card-arrow">${profileIcon("arrow")}</span></button>
  <button type="button" class="pm-card pm-ascension-card${status.ascended ? " ascended" : status.available ? " available" : ""}" data-profile-milestone-open="ascension" aria-haspopup="dialog"><span class="pm-card-art">${profileMilestoneEmblem("ascension", "ascension-card")}</span><span class="pm-card-copy"><span class="pm-card-eyebrow">Ascension unique <b>${status.ascended ? "Accomplie" : status.available ? "Disponible" : "À accomplir"}</b></span><strong>${status.ascended ? "Au-delà des étoiles" : "Franchissez un nouveau cap"}</strong><span class="pm-card-preview">${status.ascended ? "Ascension accomplie · progression jusqu’au niveau 100" : "Niveau 50 → limite 100 · retour au niveau 1"}</span><small>${status.ascended ? "Compétences acquises conservées" : `Niveau ${fmt(status.currentLevel)} / 50 · ${status.completedPortals} / ${status.requiredPortals} portails terminés`}</small></span><span class="pm-card-arrow">${profileIcon("arrow")}</span></button>`;
}

function titleCollection(model){
  return `<div class="pm-collection-summary"><span><b>${model.titles.unlockedCount}</b> / ${model.titles.total} titre${model.titles.total > 1 ? "s" : ""} débloqué${model.titles.unlockedCount > 1 ? "s" : ""}</span><p>Équipez une distinction pour afficher votre titre et activer son bonus.</p></div><div class="pm-title-collection">${model.titles.catalog.map((title, index)=>`<article class="pm-title-entry${title.unlocked ? " unlocked" : " locked"}${title.equipped ? " equipped" : ""}"><div class="pm-title-emblem">${profileMilestoneEmblem("title", `collection-title-${index}`)}${!title.unlocked ? `<span class="pm-emblem-lock">${profileIcon("lock")}</span>` : ""}</div><div class="pm-title-content"><span class="pm-title-state">${profileIcon(title.unlocked ? "check" : "lock")}${html(title.status)}</span><h3>${html(title.name)}</h3><p class="pm-title-condition">${title.unlocked ? "Condition validée" : "Condition"} : terminer ${html(title.portalName)}.${title.comingSoon && !title.unlocked ? ` <span class="pm-coming-soon">Épreuve à venir</span>` : ""}</p><div class="pm-title-bonus">+${title.bonus} % dégâts lasers, roquettes et missiles</div><p class="pm-title-note">${title.equipped ? "Bonus actif, même lorsque le titre est masqué." : title.unlocked ? "Équipez ce titre pour activer son bonus." : "Le titre sera disponible une fois cette condition remplie."}</p><div class="pm-title-actions"><button type="button" class="pm-primary"${title.unlocked ? ` data-profile-title-toggle="${title.equipped ? "" : html(title.id)}"` : " disabled"}>${title.equipped ? "Retirer" : "Équiper"}</button>${title.equipped ? `<button type="button" class="pm-secondary" data-profile-title-visibility>${profileIcon("eye")}${title.visible ? "Masquer en jeu" : "Afficher en jeu"}</button>` : ""}</div></div></article>`).join("")}</div>`;
}

function ascensionDetails(status, state){
  if(state.confirming && status.available && !status.ascended){
    return `<div class="pm-confirmation"><div class="pm-confirmation-emblem">${profileMilestoneEmblem("ascension", "ascension-confirm")}</div><span class="pm-kicker">Dernière étape</span><h3>Confirmer votre ascension</h3><p>Cette ascension est unique et irréversible.</p><dl class="pm-reset-summary"><div><dt>Niveau</dt><dd>${fmt(status.currentLevel)} → <b>${status.reset.level}</b></dd></div><div><dt>Expérience du niveau</dt><dd>${fmt(status.currentXp)} → <b>${status.reset.xp} XP</b></dd></div><div><dt>Prochain niveau</dt><dd><b>${fmt(status.reset.xpNext)} XP</b></dd></div><div><dt>Limite de niveau</dt><dd>50 → <b>${status.reset.levelCap}</b></dd></div><div><dt>Points de compétence disponibles</dt><dd><b>${status.reset.skillPoints}</b> après recalcul</dd></div></dl><p class="pm-preserved">Compétences acquises, XP cumulée, titres, équipements, monnaies et progression des portails conservés.</p><div class="pm-confirm-actions"><button type="button" class="pm-secondary" data-profile-ascension-back${state.pending ? " disabled" : ""}>Revenir aux détails</button><button type="button" class="pm-primary pm-gold" data-prestige${state.pending ? " disabled" : ""}>${state.pending ? "Demande en cours…" : "Confirmer l’ascension"}</button></div>${state.pending ? `<p class="pm-request-status" role="status">En attente de la confirmation du serveur.</p>` : ""}${state.error ? `<p class="pm-request-error" role="alert">${html(state.error)}</p>` : ""}</div>`;
  }
  return `<div class="pm-ascension-intro"><div class="pm-ascension-emblem">${profileMilestoneEmblem("ascension", "ascension-dialog")}</div><div><span class="pm-kicker">Une seule ascension par pilote</span><h3>${status.ascended ? "Ascension accomplie" : "Une nouvelle étape de votre parcours"}</h3><p>${status.ascended ? "Votre progression est ouverte jusqu’au niveau 100." : "Atteignez le niveau 50 et terminez les neuf portails de progression."}</p><span class="pm-level-transition">${status.ascended ? "Limite de niveau 100" : "Limite 50 → 100"}</span></div></div><div class="pm-ascension-progress"><span class="${status.levelOk || status.ascended ? "done" : ""}">${profileIcon(status.levelOk || status.ascended ? "check" : "lock")}Niveau ${fmt(status.currentLevel)}${status.ascended ? "" : " / 50"}</span><span class="${status.portalOk ? "done" : ""}">${profileIcon(status.portalOk ? "check" : "lock")}${status.completedPortals} / ${status.requiredPortals} portails terminés</span></div><ol class="pm-portal-list">${status.portals.map((portal, index)=>`<li class="${portal.completed ? "done" : ""}"><img src="${html(portal.image)}" alt="" loading="lazy"><span class="pm-portal-number">${String(index + 1).padStart(2, "0")}</span><div><strong>${html(portal.name)}</strong><small>${portal.completed ? "Terminé" : portal.comingSoon ? "Épreuve à venir" : "À terminer"}</small></div>${profileIcon(portal.completed ? "check" : "lock")}</li>`).join("")}</ol>${status.ascended ? `<div class="pm-ascension-complete">${profileIcon("check")}Ascension unique accomplie · Compétences acquises conservées</div>` : `<section class="pm-consequences"><h3>Ce qui change lors de l’ascension</h3><p>Niveau remis à <b>1</b> · XP du niveau remise à <b>0</b> · prochain niveau à <b>${fmt(status.reset.xpNext)} XP</b>.</p><p>Limite de niveau <b>50 → 100</b>. Compétences acquises et XP cumulée conservées ; points disponibles recalculés au niveau 1.</p><button type="button" class="pm-primary pm-gold" data-profile-ascension-review${status.available ? "" : " disabled"}>${status.available ? "Préparer mon ascension" : "Conditions à remplir"}</button></section>`}`;
}

export function renderProfileMilestoneDialog(model, state){
  const titles = state.kind === "titles";
  return `<div class="pm-dialog-shell"><header class="pm-dialog-header"><div><span class="pm-kicker">Dossier du pilote</span><h2 id="profile-milestone-dialog-heading" tabindex="-1" data-profile-milestone-heading>${titles ? "Collection de titres" : "Ascension unique"}</h2></div><button type="button" class="pm-dialog-close" data-profile-milestone-close aria-label="Fermer">${profileIcon("close")}</button></header><div class="pm-dialog-body" data-profile-milestone-scroll="body">${titles ? titleCollection(model) : ascensionDetails(model.ascension, state)}</div><footer class="pm-dialog-footer"><span>${titles ? "Vos distinctions, votre histoire." : "Votre progression reste enregistrée sur votre compte."}</span><button type="button" class="pm-secondary" data-profile-milestone-close>Fermer</button></footer></div>`;
}

export function createProfileMilestoneController({getDocument = ()=>globalThis.document, getWindow = ()=>globalThis.window} = {}){
  const state = {kind:null, confirming:false, pending:false, error:""};
  let model = null, dialog = null, markup = "", boundFeedback = false, openerKind = null;
  const focus = element=>element?.focus?.({preventScroll:true});
  function restoreOpener(){
    const element = getDocument()?.querySelector?.(`[data-profile-milestone-open="${openerKind}"]`);
    focus(element);
  }
  function close(){
    state.kind = null; state.confirming = false; state.error = "";
    if(dialog?.open) dialog.close();
    restoreOpener();
  }
  function ensureDialog(){
    if(dialog) return dialog;
    const document = getDocument();
    if(!document?.createElement || !document.body?.appendChild) return null;
    dialog = document.createElement("dialog");
    dialog.id = "profile-milestone-dialog";
    dialog.className = "pm-dialog";
    dialog.setAttribute("aria-labelledby", "profile-milestone-dialog-heading");
    dialog.addEventListener("cancel", event=>{ event.preventDefault(); close(); });
    dialog.addEventListener("close", ()=>{ if(state.kind) close(); });
    document.body.appendChild(dialog);
    const window = getWindow();
    if(!boundFeedback && window?.addEventListener){
      boundFeedback = true;
      window.addEventListener("voidsector:multiplayer-change", event=>{
        if(!state.pending) return;
        const {reason, payload} = event.detail || {};
        const limited = ["rate:limited", "account:action-limited"].includes(reason) && (!payload?.eventName || payload.eventName === "prestige:perform");
        if(reason === "prestige:error" || reason === "connection:disconnect" || reason === "disconnect" || limited){
          state.pending = false; state.error = payload?.message || "La demande n’a pas abouti. Vous pouvez réessayer.";
          render();
        }
      });
    }
    return dialog;
  }
  function render(){
    if(!model || !state.kind) return;
    if(model.ascension.ascended || !model.ascension.available){ state.confirming = false; state.pending = false; }
    const element = ensureDialog();
    if(!element) return;
    const next = renderProfileMilestoneDialog(model, state);
    if(next !== markup){
      const document = getDocument();
      const active = element.contains(document.activeElement) ? document.activeElement : null;
      const attribute = focusAttributes.find(name=>active?.hasAttribute(name));
      const value = attribute ? active.getAttribute(attribute) : null;
      const scroll = element.querySelector("[data-profile-milestone-scroll]")?.scrollTop || 0;
      element.innerHTML = next; markup = next;
      const body = element.querySelector("[data-profile-milestone-scroll]");
      if(body) body.scrollTop = scroll;
      if(attribute){
        const controls = [...element.querySelectorAll(`[${attribute}]`)];
        focus(controls.find(control=>control.getAttribute(attribute) === value && !control.disabled) || controls.find(control=>!control.disabled) || element.querySelector("[data-profile-milestone-close]"));
      }
    }
    if(!element.open){ element.showModal(); focus(element.querySelector("[data-profile-milestone-heading]")); }
  }
  return {
    sync(nextModel){
      model = nextModel;
      if(model.ascension.ascended || !model.ascension.available){ state.confirming = false; state.pending = false; }
      render();
    },
    getState:()=>({...state}),
    handleClick(event){
      const target = event.target;
      const open = target?.closest?.("[data-profile-milestone-open]");
      if(open){
        const kind = open.dataset.profileMilestoneOpen;
        if(!["titles", "ascension"].includes(kind)) return false;
        openerKind = kind; Object.assign(state, {kind, confirming:kind === "ascension" && state.pending, error:""}); render(); return true;
      }
      if(!state.kind || !dialog?.open) return false;
      if(target === dialog || target.closest?.("[data-profile-milestone-close]")){ close(); return true; }
      if(target.closest?.("[data-profile-ascension-review]")){
        if(model.ascension.available){ state.confirming = true; state.error = ""; markup = ""; const body = dialog.querySelector("[data-profile-milestone-scroll]"); if(body) body.scrollTop = 0; render(); focus(dialog.querySelector("[data-profile-milestone-heading]")); }
        return true;
      }
      if(target.closest?.("[data-profile-ascension-back]")){
        if(!state.pending){ state.confirming = false; state.error = ""; render(); }
        return true;
      }
      const final = target.closest?.("[data-prestige]");
      if(final){
        if(state.kind !== "ascension" || !state.confirming || state.pending || !model.ascension.available || final.disabled) return true;
        state.pending = true; state.error = ""; final.disabled = true;
        return false; // Existing app handler sends the one server command.
      }
      return false;
    },
    handleKeydown(event){
      if(!state.kind || !dialog?.open) return false;
      if(event.key === "Escape"){ event.preventDefault?.(); event.stopPropagation?.(); close(); return true; }
      if(event.key !== "Tab") return false;
      const controls = [...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')];
      const first = controls[0], last = controls.at(-1), active = getDocument().activeElement;
      if(!first){ event.preventDefault?.(); focus(dialog); return true; }
      if(event.shiftKey && (active === first || !controls.includes(active))){ event.preventDefault?.(); focus(last); return true; }
      if(!event.shiftKey && active === last){ event.preventDefault?.(); focus(first); return true; }
      return false;
    },
    settle(sent){ if(!sent){ state.pending = false; state.error = "Envoi impossible. Vérifiez votre connexion puis réessayez."; } render(); }
  };
}

const controller = createProfileMilestoneController();
export const syncProfileMilestoneDialog = model=>controller.sync(model);
export const handleProfileMilestoneInteraction = event=>controller.handleClick(event);
export const handleProfileMilestoneKeydown = event=>controller.handleKeydown(event);
export const settleProfileMilestoneCommand = sent=>controller.settle(sent);
