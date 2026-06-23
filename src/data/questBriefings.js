import { RANK_TABLE } from "./ranks.js";
import { getFirmDefinition, normalizeFirmId } from "./firms.js";
import { getFirmRepresentative } from "./firmRepresentatives.js";

export const QUEST_BRIEFING_TEXT = Object.freeze({
  quest_drone_cleanup:"J'en ai assez de voir défiler des bleusailles à former. Cela coûte des crédits et du temps, mais le commandement ne me laisse pas le choix. À compter d'aujourd'hui, je t'attribue le grade de Recrue. Cette première mission est importante pour ton développement comme pour celui de notre firme : neutralise les Orbes sentinelles indiquées, puis reviens au relais. Ne me fais pas regretter ce passe-droit.",
  quest_raider_patrol:"Les Vorak rushers s'installent trop près de nos routes. Coupe leur progression à la racine avant qu'ils ne deviennent un problème logistique pour toute la firme.",
  quest_spectral_scan:"Un pilote incapable de préparer sa logistique ne survit pas longtemps. Lance l'amélioration du stockage de la raffinerie et montre-moi que tu sais investir avant de combattre.",
  quest_lv1_comprehension_acquisition:"Les bases sont acquises, mais je veux une preuve complète. Nettoie les cibles demandées et franchis la route vers notre deuxième secteur pour valider ta compréhension du territoire.",
  quest_daily_cleanup:"La route commerciale doit rester ouverte aujourd'hui. Élimine les intrus signalés avant la fin de la rotation et récupère ta prime au retour.",
  quest_lv4_place_au_combat:"Assez de théorie. Les sentinelles se multiplient et nos convois ont besoin d'espace. Va au combat et réduis leur nombre.",
  quest_lv3_prepare_future:"Notre avenir dépend autant des raffineries que des canons. Lance les améliorations des trois matériaux demandés afin de renforcer notre capacité industrielle.",
  quest_lv3_new_range:"Ton équipement progresse, ton vaisseau doit suivre. Procure-toi un Velox, équipe-le et reviens confirmer que tu maîtrises ce changement de gamme.",
  quest_lv3_one_step_after_another:"Je veux vérifier ta discipline de navigation autant que ton tir. Élimine les cibles puis rejoins précisément les deux coordonnées transmises.",
  quest_lv3_alert_vigilance:"Cette mission sanctionne la moindre imprudence. Détruis les cibles sans dépasser la perte de coque autorisée ; si tu encaisses trop, tout sera à recommencer.",
  quest_lv4_establish_recon:"Nous avons besoin d'une reconnaissance offensive rapide. Entre dans le secteur demandé, neutralise les groupes hostiles et respecte strictement le temps imparti.",
  quest_lv4_contaminated_samples:"Les parasites transportent un échantillon utile à nos analystes. Récupère-le et reste en vie jusqu'au relais, sinon tout le prélèvement sera perdu.",
  quest_lv5_call_for_help:"Un signal de détresse vient du portail fermé. Rejoins Ricky, écoute ses instructions et défends-le. Cette intervention peut décider de l'accès futur de toute notre firme.",
  quest_lv8_la_roue_tourne:"Le Space Caster doit être éprouvé à pleine cadence. Effectue la série de lancements demandée et rapporte-moi les relevés de stabilité.",
  quest_lv8_un_deja_vu:"Les mêmes menaces reviennent, mais cette fois je veux une exécution propre. Détruis les boss indiqués sans dépasser la perte de coque autorisée.",
  quest_lv8_pendant_effort_pas_reconfort:"Aucun répit sur cette rotation. Les parasites et les traqueurs doivent disparaître avant qu'ils ne consolident leurs positions.",
  quest_lv8_je_l_avais_predit:"J'avais annoncé cette concentration ennemie. Prouve que mon analyse était exploitable : élimine chaque cible avant l'expiration du délai.",
  quest_lv9_ca_sent_le_poisson_pouris:"Ton vaisseau manque encore de puissance de feu visible. Équipe au moins huit lasers et présente une configuration digne des prochains secteurs.",
  quest_lv9_moucheron:"Les Orbes sont petites, nombreuses et coûteuses à ignorer. Nettoie le volume demandé et rends de la visibilité à nos patrouilles.",
  quest_lv9_ruee_vorak:"Une nouvelle ruée de Vorak menace nos lignes. Brise leur élan avant qu'ils n'atteignent les infrastructures de la firme.",
  quest_lv9_chasse_abyssale:"Les Traqueurs abyssaux testent nos défenses. Traque-les à ton tour et réduis leur présence au seuil exigé.",
  quest_lv9_reflets_du_neant:"Les Eclanites ne pardonnent aucune erreur. Détruis-les sans mourir ; ta survie fait partie intégrante de l'objectif.",
  quest_lv10_maintenance_impossible:"Ricky réclame des pièces de stabilisation pour l'armature du portail. Coordonne la récupération, rapporte-lui le matériel puis reviens établir ton rapport au relais.",
  quest_lv10_sauvons_deadly:"Le portail est enfin exploitable et Deadly est encore prisonnier. Entre, ramène-le vivant et retourne voir Ricky. Cette mission dépasse désormais une simple réparation.",
  quest_weekly_assault:"Ce contrat hebdomadaire exige endurance et préparation. Neutralise la force spectrale désignée avant la clôture de la semaine opérationnelle.",
  quest_lv3_combat_drone_companion:"Un pilote isolé gaspille son potentiel. Équipe-toi d'un drone de combat et reviens lorsque ton nouvel équipier sera opérationnel.",
  quest_astra01_raider_easy_02:"Une prime de patrouille est ouverte sur les Vorak du premier secteur. Fais vite : d'autres pilotes convoitent déjà le contrat.",
  quest_astra03_spectral_hard_01:"Le troisième secteur subit une infestation persistante. Mène la purge jusqu'au quota demandé et sécurise la zone pour la semaine.",
  quest_astra04_spectral_hard_01:"Des Pondeuses astrales travaillent dans l'ombre du quatrième secteur. Détruis-les avant que leurs rejetons ne saturent nos routes.",
  quest_astra04_spectral_hard_02:"Le front spectral est devenu trop lourd pour une patrouille ordinaire. Réduis massivement les Pondeuses et reprends l'initiative.",
  quest_astra05_boss_orb_01:"Les Boss Orbes coordonnent les sentinelles du secteur final. Élimine leurs unités de commandement et désorganise le réseau.",
  quest_astra05_boss_raider_01:"Les Boss Vorak ouvrent la voie aux vagues de rushers. Abats-les avant le prochain assaut.",
  quest_astra05_boss_spectral_01:"Les Boss Parasites renforcent toute la présence spectrale. Leur destruction est prioritaire pour nos analystes comme pour nos pilotes.",
  quest_astra05_boss_nebular_01:"Les Traqueurs d'élite ont repéré nos itinéraires. Retourne la chasse contre eux et supprime les unités désignées.",
  quest_astra05_boss_crystal_01:"Les Astranites représentent une menace stratégique majeure. Engage-les seulement avec une configuration prête et reviens avec la confirmation de leur destruction.",
  quest_astra05_boss_amber_01:"Les Cuirasses d'élite verrouillent le secteur. Brise leur ligne et ouvre un passage durable à nos forces.",
  quest_astra05_boss_daily_01:"La prime du jour vise les Boss Orbes. Le quota est élevé, mais la route ne restera sûre que si quelqu'un l'accomplit.",
  quest_astra05_boss_daily_02:"Les Boss Parasites sont la cible prioritaire de cette rotation. Réduis leur nombre avant la prochaine relève.",
  quest_astra05_boss_weekly_01:"La semaine sera perdue si les Boss Vorak conservent leur rythme d'assaut. Organise un nettoyage massif et tiens jusqu'au dernier.",
  quest_astra05_boss_weekly_02:"Le siège du secteur final commence. Les Cuirasses d'élite doivent tomber pour que notre firme conserve le contrôle territorial."
});

