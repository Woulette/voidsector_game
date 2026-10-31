# Azuron — refonte du 23 octobre 2026

Historique de la première livraison. Les règles publiques du 25 octobre (15 secondes entre vagues, rayon fixe de 2 000, carte agrandie, portes manuelles et reprise sauvegardée) sont décrites dans [AZURON_REPRISE_2026-10-25.md](AZURON_REPRISE_2026-10-25.md) et remplacent les paramètres ci-dessous.

État : mécaniques publiées et vérifiées le 24 octobre 2026 à 21 h 20 (Paris), version `20261024-azuron1`. Les monstres utilisent l’équilibrage public du 24 octobre. Le décor actuel est conservé ; la proposition violette reste locale.

Dernier retour visuel : le décor V2 violet/ivoire plaît, mais paraît trop haut niveau pour Azuron. Il est conservé comme proposition pour un futur dernier portail ; aucun numéro ne lui est encore attribué. La carte d’Azuron reste à définir. Priorité donnée maintenant à la conception du portail de changement de secteur, légèrement incliné et animé, pour servir de base commune aux autres portes.

## Déroulement demandé

30 vagues, réparties en six séries de cinq. La première vague de chaque série apparaît immédiatement, les suivantes à +10, +20, +30 et +40 secondes, même si des ennemis précédents vivent encore. Après la cinquième vague, la série attend la mort de tous ses survivants ; le dernier déclenche un compte à rebours de 15 secondes. La vague 30 nettoyée termine le portail directement.

| Vagues | Famille | Ennemis par vague | PV niveau 10 | Bouclier niveau 10 | Attaque de référence |
| --- | --- | ---: | ---: | ---: | ---: |
| 1–5 | Orbe sentinelle | 10 | 800 | 400 | 76 |
| 6–10 | Vorak rusher | 10 | 1 200 | 600 | 173 |
| 11–15 | Parasite astral | 10 | 3 000 | 1 000 | 140 |
| 16–20 | Traqueur abyssal | 10 | 5 000 | 3 000 | 250 |
| 21–25 | Éclanite | 5 | 20 000 | 20 000 | 350 |
| 26–30 | Cuirasse ambrée | 5 | 50 000 | 50 000 | 700 |

Total : 250 ennemis. Aucun boss supplémentaire. Les PV, boucliers, dégâts et récompenses de chaque ennemi sont lus depuis les définitions actuelles et les paliers additifs partagés de +50 % tous les cinq niveaux. Les anciennes règles de croissance continue et de réduction inverse ne s’appliquent plus. Les statistiques ne montent pas avec le numéro de vague. Chaque tir conserve la variation commune de ±18 %, avec des bornes arrondies après le calcul du dégât nominal (Vorak niveau 10 : 173 nominal, 142–204). Les récompenses et déblocages de fin restent ceux d’Azuron : 10 000 NOVA, 10 000 munitions X4 et Laser MK-IV garanti au premier nettoyage, puis 25 %. Les effets sur coup, dont le poison, restent désactivés dans cette rencontre comme dans l’ancien Azuron.

## Apparition et poursuite

Chaque vague utilise la dernière position autoritaire du pilote : cercle de rayon 900 dans la zone ouverte, arc disponible aux bords pour garder toutes les apparitions dans les limites et distinctes. Les six familles acquièrent immédiatement une cible dans l’instance, y compris les Orbes et Voraks normalement passifs. Leur verrouillage n’expire ni avec la distance ni avec le temps. Une cible sortie de l’instance ou indisponible est retirée normalement. Les autres cartes et portails gardent leur IA habituelle.

Dernier réglage utilisateur : le placement autour d’un pilote arrêté varie entre **150 et 160 unités** pour les six familles d’Azuron. Chaque ennemi conserve sa propre distance ; près des bords, les positions occupent un arc tourné vers l’intérieur de la carte en conservant ce rayon. Le réglage est porté par chaque ennemi ; la poursuite des autres cartes conserve son comportement existant.

Les minuteries sont annulées à l’abandon ou au remplacement d’une instance. Les morts répétées ne créent pas plusieurs pauses ou plusieurs récompenses de fin. Le chronomètre du HUD lit directement l’échéance serveur d’Azuron, y compris pendant une perte de vie.

## Carte

Arène publique conservée à 5 200 × 3 600, avec son décor existant. La publication des mécaniques n’active pas la composition violette.

Proposition historique réservée à un futur portail : dimension de verre fracturé, grand anneau brisé au centre creux, couronne réfractrice suspendue, lamelles et éclats, voile spatial violet parcouru de fissures champagne. Les trois textures originales créées avec image_gen restent sous `assets/maps/decor/azuron-v2/`, et leur module `src/game/combatData/azuronVisuals.js` reste disponible comme proposition indépendante. Son ancien branchement dans `portalState.js` est retiré ; aucune texture de cette proposition n’est déployée.

L’atlas de quatre éléments comporte des cellules distinctes ; la mini-carte lit leurs rectangles sources, ainsi que l’image complète de l’anneau. Le fond de la mini-carte reste indépendant du déplacement du joueur. Prompts et provenance : `output/azuron-v2-2026-10-23/imagegen-prompts.md`.