function rankIndex(rank){
  const index = RANK_TABLE.findIndex(entry=>entry.id === rank?.id);
  return index >= 0 ? index : 0;
}

function rankAddress(playerName, playerRank){
  const name = String(playerName || "pilote").trim() || "pilote";
  const grade = String(playerRank?.name || "Recrue");
  const index = rankIndex(playerRank);
  if(index <= 1) return `Écoute bien, ${grade} ${name}.`;
  if(index <= 5) return `${grade} ${name}, tu as commencé à faire tes preuves.`;
  if(index <= 11) return `${grade} ${name}, ton expérience mérite une mission plus exigeante.`;
  if(index <= 16) return `${grade} ${name}, le commandement connaît désormais ta valeur.`;
  return `${grade} ${name}, votre dossier impose le respect et votre jugement compte pour la firme. Je vous confie personnellement cette opération.`;
}

function statusLead(status){
  if(status === "completed") return "Le rapport confirme que la mission a été menée à son terme. ";
  if(status === "claimable") return "L'objectif est rempli. Reviens réclamer ce qui t'est dû. ";
  if(status === "active") return "La mission est toujours active. Garde le cap sur les ordres suivants : ";
  return "";
}

function formalizeBriefing(text){
  return String(text || "")
    .replace(/\bton\b/gi, "votre")
    .replace(/\bta\b/gi, "votre")
    .replace(/\btes\b/gi, "vos")
    .replace(/\btu sais\b/gi, "vous savez")
    .replace(/\btu encaisses\b/gi, "vous encaissez")
    .replace(/\btu meurs\b/gi, "vous mourez")
    .replace(/\btu n'as\b/gi, "vous n'avez")
    .replace(/\btu as\b/gi, "vous avez")
    .replace(/\btu\b/gi, "vous")
    .replace(/\bReviens\b/g, "Revenez")
    .replace(/\breviens\b/g, "revenez")
    .replace(/\bDétruis\b/g, "Détruisez")
    .replace(/\bdétruis\b/g, "détruisez")
    .replace(/\bÉlimine\b/g, "Éliminez")
    .replace(/\bélimine\b/g, "éliminez")
    .replace(/\bRejoins\b/g, "Rejoignez")
    .replace(/\brejoins\b/g, "rejoignez")
    .replace(/\bRécupère\b/g, "Récupérez")
    .replace(/\brécupère\b/g, "récupérez")
    .replace(/\bÉquipe\b/g, "Équipez")
    .replace(/\béquipe\b/g, "équipez")
    .replace(/\bLance\b/g, "Lancez")
    .replace(/\blance\b/g, "lancez")
    .replace(/\bMontre-moi\b/g, "Montrez-moi")
    .replace(/\bmontre-moi\b/g, "montrez-moi")
    .replace(/\bProuve\b/g, "Prouvez")
    .replace(/\bprouve\b/g, "prouvez")
    .replace(/\bNettoie\b/g, "Nettoyez")
    .replace(/\bnettoie\b/g, "nettoyez")
    .replace(/\bRends\b/g, "Rendez")
    .replace(/\brends\b/g, "rendez")
    .replace(/\bFais\b/g, "Faites")
    .replace(/\bfais\b/g, "faites");
}

export function getQuestBriefing({
  quest,
  playerName,
  playerRank,
  firmId,
  status = "available"
} = {}){
  const sourceQuestId = String(quest?.sourceQuestId || quest?.id || "");
  const normalizedFirmId = normalizeFirmId(quest?.firmId || firmId);
  const firm = getFirmDefinition(normalizedFirmId);
  const representative = getFirmRepresentative(normalizedFirmId);
  const baseBriefing = QUEST_BRIEFING_TEXT[sourceQuestId]
    || `J'ai une mission à te confier concernant « ${quest?.title || "ce secteur"} ». ${quest?.desc || "Exécute l'objectif transmis et reviens au relais."}`;
  const briefing = rankIndex(playerRank) >= 17 ? formalizeBriefing(baseBriefing) : baseBriefing;
  const firstAssignment = sourceQuestId === "quest_drone_cleanup" && status === "available";
  const message = firstAssignment
    ? `${String(playerName || "Pilote")}, ${briefing}`
    : `${rankAddress(playerName, playerRank)}\n\n${statusLead(status)}${briefing}`;
  return {
    sourceQuestId,
    firm,
    representative,
    addressee:`${playerRank?.name || "Recrue"} ${String(playerName || "Pilote")}`,
    message
  };
}