Modules actifs : configuration commune `src/data/azuronPortal.js`, calendrier et statistiques serveur `server/src/portals/azuronPortal.js`. Le coordinateur d’instances injecte la position courante ; le HUD suit l’échéance serveur et le catalogue décrit les six séries. Le reste de l’interface conserve les commandes et récompenses existantes.

## Vérifications

- Publication du 24 octobre : 260 tests ciblés réussis sur le candidat, sur le staging distant et avec les sources effectivement déployées, sans exclusion. Les parcours Socket.IO réels en WebSocket et polling passent par préparation, entrée, 30 vagues et 250 récompenses d’ennemi, isolement du spectateur, cinq pauses de 15 secondes et récompense finale unique. Le temps est accéléré par le test ; les éliminations sont pilotées par la fixture, ce n’est pas une partie normale gagnée.
- Comparaison des six familles avec les constructeurs actuels du monde au niveau 10 : PV, bouclier, dégâts, bornes finales, vitesse, portée, cadence et récompenses identiques, avec maintien de la règle propre à Azuron sans poison. Les deux bornes des tirs sont exercées via la vraie IA.
- Navigateur avec une API et un compte isolés, sources candidates issues de la production : cinq premières vagues cumulées, anneau mesuré à 150–160, pause affichée à 15 secondes pendant une perte de vie, puis reprise dans la série des Voraks. Aucune erreur ni alerte console. Le bouton de fixture termine la série uniquement sur ce serveur isolé. Captures : `output/azuron-release-2026-10-24/browser-combat.png` et `browser-pause.png`.
- Onze fichiers publiés, six empreintes HTTPS conformes et 540 empreintes de sources vérifiées, dont 529 fichiers préservés. `index.html` est installé en dernier avec les alias de cache `20261024-azuron1`. Sauvegarde : `/opt/avosoma-backups/20261024-azuron1-192039`. Serveur actif, PID 1406267, `NRestarts=0`, PostgreSQL prêt et aucune erreur du nouveau processus au contrôle.
- Contrôle élargi du workspace : cinq assertions hors Azuron restent en échec (quatre sur le chantier Helion-03 local et une sur la fiche vaisseau, également reproduite sur les sources publiques antérieures). Aucun de ces fichiers n’entre dans cette livraison. Les 260 tests du périmètre publié passent tous. Rapport : `output/azuron-release-2026-10-24/verification.json`.

Vérifications historiques avant publication :

- Ajustement 150–160 : 56 tests ciblés réussis, incluant les six familles au centre, aux quatre coins et sur deux bords, distances stables et distinctes dans la plage demandée ; régressions de poursuite et calendrier passées. Les captures V2 ci-dessous concernent le réglage historique fixe à 150.
- Première intégration : 254 tests ciblés réussis après actualisation d’une attente historique de 20 à 30 vagues (calendrier, statistiques, récompenses, sessions, autres portails et rendu).
- Après le nouveau décor et le rayon de 150 : 96 tests ciblés réussis, dont simulation de la poursuite des six familles au centre et aux quatre coins, calendrier, 250 ennemis, statistiques, récompenses, mini-carte et régressions des autres cartes.
- Syntaxe des sources modifiées et contrôle des espaces Git vérifiés.
- Le serveur QA utilise une copie isolée des sources et ses propres comptes/profils sous `output/azuron-rework-2026-10-23/sandbox` ; aucun compte réel n’est modifié.
- Contrôle navigateur réel du client relié à ce serveur : entrée dans Azuron, cumul des cinq premières vagues, ennemis niveau 10, nouvelle carte et mini-carte, affichage du changement de série.
- Contrôle V2 dans le client réel en 1 920 × 1 080 : la télémétrie du serveur isolé mesure 150–150 unités pour les 40 ennemis vivants à la vague 4, puis les 50 de la vague 5. Les renforts en approche peuvent encore être plus loin avant d’atteindre leur position. Capture : `output/azuron-v2-2026-10-23/decor-en-jeu.png` ; mesure sauvegardée : `formation-browser.json`. Aucune erreur console relevée. Exploration du nouveau décor vérifiée aussi à X 1 200 / Y −500, puis retour au centre.
- Le bouton QA « Finir la série » déclenche seulement dans cette copie serveur le vrai traitement de fin de série après avoir marqué les ennemis éliminés. Il sert à vérifier le trajet serveur → Socket.IO → HUD ; ce contrôle ne constitue pas une partie complète remportée normalement.
- L’équilibrage d’un run complet avec un équipement niveau 10 reste à apprécier en partie. Le compte de prévisualisation est niveau 50.

L’ancien aperçu explorable du décor était disponible sur `http://azuron.localhost:3388/map-preview.html`. Les captures et les copies de sources historiques restent dans `output/azuron-rework-2026-10-23/` et `output/azuron-v2-2026-10-23/` ; elles ne décrivent pas le décor public.
