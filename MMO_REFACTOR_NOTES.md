# VoidSector MMO - Notes de decoupage serveur

Famille de portails 10/15/20 publiée le 25 octobre 2026 à 20 h 34 (Paris), `20261025-wave-portals1` : Vesper jaune-orange et Kharon rouge reprennent les 30 vagues, 250 ennemis et checkpoints d’Azuron, avec statistiques et gains des ennemis à ×2 et ×3. Récompenses finales communes : 1/2/3 millions de crédits, 500 000/1 000 000/1 500 000 XP et 50 000/100 000/150 000 réputation ; NOVA et x4 à 10 000/20 000/30 000. Bonus spéciaux actuels conservés selon la réponse du joueur. Même cadre ovale et charge dédiée de quatre secondes, teintes appliquées au rendu et aux cartes/fragments. 250 tests sur candidat, staging et sources déployées ; entrées et continuation contrôlées dans le vrai client isolé. 36 fichiers runtime, 77 alias, 23 empreintes HTTPS et 596 gardes conformes, 560 fichiers hors livraison préservés. Sauvegardes sources/PostgreSQL avant redémarrage ; PID 2791774 / NRestarts 0, PostgreSQL prêt, aucune nouvelle erreur. Limites antérieures des tests clients et du cosmétique Kharon documentées. Détails : `docs/PORTAILS_VAGUES_10_15_20_2026-10-25.md`.

Charge dédiée d’Azuron publiée le 25 octobre 2026 à 19 h 22 (Paris), `20261025-azuron-vortex1` : `render/azuronPortalActivation.js` fait accélérer progressivement le vortex et grandir son cœur blanc bleuté pendant les quatre secondes d’entrée ou de continuation. L’ancien éclat radial de secteur est retiré pour Azuron ; cadre, projection, assets et navigation serveur conservés. L’adaptateur transmet un renderer d’énergie optionnel à `sectorPortalVisual.js`, dont le chemin par défaut reste inchangé. 63 tests sur candidat, staging et sources déployées ; entrée et continuation vers la vague 6 vérifiées dans le vrai client isolé, console sans erreur. Quatre fichiers frontend livrés, six alias actualisés, quatre empreintes HTTPS et 590 gardes conformes, 586 fichiers préservés ; publication concurrente des ennemis conservée. Aucun redémarrage, PID 2510150 / NRestarts 0, PostgreSQL prêt, aucune nouvelle erreur. Détails et capture : `docs/AZURON_ANIMATION_VORTEX_2026-10-25.md`.

Portail ovale d’Azuron publié le 25 octobre 2026 à 16 h 03 (Paris), `20261025-azuron-gate1` : cadre cobalt fixe et vortex indépendant, même projection et profondeur que le portail de sortie. L’entrée préparée et la continuation jouent quatre secondes de charge avant leur commande serveur existante ; la sortie conserve son délai autoritaire. Deux PNG RGBA natifs de 1 254 × 1 254, générés par imagegen intégré. 326 tests pertinents sur candidat, staging et sources déployées ; entrée et série 6–10 contrôlées dans le vrai client isolé, console sans erreur. Treize fichiers frontend livrés, 37 alias actualisés, treize empreintes HTTPS et 587 gardes conformes, 574 fichiers préservés ; changements concurrents conservés. Aucun redémarrage, PID 2510150 / NRestarts 0, PostgreSQL prêt, aucune nouvelle erreur. Détails, captures, prompts et limites du contrôle : `docs/AZURON_PORTAIL_ANIME_2026-10-25.md`.

Nébuleuse d’Azuron densifiée le 25 octobre 2026 à 15 h 26 (Paris), `20261025-azuron-nebula2` : `azuronArena.js` assemble 17 morceaux lointains (parallaxes 0,045–0,08), avec deux nouvelles textures RGBA natives de 1 536 × 1 024 créées par imagegen intégré d’après le panorama de la mini-carte. Masses bleues en haut à gauche et en bas à droite, nuages de liaison au centre, volumes sombres conservés ; poussières proches toujours absentes. Largeur maximale de 760 pixels logiques, sans agrandissement jusqu’à une densité de canvas ×2. Audit de 15 projections et contrôle navigateur au centre puis vers (2 730, -850), sur compte isolé. Quatre fichiers frontend livrés, 165 tests sur candidat, staging et sources déployées, quatre empreintes HTTPS et 575 gardes conformes, 571 fichiers préservés. Publication concurrente de collecte de butin conservée. Aucun redémarrage de cette livraison ; PID 2491946 / NRestarts 0, PostgreSQL prêt, aucune nouvelle erreur au contrôle. Détails, images et prompts : `docs/AZURON_NEBULEUSE_2026-10-25.md`.

Raffinerie sur toute la largeur publiée le 25 octobre 2026 à 14 h 49 (Paris), `20261025-orbital-fluid1` : remplace le centrage de l’image complète qui créait les bandes latérales. `refineryStationLayout.js` compose treize éléments depuis un atlas transparent et des bras adaptables, sur un décor spatial séparé ; la scène remplit la largeur et le bloc conserve sa hauteur bornée après défilement. Ordre des modules, bandeau compact de stocks, quatre coins et quatorze flèches conservés. 42 tests locaux et distants, 30 rendus et 20 défilements sur candidat puis fichiers publics, 78 survols et 396 lectures de jauges locaux. Sept fichiers frontend livrés, sept empreintes publiques conformes, 561 fichiers sources hors livraison préservés ; aucun redémarrage, PID 2362785 / NRestarts 0, PostgreSQL prêt, aucune nouvelle erreur. Images produites par imagegen intégré, prompts et limites de la QA documentés dans `docs/RAFFINERIE_LARGEUR_2026-10-25.md`.

Mort et reprise d’Azuron publiées le 25 octobre 2026 à 14 h 49 (Paris), `20261025-azuron-death1` : sortie automatique sans choix de résurrection, même tentative remise sur la carte extérieure et checkpoint marqué `parked`. La reprise garde les séries validées et les indices des ennemis éliminés ; les vagues vides conservent leurs quinze secondes. Les exemples des vagues 3, 7 et 16, les éliminations non consécutives, les trois vies et la réserve suivante sont vérifiés avec persistance et réseau réel WebSocket/polling. Un seul fichier serveur livré, 388 tests sur candidat, staging et sources déployées ; 573 gardes conformes, 572 fichiers préservés et quatre empreintes HTTPS. Publications concurrentes des moteurs/ennemis et de la mini-carte conservées. Sources et PostgreSQL sauvegardés avant redémarrage ; PID 2458909 / NRestarts 0, PostgreSQL prêt, aucune nouvelle erreur. Contrôle navigateur sur compte isolé, retour sans panneau et reprise observés. Détails : `docs/AZURON_MORT_REPRISE_2026-10-25.md`.

Lumières lointaines d’Azuron publiées le 25 octobre 2026 à 14 h 28 (Paris), `20261025-azuron-distant1` : `azuronArena.js` conserve uniquement les six nuages lointains (parallaxes 0,08–0,10), retire les seize éléments intermédiaires/proches et les cent petites poussières, puis accentue la luminosité de trois nuages avec les filtres du renderer existant. Aucun changement des PNG ni de leur taille native. Deux fichiers frontend livrés, 161 tests sur candidat final, staging et sources déployées, deux empreintes HTTPS et 565 gardes conformes, 563 fichiers préservés. La capture et l’index ont été reconstruits après détection de la publication concurrente d’Helion-03 et de la mini-carte ; ses cinq fichiers sont conservés. Aucun redémarrage, PID 2362785 / NRestarts 0, PostgreSQL prêt, aucun nouveau journal d’erreur. Détails et capture : `docs/AZURON_LUMIERES_2026-10-25.md`.

Azuron en couches publié le 25 octobre 2026 à 14 h 13 (Paris), `20261025-azuron-layers1` : `azuronArena.js` compose 22 éléments indépendants avec trois PNG transparents natifs de 1 536 × 1 024, sur trois plans de parallaxe de 0,08 à 0,80. Largeur maximale de 760 pixels logiques, sans agrandissement jusqu’à une densité de canvas ×2. L’ancienne illustration unique ne sert plus qu’au petit aperçu de mini-carte. Les renderers, le cache et les portails existants sont réutilisés. Audit des dimensions, alphas et 15 projections ; centre et déplacement à environ (2 900, -850) vérifiés dans la copie isolée du jeu. Cinq fichiers frontend livrés, 160 tests sur candidat, staging et sources déployées, cinq empreintes HTTPS et 565 gardes conformes, 560 fichiers préservés ; aucun redémarrage ni changement serveur. PID 2362785 / NRestarts 0, PostgreSQL prêt, aucun nouveau journal d’erreur. Assets, prompts et limites de la QA : `docs/AZURON_COUCHES_2026-10-25.md`.

Raffinerie entière à l’écran publiée le 25 octobre 2026 à 14 h 05 (Paris), `20261025-orbital-fit1` : le panneau de station tient dans la fenêtre quand la navigation a défilé hors écran ; stocks, recette et commandes gardent leur taille, tandis que l’illustration, les zones cliquables et les flèches se redimensionnent ensemble sans recadrage. Quatre fichiers front publiés, 554 fichiers sources contrôlés hors livraison préservés, quatre empreintes HTTPS conformes, 42 tests sur staging, 30 rendus et 20 contrôles de défilement avec les fichiers publics. Service actif sans redémarrage, PostgreSQL prêt. Détails et limites mobiles : `docs/RAFFINERIE_CADRAGE_ECRAN_2026-10-25.md`.

Azuron bleu publié le 25 octobre 2026 à 13 h 54 (Paris), `20261025-azuron-blue1` : la continuation réutilise l’image d’Azuron et le renderer des portails préparés ; la sortie réutilise le portail de voyage entre secteurs, avec sa charge réelle de quatre secondes. `azuronGate.js` délègue à ce renderer existant. `azuronArena.js` remplace le grand anneau de ferraille par une nébuleuse azur créée avec imagegen, des poussières froides et quelques petits fragments glacés ; sa référence `miniMapVisual` donne la même image à la mini-carte. `combatAssets.js` précharge les assets des portes via `portalAssets`. Sept fichiers frontend livrés, 160 tests ciblés sur candidat, staging et sources déployées, sept empreintes publiques et 562 gardes conformes, 555 fichiers préservés ; aucun redémarrage ni changement serveur. Sortie locale mesurée à 4 010 ms puis reprise à la vague 6. Service PID 2362785 / NRestarts 0, PostgreSQL prêt, aucune erreur au contrôle. Détails, asset et prompt : `docs/AZURON_BLEU_2026-10-25.md`.

Tentatives de portails publiées le 25 octobre 2026 à 13 h 17 (Paris), `20261025-portal-attempts1` : tous les portails à fragments consomment un exemplaire par invocation, avec une seule tentative personnelle de trois vies en cours et un exemplaire suivant assemblable pendant celle-ci. `shared/portalAttempts.js` normalise et protège le modèle persistant ; `server/src/portals/portalAttempts.js` gère les mutations atomiques, migration, reprise et fin. Azuron ajoute 1 000 000 crédits, 100 000 XP et 10 000 réputation aux gains existants ; la notification attend sept secondes. La porte droite joue quatre secondes d’animation avant la sortie autoritaire, sans dépense de la réserve suivante lors d’une reprise. 891 tests ciblés sur staging et sources déployées, 18 empreintes HTTPS et 552 gardes conformes, 524 fichiers préservés ; sauvegardes des sources et PostgreSQL avant publication. PID 2362785 / NRestarts 0, PostgreSQL prêt, aucun nouveau journal d’erreur. Suite complète locale : 2 035/2 036, seul échec de fiche vaisseau reproduit sur les sources antérieures. Détails, migration et limites de la QA : `docs/PORTAILS_TENTATIVES_2026-10-25.md`.

Raffinerie orbitale publiée le 25 octobre 2026 à 13 h 42 (Paris), `20261025-orbital3` : `ui/refineryOrbitalStation.js` compose la station illustrée, les zones de sélection, les liaisons tirées des recettes et les commandes du module sélectionné. `renderRefinery.js` conserve les données réelles et les actions existantes ; `refineryOrbital.css` limite la présentation au panneau de station. Les stocks/capacités, niveaux, chantiers, pauses, coûts et validations serveur restent ceux du jeu. La deuxième illustration (`assets/refinery/orbital-v2/station.png`, cache `20261025-orbital3`) suit la correction utilisateur : Alliage/Catalyseur/Plaque superposés, Conducteur au-dessus du Blindage, Noyau à droite ; les quatre coins de sélection sont calibrés sur les silhouettes et leurs embouts, et les étiquettes restent hors de leur contour. Le bandeau affiche le nom seul, le stock plus grand et une jauge remplie contenant uniquement le maximum ; les 36 scénarios de jauges couvrent six largeurs et 396 lectures. 42 tests, 30 rendus et 39 survols vérifiés. L’illustration ne contient aucun texte ni chiffre intégré. Publication restreinte de sept fichiers avec sauvegarde `/opt/avosoma-backups/20261025-orbital3-123720`, sept empreintes HTTPS conformes, 42 tests sur staging et 30 rendus utilisant les fichiers publics. 552 fichiers sources contrôlés hors livraison préservés ; service actif sans redémarrage, PostgreSQL prêt, aucun nouveau journal d’erreur détecté. Détails et vérifications : `docs/RAFFINERIE_ORBITALE_2026-10-25.md`.

Azuron publie le 25 octobre 2026 a 12 h 32 (Paris), `20261025-azuron2` : arene 7800 x 5400, apparitions a 2000 unites du centre fixe, vagues espacees de 15 s. Apres chaque serie nettoyee, porte gauche pour continuer et porte droite pour sortir avec reprise conservee. `server/src/portals/azuronJourney.js` porte les transitions et la preparation du retour ; `src/shared/azuronProgress.js` normalise le checkpoint protege et les recus de gains atomiques avec les mutations de profil. La projection publique de l'objectif inclut les portes ; le client applique la sortie autoritaire par `portal:paused`. `combatData/azuronArena.js` compose le decor industriel et `render/azuronGate.js` dessine les portes. 827 tests cibles sans exclusion sur candidat, staging et sources deployees, 15 empreintes HTTPS et 550 gardes conformes ; 521 fichiers preserves, publication concurrente des Orbes conservee. Service PID 2314836 / NRestarts 0, PostgreSQL et journaux corrects. Les cinq echecs hors perimetre de la suite complete sont reproduits sur les sources anterieures. Details et limites : `docs/AZURON_REPRISE_2026-10-25.md`.

Couleur des dégâts corrigée le 24 octobre 2026 : **tous les dégâts infligés et reçus utilisent le même rouge métallique**, à 21 px. `damageFeedback.js` partage une seule palette `metallicDamage` ; `damageTexts.js` l'applique dans les deux directions. Publié `20261024-damage-red1` à 21 h 10, heure de Paris : trois fichiers frontend, 111 tests locaux et distants sans exclusion, cinq empreintes HTTPS conformes et 536 fichiers préservés. Aucun redémarrage ; cumul à 160 ms et règles de tir conservés. Les anciens choix blanc infligé / rouge reçu décrits plus bas sont historiques. Détails : `docs/COMBAT_DEGATS_CUMULES_2026-10-24.md`.

Ajustement des chiffres du 24 octobre 2026 : `damageFeedback.js` passe de 20 à 21 px (+5 %) ; `damageTexts.js` remet les dégâts reçus en rouge uni et conserve le blanc métallique pour les dégâts infligés. Publié `20261024-damage-tuning1` à 20 h 57, heure de Paris : trois fichiers frontend, 111 tests locaux et distants sans exclusion, cinq empreintes HTTPS conformes et 531 fichiers préservés. Aucun redémarrage ; cumul à 160 ms, sélection X6 et mécaniques serveur conservés. Rendu contrôlé dans une scène isolée avec les fichiers publics. Détails : `docs/COMBAT_DEGATS_CUMULES_2026-10-24.md`.

Sélection X6 du 24 octobre 2026 : `combatActions.js` sélectionne immédiatement X6 même en recharge, la mémorise et conserve ce choix après la salve ; reprendre X3 exige un clic sur X3. `weapons.js` retire tous les retours automatiques, et le coordinateur retire leur ancienne dépendance. Publié `20261024-laser-selection1` : quatre empreintes publiques conformes, 36 tests X6 locaux et 101 tests sur candidat, parcours Socket.IO avec spectateur et contrôle navigateur isolé ; aucun redémarrage de cette livraison. Cette règle remplace le retour automatique de `laser-input1`. Détails : `docs/SELECTION_X6_MANUELLE_2026-10-24.md`.

IA autonome du compagnon Ricky du 24 octobre 2026 : `server/src/portals/rickyCompanionAi.js` choisit et conserve une cible proche independamment des joueurs, borne la poursuite et donne priorite au retour au-dela de 200 coordonnees de mini-carte sur X ou Y (2000 unites internes). Le runtime conserve degats, soins et recompenses. Publie `20261024-ricky-ai1` : trois fichiers serveur, dix gardes, 82 tests cibles reussis ; treize scenarios reexecutes avec les sources de production, dont deux clients en WebSocket et polling. Redemarrage autorise, PID 1355453 / NRestarts 0, PostgreSQL et sante publique OK. Details : `docs/RICKY_IA_AUTONOME_2026-10-24.md`.

Dégâts cumulés du 24 octobre 2026 : `combatData/damageFeedback.js` fixe les chiffres infligés blancs, reçus rouges et la fenêtre de 160 ms. `systems/combatDamageFeedback.js` regroupe les départs par cible et tireur entre plusieurs images, suit les impacts confirmés et met à jour un même texte ; aucune anticipation des dégâts ou modification de calcul serveur. `render/damageTexts.js` extrait le rendu des chiffres de `canvasHud.js`, qui conserve son export. Première publication `20261024-damage-feedback1` à 20 h 21, heure de Paris. Puis `20261024-damage-metal1` à 20 h 51 : chiffres de 20 px au lieu de 28 px, contour plus fin et dégradés blanc acier / rouge métal ; trois fichiers frontend, 111 tests locaux et distants sans exclusion, dont le cumul X6 + X3 + roquettes + missiles via Socket.IO et les 36 scénarios X6 actuels. Cinq empreintes HTTPS et 534 empreintes serveur conformes, 531 fichiers préservés, aucun redémarrage. La sélection X6 manuelle publiée dans `laser-selection1` et les autres chantiers restent intacts. Rendu vérifié avec les modules publics dans une scène isolée. Détails, périmètre des tests et preuves : `docs/COMBAT_DEGATS_CUMULES_2026-10-24.md`.

Defilement du magasin du 24 octobre 2026 : `shopWorkspace.css` borne le catalogue a la hauteur restante du lanceur et adapte la fiche a sa propre hauteur ; `shopShowcase.js` conserve la position lors des selections et synchronisations, puis la remet a zero sur une nouvelle recherche ou rubrique. Le catalogue devient une region accessible au clavier. Publie `20261024-shop7` : quatre fichiers frontend, 108 tests locaux et sur candidat, 48 references sur trois formats de bureau et neuf rubriques recontrolees avec les fichiers publics. Quatre empreintes HTTPS conformes, aucun redemarrage serveur. Details : `docs/MAGASIN_FICHE_LATERALE_2026-10-24.md`.

Vol de réparation du 24 octobre 2026 : `render/repairDrone.js` accélère le déploiement, les articulations et l'orbite ; une trajectoire continue alterne approche/recul et de brefs changements de sens, en conservant les points de soudure fixés à la coque. Publié `20261024-repair3` : deux empreintes publiques conformes, 27 tests ciblés, 17 352 contacts vérifiés et un clip des trois variantes ; aucun redémarrage serveur. Détails : `docs/ROBOTS_REPARATION_2026-10-24.md`.

Accroche de réparation du 24 octobre 2026 : `render/repairDrone.js` fixe les deux points de soudure dans le repère de la coque ; ils ne suivent plus l'orbite du robot dans les zones transparentes. Le balayage suit la coque, les impulsions suivent leur courbe et l'origine écran utilise l'arrondi du sprite. Publié `20261024-repair2` : deux empreintes publiques conformes, 26 tests ciblés, 17 352 contacts vérifiés sur les neuf textures publiques et un tour animé complet ; aucun redémarrage de cette livraison. Détails : `docs/ROBOTS_REPARATION_2026-10-24.md`.

Magasin et fiche laterale du 24 octobre 2026 : `shopShowcase.js` coordonne le catalogue central et la fiche permanente de droite ; `shopMarkup.js` reserve les achats a cette fiche et distingue l'apercu par defaut du clic explicite du tutoriel. `shopWorkspace.css` porte les trois colonnes dans le cadre centre, les fonds de rarete et les formats tablette/mobile. Publie `20261024-shop6` : cinq fichiers frontend, 108 tests locaux et sur candidat, 48 references et sept formats controles, neuf commandes captees localement, neuf rubriques revues avec les fichiers publics. Publications paralleles preservees, aucun redemarrage serveur. Details : `docs/MAGASIN_FICHE_LATERALE_2026-10-24.md`.

Recharge X6 du 24 octobre 2026 (publiée dans `20261024-laser-input1`) : `src/shared/weaponCooldowns.js` partage les groupes de recharge entre le serveur et le client ; la X6 conserve ses 3 secondes et devient indépendante des X1–X4. `combatActions.js` conserve la dernière munition normale et la reprend après la salve X6, pendant sa recharge ou si le stock ne suffit plus. `weapons.js` sépare aussi les requêtes en attente et les refus ; le coordinateur transmet seulement la commande. Les dégâts et consommations restent autoritaires. Les 25 scénarios X6 actuels passent sur le candidat de publication des dégâts, dont un échange Socket.IO réel avec spectateur. L'affichage blanc/rouge est publié ensuite dans `20261024-damage-feedback1`. Détails : `docs/COMBAT_LISIBILITE_X6_2026-10-24.md`.

Robots de réparation du 24 octobre 2026 : `src/data/repairDroneVisuals.js` partage les trois sprites métalliques approuvés et reconnaît les anciens chemins canoniques ; `src/game/render/repairDrone.js` anime le corps, les bras découpés dans le sprite, les faisceaux et la soudure. `render/player.js` délègue et conserve le réglage graphique existant ; le système de soins retire seulement les anciennes croix. Publication frontend `20261024-repair1` : dix empreintes HTTPS conformes, 55 tests sur candidat réussis et trois échecs magasin déjà reproduits sur la base antérieure, trois articles publics et aperçu animé vérifiés ; aucun redémarrage serveur. Détails : `docs/ROBOTS_REPARATION_2026-10-24.md`.

Atelier clair du 24 octobre 2026 : `src/ui/hangarWorkshopMarkup.js` compose la fiche et les groupes d'équipement du vaisseau à partir des statistiques et des UID existants ; `render.js` conserve la coordination. `renderDroneBay.js` réutilise les sélections, modules, skins, achats et commandes actuels. `hangarWorkshop.css` aligne les trois panneaux des deux pages et impose cinq colonnes d'inventaire avec défilement vertical. Publication frontend `20261024-workshop1` : six empreintes HTTPS conformes, 76 tests ciblés sur la base publique, contrôles navigateur local et public, retour Drones vers le bon inventaire vérifié ; aucun redémarrage serveur. Détails : `docs/HANGAR_ATELIER_CLAIR_2026-10-24.md`.

Dégâts et poison publiés du 24 octobre 2026 : `src/shared/enemyDamage.js` applique une variation commune de ±18 % aux attaques directes après les paliers et multiplicateurs. Les bases des neuf espèces et de Deadly suivent les nouvelles valeurs validées ; le poison de la Pondeuse passe à 250. Le retour de PV a été reproduit avec les modules déployés : la validation ne doit pas accepter un ancien snapshot comme un soin pendant le poison ou le délai de réparation. Les ticks de fin et le remplacement d’un poison expiré sont corrigés côté serveur et mode local. Les 1 724 tests serveur passent, dont un échange Socket.IO réel ; le même échec DOM client subsiste sur les sources antérieures. Publié et vérifié avec l’équilibrage complet dans `20261024-mobs1` : 21 fichiers, 390 tests sur candidat, 21 cartes et 20 mobs contrôlés sur le runtime déployé, empreintes publiques conformes et serveur/PostgreSQL opérationnels. Détails : `docs/EQUILIBRAGE_MOBS_2026-10-24.md`.

Mini-carte et cible verrouillee du 24 octobre 2026 : `combatScene.js` transmet la selection a `canvasHud.js`. Le monstre verrouille conserve son point rouge vivant hors radar ; les autres restent filtres et le nettoyage existant retire le suivi au deverrouillage, a la mort et au changement de carte. Publie `20261024-lock1` : trois fichiers frontend, 56 tests locaux et sur candidat, sept controles navigateur avec snapshots WebSocket locaux ; trois empreintes HTTPS conformes et aucun redemarrage serveur. Details : `docs/MINICARTE_CIBLE_VERROUILLEE_2026-10-24.md`.

Bulle de dialogue de Ricky du 24 octobre 2026 : `npcDialogueView.js` et `npcDialogue.css` remplacent le panneau de transmission par une bulle compacte a pointe courbe, nom accroche au contour et commandes discretes ; `questNpcDialogue.js` adapte son placement au-dessus ou au-dessous du PNJ. Textes et progression conserves. Publie `20261024-ricky-bubble1` : cinq empreintes publiques conformes, 17 tests locaux et distants, lecture courte/longue et quatre formats controles avec les modules publics ; aucun redemarrage serveur. Details : `docs/RICKY_BULLE_DIALOGUE_2026-10-24.md`.

Dialogues et soucoupe de Ricky du 24 octobre 2026 : `npcDialogueView.js` separe la presentation des textes et de la progression de quetes ; `rickyVisuals.js` centralise le sprite partage et les marqueurs visuels ; `render/rickySaucer.js` dessine les reacteurs, le recul, les eclairs et le soutien a partir des evenements existants. Textes conserves a l'identique, lecture/relecture au clavier, statistiques et regles MMO toujours serveur. Publie `20261024-ricky-visuals1` : 16 empreintes HTTPS conformes, 49 tests sur candidat local et distant, dialogue et animations controles dans le renderer avec fichiers publics et evenements simules ; aucun redemarrage serveur. Details : `docs/RICKY_DIALOGUES_SOUCOUPE_2026-10-24.md`.

Cle de secours de Ricky du 24 octobre 2026 : `server/src/quests/rickyKeyRecovery.js` controle l'attribution d'une cle manquante pendant `Sauvons Deadly`, par interaction validee avec le PNJ et sauvegarde avant confirmation. Le compteur permanent de portails termines coupe l'aide des la premiere reussite, meme apres abandon/reprise de mission ; aucun nouveau champ persistant. Le dialogue et sa notification reprennent cette regle. Publie `20261024-ricky-retry1` : six fichiers, 60 tests cibles locaux et 59 applicables sur le candidat distant, dont un vrai parcours Socket.IO ; quatre empreintes HTTPS et dialogues publics verifies, serveur/PostgreSQL sains apres redemarrage. Details et limites de la suite globale : `docs/RICKY_CLE_SECOURS_2026-10-24.md`.

Icones de quetes du 24 octobre 2026 : `src/game/ui/questObjectiveVisuals.js` resout les images du catalogue commun (laser du magasin, materiaux de la raffinerie, portails) pour le relais et le journal de combat. Les trois categories laser, recolte et portail utilisent les memes images que leurs objectifs, avec le contexte de la mission ; les autres symboles sont conserves. Ce module ne calcule ni progression ni recompense. Publie `20261024-quest-assets1` : neuf empreintes HTTPS conformes, 47 tests cibles, cinq quetes controlees dans l'apercu avec modules et images publics ; aucun redemarrage serveur. Details et validation : `docs/QUETES_ICONES_2026-10-24.md`.

Raffinerie et cadre centre du 24 octobre 2026 : `dashboardComfort.css` adapte le bandeau, les onze stocks et les dimensions de l'arbre, tout en conservant les positions et commandes existantes. Publie `20261024-comfort2` : trois fichiers frontend, 36 tests sur candidat, 72 parcours de rendu et 15 fenetres d'amelioration verifies avec des profils synthetiques ; trois empreintes HTTPS conformes, aucun redemarrage serveur. Details : `docs/RAFFINERIE_CONFORT_2026-10-24.md`.

Équilibrage publié des mobs du 24 octobre 2026 : `src/shared/enemyProgression.js` centralise les niveaux fixes par secteur et les paliers additifs de +50 % tous les cinq niveaux, communs au client et au serveur. La facade serveur `world/enemyProgression.js` reexporte ces règles ; les constructeurs appliquent les bases validées et les boss de secteur à ×2 strict, bouclier et poison compris. Deadly passe au niveau 10. Les 1 683 tests serveur passent ; le test client de carte de portail reste en échec également sur les sources antérieures (doublure DOM Space Caster). Publié dans `20261024-mobs1` avec les nouveaux dégâts et le poison ; la rencontre Azuron publique de 20 vagues est conservée. Détails : `docs/EQUILIBRAGE_MOBS_2026-10-24.md`.

Confort du tableau de bord du 24 octobre 2026 : `dashboardComfort.css` centralise le cadre de 1 440 px, les proportions communes et les ajustements des pages du launcher, accueil compris. Les modules de rendu, le catalogue et les commandes serveur restent utilises. Le classement mobile conserve sa table dans un conteneur defilant. Publie `20261024-comfort1` : trois fichiers frontend verifies par empreintes HTTPS, 100 tests applicables sur candidat et controles navigateur sur sept formats ; accueil concurrent conserve, aucun redemarrage serveur. Details et controles : `docs/DASHBOARD_CONFORT_2026-10-24.md`.

Accueil du 24 octobre 2026 : `renderHome.js` compose les trois blocs valides (top 3 et position du compte, quete suivie, vaisseau actif). `homePresentation.js` normalise les donnees du classement serveur et les objectifs sans ajouter de profil fictif. Le logo devient le retour a l'accueil ; l'initialisation et la connexion du launcher choisissent cette vue. Le dialogue natif des quetes affiche les objectifs actifs en lecture seule. `home.css` conserve les codes du launcher et limite la largeur du contenu. Les commandes de jeu, le tutoriel et les autorites serveur restent en place. Details : `docs/ACCUEIL_AVOSOMA_2026-10-24.md`.

Magasin du 24 octobre 2026 : le catalogue valide remplace le cadre compact par des cartes avec achat direct, fonds selon la rarete, grandes images de vaisseaux et quantites par article. `shopShowcase.js` conserve la coordination DOM et les fiches natives ; `shopMarkup.js` partage les attributs d'achat entre cartes et fiches ; `shopWorkspace.css` porte les nouveaux formats et le cadrage des armes. Les attributs du tutoriel et les commandes serveur restent utilises. Publications frontend `20261024-shop4`, puis `20261024-shop5` pour le cadrage ; 99 tests cibles sur candidat, 46 fiches parcourues et controle des fichiers publics. Details : `docs/MAGASIN_CATALOGUE_2026-10-24.md`.

Portes de secteur du 24 octobre 2026 : `sectorPortalVisuals.js` definit les assets et les portes ordinaires ; `render/sectorPortalVisual.js` dessine l'anneau en vue droite, les particules et l'eclat de transfert. Les coordinateurs transmettent la transition manuelle ou Premium existante. Publie `20261024-sector-portals1` : dix fichiers frontend, 89 tests locaux et 59 sur candidat, controle des empreintes publiques, aucun redemarrage serveur. Details : `docs/PORTAILS_CHANGEMENT_MAP_2026-10-24.md`.

Objectif : reduire `server/src/index.js` sans changer le gameplay, en gardant le serveur autoritaire et le mode solo compatible pendant la migration.

Monnaies en lignes du 24 octobre 2026 : supportStorePanels.js compose six offres avec reserve complete, avantage explicite par euro, prix blanc et commande alignee ; storeCollections.css reprend la presentation validee et adapte les lignes aux petits ecrans. Quantites, tarifs, images et comportement achat conserves. Publication frontend selective 20261024-currency-rows1 ; details : docs/BOUTIQUE_MONNAIES_EN_LIGNES_2026-10-24.md.

Quantites boutique du 24 octobre 2026 : supportStorePanels.js met les montants de NOVA et credits dans un encadre distinct, avec bonus par euro entier et pastille compacte ; storeCollections.css garde les six cartes, les badges et les couleurs existantes. Aucun prix, montant ou achat modifie. Publication frontend selective 20261024-currency-emphasis1 ; details : docs/BOUTIQUE_QUANTITES_LISIBLES_2026-10-24.md.

Recompenses Beta a 08h du 24 octobre 2026 : src/shared/betaRewardSchedule.js fixe la periode quotidienne a 08:00 Europe/Paris, changements heure inclus ; les actions serveur existantes controlent cette meme regle avant attribution. betaRewardCountdown.js actualise le compteur sans reconstruire la grille chaque seconde, puis revele la recuperation a echeance. Historique conserve, aucun achat ni recuperation publique de verification. Publication selective 20261024-beta-clock1, tests de fuseau/DST, sauvegarde et Socket.IO reel ; details : docs/BETA_RECOMPENSES_08H_PARIS_2026-10-24.md.

Presentation Beta du 24 octobre 2026 : les packs reutilisent les lignes `sc-starter-*` des Packs officiels et conservent contenus, tarifs et bonus. `betaStoreCalendar.js` compose les 25 jours avec la grille et la fiche laterale du calendrier officiel ; la selection reste `store.betaCalendarDay`, sans modifier le profil. L'eligibilite et la commande serveur restent utilisees ; aucun calendrier OR ni paiement modifie. Details : `docs/BETA_PRESENTATION_OFFICIELLE_2026-10-24.md`.

Cartes Premium OR du 24 octobre 2026 : `premiumPassArtwork.js` selectionne les deux PNG dores pour les seuls pass OR 7/30 jours. Les lignes/fiches Boutique et le modele Magasin utilisent cette presentation commune ; les images standards et les pass inclus dans les packs restent identiques. Aucun catalogue partage, droit ou tarif modifie. Details : `docs/PREMIUM_OR_CARTES_2026-10-24.md`.

Finitions Boutique du 24 octobre 2026 : les prix deviennent blancs, sauf le Premium OR dore ; les cartes de monnaie affichent les mises en avant 24,99/99,99 EUR et les rendements par euro, calcules en centimes par rapport au pack 1,99 EUR. Les montants jusqu'a 330 millions restent entiers. `storePackCategories.js` prepare les familles Vaisseaux, Boosters, Lasers et Ressources ; les familles sans offre restent A venir. La vitrine Beta et ses 25 jours sont harmonises, sans changer les actions ni les gains. Les filtres restent hors profil. Details : `docs/BOUTIQUE_FINITION_2026-10-24.md`.

Boutique officielle du 24 octobre 2026 : `supportStorePanels.js` compose les six packs de monnaie, les packs de depart en lignes et les 28 jours du calendrier OR ; `storeCollections.css` reste limite a la Boutique. `premiumPassStore.js` conserve les lignes validees et distingue Premium classique et OR. Les quatre pass sont en euros uniquement ; l'ancien achat NOVA est refuse dans le client, l'action serveur et Socket.IO, sans debit ni attribution. Le terme OR protege `premiumGoldUntil`, reserve le calendrier et preserve les abonnements historiques jusqu'a leur echeance. Les prix et quantites NOVA suivent la grille validee ; les credits, contenus des starters et recompenses restent inchanges. Details : `docs/BOUTIQUE_OFFICIELLE_2026-10-24.md`.

Pass Premium du 24 octobre 2026 : `premiumPassStore.js` compose les offres en lignes validees, le choix Euros/NOVA et les avantages communs ; `supportStore.js` lui delegue cette rubrique et ses fiches. Le choix de monnaie reste un etat de presentation hors profil. `premiumPassStore.css` ne cible que la Boutique. Deux cartes PNG transparentes remplacent les medailles des pass 7/30 jours ; les prix, les durees cumulables et les commandes serveur restent inchanges. Les paiements en euros restent desactives ; seuls les pass en NOVA utilisent la commande existante.

Boutique complete du 24 octobre 2026 : `supportStore.js` porte les pass Premium, les monnaies, les packs de depart et le calendrier Premium de 28 jours ; `render.js` conserve seulement la composition et `app.js` les commandes existantes. La navigation reaffiche les cinq rubriques pendant la preparation (`BETA_STORE_ONLY=false`), sans changer les achats Beta. Les prix NOVA utilisent la meme regle de reputation/remise que le serveur. Les paiements euros hors Beta restent desactives ; les 28 gains sont consultables sans recuperation anticipee. `supportStore.css` reste limite a la Boutique.

Boutique Beta du 23 octobre 2026 : `src/ui/betaStore.js` compose la vitrine validee, les fiches natives et les 25 jours du calendrier depuis le catalogue et le profil reel. `render.js` conserve la composition et `app.js` les commandes existantes ; `betaStore.css` reste limite a la Boutique. Les autres rubriques sont conservees dans le code et masquees pendant la Beta. Les identifiants d'achat historiques restent stables lors du passage aux packs Valkyrie (1,49 EUR), Razorion (4,99 EUR) et Astralis (9,99 EUR). Le serveur attribue les vaisseaux fixes et les montants demandes ; les actions ne deviennent pas locales.

Azuron publie le 24 octobre 2026 a 21 h 20 (Paris), `20261024-azuron1` : `src/data/azuronPortal.js` partage les 30 vagues, six familles et pauses de 15 s apres chaque serie de cinq vagues espacees de 10 s. Le serveur utilise les bases et paliers actuels des monstres au niveau 10 ; les bornes de degats sont calculees apres les paliers avec la variation commune de 18 %, et les recompenses individuelles heritent des definitions actuelles. L'aggro permanente et l'anneau stable de 150 a 160 restent propres a Azuron, avec apparitions autour de la position autoritaire courante. Le HUD conserve le calendrier pendant une perte de vie ; le catalogue affiche les nouvelles series. Le decor public existant est conserve et le branchement du prototype violet est retire du client local ; ses textures et son module restent disponibles comme proposition future. Onze fichiers publies, six empreintes HTTPS et 540 empreintes de sources conformes, dont 529 fichiers preserves ; 260 tests cibles sans exclusion sur candidat, staging et sources effectivement deployees, dont les parcours complets Socket.IO en WebSocket et polling avec horloge de test acceleree. Serveur PID 1406267 / NRestarts 0, PostgreSQL pret, aucune erreur du nouveau processus. Details, limites des controles et sauvegarde : `docs/AZURON_REFONTE_2026-10-23.md` ; preuves : `output/azuron-release-2026-10-24/verification.json`.

Magasin du 23 octobre 2026 : `renderShop.js` conserve le point d’entree et delegue a `shopShowcase.js` (DOM/recherche), `shopCatalog.js` (references/filtres), `shopProductModel.js` (presentation), `shopMarkup.js` (cartes/fiches) et `shopIcons.js`. `shopShowcase.css` est limite au Magasin du dashboard. Les commandes serveur, tarifs et accroches du tutoriel sont conserves. Publie `20261023-shop1` : neuf empreintes HTTPS conformes, 94 tests cibles locaux et 94 sur le candidat de production, controle navigateur desktop/petite fenetre et modules publics ; sans redemarrage ni modification de profil. Details : `docs/MAGASIN_REFONTE_2026-10-23.md`.

## Regles de decoupage

Correction du magasin `20261023-shop2` : `shopWorkspace.css` neutralise la zone de grille historique `shop` et utilise la hauteur restante du dashboard. `shopCatalog.js` calcule les pages de neuf references ; `shopShowcase.js` pilote pagination et fenetres de details ; `shopMarkup.js` place les quantites dans le pied d’achat. Les notes de prix de `shopProductModel.js` conservent la majoration de reputation et la remise Premium pres du montant. Sept fichiers frontend publies, 97 tests locaux et 97 sur candidat, geometrie des 46 fiches controlee et sept empreintes HTTPS conformes, sans redemarrage. Details : `docs/MAGASIN_ERGONOMIE_2026-10-23.md`.

- Extraire un domaine a la fois.
- Injecter le contexte serveur (`players`, `profileManager`, `guard`, helpers) au lieu de creer des imports globaux caches.
- Garder `index.js` comme composition serveur : creation HTTP, Socket.IO, et branchement des domaines.
- Lancer `node --check` apres chaque extraction.
- Ne pas modifier `server/data/profiles.json` pendant les refactors.

## Lecture obligatoire avant de coder

Avant toute modification MMO ou architecture, lire dans cet ordre :

1. `MMO_100_PERCENT_PLAN.md`
2. `MMO_REFACTOR_NOTES.md`
3. `REGLES_IMPORTANTES_AVANT_DE_CODER.md`

Le fichier `REGLES_IMPORTANTES_AVANT_DE_CODER.md` explique ou placer le code apres les extractions recentes. Ne pas regonfler les facades (`store.js`, `questStore.js`, `refineryStore.js`, `server/src/quests/quests.js`, `server/src/economy/refinery.js`, `server/src/index.js`) avec de la logique metier.

## Etat actuel du decoupage

Raffinerie du 23 octobre 2026 : `renderRefinery.js` compose l'arbre permanent, l'expedition et le bilan depuis les donnees reelles ; `refineryPresentation.js`, `refineryHangarPanels.js` et `refineryDom.js` portent la presentation et la reconciliation du DOM sans perdre la saisie. `spawnRefineryPanel.js` extrait le raffinage et les bonus temporaires de la facade `spawnPanel.js`. Les coordinateurs ne conservent que les choix UI et les branchements aux commandes existantes. Onze illustrations stylisees individuelles remplacent les pictogrammes ; aucune recette, aucun tarif ni mecanisme serveur ne change. Details et verification : `docs/RAFFINERIE_VISUELLE_2026-10-23.md`.

Carte stellaire et voyage Premium du 23 octobre 2026 : `combatMapPanel.js` compose les 21 secteurs depuis les portails reels ; `sectorMapPresentation.js` et `sectorMap.css` portent la presentation validee. `sectorAutoTravel.js` et `multiplayer/sectorTravel.js` conservent l'intention et la prediction client, avec arret immediat sur ordre manuel. Les modules `server/src/travel/` calculent et pilotent le trajet a vitesse normale avec verification Premium canonique et transferts de quatre secondes ; `travelHandlers.js` expose les commandes authentifiees. L'animation automatique ne peut pas transferer le joueur localement. Les branchements restent dans les coordinateurs existants. Publication `20261023-sector-travel1` : 22 empreintes installees, 14 empreintes publiques et 193 executions de tests cibles client/serveur/compatibilite conformes ; sauvegarde distante disponible, decor de la mini-carte conserve. Details : `docs/CARTE_STELLAIRE_VOYAGE_PREMIUM_2026-10-23.md`.

Lot A09 du 23 octobre 2026 : `src/shared/reputation.js` centralise la reputation signee, la recidive glissante de sept jours, les paliers de majoration et le statut CIBLE. `shopPricing.js` et `shopPayment.js` limitent le nouveau tarif au magasin et aux achats en partie. `pvpDiscipline.js` suit l'agresseur par compte ; `playerPvpRewards.js` regle chaque mort une seule fois et attend la sauvegarde du profil. Le coordinateur lui delegue les anciens calculs PvP. `firmPvp.js` donne cinq gains complets, cinq gains a 5 %, puis aucun ; les sockets launcher/game du meme compte ne doublent pas le compteur. Details : `docs/PVP_REPUTATION_2026-10-23.md`.

Hangar du 23 octobre 2026 : `src/ui/renderHangarShowcase.js` compose la selection visuelle, l'apercu et les statistiques depuis le catalogue, les possessions et les getters existants. `src/ui/render.js` reste le coordinateur. `src/ui/launcherCurrency.js` conserve les montants complets dans l'en-tete ; `launcher.css` et `hangarShowcase.css` sont limites au dashboard. La selection de presentation survit aux synchronisations sans modifier le vaisseau actif serveur. Le tutoriel distingue maintenant selection et ouverture d'inventaire. Publie `20261023-hangar1` : 11 empreintes serveur et HTTPS conformes, 167 tests cibles sur la base de production et controle du navigateur public ; sans redemarrage, PID 3688379 inchange. Details : `docs/HANGAR_REFONTE_2026-10-23.md`.

Lot A06 du 23 octobre 2026 : `server/src/portals/portalSessions.js` conserve les sessions solo par compte dans un registre distinct des groupes sociaux. Les resolvers de combat, de visibilite, de mouvement, de collisions et de cycle de vie utilisent ce contexte ; les boucles des huit portails parcourent aussi les sessions personnelles. Les changements de groupe conservent les runs solo. `deadlyEntry.js` verifie la porte de la firme et attend la sauvegarde d'une cle par entrant ; un contexte modifie annule et restitue l'entree. Les sorties de groupe de Deadly passent par le cycle de vie. Decision utilisateur : tous les portails de progression sont solo ; Deadly est la seule exception solo/groupe, avec trois vies individuelles. Details : `docs/PORTAILS_SESSIONS_2026-10-23.md`.

Mini-carte du 23 octobre 2026 : `src/game/render/miniMapScenery.js` affiche un fond fixe du secteur. La composition est declaree dans `src/game/combatData/miniMapVisuals.js` ; Helion-01 charge la capture `assets/maps/minimaps/helion-01.png` via le cache d'assets. `canvasHud.js` superpose les marqueurs, `miniMapChrome.js` dessine le cadre et les reperes de navigation, et `miniMapLayout.js` partage la geometrie entre le rendu et `minimapState.js` (proportions, boutons, clics). Le fond ne depend ni du joueur, ni de la camera, ni du zoom. Details : `docs/MINICARTE_REPERES_VISUELS_2026-10-23.md`.

Lot A04 du 23 octobre 2026 : `src/shared/droneLimits.js` distingue les 8 drones standards de la capacite totale de 10. `server/src/economy/dronePurchases.js` calcule le devis depuis le profil serveur, verifie seulement la fraicheur du prix affiche, debite et attribue exactement un drone. `profileActions.js` conserve la validation tutoriel et la persistance avec restauration ; le handler confirme apres sauvegarde. Achat, fabrication et attribution admin respectent le plafond standard sans supprimer les drones historiques. Les deux drones speciaux et leurs recettes restent a definir selon la decision utilisateur. Details : `docs/DRONES_ACHATS_2026-10-23.md`.

Lot A03 du 22 octobre 2026 : `server/src/economy/craftingJobs.js` normalise chantiers et recus de paiement, `craftingRecovery.js` traite les remboursements des sorties devenues redondantes. `crafting.js` reste le coordinateur fabrication, `profileSanitize.js` conserve le recu sans muter l'economie, et `profiles.js` repare/persiste les anciens chantiers au chargement avec restauration sur echec. La raison de redondance est partagee via `src/data/craftingRecipes.js`. Details : `docs/FABRICATION_RECUPERATION_2026-10-22.md`.

Lot A02 du 22 octobre 2026 : l'abandon de quete est extrait dans `server/src/quests/questAbandon.js`, la migration ciblee des contrats obsoletes dans `questCatalogMigration.js`. Le catalogue partage expose sa revision dans `src/shared/quests/catalogRevision.js`. Le profil serveur conserve cette revision et persiste les journaux repares au chargement. Le controleur client `src/game/ui/questAbandon.js` attend le profil canonique ; il ne gere ni recompense ni inventaire. Details et preuves : `docs/QUETES_COHERENCE_2026-10-22.md`.

Le gros decoupage structurel est en pause. Les anciens fichiers fourre-tout les plus critiques ont ete reduits en facades ou coordinateurs :

- `server/src/index.js`
- `server/src/quests/quests.js`
- `server/src/economy/refinery.js`
- `src/core/store.js`
- `src/core/questStore.js`
- `src/core/refineryStore.js`
- `src/multiplayer/client.js`
- `src/app.js`
- `src/game/combatOrchestrator.js`
- `server/src/portals/instances.js`

Regle actuelle : ne plus decouper pour decouper. Ajouter du code dans le module de domaine existant, ou creer un nouveau module si la responsabilite ne rentre pas clairement dans les fichiers actuels.

## Extraction portails - Runtime Ricky et preparation

Fait le 28 juin 2026 :

- `server/src/portals/instances.js`
  - reste le coordinateur public des instances de portail ;
  - garde `createPortalInstanceManager(...)` et les exports historiques du manager ;
  - gere lancement, completion, rewards de portail generiques et branchement du runtime Ricky ;
  - reduit d'environ 1486 lignes a 546 lignes.
- `server/src/portals/rickyPortalRuntime.js`
  - objectifs Deadly/Ricky ;
  - vagues de route, balises, final gate et summons du boss ;
  - compagnon Ricky, tirs Ricky, soin, retours des joueurs apres completion ;
  - rewards des ennemis Ricky avec split de groupe et bonus de firme.
- `server/src/portals/rickyPortalState.js`
  - constantes Ricky ;
  - definition du portail Ricky ;
  - builders purs : objectif, boss, cage, allie Ricky.
- `server/src/portals/rickyCompanionAi.js`
  - choix autonome des ennemis et navigation du compagnon ;
  - rappel prioritaire au-dela de 200 coordonnees de mini-carte sur X ou Y.
  - suivi calme : depart a 30 coordonnees, maintien d'environ 24 en mouvement et arrivee a 12 a l'arret.
- `server/src/portals/rickyHealBeacon.js`
  - soin automatique du compagnon a 75 % de coque pour lui ou un allie proche ;
  - pose a sa position, pulsations, destinataires autorises et refus de l'ancienne commande manuelle.
- `server/src/portals/portalPreparation.js`
  - placement/public payload du portail prepare ;
  - verification de presence au portail prepare.
- `server/src/portals/portalWaves.js`
  - creation des ennemis et vagues generiques des portails standards.

Regle de reprise :

- ne pas remettre les objectifs ou le compagnon Ricky dans `instances.js` ;
- pour modifier le contenu Deadly/Ricky, partir de `rickyPortalRuntime.js` et `rickyPortalState.js` ;
- pour modifier les portails standards, commencer par `portalWaves.js` ou le coordinateur `instances.js` selon que la modification touche les vagues ou le cycle d'instance.

Checks effectues :

- `node --check server/src/portals/instances.js`
- `node --check server/src/portals/rickyPortalRuntime.js`
- `node --check server/src/portals/rickyPortalState.js`
- `node --check server/src/portals/portalWaves.js`
- `node --check server/src/portals/portalPreparation.js`
- `node --test server/test/portal-instance-security.test.js`
- `node --test server/test/quest-level10-ricky.test.js`
- `node --test server/test/player-state-security.test.js`
- `npm test` dans `server/` : 678/678 tests OK
- `git diff --check`

## Extraction client - combatData facade

Fait le 28 juin 2026 :

- `src/game/combatData.js`
  - reste la facade publique historique du client ;
  - reexporte `MAPS`, `ENEMY_TYPES`, les constantes combat et les profils moteurs ;
  - reduit d'environ 1968 lignes a 25 lignes.
- `src/game/combatData/mapDefinitions.js`
  - garde la definition brute initiale de `MAPS`.
- `src/game/combatData/maps.js`
  - reste la facade de composition des maps client ;
  - installe le graphe secteur, le portail Ricky et les libelles publics ;
  - reduit d'environ 825 lignes a 35 lignes.
- `src/game/combatData/mapConstants.js`
  - constantes de position de portails, visuels de firme et ids internes.
- `src/game/combatData/mapUtils.js`
  - helpers purs pour templates Helion, ids/noms de firmes, portails directionnels et theming.
- `src/game/combatData/firmMapBuilders.js`
  - generation des maps de firme et de la map `CORE`.
- `src/game/combatData/sectorGraph.js`
  - construction du graphe de portails client, bridges inter-firmes et resets de zones.
- `src/game/combatData/rickyPortalClient.js`
  - verrou client du portail Ricky, portail ferme, NPC Ricky et portail deverrouille.
- `src/game/combatData/mapDisplayNames.js`
  - application des noms publics de maps et labels de portails.
- `src/game/combatData/enemies.js`
  - garde `ENEMY_TYPES` et les helpers de loot/statistiques ennemis.
- `src/game/combatData/constants.js`
  - garde les constantes combat, aggro, hit chance, drops bruts et vagues portail.
- `src/game/combatData/engineProfiles.js`
  - garde `DEFAULT_ENGINE_PROFILE` et `SHIP_ENGINE_PROFILES`.

Regle de reprise :

- ne pas remettre de donnees ou logique metier dans `combatData.js` ;
- ne pas remettre de logique de graphe dans `maps.js` ;
- pour les donnees brutes de map, commencer par `mapDefinitions.js` ;
- pour les routes/bridges client, commencer par `sectorGraph.js` ;
- pour les portails Ricky client, commencer par `rickyPortalClient.js` ;
- pour les themings de firme, commencer par `mapConstants.js`, `mapUtils.js` ou `firmMapBuilders.js` selon le changement ;
- pour les stats ennemies, modifier `enemies.js` et verifier la source autoritaire serveur correspondante ;
- pour les profils moteurs, garder l'alignement avec les definitions de vaisseaux.

Checks effectues :

- `node --check src/game/combatData.js`
- `node --check src/game/combatData/maps.js`
- `node --check src/game/combatData/mapDefinitions.js`
- `node --check src/game/combatData/mapConstants.js`
- `node --check src/game/combatData/mapUtils.js`
- `node --check src/game/combatData/firmMapBuilders.js`
- `node --check src/game/combatData/sectorGraph.js`
- `node --check src/game/combatData/rickyPortalClient.js`
- `node --check src/game/combatData/mapDisplayNames.js`
- `node --check src/game/combatData/enemies.js`
- `node --check src/game/combatData/constants.js`
- `node --check src/game/combatData/engineProfiles.js`
- import ESM de `src/game/combatData.js`
- `node --test server/test/canonical-map-names.test.js`
- `node --test server/test/map-portal-transitions.test.js`
- `node --test server/test/quest-level10-ricky.test.js`
- `node --test server/test/world-resource-drops.test.js`
- `node --test server/test/asterion-double-shot.test.js`
- `npm test` dans `server/` : 679/680 tests OK ; echec restant hors extraction sur `server/test/combat-server-events-performance.test.js` profiler combat.

## Reste a decouper plus tard

Pas urgent avant les corrections en jeu, mais a garder en tete :

- `server/src/players/profiles.js`
  - sensible car charge, normalise et sauvegarde les profils ;
  - a reprendre seulement si une future modification profil l'alourdit.
- `src/app.js`
  - encore coordinateur UI global ;
  - a reprendre seulement si on ajoute beaucoup de branchements UI.
- `src/game/combatOrchestrator.js`
  - encore gros ;
  - a reprendre par domaines seulement si on touche au combat client.
- `src/multiplayer/client.js`
  - deja decoupe ;
  - a reprendre seulement si de nouveaux events MMO le regonflent.
- `server/src/players/profileActions.js`
  - peut devenir gros avec l'anti-spam et les nouvelles actions autoritaires ;
  - si ca arrive, separer les domaines action par action.

Priorite suivante recommandee : corrections en jeu et securisation MMO, pas nouveau refactor structurel.

## Systeme de firme - reprise rapide

Etat au 12 juin 2026 :

- page FIRME principale et panneau Firme en jeu branches ;
- quetes quotidiennes collectives auto-actives a 06h/12h/18h avec verrouillage des prochaines rotations ;
- quetes hebdomadaires collectives separees ;
- objectifs saisonniers personnels ajoutes dans l'onglet `SAISONNIERES` :
  - progression solo ;
  - points ajoutes au joueur et a sa firme a la completion ;
  - recompense placee dans les gains en attente ;
- anti-farm niveau separe des quetes : un monstre trop bas niveau ne donne pas le point direct, mais continue de faire progresser les quetes/objectifs ;
- UI quetes : le compteur est libelle `Participation quete` pour ne pas le confondre avec la contribution saisonniere reelle ;
- Orbes de firme : utiliser le `kind` serveur `drone_pirate`; `sentinel_orb` reste seulement un alias de compatibilite pour anciens snapshots/tests ;
- fin de portail : chaque portail termine appelle la progression de quete portail pour les membres concernes ;
- barre de progression par firme restauree sous chaque quete collective ;
- texte de timer actif affiche sous forme `Ferme ...` ;
- image Vorak Rusher tournee de 180 degres dans les objectifs ;
- icone Firmaton ajoutee puis renforcee avec un grand `F` noir : `assets/icons/firmaton.svg` ;
- verifications recentes : `node --check`, `node --test` serveur 72/72, `git diff --check`.

## Securite MMO - Verrous par compte

Fait :

- `server/src/security/accountActionLocks.js`
  - verrous anti double-clic et anti-spam par compte ;
  - fallback invite par `clientId` quand le joueur n'est pas connecte ;
  - logs serveur `Account action limited` pour les abus ;
  - emission `account:action-limited` silencieuse cote gameplay.
- `server/src/config.js`
  - configuration des verrous par event sensible.
- `server/src/index.js`
  - branchement dans le `guard(eventName)` central, apres le rate-limit Socket.IO.

Regle :

- ne pas appliquer ces verrous a `player:state`, `player:laser` ou aux events de rendu combat rapides ;
- garder les delais courts pour ne pas changer le gameplay normal ;
- renforcer seulement les actions qui touchent aux donnees critiques : economie, equipement, quetes, progression, raffinerie, loot et portails.

## Securite MMO - Autorite mort, respawn et chemins client

Fait :

- `server/src/players/playerLifecycle.js`
  - radiation hors map geree cote serveur ;
  - mort joueur serveur avec `player:death` ;
  - respawn serveur avec cout NOVA, position, PV et bouclier imposes ;
  - vies de portail et abandon force apres epuisement.
- `server/src/players/playerStateValidation.js`
  - snapshots refuses quand le joueur est mort ;
  - joueur a 0 PV bloque a 0 PV avant meme l'emission de `deathState` ;
  - sortie d'un portail actif refusee tant que l'instance n'est pas terminee ;
  - ancienne session de portail sans instance live replacee sur la map de firme.
- `server/src/portals/instances.js`
  - demarrage refuse si joueur mort ;
  - demarrage refuse si le portail n'est pas deverrouille ou si le niveau requis manque ;
  - double instance active refusee.
- `src/multiplayer/profileSync.js`
  - `profile:save` n'envoie plus que les preferences UI/action bar.
- `src/game/systems/*`
  - rewards locaux, vagues portail locales, radiation persistante locale et consommation locale de munitions contre cible serveur sont bloques en session MMO autoritaire.

Checks effectues :

- `node --test server/test/player-state-security.test.js`
- `node --test server/test/portal-instance-security.test.js`
- `node --test server/test/client-mmo-authority.test.js`
- `node --test server/test/player-lifecycle-authority.test.js`
- `npm test` dans `server/` : 168 tests OK

## Exploitation MMO - Admin et audit initial

Fait :

- `server/src/admin/adminManager.js`
  - verification de role `moderator`, `admin`, `owner` ;
  - snapshot joueurs connectes, groupes, instances et profils recents ;
  - inspection d'un joueur/profil ;
  - kick moderation ;
  - ajustement credits, NOVA et XP reserve aux admins avec raison obligatoire.
- `server/src/admin/adminAudit.js`
  - audit persistant JSON en fallback ;
  - audit PostgreSQL via table `admin_audit_log` quand `DATABASE_URL` est configure.
- `server/src/socket/adminHandlers.js`
  - events Socket.IO : `admin:sync`, `admin:inspect-player`, `admin:kick`, `admin:adjust-player`.
- `server/src/index.js`
  - branchement du manager admin ;
  - `/health` enrichi avec storage actif, uptime et compteurs joueurs.

Regles :

- aucun event admin ne doit modifier un profil sans role suffisant ;
- toute correction de credits/NOVA/XP doit avoir une raison et une entree d'audit ;
- les roles se gerent pour l'instant cote stockage compte (`role` dans `accounts`) ;
- il reste a construire une UI admin, ban/unban, mute, reset instance et logs economie/combat plus detailles.

Checks effectues :

- `node --check server/src/admin/adminManager.js`
- `node --check server/src/admin/adminAudit.js`
- `node --check server/src/socket/adminHandlers.js`
- `node --test server/test/admin-tools.test.js`

## Extraction 1 - Socket handlers autoritaires

Fait :

- `server/src/socket/questHandlers.js`
  - `quest:accept`
  - `quest:claim`
  - `quest:progress`
- `server/src/socket/progressionHandlers.js`
  - `skill:upgrade`
  - `portal:unlock`
  - `prestige:perform`
- `server/src/socket/economyHandlers.js`
  - `space-caster:run`
  - `refinery:*`
  - `shop:buy-*`
- `server/src/socket/equipmentHandlers.js`
  - `ship:equip-active`
  - `equipment:*`
- `server/src/socket/playerHandlers.js`
  - `player:hello`
  - `profile:save`
  - `player:state`
  - `player:laser`
  - `session:logout-request`
- `server/src/socket/groupHandlers.js`
  - `group:*`
  - `coop:start-test`
  - `portal:start`
- `server/src/socket/combatHandlers.js`
  - `coop:enemy-hit`
  - `combat:fire`
  - `loot:pickup`
  - `enemy:hit`
- `server/src/socket/authHandlers.js`
  - `auth:*`
- `server/src/socket/disconnectHandlers.js`
  - `disconnect`

Pourquoi :

- Ces events sont deja des actions serveur autoritaires.
- Ils partagent le meme modele : verifier rate-limit, retrouver le joueur, appliquer une action profil, emettre `profile:sync`.
- Les sortir de `index.js` reduit le bruit sans changer les fonctions monde/combat/groupes.

Checks effectues :

- `node --check server/src/index.js`
- `node --check server/src/socket/questHandlers.js`
- `node --check server/src/socket/progressionHandlers.js`
- `node --check server/src/socket/economyHandlers.js`
- `node --check server/src/socket/*.js`

## Reste dans index.js

- Boot HTTP et Socket.IO.
- Presence joueurs.
- IA ennemis monde.
- Groupes et instances.
- Portails.
- Combat et loot.
- Fonctions metier appelees par les handlers extraits.

## Extraction 2 - Definitions et etat monde

Fait :

- `server/src/world/aggro.js`
  - regle MMO safe-zone / riposte ;
  - un joueur en zone non-agression est ignore sauf par l'ennemi qu'il vient d'attaquer ;
  - la riposte expire apres 10 secondes sans nouvelle attaque du joueur.
- `server/src/world/definitions.js`
  - `WORLD_MAPS`
  - `WORLD_ENEMY_TYPES`
  - `COOP_ENEMY_TYPES`
  - `PORTAL_CONFIGS`
  - `PORTAL_DROP_RULES`
  - constantes loot monde
- `server/src/world/spawn.js`
  - serialization publique ennemi
  - RNG seed
  - choix pondere
  - safe zones
  - creation spawn ennemi monde
- `server/src/world/state.js`
  - stockage live des maps monde
  - emission `world:enemies`
  - changement de room map
  - recherche et respawn ennemi monde
  - liste des joueurs par map
- `server/src/world/constants.js`
  - constantes IA monde
- `server/src/world/ai.js`
  - selection cible ennemi
  - memoire d'aggro
  - decisions de mouvement par type d'ennemi
  - attaques ennemies contre joueurs
  - update d'un ennemi monde ou instance
- `server/src/world/loot.js`
  - ownership temporaire de loot
  - drops prives de pieces portail
  - ramassage serveur de loot
  - expiration des drops actifs
- `server/src/world/statusEffects.js`
  - effets de statut infliges par les ennemis serveur
  - poison autoritaire des Parasites et Boss Parasites
  - synchronisation visuelle des effets avec le client
- `server/src/portals/instances.js`
  - creation ennemis portail
  - generation des vagues serveur
  - demarrage instance portail
  - completion portail et recompenses serveur
- `server/src/groups/groups.js`
  - stockage live des groupes
  - serialization publique des groupes
  - create / leave / accept invite
  - emission groupe et instance
  - instance coop de test
- `server/src/world/rewards.js`
  - rewards monde serveur
  - partage groupe
  - application profil serveur
- `server/src/quests/killProgress.js`
  - progression quete serveur sur kill
- `server/src/combat/enemyHits.js`
  - resolution hit ennemi monde et instance
  - validation combat serveur via `resolveServerCombatFire`
  - progression vague portail apres kill
  - branchement rewards, loot, quetes et respawn
- `server/src/players/equipmentLocation.js`
  - verification spawn firme
  - sessions de respawn apres changement vaisseau/equipement
  - diffusion equipement aux sockets du meme compte
- `server/src/auth/socketSession.js`
  - payload auth public
  - attachement compte/socket
  - reprise session monde
  - takeover/reconnexion socket meme compte
- `server/src/tick/serverTick.js`
  - boucle serveur monde / instances
  - emission periodic world / instance
  - expiration loot
  - tick presence

Pourquoi :

- Les definitions statiques n'ont pas a vivre dans la composition serveur.
- L'etat live `worldMaps` reste encapsule dans un manager dedie.
- `index.js` orchestre le tick serveur sans contenir les decisions IA.
- L'etat live `activeLootDrops` reste encapsule dans un manager dedie.
- Les recompenses et vagues portail restent ensemble dans le domaine portail.
- L'etat live `groups` reste encapsule dans un manager dedie, tout en restant expose pour les rewards, le tick serveur et le combat.
- Le combat, les sessions socket, l'equipement et le tick ne vivent plus dans la composition serveur.

## Prochaine extraction recommandee

Reste eventuel, non urgent :

- `server/src/http/health.js` si on veut sortir le handler HTTP.
- Tests unitaires sur les managers purs.
- Tests d'integration Socket.IO plus complets.

## Extraction 3 - Profile manager

`server/src/players/profiles.js` reste le coordinateur de stockage profil :

- chargement et persistence ;
- resolution de cle compte / legacy ;
- avance de la raffinerie au chargement ;
- protection de `profile:save` ;
- composition des sous-modules profil.

Modules extraits :

- `server/src/players/profileSanitize.js`
  - sanitization profil et session monde ;
  - protection des possessions et champs serveur autoritaires.
- `server/src/players/profileDefaults.js`
  - profil starter ;
  - garantie du drone reparation starter.
- `server/src/players/profileActions.js`
  - achats ;
  - equipement ;
  - quetes ;
  - economie / raffinerie ;
  - progression / prestige.
- `server/src/players/profileMutations.js`
  - rewards ;
  - depenses generiques ;
  - mutations atomiques profil.
- `server/src/players/profileWorldSession.js`
  - lecture profil ;
  - lecture et sauvegarde session monde.

Resultat :

- `server/src/players/profiles.js` passe de 626 a environ 162 lignes.
- L'API publique du profile manager reste identique pour ne pas casser les handlers MMO.

Regle : la prochaine extraction doit rester petite, car ces fonctions utilisent beaucoup `io`, `players`, `groups`, `presence` et `profileManager`.

## Extraction 4 - Combat client

`src/game/combatOrchestrator.js` reste le coordinateur du combat client. Les extractions conservent les branches solo et MMO sans changer les contrats avec `src/app.js`.

Modules extraits :

- `src/game/ui/combatLogoutController.js`
  - deconnexion differee ;
  - blocages mouvement / combat / portail ;
  - evenements de deconnexion serveur.
- `src/game/ui/questNpcDialogue.js`
  - recherche et interaction PNJ de quete ;
  - dialogue et progression de quete.
- `src/game/systems/combatServerActions.js`
  - choix entre action serveur autoritaire et fallback solo pour quetes, raffinerie et upgrades.
- `src/game/combatProfileTitles.js`
  - libelles statiques des titres affiches en combat.
- `src/game/systems/combatPlayerStats.js`
  - construction de l'etat joueur combat ;
  - application des statistiques du vaisseau et de l'equipement.
- `src/game/systems/combatQuestProgress.js`
  - progression quete liee au combat ;
  - branches solo / serveur pour visites et coordonnees ;
  - echecs sur mort, perte de vie et temps limite.
- `src/game/systems/combatMultiplayerSync.js`
  - synchronisation des ennemis controles serveur ;
  - application du spawn coop.
- `src/game/systems/combatSession.js`
  - demarrage et arret du combat ;
  - reprise de session monde serveur ;
  - rafraichissement du loadout actif.
- `src/game/systems/combatPortalNavigation.js`
  - sortie d'instance portail ;
  - transition entre maps monde.
- `src/game/systems/combatEnemyDamage.js`
  - choix entre hit ennemi serveur et degats locaux temporaires ;
  - application bouclier / coque pour les ennemis non serveur.

Resultat intermediaire :

- `src/game/combatOrchestrator.js` passe d'environ 1447 a environ 1051 lignes.
- L'orchestrateur continue de composer les systemes combat, le rendu, les inputs et le cycle de vie.
- Les changements ont ete verifies avec `node --check` apres chaque extraction.

Prochaine extraction recommandee :

- ne pas extraire artificiellement les petits wrappers qui servent de liaison entre systemes ;
- traiter ensuite `src/multiplayer/client.js`, qui concentre encore connexion, profil, economie, groupes, monde et combat.

## Extraction 5 - Client multijoueur

`src/multiplayer/client.js` reste le point d'entree public du multijoueur et conserve tous ses exports existants.

Modules extraits :

- `src/multiplayer/authController.js`
  - inscription, connexion et deconnexion compte ;
  - action auth en attente pendant la connexion Socket.IO ;
  - application des succes et erreurs auth.
- `src/multiplayer/profileSync.js`
  - construction et emission du profil client temporaire vers `profile:save`.
- `src/multiplayer/socketCommands.js`
  - commandes sortantes progression, economie, equipement, quetes, raffinerie et loot.
- `src/multiplayer/combatCommands.js`
  - snapshot joueur ;
  - tirs serveur et effets laser.
- `src/multiplayer/groupCommands.js`
  - commandes groupe, coop et portail ;
  - lecture des joueurs distants du groupe.
- `src/multiplayer/playerSocketListeners.js`
  - profil, reprise monde, joueurs distants, effets, degats, rewards et loot.
- `src/multiplayer/economySocketListeners.js`
  - magasin, equipement, combat, raffinerie et Space Caster.
- `src/multiplayer/progressionSocketListeners.js`
  - quetes, competences, portails et prestige.
- `src/multiplayer/worldSocketListeners.js`
  - monde, ennemis serveur, groupes et instances.
- `src/multiplayer/socketState.js`
  - interpolation joueurs distants ;
  - remplacement des ennemis serveur ;
  - effets distants.
- `src/multiplayer/domHandlers.js`
  - delegation des actions DOM multijoueur et compte.

Resultat :

- `src/multiplayer/client.js` passe de 996 a environ 352 lignes.
- Il conserve la composition, la connexion Socket.IO, les evenements connexion/auth/session et la remise a zero de l'etat.
- Les 47 exports publics existants restent disponibles.
- Un smoke test verifie l'installation unique des 55 listeners et les flux joueurs, magasin, quetes, monde et commandes sortantes.

Prochaine extraction recommandee :

- `src/app.js`, qui concentre encore navigation, rendu, magasin, equipement, progression, raffinerie et branchements MMO.

## Extraction 6 - Coordinateur application

Premiere passe sur `src/app.js` :

- `src/app/profileController.js`
  - scope de sauvegarde invite / compte ;
  - sauvegarde et synchronisation du profil ;
  - application des snapshots profil serveur.
- `src/app/serverEventController.js`
  - consommation des achats serveur ;
  - application des evenements equipement, quetes, raffinerie et Space Caster ;
  - reactions aux changements auth.
- `src/app/shopActions.js`
  - achats vaisseaux, items, munitions, drones et formations ;
  - priorite aux commandes serveur avec fallback local temporaire.
- `src/app/equipmentActions.js`
  - equipement automatique et manuel ;
  - compatibilite vaisseaux / drones ;
  - retrait d'equipement et commandes serveur.
- `src/app/refineryActions.js`
  - delegation des clics raffinerie ;
  - jobs, production, upgrades, rush et expeditions.
- `src/app/progressionActions.js`
  - Space Caster ;
  - deverrouillage portails ;
  - amelioration des competences.

Resultat intermediaire :

- `src/app.js` passe de 1337 a environ 655 lignes.
- Les responsabilites profil MMO, evenements serveur, magasin, equipement, raffinerie et progression ne sont plus melangees a l'initialisation.

Prochaines extractions recommandees :

- extraire les derniers branchements UI generiques seulement si cela clarifie leur domaine ;
- traiter ensuite `src/core/store.js`, qui reste le prochain fichier critique melangeant etat, sauvegarde et logique metier.

## Extraction 7 - Store client core

Premiere passe sur `src/core/store.js` :

- `src/core/catalogStore.js`
  - getters catalogue : vaisseaux, items, munitions, drones, portails, quetes, materiaux et recettes.
- `src/core/currencyStore.js`
  - labels de prix, verification credits / NOVA et depense locale temporaire.
- `src/core/xpStore.js`
  - courbe XP, calcul du prochain niveau et synchronisation des points de competence.
- `src/core/graphicsStore.js`
  - presets et normalisation de la qualite graphique.
- `src/core/portalProgressStore.js`
  - pieces de portails, completion, conditions de vaisseaux, prestige et verrous de progression.
- `src/core/stateNormalizer.js`
  - migration / nettoyage des sauvegardes locales ;
  - protection des valeurs de profil ;
  - initialisation du starter Orion, slots, drone de reparation, quetes, raffinerie, cargo et loadouts.
- `src/core/combatStatsStore.js`
  - equipements actifs vaisseau / drones ;
  - bonus extras, drone de reparation, boosts temporaires et formations ;
  - stats combat vaisseau ;
  - XP, reputation et compteur d'utilisation des armes.

Resultat :

- `src/core/store.js` passe d'environ 950 a environ 170 lignes.
- Le fichier reste la facade publique historique du store pour limiter les changements d'import.
- Les responsabilites critiques sont maintenant separees entre catalogue, monnaie, XP, portails, normalisation d'etat et stats combat.
- Smoke test OK sur `loadState()`, `normalizeState`, XP, Orion, drone starter, slots 1 / 9, stats combat et reputation.

Prochaine extraction recommandee :

- reprendre `src/core/refineryStore.js`, qui reste un gros domaine metier avec production, upgrades, expeditions et recettes ;
- ou `src/core/questStore.js` si la prochaine priorite est la progression serveur / synchro quetes.

## Extraction 8 - Raffinerie client

Decoupage de `src/core/refineryStore.js` :

- `src/core/refineryRules.js`
  - constantes, modules, couts, courbes, durees et formules pures.
- `src/core/refineryStateStore.js`
  - niveaux materiaux, niveaux modules et activation production.
- `src/core/refineryUpgradeStore.js`
  - donnees d'upgrade ;
  - demarrage, rush et completion des jobs d'amelioration ;
  - upgrades instantanes legacy.
- `src/core/refineryShipmentStore.js`
  - capacite transport ;
  - expeditions vers la soute ;
  - rush et completion d'expedition ;
  - craft / fusion en soute.

Resultat :

- `src/core/refineryStore.js` passe d'environ 636 a environ 84 lignes.
- Il conserve les exports publics historiques via re-export pour ne pas casser les imports existants.
- Smoke test OK sur niveaux, capacite stockage, production, upgrade data, expedition et `tickRefineryProduction()`.

Prochaine extraction recommandee :

- `src/core/questStore.js`, car il reste un domaine critique pour la synchro MMO temps reel ;
- ensuite `server/src/quests/quests.js` pour aligner plus clairement la logique serveur des quetes.

## Extraction 9 - Quetes client

Decoupage de `src/core/questStore.js` :

- `src/core/questObjectiveMatchers.js`
  - matchers d'objectifs : kill, map, coordonnees, NPC, item drop, Space Caster et upgrades raffinerie.
- `src/core/questProgressStore.js`
  - quetes actives ;
  - lecture de progression ;
  - acceptation ;
  - conditions d'objectifs et progression d'objectif.
- `src/core/questFailureStore.js`
  - reset de run ;
  - echecs par perte de HP, temps limite et mort.
- `src/core/questRewardStore.js`
  - multipliers de recompense ;
  - claim local legacy et application des rewards.

Resultat :

- `src/core/questStore.js` passe d'environ 474 a environ 141 lignes.
- Il garde les exports publics historiques et devient surtout le dispatcher des evenements de progression client.
- Smoke test OK sur acceptation, claim, progression, kill, NPC et echecs.

Prochaine extraction recommandee :

- `server/src/quests/quests.js`, pour clarifier la logique serveur qui doit rester l'autorite MMO ;
- ou `server/src/economy/refinery.js` si on veut aligner les formules raffinerie serveur avec le decoupage client.

## Extraction 10 - Quetes serveur

Decoupage de `server/src/quests/quests.js` :

- `server/src/quests/questState.js`
  - catalogue quetes ;
  - objectifs, progression et normalisation des champs profil ;
  - acceptation serveur ;
  - progression d'objectif.
- `server/src/quests/questMatchers.js`
  - matchers kill et actions serveur.
- `server/src/quests/questRewards.js`
  - multiplicateurs de recompense ;
  - application des rewards serveur ;
  - claim serveur.

Resultat :

- `server/src/quests/quests.js` passe d'environ 322 a environ 60 lignes.
- Il reste la facade publique des quetes serveur avec `acceptServerQuest`, `claimServerQuest`, `progressServerQuestKill` et `progressServerQuestAction`.
- Smoke test OK sur les exports publics.
- `SERVER_CHECK_OK` sur tout `server/src`.

Prochaine priorite essentielle :

- ajouter les verrous anti-spam par compte sur les actions sensibles ;
- finir les domaines encore trop clients : rang et controles admin minimum ;
- aligner ou factoriser les formules raffinerie serveur si on veut eviter les divergences client / serveur.

## Extraction 11 - Raffinerie serveur

Decoupage de `server/src/economy/refinery.js` :

- `server/src/economy/refineryRules.js`
  - constantes, modules, couts, courbes, durees et formules pures serveur.
- `server/src/economy/refineryProfile.js`
  - acces profil : materiaux, soute, vaisseaux, niveaux raffinerie et activation production.
- `server/src/economy/refineryUpgrades.js`
  - calcul des upgrades ;
  - demarrage, rush et completion des ameliorations.
- `server/src/economy/refineryJobs.js`
  - lancement / claim des jobs de raffinage simples.
- `server/src/economy/refineryProduction.js`
  - production automatique par tick serveur.
- `server/src/economy/refineryShipments.js`
  - expeditions vers soute ;
  - rush / completion expedition ;
  - craft de soute.

Resultat :

- `server/src/economy/refinery.js` passe d'environ 530 a environ 14 lignes.
- Il reste la facade publique historique utilisee par `profileActions.js` et `profiles.js`.
- Smoke test OK sur les exports raffinerie serveur.
- `SERVER_CHECK_OK` sur tout `server/src`.

Suite recommandee :

- arreter le gros decoupage structurel ;
- passer aux corrections en jeu et aux priorites MMO : anti-spam serveur, rang serveur et admin minimum.

## Extraction 12 - Cibles joueurs distants combat

Le ciblage client des joueurs distants n'est plus porte directement par `src/game/combatOrchestrator.js`.

- `src/game/systems/combatRemoteTargets.js`
  - construit la cible combat d'un joueur distant ;
  - resout une cible par id joueur pour les beams / attaques ;
  - resout la cible la plus proche au clic monde ;
  - conserve les regles existantes : meme groupe, niveau PvP, firme hostile et filtre par map courante.

Resultat :

- `src/game/combatOrchestrator.js` compose maintenant un resolver injecte avec `store`, `multiplayer` et `currentMap`.
- La logique de lock joueur distant devient testable sans charger le canvas ou Socket.IO.

Checks a relancer apres modification de ce domaine :

- `node --check src/game/systems/combatRemoteTargets.js`
- `node --check src/game/combatOrchestrator.js`
- `node --check server/test/combat-remote-targets.test.js`
- `npm test` dans `server/`

## Audit 13 - Gros fichiers jeu apres reprise

Etat inspecte le 13 juin 2026 apres l'extraction des cibles joueurs distants :

- `src/game/combatData.js` reste le plus gros fichier, mais c'est surtout un catalogue de maps, ennemis et profils. Ne pas le decouper sans besoin de domaine clair.
- `src/game/ui/combatPanels.js` reste gros car il compose plusieurs panneaux combat. Les prochains decoupages utiles sont des sous-panneaux autonomes, pas des petits wrappers.
- `src/game/render/world.js` est un gros renderer visuel. Le decouper seulement par couche de rendu claire si on touche aux fonds/parallax/spawn, car un mauvais decoupage peut casser le rendu sans gain gameplay.
- `src/game/combatOrchestrator.js` reste un coordinateur. Continuer a extraire des domaines testables quand on touche a une feature combat/MMO, mais ne pas extraire la glue pure.
- `src/game/systems/combatServerEvents.js` a maintenant des sous-domaines extraits pour effets d'armes distants et quetes serveur. Il reste candidat futur seulement si on touche aux portails, degats joueur, rewards, loot ou projectiles ennemis.

Regle appliquee : garder le decoupage conservateur. Un fichier gros n'est pas automatiquement un fichier mal decoupe si son contenu est du catalogue ou du rendu coherent.

## Extraction 13 - Carte du panneau combat

Le rendu de la carte territoriale du panneau combat n'est plus dans `src/game/ui/combatPanels.js`.

- `src/game/ui/combatMapPanel.js`
  - contient les secteurs visuels des firmes ;
  - contient les liaisons affichees sur la carte ;
  - rend le panneau carte combat a partir de `maps` et `getCurrentMap` ;
  - garde l'echappement HTML des noms de maps pour eviter une injection dans le panneau.
- `src/game/ui/combatPanels.js`
  - conserve seulement la composition, l'ouverture et le refresh du panneau `map` ;
  - appelle `renderCombatMapPanel({maps, getCurrentMap})`.
- `server/test/combat-map-panel.test.js`
  - verifie la map courante ;
  - verifie le compteur de secteurs actifs ;
  - verifie les points de portails ;
  - verifie l'echappement des noms affiches.

Resultat :

- `src/game/ui/combatPanels.js` passe d'environ 1306 a environ 1163 lignes.
- La carte devient testable sans canvas, DOM ni Socket.IO.

Checks a relancer apres modification de ce domaine :

- `node --check src/game/ui/combatMapPanel.js`
- `node --check src/game/ui/combatPanels.js`
- `node --check server/test/combat-map-panel.test.js`
- `node --test server/test/combat-map-panel.test.js`
- `npm test` dans `server/`

## Extraction 14 - Effets d'armes joueurs distants

Les animations d'armes recues des autres joueurs ne sont plus codees directement dans `src/game/systems/combatServerEvents.js`.

- `src/game/systems/combatRemoteWeaponEvents.js`
  - consomme `multiplayer.remoteEffects` ;
  - filtre les effets par map courante ;
  - rejoue les lasers distants via le systeme de beams ;
  - cree les projectiles visuels des roquettes et missiles distants ;
  - conserve l'ammo exacte, le sprite projectile, la couleur, la cible et les courbes de salve.
- `src/game/systems/combatServerEvents.js`
  - conserve son API publique historique ;
  - delegue `applyRemoteWeaponEvents()` au processeur dedie.
- `server/test/combat-remote-weapon-events.test.js`
  - verrouille le rendu laser distant avec ammo/couleur/cible ;
  - verrouille les missiles distants avec sprite `missile_m2`, cible joueur locale et courbes ;
  - verifie que les effets d'une autre map sont conserves brievement au lieu d'etre perdus.

Resultat :

- `src/game/systems/combatServerEvents.js` passe d'environ 512 a environ 460 lignes.
- La zone fragile des animations de ton pote est testable sans canvas ni Socket.IO.

Checks a relancer apres modification de ce domaine :

- `node --check src/game/systems/combatRemoteWeaponEvents.js`
- `node --check src/game/systems/combatServerEvents.js`
- `node --check server/test/combat-remote-weapon-events.test.js`
- `node --test server/test/combat-remote-weapon-events.test.js`
- `npm test` dans `server/`

## Extraction 15 - Evenements de quetes serveur en combat

Les evenements de quetes recus pendant le combat ne sont plus traites directement dans `src/game/systems/combatServerEvents.js`.

- `src/game/systems/combatQuestServerEvents.js`
  - traite la progression de quete serveur ;
  - traite les recompenses de quetes claim ;
  - traite les echecs de quetes temps / perte de vie ;
  - construit les libelles compacts de recompenses de quete ;
  - accepte des dependances injectees pour etre teste sans lancer le jeu.
- `src/game/systems/combatServerEvents.js`
  - garde les methodes publiques `applyQuestProgressEvents()` et `applyQuestFailureEvents()` ;
  - delegue aussi le claim de quete dans `applyAll()`.
- `server/test/combat-quest-server-events.test.js`
  - verifie la progression locale depuis un event serveur ;
  - verifie le reset et retrait d'une quete echouee ;
  - verifie le dedoublonnage d'un claim ;
  - verifie les libelles de recompenses items / munitions / portails / materiaux.

Resultat :

- `src/game/systems/combatServerEvents.js` passe d'environ 460 a environ 355 lignes.
- La logique de quetes combat est relisible et testable sans canvas ni Socket.IO.

Checks a relancer apres modification de ce domaine :

- `node --check src/game/systems/combatQuestServerEvents.js`
- `node --check src/game/systems/combatServerEvents.js`
- `node --check server/test/combat-quest-server-events.test.js`
- `node --test server/test/combat-quest-server-events.test.js`
- `npm test` dans `server/`

## Extraction 16 - Bindings de barre d'action combat

Les interactions de la barre d'action combat ne sont plus melangees aux bindings souris/clavier monde dans `src/game/ui/inputBindings.js`.

- `src/game/ui/combatActionBarInput.js`
  - installe les listeners de clic, dragstart, dragend, dragover et drop de `#gameActionBar` ;
  - gere le deplacement d'un slot vers un autre ;
  - gere la suppression d'un slot quand il est tire hors de la barre au-dela de 72 px ;
  - gere les drops d'extras, formations drones, munitions et CPU missile ;
  - expose `setCombatAssetDragImage()` reutilise par le panneau rapide combat.
- `src/game/ui/inputBindings.js`
  - garde les interactions monde, minimap, panneaux utilitaires, panneau spawn et raccourcis clavier ;
  - delegue la barre d'action a `installCombatActionBarInputHandlers()`.
- `server/test/combat-action-bar-input.test.js`
  - verrouille le seuil de suppression d'un slot ;
  - verrouille la lecture des payloads de drop ;
  - verifie l'assignation d'un extra dans un slot ;
  - verifie la suppression d'un slot tire hors barre.

Resultat :

- `src/game/ui/inputBindings.js` passe d'environ 688 a environ 598 lignes.
- Le code sensible des slots et munitions devient testable sans lancer le jeu.

Checks a relancer apres modification de ce domaine :

- `node --check src/game/ui/combatActionBarInput.js`
- `node --check src/game/ui/inputBindings.js`
- `node --check server/test/combat-action-bar-input.test.js`
- `node --test server/test/combat-action-bar-input.test.js`
- `npm test` dans `server/`

## Ajout MMO - Chat combat

Le chat combat MMO est decoupe en modules dedies :

- `server/src/socket/chatHandlers.js`
  - reception `chat:send` ;
  - validation du canal ;
  - nettoyage du texte ;
  - diffusion `chat:message` globale.
- `src/multiplayer/chatSocketListeners.js`
  - reception `chat:message` ;
  - reception `chat:error` ;
  - stockage temporaire dans `multiplayer.chatMessages`.
- `src/game/ui/combatChat.js`
  - fenetre chat redimensionnable ;
  - onglets Global, Firme, Guilde et Log ;
  - sauvegarde taille / position dans `uiLayout.combatChatPanel` ;
  - journal personnel des rewards combat via `voidsector:combat-log`.

Etat actuel :

- canal Global MMO fonctionnel ;
- canaux Firme et Guilde affiches mais bloques tant que la logique firmes / guildes n'existe pas ;
- onglet Log alimente par les rewards serveur et le legacy solo.

Regle :

- ne pas mettre de logique chat dans `server/src/index.js`, `src/game/combatOrchestrator.js` ou `src/multiplayer/client.js` au-dela du branchement minimal.

## Ajout MMO - Systeme de firme

La refonte firme ajoute un domaine serveur autoritaire dedie :

- `server/src/firms/firmRules.js`
  - constantes de saison, seuil collectif, paliers reputation, boutique, recompenses, quetes et boites.
- `server/src/firms/firmState.js`
  - etat global persistant, migration et sanitization.
- `server/src/firms/firmSeason.js`
  - points, contributions, classements, cloture de saison et recompenses en attente.
- `server/src/firms/firmQuests.js`
  - quetes quotidiennes 06h/12h/18h en heure locale serveur ;
  - snapshots avec quetes ouvertes et prochaines quetes verrouillees ;
  - quetes hebdomadaires auto-actives, progression collective et classements de contribution sans gain personnel de contribution ;
  - reclamation de prime de quete terminee, une seule fois par joueur.
- `server/src/firms/firmEconomy.js`
  - firmatons, achats boutique, ouverture de boites et application des recompenses.
- `server/src/firms/firmPvp.js`
  - anti-farm PvP quotidien.
- `server/src/firms/firmWar.js`
  - facade compatible avec les appels existants.
- `server/src/socket/firmHandlers.js`
  - sync, achat, ouverture, reclamation de recompense et reclamation de prime de quete.

Client :

- `src/ui/renderFirm.js` rend la page principale FIRME ;
- `src/styles/firm.css` contient le style de la page FIRME ;
- `src/game/ui/combatFirmPanel.js` rend le panneau firme condense en combat ;
- `src/multiplayer/firmCommands.js` et `src/multiplayer/firmSocketListeners.js` isolent les commandes et events Socket.IO du domaine.

Regles importantes :

- les firmatons ne doivent etre visibles que dans la page principale FIRME ;
- le bouton `CLASSEMENT` existant reste hors perimetre ;
- les broadcasts globaux doivent utiliser `firm:ranking`, pas `firm:snapshot`, pour ne pas ecraser le snapshot personnel d'un joueur ;
- `firmatons`, `firmBoxes` et `firmRewardHistory` sont proteges contre les sauvegardes client ;
- les nouvelles actions sensibles sont rate-limitees dans `server/src/config.js`.
- les primes de quete donnent 5 firmatons mais ne donnent aucun point individuel.
- la participation affichee sur une quete mesure uniquement les actions du joueur sur cette quete ; elle n'ajoute pas de contribution individuelle ;
- la colonne gauche des quetes ne cumule plus des objectifs de tailles differentes et liste les sessions du jour sans celles du lendemain ;
- les montants de Firmatons sont affiches avec l'icone apres le nombre dans la page FIRME.
- la boutique FIRME est structuree en zones de rarete filtrables ; chaque rarete contient 3 paliers de reputation et 9 offres catalogue.
- les offres de munitions laser de la boutique utilisent les noms et assets du catalogue d'equipement, pas des libelles temporaires.
- les coffres de firme utilisent des assets SVG dedies par rarete dans `assets/firm/chests/`.
- une planche de preview locale existe dans `assets/firm/chests/preview.html` pour comparer les 5 coffres de rarete et les 3 concepts alternatifs.
- `firm:box-open` renvoie maintenant la rarete du coffre ouvert et declenche cote client une animation centrale : rotation du coffre, ouverture du couvercle, puis revelation de la recompense avec son asset et sa quantite.

## Ajout MMO - Progression des monstres et drops de ressources

- Les plages de niveaux sont autoritaires cote serveur :
  - cartes 1 a 5 : `1-4`, `5-9`, `10-14`, `15-19`, `20-24` ;
  - noyau central : `25-34` ;
  - les regles de drop couvrent deja les futures zones trou noir `35-50`.
- Chaque espece conserve un niveau de base. Chaque niveau supplementaire applique :
  - `+5 %` vie, bouclier et degats ;
  - `+10 %` XP, credits, NOVA et donc reputation issue de l'XP.
- `server/src/world/resourceDrops.js` contient les taux par rarete et tire les ressources cote serveur.
- `server/src/world/loot.js` cree des drops prives, valide la distance et ajoute la ressource au profil lors du ramassage.
- Les objets au sol utilisent un asset leger, un halo de rarete, une rotation et une oscillation verticale.
- A l'arrivee sur une ressource, le client joue une aspiration de `0,7 s`, bloque le mouvement puis demande la validation finale du ramassage au serveur.
- La boutique commune contient un coffre et les huit nouvelles ressources de craft.
- Chaque achat de ressource commune ajoute exactement une unite au profil.

Checks effectues :

- `npm test` dans `server/` : 81 tests OK ;
- `node --check` sur les fichiers JS modifies : OK ;
- `git diff --check` : OK ;
- verification visuelle navigateur non effectuee dans la session, car le navigateur integre etait indisponible.

## Verrou MMO-only - Autorite serveur et fin des fallbacks locaux

La passe MMO-only retire les derniers chemins actifs qui pouvaient encore doubler la logique serveur cote client.

- `src/core/store.js` ne sauvegarde plus l'etat complet dans `localStorage`.
- `src/core/localPreferencesStore.js` ne persiste que les preferences locales :
  - qualite graphique ;
  - raccourcis de slots ;
  - layout UI.
- Les anciens saves locaux complets sont relus uniquement pour migrer ces preferences, puis reecrits en format preferences-only.
- `src/multiplayer/profileSync.js` n'envoie plus que les preferences non critiques au serveur :
  - action slots ;
  - action slots par vaisseau ;
  - dernier laser selectionne.
- `server/src/players/profiles.js` rejette les sauvegardes non authentifiees et ignore les champs critiques envoyes par le client.

Progression et combat :

- XP, credits, NOVA, niveaux, inventaire, munitions, ressources, quetes, portails, kills, stats de tir et temps de jeu ne doivent plus etre modifies localement.
- Les recompenses, drops, ramassages, tirs et quetes attendent la validation serveur puis un `profile:sync`.
- Les evenements client de recompense ou de quete servent a afficher des notifications, pas a appliquer la progression.
- Les cibles non serveur sont refusees par le systeme d'armes MMO-only.
- Les drops au sol ne sont ramassables que s'ils sont explicitement `serverControlled`.
- Les titres de profil sont valides cote serveur via `profile:title-set`.

Tests de protection ajoutes ou mis a jour :

- sauvegarde locale preferences-only ;
- sauvegarde profil client limitee aux preferences autorisees ;
- rejet des cibles et butins locaux ;
- absence de consommation locale des munitions ;
- absence de calcul de degats local ;
- stats de tir et temps de jeu persistants cote serveur ;
- validation serveur des titres publics.

Checks effectues :

- `node --check` sur les fichiers modifies clefs : OK ;
- tests cibles MMO-only : OK ;
- `npm test` dans `server/` : 241 tests OK ;
- recherches `rg` sur les mutations locales sensibles : aucune mutation active hors application du `profile:sync` serveur.

Regle de maintenance :

- Ne pas recreer de branche `else saveState()` pour quetes, recompenses, achats, raffinage, tirs ou drops.
- Si une action touche a la progression MMO, elle doit passer par une commande socket serveur, puis etre appliquee au client uniquement par `profile:sync`.
- Les modules legacy de `src/core/*Store.js` peuvent rester tant qu'ils ne sont pas appeles par les workflows actifs ; leur suppression doit se faire par domaine, avec tests dedies.

## Verrou MMO-only - Compte obligatoire

- `server/src/security/gameplayAccountGuard.js` applique une politique privee par defaut : tout event socket exige un `accountId`, sauf auth, `player:hello` et classement.
- `player:hello` n'envoie plus de profil invite. Un token en attente peut terminer `auth:session`, mais aucun gameplay n'est accepte avant l'attachement du compte.
- Les sockets non authentifiees ne rejoignent plus automatiquement la map 0 et ne sont plus publiees dans `players:list`.
- Les commandes client combat, economie, profil, firme, groupe et social attendent maintenant un compte et un `profile:sync` termines.
- Un logout compte ferme proprement la socket afin que l'ancien vaisseau ne reste pas actif sous une identite invitee.
- Tout nouveau handler Socket.IO doit appeler `guard(eventName)` ; un test structurel controle cette regle.

## Securite MMO - Identite pilote et rendu HTML

- `server/src/players/profileIdentity.js`
  - normalise les noms de pilote en texte affichable ;
  - conserve lettres, accents, chiffres, espaces, points, tirets et `_` ;
  - retire les caracteres de controle et de balisage HTML ;
  - limite les noms a 24 caracteres.
- `server/src/players/profileSanitize.js`
  - nettoie aussi les noms deja stockes lors du chargement des profils.
- `src/ui/render.js` et `src/ui/renderLeaderboard.js`
  - echappent explicitement les noms avant insertion avec `innerHTML`.
- `server/test/profile-name-security.test.js`
  - verrouille la normalisation serveur ;
  - verrouille le nettoyage des anciens profils ;
  - controle les deux rendus client sensibles.

Checks effectues :

- `node --check` sur les modules modifies ;
- `npm test` dans `server/` : 256 tests OK ;
- `git diff --check` sur les fichiers de cette passe.

## Persistance MMO - Ecritures atomiques et arret gracieux

- `server/src/storage/profileStore.js`
  - serialise les ecritures dans une file unique ;
  - execute les sauvegardes PostgreSQL dans une transaction ;
  - refuse qu'une ancienne version `updatedAt` remplace une version plus recente ;
  - fusionne les profils modifies avec le contenu JSON existant ;
  - ecrit le fallback JSON dans un fichier temporaire unique, force la synchronisation disque puis effectue un renommage atomique.
- `server/src/players/profiles.js`
  - sauvegarde uniquement le profil concerne par une action ;
  - attribue une version `updatedAt` strictement croissante ;
  - expose `flushPersistence()` pour attendre toutes les sauvegardes en cours.
- `server/src/lifecycle/gracefulShutdown.js`
  - arrete le tick serveur et les nouvelles connexions ;
  - force une derniere capture des joueurs connectes ;
  - attend la fin de la persistance avant de fermer PostgreSQL ;
  - rend l'arret idempotent pour eviter une double fermeture.
- `server/src/index.js`
  - branche cet arret propre sur `SIGINT` et `SIGTERM`.
- `server/test/profile-persistence.test.js`
  - controle la serialisation, la fusion JSON, les fichiers temporaires, les versions obsoletes et la transaction PostgreSQL.
- `server/test/graceful-shutdown.test.js`
  - controle l'ordre complet de fermeture et l'idempotence.

Checks effectues :

- `node --check` sur les 99 fichiers JavaScript serveur : OK ;
- `npm test` dans `server/` : 260 tests OK ;
- `git diff --check` sur les fichiers de cette passe : OK.

## Exploitation MMO - Configuration production et readiness

- `server/src/config.js`
  - refuse un port hors plage ;
  - valide une ou plusieurs origines HTTP(S) separees par des virgules ;
  - interdit `CLIENT_ORIGIN=*` en production ;
  - exige `DATABASE_URL` en production pour empecher un demarrage accidentel sur le fallback JSON.
- `server/src/db/client.js`
  - expose un controle PostgreSQL reel avec `SELECT 1` et mesure de latence.
- `server/src/monitoring/health.js`
  - construit un etat de readiness testable sans demarrer tout le serveur ;
  - retourne HTTP 503 quand PostgreSQL est configure mais indisponible ;
  - conserve les compteurs sockets, comptes en ligne et sessions de jeu.
- `server/src/index.js`
  - utilise cette readiness pour `/health`.
- `server/.env.example`
  - documente les variables obligatoires en production.
- `.gitignore`
  - exclut tous les magasins JSON d'execution, y compris `server/data/profiles.json`.
- `server/test/production-safety.test.js`
  - controle les erreurs de configuration production et les reponses 200/503 de readiness.
- `server/test/live-server-config.test.js`
  - controle que tous les fichiers JSON runtime sont exclus de Git.

Attention :

- `server/data/profiles.json` etait deja suivi par Git avant l'ajout de la regle. La regle empeche les futurs ajouts une fois le fichier retire de l'index, mais le retrait de l'index doit etre fait explicitement sans supprimer la copie locale.

Checks effectues :

- `npm test` dans `server/` : 266 tests OK ;
- `node --check` sur les 158 fichiers JavaScript de `server/src` et `server/test` : OK ;
- `git diff --check` sur les fichiers de cette passe : OK.

## Stabilite 24/7 - Rate limits et cooldowns

- `server/src/socket/rateLimit.js`
  - purge periodiquement les buckets expires ;
  - expose un nettoyage par socket ;
  - supprime immediatement les buckets d'une socket deconnectee.
- `server/src/security/accountActionLocks.js`
  - conserve les verrous par `accountId` lors d'une reconnexion ;
  - purge periodiquement les comptes inactifs sans attendre un seuil de 5 000 entrees.
- `server/src/combat/damage.js`
  - lie les cooldowns d'armes a l'identite stable du compte ;
  - empeche de contourner une recharge en changeant de socket ;
  - purge les cooldowns expires.
- `server/src/socket/disconnectHandlers.js`
  - declenche le nettoyage des rate limits socket a chaque deconnexion.
- `server/test/rate-limit-lifecycle.test.js`
  - controle la liberation memoire ;
  - controle la conservation des verrous compte apres reconnexion ;
  - controle le cooldown combat stable par compte.

Checks effectues :

- `npm test` dans `server/` : 269 tests OK ;
- `node --check` sur les 159 fichiers JavaScript de `server/src` et `server/test` : OK ;
- `git diff --check` sur les fichiers de cette passe : OK.

## Schema MMO - Migrations versionnees et identites uniques

- `server/src/db/migrations.js`
  - remplace les modifications SQL dispersees au demarrage par des migrations identifiees ;
  - stocke les versions appliquees dans `schema_migrations` ;
  - execute chaque migration dans sa propre transaction ;
  - utilise un verrou consultatif PostgreSQL pour empecher deux instances de migrer simultanement ;
  - cree `pilot_identities` avec une cle de nom unique et un seul nom reserve par compte ;
  - bloque la migration si des noms de pilote deja configures sont en conflit.
- `server/src/db/client.js`
  - lance le moteur de migrations lors de l'initialisation PostgreSQL.
- `server/src/players/profileIdentity.js`
  - produit une cle d'identite NFKC insensible a la casse.
- `server/src/storage/pilotIdentityStore.js`
  - reserve ou remplace le nom d'un compte dans une transaction ;
  - refuse un nom possede par un autre compte ;
  - detecte aussi la course ou une autre instance insere le nom entre la verification et l'ecriture.
- `server/src/players/profiles.js`
  - serialise les configurations d'identite dans le processus ;
  - refuse les doublons locaux deja configures ;
  - attend la reservation PostgreSQL avant de modifier le profil.
- `server/src/db/migrateJson.js`
  - reserve les noms des anciens profils configures pendant l'import JSON.
- `server/src/socket/playerHandlers.js`
  - attend la reservation et renvoie une erreur temporaire propre si PostgreSQL echoue.
- `server/test/database-migrations.test.js`
  - controle migrations en attente, transactions, rollback et liberation du verrou.
- `server/test/pilot-identity.test.js`
  - controle normalisation, doublons locaux, proprietaire PostgreSQL, renommage et course concurrente.

Checks effectues :

- `npm test` dans `server/` : 276 tests OK ;
- `node --check` sur les 163 fichiers JavaScript de `server/src` et `server/test` : OK ;
- `git diff --check` sur les fichiers de cette passe : OK.

## Optimisation MMO - Cadence de sauvegarde session monde

- `server/src/players/profileWorldSession.js`
  - expose `WORLD_SESSION_SAVE_INTERVAL_MS = 15_000` ;
  - limite les sauvegardes non forcees de session monde a une fois toutes les 15 secondes par joueur ;
  - conserve les sauvegardes forcees immediates pour mort, deconnexion, respawn, changement de vaisseau, Portgun et retours de portail.
- `server/src/world/playerActivity.js`
  - aligne les sauvegardes de mouvement serveur/background sur la meme cadence de 15 secondes.
- `server/src/socket/playerHandlers.js`
  - force la sauvegarde quand un snapshot valide change de map, donc transition portail/map sauvegardee immediatement.
- Les gains importants restent immediats car ils passent par les mutations profil :
  - kill mob : `applyReward()` persiste le profil ;
  - ressource / item / piece de portail ramasse : `loot:pickup` mute le profil puis persiste ;
  - quetes, achats, equipement, raffinerie et progression : actions serveur avec persistance immediate.
- `server/test/server-profile-stats.test.js`
  - controle la cadence 15 secondes et l'exception `force:true`.
- `server/test/firm-setup.test.js`
  - controle qu'une transition de map force une sauvegarde immediate.

Checks effectues :

- `npm test -- test/server-profile-stats.test.js test/firm-setup.test.js test/player-background-intent.test.js` dans `server/` : 11 tests OK ;
- `node --check` sur les fichiers JS modifies de cette passe : OK ;
- `npm test` dans `server/` : 278 tests OK ;
- `git diff --check` : OK, uniquement des avertissements CRLF.

## Parametres client en jeu

Etat au 22 juin 2026 :

- `src/core/settingsSchema.js` porte le schema local versionne, les presets graphiques et leur normalisation ;
- `src/core/settingsStore.js` expose les mutations de preferences sans ajouter de logique a la facade `store.js` ;
- `src/game/ui/combatSettingsPanel.js` gere la fenetre a quatre onglets et la capture des touches ;
- `src/game/systems/combatSettingsRuntime.js` centralise l'application immediate au HUD, au chat, au panneau PERF et au canvas ;
- les preferences restent locales au navigateur et ne deviennent pas des donnees MMO autoritaires ;
- les anciens champs `graphicsQuality`, `slotKeybinds` et `uiLayout` sont conserves et migres ;
- la boucle de combat accepte un limiteur FPS sans modifier les ticks serveur caches ;
- les options graphiques ne changent que le rendu client et jamais les degats, collisions, drones ou projectiles autoritaires.

Checks effectues :

- `node --check` sur les modules de parametres et de rendu modifies : OK ;
- tests cibles parametres, migration et FPS : 9/9 OK ;
- `npm test` dans `server/` : 433/433 OK ;
- verification visuelle locale a 1280x720 : OK ;
- `git diff --check` : OK, uniquement des avertissements CRLF.

## Essai visuel Helion-01 - 18 octobre 2026

- `src/game/combatData/helionOneVisuals.js` porte la composition visuelle de l'essai et retourne une liste de rendu conservant les autres objets de maps. Le tableau partagé `MAPS` et les modèles de firmes restent intacts.
- `src/game/combatOrchestrator.js` compose cette liste au démarrage par un seul appel ; la logique et les données du décor restent dans leur module de domaine.
- `src/game/render/world.js` accepte les images de décor en coordonnées monde via `space: "world"` ; les anciens calques conservent leur parallaxe. Les décors d'astéroïdes peuvent suivre le réglage graphique existant.
- Détails, mesures et publication : `docs/HELION_01_VISUEL_2026-10-18.md`. Aucun changement d'autorité serveur ou de gameplay.

## Limites du décor et astéroïdes variés Helion-01 - 18 octobre 2026

- `src/game/render/mapSceneryBounds.js` découpe le décor aux limites réelles du secteur et trace le contour indépendamment de la grille. L'activation reste explicite via `parallaxScene.clipToBounds` et limitée à Helion-01.
- `src/game/render/world.js` accepte des découpes normalisées d'atlas via `layer.frame` et conserve le chemin habituel des images sans découpe. L'ensemble de la couche de décor est borné ; les entités et effets de combat restent rendus ensuite.
- `src/game/combatData/helionOneVisuals.js` place la planète en bas à gauche et prépare une distribution déterministe de petits rochers de six formes, tailles et orientations différentes, à partir d'un seul atlas transparent. Les anciens groupes et champs de rochers ne sont plus utilisés sur cette map.
- Vérifications et publication : `docs/HELION_01_LIMITES_ET_ASTEROIDES_2026-10-18.md` ; suites 1 053 / 1 053 et 40 / 40 ; contrôle des pixels hors secteur sur 36 combinaisons qualité/zoom/vue.

## Nuages localisés Helion-01 - 18 octobre 2026

- Les fonds de `src/game/render/world.js` acceptent explicitement `space: "world"` pour conserver les nuages aux mêmes coordonnées du secteur. Les fonds historiques gardent leur parallaxe. Le retrait hors écran des nuages fixes tournés conserve leurs coins visibles.
- `src/game/combatData/helionOneVisuals.js` réutilise la texture existante en poches régionales : nord-ouest plus dense, nord-est plus léger, sud-est modéré et centre dégagé. Aucun nouvel asset de gameplay ni calcul de texture par image.
- Essai réversible et sauvegarde de la répartition précédente documentés dans `docs/HELION_01_NUAGES_LOCALISES_2026-10-18.md` ; suites 1 055 / 1 055 et 40 / 40 ; vérification des limites sur 36 combinaisons qualité/zoom/vue.

## Profondeur et parallaxe Helion-01 - 18 octobre 2026

- `src/game/render/mapSceneryProjection.js` centralise la projection et le retrait hors écran. Le mode opt-in `space: "map"` ancre les éléments au secteur avec un coefficient de profondeur et tient compte du centre logique de la vue. Les modes historiques gardent leur projection.
- `src/game/combatData/helionOneVisuals.js` prépare des champs rocheux en courbes, trois plages de profondeur et un ordre lointain/proche commun aux rochers, à la planète et aux poussières. La planète défile à 0,30 ; les poussières proches passent devant elle.
- `showBoundary: false` masque le contour sur Helion-01 ; le découpage aux limites réelles et le vide noir extérieur restent actifs. Les réglages graphiques et l'autorité serveur restent inchangés.
- Vérifications, vidéo du moteur de décor et publication : `docs/HELION_01_PROFONDEUR_ET_PARALLAXE_2026-10-18.md` ; suites 1 058 / 1 058 et 40 / 40 ; contrôle hors secteur sur 36 combinaisons et lecture publique complète du MP4.

## Ambiance et bords progressifs Helion-01 - 18 octobre 2026

- La scène Helion-01 désactive la coupure rectangulaire. `getMapSceneryEdgeOpacity` dans `src/game/render/mapSceneryBounds.js` efface seulement les éléments proches avant les limites, selon leur position apparente après parallaxe et leur empreinte tournée. Les fonds et la planète continuent à l'extérieur.
- `src/game/render/mapSceneryLights.js` réutilise un petit halo en cache par source statique. Les lumières historiques des autres maps conservent leurs coordonnées et leur rendu.
- La composition conserve cinq voiles intermédiaires/proches, dégage le spawn, répartit cinq nappes lointaines lentes et relève légèrement la luminosité. Aucun changement de gameplay ni d'autorité serveur.
- Vérifications et aperçu : `docs/HELION_01_AMBIANCE_ET_BORDS_2026-10-18.md` ; suites 1 062 / 1 062 et 40 / 40 ; contrôle raster sur 42 combinaisons qualité/zoom/vue.

## Planète et vestiges lointains Helion-01 - 18 octobre 2026

- Le coefficient de la planète passe à 0,12 avec réancrage conservant le cadrage au spawn. La composition des nuages et rochers validée reste identique.
- Trois assets transparents séparés enrichissent le fond : frégate brisée, rémanence d'explosion et couronne stellaire. Les vestiges passent derrière les rochers, avec des coefficients de 0,17 à 0,22. Les lumières ambiantes en cache peuvent retirer leur point blanc central via `point: false`.
- Le rendu des images respecte aussi le réglage `starGlow`, y compris le défaut associé à la qualité graphique. Aucun changement du gameplay, des autres maps ou de l'autorité serveur.
- Détails et vérifications : `docs/HELION_01_PLANETE_ET_VESTIGES_2026-10-18.md` ; suites 1 064 / 1 064 et 40 / 40 ; contrôle raster sur 42 combinaisons qualité/zoom/vue.

## Ajustement de la planète Helion-01 - 22 octobre 2026

- Taille à 1 380 et coefficient de parallaxe à 0,07, avec un ancrage décalant légèrement le centre apparent vers le bas et la droite au spawn. Le reste de la scène est identique.
- Vérification d'un trajet de 6 000 unités vers la droite ; détails et publication dans `docs/HELION_01_PLANETE_2026-10-22.md`. Aucun changement d'architecture ni de gameplay.

## Décors solides et ciel aux limites Helion-01 - 22 octobre 2026

- `src/game/render/mapScenerySky.js` applique un fondu spatial optionnel au ciel lointain, avant les images de profondeur. Il dessine seulement les bandes visibles ; aucun buffer ou grand asset supplémentaire. La planète reste libre de dépasser et les autres maps n'activent pas ce traitement.
- La composition décale la couronne stellaire vers la droite, retire la rémanence d'explosion et relève l'opacité des objets solides. Géométrie, parallaxe et fondu des objets proches restent préservés.
- Détails et preuves : `docs/HELION_01_DECORS_ET_BORDS_2026-10-22.md` ; suites 1 067 / 1 067 et 40 / 40 ; contrôles raster sur 42 combinaisons pour les objets proches et 36 pour le ciel. Aucun changement de gameplay ni d'autorité serveur.

## Refonte du tutoriel - 22 octobre 2026

- Publication ciblée `20261022-tutorial2` : un `importmap` dans `index.html` renouvelle les modules du tutoriel sans multiplier les instances des modules uniques de connexion et d'état. Les variantes d'import historiques sont résolues vers une seule URL par module modifié. Détails et preuves de publication dans `docs/TUTORIEL_REFONTE_2026-10-22.md`.
- `src/shared/tutorial.js` conserve les identifiants historiques d'étapes et porte l'état versionné, la révision et la résolution des quatre missions selon la firme. Une revue unique des anciens états actifs récupère les objectifs manquants sans réattribuer les récompenses. Les états abandonnés et terminés restent définitifs.
- `server/src/players/tutorialValidation.js` contrôle les preuves de progression ; `tutorialActions.js` gère les transitions et la récompense unique. Les départs et retours utilisent le joueur réellement présent sur le serveur, y compris depuis une requête du tableau de bord. Chaque demande sensible transporte l'étape et la révision attendues.
- `server/src/players/tutorialEconomyPolicy.js` empêche les ventes et dépenses qui bloqueraient la formation, à partir des prix existants. Le rééquipement et les rachats nécessaires d'un ancien profil restent possibles. Le point de validation commun des mutations restaure le profil si une opération est refusée.
- `src/ui/tutorialStages.js` porte les six chapitres, leurs conditions, les textes par firme et les chemins de récupération dans les menus. `tutorialController.js` coordonne seulement les événements, requêtes et états de présentation. `tutorialView.js` produit le panneau réductible et la confirmation d'abandon ; fermer un onglet ne constitue pas un abandon.
- `src/ui/tutorialGuidance.js` guide vers les contrôles réellement visibles et les destinations projetées. `src/game/systems/tutorialWorldGuidance.js` choisit une cible utile stable et calcule les routes avec les portails ouverts existants. La façade du combat fournit les données sans porter ces règles. Sur demande utilisateur, aucun cercle de tutoriel n'entoure un monstre visible ; la flèche hors écran est conservée.
- Le contrôle navigateur a révélé un compteur de raffinerie figé sans action. `src/app/refinerySyncController.js` demande un état canonique toutes les dix secondes uniquement lorsque la raffinerie du tableau de bord est visible et authentifiée. `profile:refresh` calcule la production côté serveur, utilise la diffusion au compte existante et reste limité par compte et socket. Aucun gain n'est simulé dans le navigateur.
- Validation : 1 130 tests serveur et 40 tests client réussis ; scénario économique avec les vraies actions sur les quatre firmes. Les contrôles navigateur utilisent une API et des données locales isolées, sans modifier le pilote de production. Détails, limites et aperçu dans `docs/TUTORIEL_REFONTE_2026-10-22.md`.

## Retours du tutoriel - 22 octobre 2026 - publié `20261022-tutorial3`

- Le lot préparé et relu localement est publié sous `20261022-tutorial3` le 22 octobre à 20:36:32 (Europe/Paris). La section précédente conserve l'historique de la première livraison `20261022-tutorial2`.
- `src/ui/tutorialView.js`, `tutorialGuidance.js` et `src/styles/tutorial.css` mettent la consigne dans un cadre « À FAIRE », ancrent un point pulsant au vrai contrôle et indiquent le défilement par des flèches, sans défilement automatique. Relais, QG et portails utilisent des triangles de destination. Une bordure intérieure conserve le repère de la case cible malgré son découpage CSS.
- `src/ui/tutorialStages.js` conserve les explications courtes et ajoute quatre étapes avant les Vorak : menu +, achat de 100 Roquettes R-1, M-1 en case 1 et R-1 en case 2. L'explication de la barre propre au Velox précise que les canons restent équipés. Le drone en case 9 est facultatif.
- L'état version 3 et la validation serveur distinguent la preuve d'achat des 100 R-1 du stock restant. Les raccourcis sont validés depuis les préférences canoniques du Velox. Les migrations ciblent les états actifs concernés ; aucun redémarrage d'un tutoriel abandonné ou terminé. Réactivation du Velox, matériel minimal, réassort payant et rétablissement du raccourci laser sont guidés sans réinitialiser l'achat validé. Une pause suivie de l'acceptation et de la fin de la mission Vorak ne permet plus de sauter cette leçon ; les anciens profils version 2 déjà plus avancés restent préservés.
- La visite persistée du secteur 2 évite un retour forcé au portail après être revenu au secteur 1. Le guidage de la mission jaune utilise la carte courante lorsqu'elle appartient aux cartes 1 ou 2 autorisées de la firme, et conserve seulement les familles d'ennemis encore utiles.
- La clé de rendu des récupérations dans `tutorialController.js` inclut mode, objectif et message pour suivre les changements de consigne sans faire avancer artificiellement l'étape.
- Contrôles navigateur locaux : accueil Astra, DÉPART hors vue avec « Plus haut », relais triangulaire ; scénario Solarys + → Magasin → achat 100 R-1 (101 835 → 91 835 crédits), M-1 en case 1 par glisser-déposer, rechargement préservant le raccourci, R-1 en case 2 par clic puis étape Vorak. Le rechargement suivant conserve les deux raccourcis, le stock de 100 R-1, le solde, la preuve d'achat persistée et l'étape Vorak, sans erreur console relevée. Le glisser-déposer automatisé de R-1 reste non concluant ; aucun bug de ce geste n'est affirmé.
- Preuves : `tutorial-clarity-welcome.png`, `tutorial-clarity-scroll.png`, `tutorial-clarity-relay.png`, `tutorial-rockets-shop.png`, `tutorial-rockets-binding.png` et `tutorial-rockets-ready.png` sous `output/tutorial-refonte-2026-10-22/`.
- Validation locale actuelle : 1 167 tests serveur, 40 tests client et 48 tests ciblés UI/parcours/monde, tous réussis. Les quatre nouveaux tests serveur couvrent le contournement par pause, acceptation Vorak, trois kills et attribution serveur, puis reprise sans preuve d'achat. Le scénario économique relancé sur les quatre firmes inclut l'achat des 100 R-1 et aboutit à 176 835 crédits après les quatre missions. Les journaux de racine ont été actualisés et remplacent ceux de la validation initiale à 1 130 tests serveur ; ils ne prouvent pas la publication de ce lot.
- L'aperçu local et son API ont été arrêtés après les essais ; le script de lancement recopie le code courant à la prochaine ouverture.
- `output/tutorial-refonte-2026-10-22/feedback-local-manifest.json` conserve l'inventaire des 12 fichiers applicatifs de préparation comparés au paquet précédent. La livraison effective comprend 14 fichiers avec `index.html` et `styles.css`, 24 contrôles de garde sur une base distante fraîche intégrant Hélion hub2, sauvegarde du code sous `/opt/avosoma-backups/20261022-tutorial3` et 14 empreintes installées conformes.
- Après publication : service `avosoma-beta.service` actif, PID `2789980`, `NRestarts=0`, PostgreSQL prêt et capacité de 50 joueurs. Neuf fichiers publics sur neuf répondent HTTP 200 avec les empreintes SHA-256 normalisées attendues ; `/health` confirme PostgreSQL prêt et la capacité. Les alias Hélion hub2 et son entrée de jeu restent préservés, sans nouvel alias des modules uniques d'état ou de connexion. Preuve : `output/tutorial-refonte-2026-10-22/release3/public-verification.json`.
- Remise à zéro du seul profil de jeu demandé, avec sauvegarde privée en mode `0600` : compte Absyrion, pseudo et autres profils conservés ; cinq références personnelles de firme nettoyées et aucune restante pour ce profil. L'état persisté est `pending`, version 3, `launcher_orion`, révision 0, récompense non réclamée. Contrôle dans le navigateur public après rechargement et connexion Absyrion : choix des quatre firmes sans sélection, profil de départ, aucun pas avancé. Capture : `output/tutorial-refonte-2026-10-22/release3/account-reset-ready.png`.
- Suivi cumulatif et limites : `docs/TUTORIEL_RETOURS_2026-10-22.md` et `docs/TUTORIEL_REFONTE_2026-10-22.md`. Les essais décrits ne sont pas quatre parcours manuels complets et ne déclarent pas l'absence de bugs dans tout le jeu.

## Couronne et services d'Hélion-01 — 22 octobre 2026 — publié

- `src/shared/helionOneHub.js` définit le hub validé, ses services et son rectangle de protection commun client/serveur. Installation après génération des firmes, uniquement sur Hélion-01. Les clics, le guidage et le relais serveur utilisent ces positions ; les règles des quêtes et du commerce sont conservées.
- `src/game/render/spawnHub.js` extrait le rendu des bâtiments de `world.js` et ajoute une présentation stable, opaque et sobre pour les nouveaux sprites. Les trois textures WebP sans perte sont chargées par le cache de maps.
- `src/game/combatData/maps.js` clone ses templates avant construction pour empêcher leur contamination lors d'importations avec des versions différentes. Six régressions du hub vérifient notamment que les autres firmes ne récupèrent pas les bâtiments d'Hélion.
- Version publique `20261022-helion-hub1`, 35 fichiers ciblés. Les modifications locales du lot de retours tutoriel décrit plus haut ne sont pas incluses. Suite locale : 1 173 tests serveur et 40 client réussis ; contrôle visuel isolé des vrais modules et des clics. Après déploiement : 35 empreintes sur le serveur, 34 via HTTPS, arrêt gracieux et disponibilité PostgreSQL vérifiés. Détails et limites dans `docs/HELION_01_COURONNE_SERVICES_2026-10-22.md`.

## Flèches du tutoriel synchronisées au rendu — 22 octobre 2026 — publié

- `tutorialWorldGuidance` expose une souscription aux images rendues et une reprojection légère de la cible existante. La façade de combat notifie après `sceneRenderer.draw()` et expose ces deux accès ; aucune règle de guidage n'est déplacée dans la façade.
- `tutorialGuidance` suit la caméra effectivement affichée, sans seconde boucle RAF ni recherche d'itinéraire par image. La validation et le choix des cibles restent à 10 Hz. Les positions fractionnelles, l'invalidation des ennemis morts, le changement de carte et l'arrêt du suivi dans les menus sont couverts. Le placement automatique du panneau gauche/droite reste conservé sur confirmation utilisateur.
- Publication `20261022-tutorial4` à 20:55:16 Europe/Paris : 4 fichiers front, sans redémarrage ni changement de compte, empreintes serveur et HTTPS conformes. Les alias Hélion hub3 sont conservés ; PID 2796801 inchangé, service actif, PostgreSQL disponible et limite 50 joueurs.
- 152 tests ciblés et 40 tests client réussis. Contrôle de déplacement local : 57 changements de position sur 1 794 ms, intervalles médian 18 ms / maximal 29 ms pendant le mouvement observé, aucune erreur console. Ce relevé n'est pas une mesure de coût CPU. Détails et limites dans `docs/TUTORIEL_RETOURS_2026-10-22.md`, preuves sous `output/tutorial-refonte-2026-10-22/release4/`.

## Survol des bâtiments Hélion-01 — 22 octobre 2026 — publié

- `src/game/ui/spawnStationHover.js` gère pointeur, curseur et visibilité avec le hit-test existant, la caméra actuelle et les exclusions panneaux/minimap. La façade injecte le contrôleur dans le renderer et le réinitialise à l’arrêt.
- `src/game/render/spawnStationHighlight.js` gère le halo de silhouette mis en cache et l’étiquette de survol indépendante du zoom ; `spawnHub.js` conserve le rendu des sprites et des autres hubs. Aucun déplacement de bâtiment ou changement de règle serveur.
- Version publique `20261022-helion-hover1` à 21:12:02, sept fichiers front contrôlés par empreinte HTTPS, sans redémarrage ni modification de profil. 21 tests ciblés réussis et contrôle navigateur du vrai rendu isolé (clics, survols, zoom, caméra), sans erreur console. Détails et limites dans `docs/HELION_01_COURONNE_SERVICES_2026-10-22.md`.

## Relais de quêtes « Console claire » — 22 octobre 2026 — publié

- `questRelayPanel.js` extrait le relais de `spawnPanel.js` ; `questRelayObjectives.js` présente les objectifs réels et leur progression individuelle. Liste lisible, briefing compact/dépliable, récompenses détaillées, actions fixes, quatre firmes et formats réduits. Le contrôleur transmet la progression par objectif et préserve la lecture lors des actualisations.
- Mission Velox : libellé de possession et illustration rétablis, briefing aligné sur la condition existante. Couleurs rares/prioritaires, verrouillages, tutoriel et abandon préservés ; règles de récompense et serveur inchangées.
- Version publique `20261022-quest-console1` à 21:52:22 : huit fichiers front vérifiés sur disque et via HTTPS, sans redémarrage, PID 2856426 inchangé pendant la publication. Les changements de fabrication déjà publiés en parallèle ont été conservés après comparaison à la base distante fraîche.
- 76 tests ciblés réussis, contrôle navigateur isolé des vrais modules et données en 1880×1080, 1366×768 et 390×844. Aucune erreur console au contrôle final. Limites et preuves : `docs/RELAIS_QUETES_CONSOLE_2026-10-22.md` et `output/quest-relay-console-2026-10-22/`.

## 2026-10-22 — Relais de quêtes, fidélité visuelle console 2
- Révision publiée `20261022-quest-console2` à 22:54:11 Europe/Paris : cadre angulaire, portraits rapprochés, hiérarchie typographique, fond de hangar et véritable sprite agrandi, pictogrammes, XP, récompenses et CTA. Grille des objectifs multiples, adaptation 1366 × 768 et mobile.
- 76 tests ciblés passent. Contrôle visuel sur les quatre firmes, scénarios de mission et tailles d’écran ; comptes de production non modifiés pour ces essais.
- Six fichiers publics vérifiés par empreintes, PostgreSQL sain, PID 2856426 inchangé, aucun redémarrage ni commit/push Git. Autres travaux locaux conservés.
- Détails : docs/RELAIS_QUETES_CONSOLE2_2026-10-22.md. Preuves : output/quest-relay-console2-2026-10-22/.

## 2026-10-23 — Pictogrammes de catégories du relais
- Publié `20261023-quest-icons1` à 11:23:49 Europe/Paris. Neuf silhouettes simples validées : combat, récolte, vaisseau, drone, laser, amélioration, exploration, livraison, portail.
- Nouveau domaine UI `src/game/ui/questCategories.js` : dessins partagés et catégorie principale, avec catégorie explicite facultative pour les futures quêtes mixtes. `questRelayObjectives.js` et `questRelayPanel.js` consomment ce domaine ; aucun changement de progression ou d’autorité serveur.
- La liste conserve la catégorie même pour une quête verrouillée ou terminée. La présentation des conditions de dégâts est inchangée, conformément à la demande.
- 49 tests ciblés passent ; contrôle visuel sur les quatre firmes et deux formats de PC. Quatre fichiers publics vérifiés par empreintes, PostgreSQL sain, aucun redémarrage ni commit/push Git.
- Détails : docs/QUETES_ICONES_2026-10-23.md. Preuves : output/quest-icons-2026-10-23/.

## 2026-10-23 — Poursuite et regroupement des monstres

- `server/src/world/pursuit.js` porte le déplacement serveur, l'arrivée proche et la reprise avec marge de stabilité. `world/ai.js` conserve sélection des cibles, aggro, mémoire et attaques ; la direction de poursuite suit la position actuelle à chaque tick, sans refaire les recherches de cible à cette fréquence.
- Le point de poursuite commun remplace les destinations individuelles au-delà du joueur. Les demi-tours alignés ne mélangent plus deux vitesses opposées. Vitesses configurées, portées de tir, conditions d'agression et ennemis ancrés restent contrôlés par leurs règles serveur.
- Les anciens helpers `enemyTrajectory.js` restent utilisés par l'IA locale historique. Aucun module client ni paramètre d'interpolation n'est modifié pour cette correction MMO.
- Validation locale : 1 312 tests serveur et 40 tests client passent. Régressions avec les vrais monstres générés : cercle puis arrêt, passages alignés/décalés, coordonnées nulles, changement de cible, zone sûre et limites de map. Le pipeline réel de snapshots et d'interpolation conserve le groupe de 32 ennemis à 30, 60 et 144 FPS avec retards simulés.
- Résultats avant/après et publication : `output/mob-pursuit-2026-10-23/`. Les mesures de regroupement sont des simulations contrôlées, pas une mesure de partie en production.
- Publié `20261023-pursuit1` sur Netcup le 23 octobre à 12:02:38 Europe/Paris : deux modules serveur, sauvegarde `/opt/avosoma-backups/pursuit1-20261023`, 28 tests ciblés sur les dépendances réelles du serveur avant installation. Empreintes installées conformes, PID 3661523 actif sans redémarrage automatique, santé publique PostgreSQL disponible ; page publique inchangée. Aucun changement de base, de configuration, de profil local ni publication Git globale.

## 2026-10-23 — Réaction différée et positions de tir à l'arrêt

- Demande utilisateur après essai : réévaluer la poursuite toutes les 0,8 à 1,5 seconde et éviter la superposition exacte de tous les monstres quand le joueur s'arrête. Cette révision remplace le suivi instantané de `20261023-pursuit1`.
- `pursuit.js` conserve un point visé entre les réactions. Un déplacement ou un nouveau tir du joueur ne rafraîchit pas ce point prématurément ; les demi-tours restent fonctionnels. Les indications de vitesse validées permettent de passer à la formation lors de la première réaction après l'arrêt.
- `enemyFormation.js` attribue des angles stables aux poursuivants d'une même cible dans une même map/instance. Un nouvel arrivant prend le milieu du plus grand arc libre, sans redistribuer les places existantes. Nettoyage périodique des membres morts, détachés ou inactifs ; aucune séparation par paires à chaque tick.
- En déplacement, les monstres se regroupent derrière la dernière position connue ; à l'arrêt, ils rejoignent des positions de tir à `min(200, portée × 0,7)` unités. La formation se réduit et se décale vers l'intérieur aux bords de map pour rester dans les limites et à portée. Le clic existant au centre de chaque cible reste utilisable.
- Validation : 1 361 tests serveur et 40 tests client passent. Contrôles de réaction, poursuite, sélection de chaque monstre via le vrai hit-test, groupe initialement confondu, mort/réapparition sans déplacement des survivants, coin de map et pipeline client à 30/60/144 FPS avec retards simulés. Preuves : `output/mob-pursuit-delay-2026-10-23/`.
- Publié `20261023-pursuit2` à 12:28:49 Europe/Paris : trois modules serveur, 33 tests ciblés réussis sur les dépendances de production, empreintes installées conformes. PID 3688379 actif sans redémarrage automatique, PostgreSQL prêt et aucun avertissement du nouveau processus relevé. Page publique inchangée ; sauvegarde `/opt/avosoma-backups/pursuit2-20261023`. Aucun combat sur un compte de production pour les essais.

Mini-carte panoramique : le ratio 9/20 est partage dans `miniMapLayout.js`, et les illustrations de `miniMapScenery.js` compensent la projection pour rester proportionnees. Details : `docs/MINICARTE_FORMAT_LARGE_2026-10-23.md`.

## 2026-10-23 — Compétences du pilote, arbre et fiche détaillée

- Le Hangar présente les trois branches et cinq paliers de la maquette validée. Tous les nœuds sont consultables ; seul le prochain rang admissible sélectionné propose la commande d'amélioration existante.
- `skillTreeModel.js` porte la projection pure des données ; `skillTreeIcons.js` les pictogrammes ; `renderSkills.js` la sélection et le rendu ; `skillTree.css` les styles limités au Hangar. Les façades et la délégation restent fines. Aucun changement des bonus, prix, prérequis, achats serveur ou combat.
- Validation et preuves : `docs/COMPETENCES_REFONTE_2026-10-23.md`, `output/skills-refonte-2026-10-23/`. Version frontend `20261023-skills1`.

## 2026-10-23 — Dossier du pilote et grades réels

- Le Profil du Hangar reprend la maquette avec les grades, insignes SVG, compteurs, vaisseau, drones, statistiques et conditions réels. L'ascension annonce le retour au niveau 1 ; le titre conserve équipement, retrait et visibilité avec leurs commandes serveur existantes.
- Le rendu est extrait de `render.js` vers `renderProfile.js`, la projection vers `profilePresentation.js` et les pictogrammes vers `profileIcons.js`. Styles limités au Profil dans `profileDossier.css`. Les façades restent fines et les règles métier inchangées.
- Validation et preuves : `docs/PROFIL_REFONTE_2026-10-23.md`, `output/profile-refonte-2026-10-23/`. Version frontend `20261023-profile1`.

## 2026-10-23 — Première adaptation du HUD A, aperçu local

- Base visuelle choisie par le créateur : fiche pilote et suivi à gauche, dix modules nommés, groupe compact, chat replié et barre d'action. `combatHud.css` limite la présentation aux éléments du HUD ; les modules de mini-carte, les cartes et les règles du combat restent hors de cette modification. Les dispositions personnelles existantes sont conservées.
- `combatPanelPresentation.js` conserve les nœuds des panneaux inchangés, leur défilement et des minuteurs indépendants. Les commandes de repli restent dans le contrôleur des panneaux ; le grade n'est plus reconstruit à chaque actualisation du HUD. Les six onglets d'équipement restent visibles.
- Les captures et l'aperçu avec les vrais modules sont dans `output/hud-modernisation-2026-10-23/`. Profil de démonstration, aucune mutation de compte ou de progression ; cette étape n'est pas une publication en production.

## 2026-10-23 — Refonte de la baie de drones

- La page Drones reprend la maquette validée avec les vrais visuels et raretés du catalogue. L'inventaire regroupe les modèles et expose leurs exemplaires UID, disponibilités et emplacements réels ; l'action explicite cible le drone sélectionné.
- `renderDroneBay.js`, `droneBayModel.js` et `droneBayIcons.js` extraient le domaine de la façade `render.js`. `app.js` ajoute une délégation fine, `droneBay.css` limite les styles à la page. Achats, équipements, ventes, Overdrive permanent et anciens drones 9/10 conservent leurs règles serveur.
- Validation et preuves : `docs/DRONES_REFONTE_2026-10-23.md`, `output/drones-refonte-2026-10-23/`. Version frontend `20261023-dronebay1`.

## 2026-10-23 — Inventaire des drones en cases individuelles

- À la demande du créateur, la liste groupée est remplacée par une vraie grille : chaque exemplaire disponible a sa case et son image, avec une fiche unique au clic. Les équipements déjà installés ne sont plus présentés comme stock disponible.
- Le domaine de rendu et ses styles existants portent cette correction ; les contrôleurs et l'autorité du serveur sont conservés. Détails et preuves : `docs/DRONES_INVENTAIRE_GRILLE_2026-10-23.md`, `output/drone-grid-correction-2026-10-23/`. Version frontend `20261023-dronegrid1`.

## 2026-10-23 — HUD A, première version publiée

- Publication frontend ciblée `20261023-hud1` le 23 octobre à 15:10:53 Europe/Paris : dix modules nommés, fiche pilote, suivi de quêtes, groupe/chat repliables et équipement à six onglets. Les préférences de disposition existantes restent prioritaires.
- Neuf fichiers changés, dix contrôlés sur disque et par empreintes publiques HTTPS ; alias des modules du HUD actualisés. Base distante reprise après une publication concurrente de la boutique/fabrication. Les autres alias et l’entrée de jeu sont conservés ; les fonctions de voyage encore en préparation dans les fichiers locaux partagés ont été exclues du lot.
- 99 tests réussis sur les sources de production avec le lot exact superposé, contrôles syntaxiques des sept modules JS et contrôle du vrai jeu en zone protégée : chargement, six onglets, CPU et fermeture du panneau. Aucune erreur console relevée. Aucun achat ni combat provoqué pour ces vérifications ; pas de mesure de gain de FPS.
- Aucun redémarrage pour ce lot : PID `3849702`, `NRestarts=0`, PostgreSQL prêt. Sauvegarde `/opt/avosoma-backups/20261023-hud1-131053`. Aucun commit/push Git global ; diffusion effective sur Netcup. Mini-carte et règles serveur hors du lot.
- Preuves et manifeste : `output/hud-modernisation-2026-10-23/release/`, capture publique `public-hud.jpg`.

## 2026-10-23 — Skins de drones équipables et récupérables

Le Noyau Overdrive occupe désormais un slot de skin distinct de l'arme ou du bouclier. Il reste dans l'inventaire avec son UID et redevient disponible après retrait ; déplacement et remplacement préservent l'équipement principal. La baie affiche les vrais objets possédés dans une grille et un emplacement de skin par drone. Les anciennes installations consommées sont converties une seule fois en exemplaires équipés, sans prendre le stock libre. Les bonus et le prérequis Vesper restent inchangés, les mutations et la migration sont protégées côté serveur.

Documentation : `docs/DRONES_SKINS_2026-10-23.md`. Release : `20261023-droneskin1` ; validation du candidat isolé, essais Socket et visuels sur comptes locaux, sauvegarde du runtime et contrôle des empreintes publiques avant publication confirmée.

## 2026-10-23 — HUD compact validé et monstres agrandis

- Version `20261023-hud2` publiée à 16:02:27 Europe/Paris. Fiche pilote compacte, jauges avec valeurs intégrées et XP fine ; nouveau domaine `combatPilotPanel.js` pour déplacement libre, repli et mémorisation dans le stockage existant de disposition. La façade HUD conserve les données et règles de combat.
- Chat : canaux/commandes sur une ligne, zone de messages plus utile, redimensionnement et déplacement conservés, historique non ramené en bas lorsqu’on le consulte. Firme/Guilde restent signalés à venir ; transports existants inchangés.
- Suivi : sélection de quête dans l’en-tête, lieu commun affiché une fois, objectifs plus serrés et images de monstres agrandies en tenant compte des marges des sprites. Détails/gains dépliables ; conditions d’échec toujours visibles, abandon et récompenses existants conservés.
- 103 tests passent sur le lot exact superposé aux sources de production, sept contrôles syntaxiques. Tests navigateur isolés avec les vrais modules en 1920×1080 et 1366×768 : déplacement des trois panneaux puis restauration exacte, repli du pilote après rechargement, choix de quête, détails et chat ; redimensionnement du chat à 462×242 retrouvé après rechargement.
- Dix fichiers sur dix vérifiés sur disque et par empreintes publiques HTTPS ; PID 3876299 inchangé, NRestarts=0, PostgreSQL prêt. Sauvegarde `/opt/avosoma-backups/20261023-hud2-140227`. La session de jeu authentifiée pilotée par un autre chat n’a pas été reprise ; le chargement public anonyme est contrôlé séparément. Aucun commit/push Git global ni modification de mini-carte ou de règles serveur.
- Preuves : `output/hud-compact-2026-10-23/` et son sous-dossier `release/`.


## 2026-10-23 — Grades autoritaires, boosters unitaires et retrait de l’Impérial

- `rankAuthority.js` réutilise les seuils et quotas du classement pour fournir la même attribution au profil, aux fiches publiques et au combat. Projection légère avec cache et mises à jour ciblées ; `rankAuthorityStore.js` et `rankPresentation.js` partagent l’attribution et les conditions de progression côté client. Les façades n’ajoutent que la composition. Les 25 SVG conservent les formes d’origine confirmées par le créateur et améliorent leur relief.
- Boosters S1 : une unité de cinq heures par clic, plafond serveur de 1 000 par type vérifié avant débit, refus intégral des dépassements et restauration après échec de stockage. L’interface indique la réserve et la limite ; les S2 restent distincts.
- `retiredShips.js` retire les données historiques d’Impérial avant normalisation et persiste la réparation avant exposition des profils. Reçus ou recette historique figée pour les remboursements, équipements et soute conservés, migration idempotente. Le Roi démon garde un asset indépendant.
- Publié sur Netcup sous `20261023-coherence1`, 56 entrées de manifeste, base fraîche et changements simultanés préservés. Suite locale 1 543 serveur / 40 client ; candidat isolé 88 tests ciblés, syntaxe et démarrage validés. 43 réponses publiques conformes dont les 25 SVG et l’ancien asset en 404. Un profil réellement réparé, monnaies/inventaire/stockage contrôlés. PID 3917403, NRestarts=0, PostgreSQL prêt. Contrôle navigateur de vrais modules publiés avec profils synthétiques ; aucun achat de production.
- Détails, limites et preuves : `docs/GRADES_IMPERIAL_BOOSTERS_2026-10-23.md`, `output/imperial-ranks-2026-10-23/release/`. Prix Premium, secours du classement et calendrier conservés pour la suite ; aucun commit/push global.

## 2026-10-23 — Collection de titres et ascension unique

Le dossier du pilote retrouve une collection de titres accessible même sans titre débloqué et une fenêtre dédiée à l'ascension unique. `profileMilestones.js` porte les tuiles et fenêtres accessibles ; `profileMilestoneEmblems.js` leurs emblèmes SVG, `profileMilestones.css` leur style. `renderProfile.js` compose et synchronise les fenêtres ; `app.js` délègue les interactions et garde les commandes MMO existantes. Le catalogue actuel contient un seul titre, les conditions et bonus restent ceux du serveur. Les neuf portails distincts et les effets de l'ascension sont expliqués avant une confirmation séparée ; l'épreuve Éternel à venir reste signalée. Aucun changement des déblocages ni du backend.

Détails : `docs/PROFIL_TITRES_ASCENSION_2026-10-23.md`. Version frontend : `20261023-profilemilestones1` ; validation sur candidat canonique et comptes privés jetables, publication limitée avec sauvegarde et contrôle des empreintes.

## 2026-10-23 — Taille des monstres rétablie et accès direct aux cinq quêtes

- À la demande du créateur, la taille précédente des images de monstres est rétablie (`20261023-hud2-icons1`, 16:09:05 Europe/Paris). Le HUD compact reste en place.
- Le suivi dispose désormais de cinq boutons numérotés accessibles en un clic : numéro sélectionné surligné, titre au survol, emplacements libres désactivés. La numérotation suit l’ordre des quêtes acceptées et reste stable lors des sélections. Le menu de titre et le déplacement du panneau sont conservés.
- La délégation existante `data-track-combat-quest` appelle le suivi serveur canonique. Un test avec deux vraies quêtes partageant une cible confirme que la seconde, une fois suivie, reçoit le prochain kill compatible. Les règles serveur ne changent pas : la quête suivie reste prioritaire, puis les autres quêtes admissibles si elle ne peut pas recevoir ce kill.
- Version `20261023-quest-shortcuts1` publiée à 16:26:21 Europe/Paris : quatre fichiers contrôlés par empreintes publiques HTTPS, 106 tests réussis sur les sources distantes fraîches avec le lot exact superposé. Les cinq clics directs sont vérifiés dans le navigateur avec les vrais modules et un profil de démonstration ; aucune erreur console. Le chargement public sert les nouveaux alias. La session authentifiée contrôlée par un autre chat reste intacte.
- Aucun redémarrage : PID 3917403, NRestarts=0, PostgreSQL prêt. Sauvegarde `/opt/avosoma-backups/20261023-quest-shortcuts1-142621`. Aucun changement de mini-carte, de compte ni de règles serveur. Preuves et capture : `output/hud-quest-shortcuts-2026-10-23/`.

## 2026-10-23 — Retour au suivi classique et jauges pilote plus étroites

- À la demande du créateur, retour au rendu précédent du suivi : cases des quêtes acceptées avec progression, titre dans l’en-tête et onglets Objectifs/Gains/Infos. Le menu de titre et la bande de raccourcis de la version compacte ne sont plus affichés. L’autorité et la priorité des quêtes côté serveur sont conservées.
- Fiche pilote : largeur indépendante du suivi (268 px au lieu de 326 sur grand écran ; 256 au lieu de 300 sur écran plus petit). Les valeurs et pourcentages sont alignés au-dessus de jauges fines, sans superposition du texte sur le remplissage. Grade par son icône avec titre au survol ; déplacement, repli et mémorisation existants conservés. Aucun changement des statistiques de combat.
- Version `20261023-hud3` publiée à 16:47:43 Europe/Paris : six fichiers vérifiés par empreintes publiques HTTPS et 106 tests réussis sur sources de production fraîches avec le lot exact. Contrôle des vrais modules en 1920×1080 et 1366×768 : sélection d’une autre quête, trois onglets, abandon accessible, repli du pilote et restauration exacte de sa position après rechargement (352,136), valeurs sans débordement à 256 px. Aucune erreur console. Profil de démonstration pour les essais ; aucune mutation de compte de production.
- Aucun redémarrage : PID 3943270, NRestarts=0, PostgreSQL prêt. Sauvegarde `/opt/avosoma-backups/20261023-hud3-144743`. Mini-carte et chat hors de ce lot ; changements simultanés et autres alias conservés. Preuves : `output/hud-revision3-2026-10-23/`.

## 2026-10-23 — Suivi classique de quêtes moins encombrant

- À la demande du créateur, réduction du panneau conservant le suivi classique : largeur 268 px sur grand écran et 256 sur écran plus petit. En-tête, cases, onglets et marges resserrés ; objectifs à 36 px minimum. Les images gardent leurs dimensions précédentes ; noms longs et conditions conservent leur retour à la ligne.
- Mesure sur cinq quêtes acceptées et quatre objectifs visibles : 326×370 → 268×267 en 1920×1080 ; 300×370 → 256×267 en 1366×768. Soit environ 40 % de surface en moins sur cet exemple, sans hauteur fixe imposée au contenu.
- Version `20261023-quest-size1` publiée : trois fichiers vérifiés par empreintes publiques HTTPS, 25 tests ciblés réussis sur le candidat issu des sources distantes fraîches. Sélection de quête, trois onglets, abandon accessible, compteurs contenus et absence de débordement vérifiés dans le navigateur avec les vrais modules et un profil de démonstration. Aucun changement de JS, de progression, de mini-carte, de chat ni de fiche pilote.
- Une publication concurrente a été détectée avant installation ; base distante reprise et tous ses changements préservés. Aucun redémarrage : PID 3943270, NRestarts=0, PostgreSQL prêt. Sauvegarde `/opt/avosoma-backups/20261023-quest-size1-145730`. Preuves : `output/quest-panel-size-2026-10-23/`.

## 2026-10-23 — Barre des dix modules entièrement repliable

- Une flèche à droite replie les dix icônes en un bouton 36×36, puis les réaffiche d’un clic. Les fenêtres ouvertes restent en place. Le choix est mémorisé dans `uiLayout.combatUtilityDock.collapsed` via le stockage local existant.
- `combatUtilityDock.js` porte la présentation, le repli et la préférence ; `combatPanels.js` compose ce domaine et le rafraîchit aux restaurations de disposition. L’ancien bouton affichant les modules supplémentaires est remplacé ; `inputBindings.js` conserve les délégations des commandes existantes. La zone des dix icônes peut défiler horizontalement si nécessaire, avec flèche extérieure toujours accessible.
- Version `20261023-dock-fold1` publiée à 17:09:00 Europe/Paris : six fichiers vérifiés par empreintes publiques HTTPS, trois contrôles syntaxiques et 26 tests ciblés réussis sur le candidat issu des sources distantes fraîches. Le navigateur confirme le repli total, la restauration après rechargement et après sauvegarde d’un autre panneau, les commandes Chat/Quêtes et l’affichage en 1920×1080 et 1366×768. Aucune erreur console, aucun compte de production modifié pour les essais.
- Aucun redémarrage : PID 3943270, NRestarts=0, PostgreSQL prêt. Sauvegarde `/opt/avosoma-backups/20261023-dock-fold1-150900`. Mini-carte et règles serveur hors du lot ; autres changements et alias conservés. Preuves : `output/hud-dock-fold-2026-10-23/`.

## 2026-10-23 — Secteurs 01 des quatre firmes

- La composition approuvée de Helion-01 est étendue à Nereid-01 (bleu, haut gauche), Aureon-01 (or, haut droite) et Sylva-01 (vert, bas droite). `firmHomeMapThemes.js` fixe l'identité par carte, `firmHomeMapScenery.js` réfléchit positions/rotations/silhouettes. Tailles, profondeurs, variété de rochers, nuages et transitions vers le vide restent celles de Helion ; planète à 0,07. Les secteurs suivants sont conservés.
- `mapAssetPalette.js` prépare les textures une fois au chargement, avec conservation de l'alpha et des matériaux neutres ; URL originale commune pour réutiliser le cache HTTP. Les variantes restent dans le cache limité à trois cartes ; traitement des chargements tardifs et du LRU ponctuel couvert. Aucun traitement des couleurs dans le rendu par image.
- Le hub partagé installe QG, relais et raffinerie dans les quatre coins avec leurs couleurs, zones cliquables et rectangles de protection concordants côté serveur/client. Même géométrie pour le tutoriel. Actualisation des alias du module d'interaction pour éviter une ancienne cible de commerce conservée en cache.
- Publication Netcup `20261023-firm-homes1`, neuf fichiers effectifs vérifiés publiquement, 117 tests ciblés sur les sources de production avec le payload exact. Redémarrage nécessaire pour les positions serveur : PID 4003944, NRestarts=0, PostgreSQL prêt ; sauvegarde `/opt/avosoma-backups/20261023-firm-homes1-154200`. Les retouches de l'aperçu et du cache n'ont pas redémarré le service.
- Les trois rendus, les six cibles et le déplacement de planète de 70 pixels logiques pour 1 000 unités sont contrôlés dans l'aperçu public utilisant les vrais modules, sans compte authentifié. Le décor chaud y présente une médiane CPU de soumission proche de Helion (~0,3 ms), sans conclure sur les FPS du jeu multijoueur. Aucun fichier de mini-carte ni profil local modifié par ce lot. Détails : `docs/SECTEURS_01_FIRMES_2026-10-23.md` ; preuves : `output/firm-home-maps-2026-10-23/`.

## 2026-10-23 — Couronnes de Nereid et Aureon remises à l'endroit

- Le QG conserve son orientation verticale d'origine au lieu d'être retourné avec les cartes du haut. Correction ciblée dans la préparation des textures, sans déplacement des bâtiments ni modification de leurs couleurs ou interactions. Publication `20261023-hq-upright1` à 18:06 Europe/Paris : trois fichiers vérifiés publiquement, 52 tests ciblés sur sources distantes fraîches et contrôle visuel des deux cartes dans l'aperçu public. Aucun redémarrage : PID 4003944 / NRestarts 0 inchangés, PostgreSQL prêt ; sauvegarde `/opt/avosoma-backups/20261023-hq-upright1-160654`. Preuves : `output/firm-hq-upright-2026-10-23/`.


## 2026-10-23 — Services visibles et cohérence des secteurs 01

Publication frontend `20261023-map-consistency1` à 18:36 Europe/Paris : les services des bases sont visibles pour toutes les firmes, mais les interactions et la protection restent réservées aux propriétaires. Le renderer reçoit `getVisibleSpawnStations()` ; les requêtes d'interaction et de tutoriel conservent `getSpawnStations()`. Les positions réfléchies sont inchangées ; les sprites de décors et bâtiments gardent désormais leur orientation d'origine. Les mini-cartes des trois autres secteurs 01 reprennent les proportions de Helion avec leurs palettes et coins respectifs, via trois atlas fixes sans marqueurs ni bâtiments incorporés.

93 tests ciblés réussis sur les sources distantes fraîches avec le payload exact. Onze fichiers publiés sous garde d'empreintes et vérifiés publiquement ; essais des seize clics de services dans l'aperçu public des quatre cartes, sans erreur de console. Pas de session multijoueur authentifiée pour ces essais visuels. Aucun redémarrage : PID 4003944, NRestarts 0, PostgreSQL prêt. Sauvegarde `/opt/avosoma-backups/20261023-map-consistency1-163620`. Détails : `docs/SECTEURS_01_FIRMES_2026-10-23.md`. Preuves : `output/firm-map-consistency-2026-10-23/`.


## 2026-10-23 — Helion-02, frontière industrielle

`helionTwoVisuals.js` compose un décor propre à Helion-02 après les cartes 01, sans muter leurs définitions ni celles du gameplay. Station diagonale au relief précalculé, plateforme de maintenance et épave de transporteur en trois WebP RGBA séparés, sans perte ; mêmes textures de nuages et atlas de rochers que Helion-01. Profondeurs distinctes et bords progressifs, avec planète lente à 0,065 et station à 0,27. `miniMapVisuals.js` ajoute le fond fixe 1200×540 de ce seul secteur ; marqueurs toujours séparés. Aucune interaction ni règle MMO ajoutée, autres cartes inchangées.

Publication frontend `20261023-helion2-industrial1` à 19:25 Europe/Paris : dix fichiers gardés et vérifiés par empreintes publiques HTTPS, 100 tests ciblés réussis sur les sources distantes avec le payload exact. Aperçu public réel sans compte multijoueur : neuf textures prêtes, arrivée, Ricky, plateforme, hors-carte et déplacement de planète de 65 pixels contrôlés sans erreur console. Comparaison du coût CPU du décor et de la mini-carte favorable sur trois vues ; pas de conclusion sur les FPS complets en combat. Aucun redémarrage : PID 4003944 / NRestarts 0, PostgreSQL prêt. Sauvegarde `/opt/avosoma-backups/20261023-helion2-industrial1-172520`. Détails : `docs/HELION_02_FRONTIERE_INDUSTRIELLE_2026-10-23.md`. Assets, prompts, mesures et captures : `output/helion02-industrial-2026-10-23/`.


## 2026-10-24 — Helion-02, espacement et mini-carte allégée

Publication frontend `20261024-helion2-adjust1` à 12:26 Europe/Paris : épave décalée de −500 / +800 unités, plateforme de maintenance retirée du décor et du streaming, station plus rapide à traverser visuellement (p 0,27 → 0,40) avec une illustration de mini-carte réduite de 41,7 %. Planète réduite à 750 au lieu de 850, décalée légèrement vers le bas-gauche, p 0,065 conservé ; mini-carte adaptée via le nouvel atlas fixe `helion-02-wide-v2.png`. Les nuages, rochers, bords et données MMO sont conservés.

102 tests ciblés réussis sur les sources distantes fraîches. Première tentative bloquée par le garde d'empreinte de la page d'entrée modifiée en parallèle ; aucune écriture à cette tentative. Lot rebasé sur la dernière production puis six fichiers publiés et vérifiés par HTTPS, avec conservation des modifications des portails. Contrôle public du renderer et de l'atlas exporté, sans erreur console ; aperçu isolé, sans compte multijoueur. PID 4125505 / NRestarts 0 inchangés, PostgreSQL prêt, profils locaux et métadonnées du fichier distant préservés. Sauvegarde `/opt/avosoma-backups/20261024-helion2-adjust1-102655`. Détails : `docs/HELION_02_FRONTIERE_INDUSTRIELLE_2026-10-23.md` ; preuves : `output/helion02-adjustments-2026-10-24/`.


## 2026-10-24 — Helion-02, structures plus profondes

Publication frontend `20261024-helion2-depth1` à 12:44 Europe/Paris : station et épave réduites d'environ un tiers, parallaxes respectives 0,36 / 0,16 et couleurs/contraste adoucis via le filtre 2D existant, sans réduire l'opacité. Planète de mini-carte décalée de 0,83 à 0,88 sur l'axe horizontal, via le nouvel atlas `helion-02-wide-v3.png` ; planète en jeu inchangée.

102 tests ciblés réussis sur sources distantes fraîches ; cinq fichiers modifiés, six gardés et vérifiés par HTTPS. Aperçu public avec moteur réel sans erreur console, atlas exporté à l'identique ; pas de session MMO authentifiée. Service inchangé (PID 4125505 / NRestarts 0), PostgreSQL prêt, fichiers profils préservés. Sauvegarde `/opt/avosoma-backups/20261024-helion2-depth1-104414`. Détails : `docs/HELION_02_FRONTIERE_INDUSTRIELLE_2026-10-23.md` ; preuves : `output/helion02-depth-2026-10-24/`.

## 2026-10-24 — Aspiration des butins au sol

Tous les butins serveur utilisent un ramassage en 700 ms : approche 48 unités au-dessus de l'objet, animation vers le vaisseau, mouvement libre et annulation par nouvelle navigation ou éloignement. Le contrôleur client et le renderer dédiés ne mutent pas les coordonnées canoniques ni les inventaires. Un module partagé définit les seuils et borne le point d'approche aux limites de carte.

Le nouveau gestionnaire serveur `world/lootCollection.js` avance dans le tick de nettoyage existant, sans minuteur par objet. Les phases start/finish/cancel de `loot:pickup` portent un identifiant de tentative ; la récompense existante ne s'exécute qu'après 700 ms et validation de l'état, du propriétaire, de la carte et du déplacement. Les messages tardifs sont isolés et un refus remet l'objet au sol. Les quotas socket/compte de cet événement acceptent le protocole à plusieurs phases, sans contourner la durée minimale.

Vérification client, serveur, Socket.IO réel, renderer et quotas, plus quatre parcours dans le navigateur avec un profil éphémère. Détails et limites : `docs/RAMASSAGE_ASPIRATION_2026-10-24.md` ; preuves : `output/loot-collection-20261024/`. Lot de publication limité `20261024-loot-suction1`, sans changements des autres travaux du checkout.


## VFX 20261024-vfx1 — 24 octobre 2026

Rendu partagé extrait dans `render/shipEngines.js`, `shipEngineWake.js`, `enemyLife.js`, `weaponVfx.js` et `vfxPrimitives.js`. Le statut proportionnel utilise `shared/movementSlow.js` pour le client, la validation serveur et le maintien du déplacement en arrière-plan. Bombe de mort du Traqueur : rayon 100, -50 % pendant 5 s, isolation par instance et absence de cumul multiplicatif. Les 4 passages M-6 sont uniquement visuels et la recharge est contrôlée par le serveur à 3 s. Poursuite, trajectoires, règles d'orientation et équilibrage déjà publié préservés. Publication restreinte et vérifiée ; détails dans `docs/VFX_REACTEURS_MOBS_2026-10-24.md`.

Publication du lot aspiration à 17:01:46 Europe/Paris : 13 fichiers installés sous garde, 10 empreintes HTTPS concordantes (sources serveur privées), 116 tests ciblés, 242 modules résolus et 157 cibles d'importmap accessibles. 306 alias étrangers et les nouveautés concurrentes sont préservés. Shared et backend avant l'unique redémarrage, index en dernier ; PID 1144897 / NRestarts 0, PostgreSQL prêt, journaux sans erreur et handshake WebSocket public anonyme vérifié. Sauvegarde `/opt/avosoma-backups/20261024-loot-suction1`. Aucun compte de production utilisé pour les gains d'essai ; recharge de page nécessaire pour les sessions ouvertes.

## 2026-10-24 — Frontières industrielles des trois autres secteurs 02

`firmSectorTwoVisuals.js` décline la composition approuvée de Helion-02 sur Nereid-02, Aureon-02 et Sylva-02, avec les palettes des secteurs01 et les placements réfléchis. La factory Helion existante devient exportée sans changer son résultat. Les vraies positions de portails et PNJ sont ramenées au repère canonique avant la dispersion des rochers ; seules les couches de décor sont recolorées et déplacées. Aucune donnée de gameplay modifiée ; tableaux conservés par référence, autres secteurs inchangés.

Trois atlas fixes 1200×540 portent les fonds, planètes et stations des mini-cartes ; tous les marqueurs restent séparés. Aperçu réel des quatre secteurs 02 dans `assets/maps/previews/sector02-firms1/`, sans compte MMO. Invariants, navigation, palettes, streaming et mini-cartes vérifiés ; contrôle navigateur des trois variantes et déplacement lointain de 65 pixels pour 1000 unités. Détails : `docs/SECTEURS_02_FIRMES_2026-10-24.md` ; preuves : `output/sector02-firms-20261024/`. Lot frontend `20261024-sector02-firms1`, prototype Helion-03 séparé et exclu.

Publication des secteurs 02 à 17 h 32 Europe/Paris : dix fichiers frontend, index dernier et aucun redémarrage. 86 tests ciblés, cinq syntaxes, 235 imports et 162 cibles d'importmap vérifiés ; dix empreintes HTTPS concordantes, 316 alias étrangers préservés. PID 1144897 inchangé, PostgreSQL prêt, journal sans nouvel avertissement ou erreur ; sauvegarde `/opt/avosoma-backups/20261024-sector02-firms1`. Les trois cartes de l'aperçu public `assets/maps/previews/sector02-firms1/index.html` chargent dix textures chacune, sans erreur console. Prototype Helion-03 local uniquement, exclu de la publication.


## 2026-10-24 — Helion-03, vestiges du cataclysme

Le Sillon écarlate approuvé reçoit une planète brisée rouge/cuivre, avec cœur incandescent et fragments. Overlay visuel strict ID 2 / Helion-03, ancrage 11200 / −4000, largeur 640, parallaxe 0,05. Nébuleuse unique conservée ; données et références de gameplay inchangées. Nouvel asset WebP lossless RGBA et atlas fixe 1200×540, sans marqueurs ; rendu de secours autorisé uniquement pour les backdrops minimap:true. Aperçu avec les modules réels dans assets/maps/previews/helion03-cataclysm1/index.html, sans compte MMO. Détails : docs/HELION_03_CATACLYSME_2026-10-24.md ; preuves et prompt image : output/helion03-cataclysm-20261024/. Lot frontend 20261024-helion3-cataclysm2, déploiement limité sans redémarrage et sans changements étrangers.

Publication Helion-03 à 18 h 10 Europe/Paris : neuf fichiers frontend, index dernier, 103 tests ciblés sur production + candidat, cinq syntaxes et 242 imports. Neuf empreintes HTTPS conformes et 173 cibles d'importmap accessibles ; 337 alias étrangers conservés. PID 1182716 inchangé, PostgreSQL prêt, journal sans nouvelle erreur et aucun redémarrage. Sauvegarde /opt/avosoma-backups/20261024-helion3-cataclysm2. Aperçu public assets/maps/previews/helion03-cataclysm1/index.html vérifié avec capture et console vide ; sans compte MMO authentifié.

## 2026-10-24 — Vitesse X1–X4 et enchainement X6

Version `20261024-laser-input1` publiee a 18 h 13 (Paris). Retour aux passages ordinaires de 200 ms / longueur 130. `shared/weaponCooldowns.js` separe la X6 des lasers normaux cote client et serveur ; activation X6 immediate, reprise du laser normal sans attendre l'accuse et traitement des appuis rapproches. Chaque faisceau isole son alpha et son ombre, pour que la fin d'un laser normal ne masque pas le X6.

103 tests cibles passent sur le candidat issu du runtime public frais, dont Socket.IO reel et repro des entrees dans la meme image. Neuf fichiers installes, huit empreintes HTTPS et 515 fichiers etrangers preserves ; une modification simultanee de l'orchestrateur a impose une nouvelle base avant installation. Sonde des modules installes sur objets ephemeres, PostgreSQL et journaux controles. Les trois variantes artistiques X6 et la refonte des cinq monstres restent locales. Details : `docs/VFX_LASERS_VARIANTES_2026-10-24.md`.


## 2026-10-24 — Helion-03, retouche de profondeur

À la demande du joueur, la planète brisée est recentrée et réduite de 25 % (480×320, ancrage 9000/−5000). La parallaxe passe de 0,05 à 0,03 pour une sensation plus lointaine. Même illustration et nébuleuse, aucun changement de gameplay. Atlas fixe helion-03-wide-v2.png exporté avec le renderer réel : planète 67 % / 34 %, largeur 20 %, autres repères inchangés ; atlasv1 conservé. Lot frontend limité 20261024-helion3-depth1, preuves output/helion03-depth-20261024/.


Retouche de profondeur publiée le 24 octobre à 20 h 12 Europe/Paris, lot 20261024-helion3-depth1 : cinq fichiers frontend, 28 tests ciblés, deux syntaxes, cinq empreintes publiques conformes et 176 cibles d'importmap accessibles. Les 353 alias étrangers, les anciens assets et le JS d'aperçu sont conservés. PID 1222927 inchangé, PostgreSQL prêt, aucun redémarrage ni nouvelle erreur. Sauvegarde /opt/avosoma-backups/20261024-helion3-depth1. Vérification visuelle de l'aperçu public au centre et capture output/helion03-depth-20261024/centre-public.png, sans compte MMO authentifié.


## 2026-10-24 — Bouclier temporaire et X6 B

Publication `20261024-shield-x6b1` à 20 h 24 (Paris). Suppression de la couche de fissures persistantes. Géométrie de contact partagée dans `combatData/enemyWeaponContact.js`, réception des coups et effets bornés dans `systems/combatEnemyImpacts.js`, dessin temporaire dans `render/enemyWeaponImpact.js`. Le serveur transmet `shieldBefore` avant chaque application de dégâts ; les règles de combat restent inchangées. Variante B retenue : quatre impulsions X6 en 390 ms, recharge 3 s ; X1–X4 conservés à 200 ms et longueur 130. La refonte locale des cinq corps de monstres reste exclue. Candidat composé sur la dernière publication des chiffres de dégâts : 117 tests réussis, 11 fichiers installés, 10 fichiers publics vérifiés, 519 fichiers hors correctif préservés. Détails : `docs/VFX_BOUCLIER_X6_B_2026-10-24.md`.


## 2026-10-24 — Helion-03, fond reconstruit par couches

Après signalement du fond flou, remplacement du poster de 1704 pixels affiché sur 3000 unités par une crête rouge/cuivre RGBA native de 1672×941 pixels, affichée sur 1300 unités (ratio physique 0,933 au zoom 80 % / DPR 1,5). Même méthode que les cartes 01/02 : atmosphère sombre, cinq fonds diffus discrets à alpha 0,055–0,08 et une seule nébuleuse détaillée, sans tuilage ni répétition. Nouvelle illustration `scarlet-ridge.webp` générée par imagegen intégré, conversion lossless exacte. Planète depth1, voiles proches, halos, étoiles et données de jeu inchangés. Mini-carte fixe v3 exportée par le renderer réel. Lot limité `20261024-helion3-layered1` ; preuves et prompt dans `output/helion03-layered-20261024/`. Tests ciblés 28/28 et contrôle 1920×1080 au centre à 80 %, entrée à 65 % et portail nord à 120 % ; aucun compte MMO authentifié utilisé.


Fond par couches publié le 24 octobre à 20 h 31 Europe/Paris, lot 20261024-helion3-layered1 : six fichiers frontend, 28 tests ciblés, deux syntaxes, six empreintes publiques conformes et 183 cibles d'importmap accessibles. Les 361 alias étrangers du principal et 353 de l'aperçu sont préservés. Planète, textures de base, ancien atlas et JS d'aperçu inchangés. PID 1346787 stable, PostgreSQL prêt, aucun redémarrage ni nouvelle erreur. Sauvegarde /opt/avosoma-backups/20261024-helion3-layered1. Scène et atlas vérifiés dans l'aperçu public à 1920×1080 ; capture output/helion03-layered-20261024/centre-1920-public.png et console sans erreur.


## 2026-10-24 — Coup fatal sans bouclier et trois propositions locales

Correctif `20261024-shield-lethal1` publié à 20 h 41 (Paris). Le serveur transmet le verdict cosmétique `targetDestroyed`, calculé par les règles de dégâts existantes sur une copie isolée ; aucun changement des dégâts ou de l'ordre des récompenses. Aucun effet de bouclier sur un coup fatal, y compris après disparition de la cible ; un effet en attente cesse avec sa mort. Candidat basé sur la production courante : 122 tests réussis, cinq fichiers installés, quatre fichiers publics vérifiés et 526 fichiers hors correctif préservés. Trois propositions Canvas restent locales dans `tools/vfx-lab/shields.html` : membrane réfractive, maillage hexagonal et champ magnétique. La scène de comparaison compose les systèmes réels, avec deux tests supplémentaires pour le coup fatal et les salves. Détails : `docs/VFX_BOUCLIERS_VARIANTES_2026-10-24.md`.

## 2026-10-24 — Ricky, balise de soin autonome

Publication `20261024-ricky-heal1` à 21 h 05 (Paris). Ricky déclenche le soin à 75 % de coque pour lui ou un allié vivant proche et pose la balise à sa propre position. Le champ reste fixe ; 3 000 points par pulsation de 2 secondes, rayon 250, durée 18 secondes, recharge 60 secondes. Premier soin immédiat sans doublon au tick suivant. Le bouton joueur est retiré et l'ancienne commande manuelle est refusée par le serveur. Renderer Canvas dédié : émetteur médical, ouverture, ondes synchronisées et extinction progressive, avec variante graphique sans effets.

112 tests ciblés réussis sur le candidat distant et seize scénarios relancés sur les sources publiées, dont deux clients en WebSocket et polling forcé. Aperçu du renderer public et cycle complet vérifiés sans erreur ; pas de partie MMO authentifiée. Sept fichiers publiés, seize empreintes protégées, quatre fichiers HTTPS concordants. PID 1385896 vers 1389965, NRestarts 0, PostgreSQL sain et journaux sans nouvelle erreur. Sauvegarde `/opt/avosoma-backups/20261024-ricky-heal1-190522`. Les changements concurrents ont été préservés après rafraîchissement de la base publique. Détails : `docs/RICKY_BALISE_SOIN_2026-10-24.md` ; preuves : `output/ricky-heal-beacon-2026-10-24/`.

## 2026-10-24 — Ricky, suivi calme et distance de depart

Publication `20261024-ricky-follow1` à 21 h 12 (Paris). Sans cible de combat, le compagnon laisse 30 coordonnées de mini-carte avant de démarrer, garde environ 24 pendant le déplacement et rejoint 12 après l'arrêt du joueur. Un nouveau départ rétablit l'espace d'attente. Une cible conserve la priorité jusqu'au rappel existant à plus de 200 sur X ou Y ; le soin automatique reste inchangé. Seul le module serveur `rickyCompanionAi.js` est publié.

119 tests ciblés passent sur le candidat local et distant, puis vingt scénarios d'IA sur les sources publiées, dont le cycle complet reçu par deux clients en WebSocket et polling forcé. Un fichier installé, douze empreintes protégées ; PID 1389965 vers 1397806, NRestarts 0, PostgreSQL sain et aucune nouvelle erreur. Sauvegarde `/opt/avosoma-backups/20261024-ricky-follow1-191232`. Détails : `docs/RICKY_IA_AUTONOME_2026-10-24.md` ; preuves : `output/ricky-follow-spacing-2026-10-24/`.


## 2026-10-24 — Boucliers attribués : joueur hexagonal, ennemis membrane

Choix explicite intégré et publié à 21 h 01 (Paris), `20261024-shield-assigned1`. Les deux formes sont partagées dans `render/shieldSurfaces.js`. Réception du joueur dans `systems/combatPlayerShieldImpacts.js`, dessin après son sprite dans `render/playerShieldImpacts.js`, avec six réactions au maximum et expiration à 560 ms. Les événements ennemis, PvP et bombe ancienne fournissent le bouclier avant dégâts ; le coup fatal des monstres sans réaction est conservé. Aucun changement des données ou règles de combat. Candidat issu de production : 164 tests réussis ; douze fichiers installés, neuf fichiers publics contrôlés et 522 fichiers du runtime hors correctif préservés. L'index a été repris sans écraser une publication concurrente. L'atelier présente les deux attributions avec les mêmes formes ; aucun duel MMO authentifié n'est revendiqué. Voir `docs/VFX_BOUCLIERS_ATTRIBUTION_2026-10-24.md`.

## 2026-10-24 — Orbe, nouvelle base animée locale

La reprise artistique commence par l'Orbe, avant le Vorak, le Parasite, le Traqueur et l'Éclanite. Nouvelle illustration transparente conservée séparément ; noyau stable, huit branches animées avec accélération ponctuelle, charge et éclat au tir, sillage de vapeur borné en coordonnées de monde. Les responsabilités sont séparées dans `tools/vfx-lab/orb/motion.js`, `wake.js` et `renderer.js`, composées par l'atelier sans anciennes animations superposées pour l'Orbe. La démonstration de vol et tirs reprend la patrouille simulée existante. Aucune IA, statistique ou cadence réelle modifiée ; aucun fichier de runtime modifié dans cette étape. 23 tests ciblés passent, dont les délais de poursuite existants. Contrôle navigateur du tir, des rotations et de la vue d'ensemble sans erreur console. La base reste locale, à comparer avant intégration publique. Le X6 est reporté avec une future direction orange. Détails : `docs/ORBE_REFONTE_BASE_ANIMEE_2026-10-24.md` ; preuves : `output/orb-sentinel-rig-2026-10-24/`.

## 2026-10-25 — Orbe commun compact et modèle validé attribué au boss

Le modèle à huit branches validé est désormais attribué au boss Orbe dans l'atelier. Un nouveau PNG à six petites pattes conserve la famille graphique et l'animation autour d'un noyau stable, au gabarit du premier monstre. `tools/vfx-lab/orb/profiles.js` sépare les illustrations, le découpage, le gabarit et la lumière des deux rendus ; la pose accepte six ou huit branches. Le code de fumée validé reste inchangé. Aucun runtime, règle de combat, statistique ou délai de poursuite modifié dans cette étape locale. 24 tests ciblés passent ; contrôle navigateur des deux modèles. Détails : `docs/ORBE_COMMUN_ET_BOSS_2026-10-25.md` ; preuves et sauvegardes : `output/orb-scout-and-boss-2026-10-25/`.

## 2026-10-25 — Publication des deux Orbes animés

Lot frontend `20261025-orb-family1` publié à 12 h 15 Europe/Paris : Orbe commun à six pattes et boss à huit branches, noyau stable, éclat au tir réel et fumée validée. Promotion des profils dans `combatData/orbVisuals.js` et des pose/fumée/dessin dans `render/orbMotion.js`, `orbWake.js`, `orbSprite.js`. Raccordement `render/enemyOrb.js` via état cosmétique en WeakMap, sans mutation des entités autoritaires ; les modules d'atelier réexportent ces sources. Ancien rendu de corps remplacé seulement pour les deux Orbes, préchargement des textures et icône de boss entière. Règles, statistiques et délais de poursuite inchangés.

Candidat issu de la production fraîche : 73 tests réussis, syntaxe, 333 modules et 846 imports résolus. Douze fichiers installés, index dernier ; douze empreintes HTTPS conformes et 195 cibles d'importmap accessibles, 377 alias étrangers préservés. 534 fichiers hors lot inchangés, huit gardes de règles vérifiées. PID 1406267 inchangé, NRestarts 0, PostgreSQL sain, aucun redémarrage ou nouvel avertissement. Sonde des sources installées sur objets figés et contrôle visuel local du vrai renderer ; aucune session MMO authentifiée revendiquée. Sauvegarde `/opt/avosoma-backups/20261025-orb-family1-20261025T111558Z`. Détails : `docs/ORBE_PUBLICATION_2026-10-25.md` ; preuves : `output/orb-family-release-2026-10-25/`.

## 2026-10-25 — Orbe sentinelle commun, taille visuelle +10 %

Retouche `20261025-orb-size1` publiée à 12 h 25 Europe/Paris : facteur de dessin commun 0,60 → 0,66 dans `combatData/orbVisuals.js`, sans changement du boss, du rayon de collision ni des règles. Deux fichiers publiés, index de cache en dernier ; six tests existants réussis, deux empreintes HTTPS conformes et 195 cibles d'importmap accessibles. Huit gardes et 542 fichiers hors lot préservés. PID 1406267 inchangé, PostgreSQL sain et aucun redémarrage ou nouvel avertissement. Sauvegarde `/opt/avosoma-backups/20261025-orb-size1-20261025T112548Z` ; preuves `output/orb-size-2026-10-25/`.

## 2026-10-25 — Traînée des Orbes, rendu au-dessus de 60 Hz

Défaut reproduit sur le code public : `combatLoop` met à jour les positions à 60 Hz mais peut dessiner à 120/144/240 Hz ; `orbWake` effaçait la fraction d'émission sur les images répétant une position, d'où zéro nuage. Le compteur traverse maintenant ces images et mesure tout l'intervalle de déplacement. Apparence, taille +10 %, budget de particules et règles inchangés. Huit des seize régressions échouent avant ; les seize passent après, via vraie boucle, paquets simulés au format serveur, réception, interpolation et renderer. 48 tests du candidat réussis ; seize scénarios relancés sur les modules installés sans état persistant modifié.

Lot frontend `20261025-orb-wake1` publié à 12 h 42 Europe/Paris : deux fichiers et empreintes HTTPS conformes, 199 cibles d'importmap accessibles, douze gardes et 546 fichiers hors correctif préservés. Une publication Azuron concurrente a imposé une reprise de l'index avant toute écriture. PID 2314836 inchangé pendant ce lot, NRestarts 0, PostgreSQL sain, aucun redémarrage ni nouvel avertissement. Sauvegarde `/opt/avosoma-backups/20261025-orb-wake1-20261025T114233Z`. Rapport `docs/ORBE_TRAINEE_CADENCE_2026-10-25.md` ; preuves `output/orb-wake-fix-2026-10-25/`.

## 2026-10-25 — Vorak commun valide et variante boss locale mesuree

Le joueur valide le Vorak commun apres ajout des sept lampes puis demande sa variante boss sans exageration. Nouvelle illustration derivee, blindage renforce, deux lampes supplementaires et gabarit visible environ 20 % plus present. Les profils de cette famille sont separes dans `tools/vfx-lab/vorak/profiles.js` et partagent les modules locaux de pose, moteurs et vapeur. Le boss conserve son orientation fixe existante ; le commun suit son angle de deplacement. La comparaison du boss montre explicitement le commun valide a gauche et la proposition a droite. Aucun runtime ou serveur modifie, aucune publication. 40 tests cibles passent, controles navigateur en x1/x3 et empreintes du PNG commun, du catalogue et des regles d'orientation inchangees. Details : `docs/VORAK_BOSS_VARIANTE_2026-10-25.md` ; preuves : `output/vorak-boss-2026-10-25/`.

## 2026-10-25 — Publication des deux Voraks valides

Lot frontend 20261025-vorak-family1 publie a 13 h 25 (Paris) : commun a sept lampes et boss mesure, deux ailes articulees, canon lumineux au vrai tir, deux moteurs et vapeur. Promotion des profils et pose/vapeur/dessin dans les modules de domaine du jeu, reutilises par l'atelier. Adaptateur WeakMap hors des entites serveur ; anciennes animations remplacees pour les deux Voraks seulement, images et icones de quete coherentes. Statistiques, collisions, poursuite, orientation de comportement et tirs conserves. 87 tests du candidat, 342 modules et 871 imports ; 16 scenarios de boucle/reception/interpolation/rendu sur les modules installes. Treize fichiers publics concordants, 209 cibles d'importmap accessibles, 545 fichiers hors lot et onze gardes preserves. PID 2362785 inchange, aucun redemarrage, PostgreSQL sain et aucun nouvel avertissement. Sauvegarde /opt/avosoma-backups/20261025-vorak-family1-20261025T122506Z. Aucune partie MMO authentifiee revendiquee. Details : docs/VORAK_PUBLICATION_2026-10-25.md ; preuves : output/vorak-family-release-2026-10-25/.

## 2026-10-25 — Parasite commun, nouvelle base animee locale

Apres publication des Voraks, premiere proposition du Parasite commun : nouvelle illustration transparente a six tentacules, noyau ancre, deformation souple en dix bandes par membre, veines et noyau vert brillant au tir, brume et spores en coordonnees de monde. Les modules locaux parasite/motion.js, wake.js et renderer.js remplacent la proposition generique du Parasite dans l'atelier. Gabarit courant et regles conserves ; aucun raccordement public du Parasite. 49 tests cibles passent, controles x1/x3 et capture du flash au tir sans erreur console. La variante boss viendra apres examen de cette base. Details : docs/PARASITE_COMMUN_BASE_ANIMEE_2026-10-25.md ; preuves : output/parasite-scout-2026-10-25/.

## 2026-10-25 — Fumee plus volumineuse et proposition du boss Parasite

Le joueur valide a 100 % le commun puis demande son boss. Profils locaux separes dans parasite/profiles.js, nouvelle illustration derivee, racines renforcees et gabarit natif 104 contre 86 (+20,9 %), meme facteur 0,94. Six tentacules, noyau lumineux au tir et brume conserves. Parametres du commun identiques ; PNG commun, catalogue et orientation verifies par empreintes. Comparaison explicite commun valide / boss propose. Aucun changement de regles ni publication du Parasite.

La fumee des vaisseaux partage maintenant un seul renderer entre jeu et atelier : nuages en expansion, corps teinte en composition normale et coeur doux en ecran, plutot que le seul ruban additif. Historiques, durees, moteurs et jets conserves ; textures mises en cache, numero d'emission commun aux tuyeres et dessin borne. L'atelier garde l'ancien rendu dans deux fixtures et utilise un module engineBackdrop.js pour les vrais decors Helion-01/03. Cache des index locaux actualise. 74 tests cibles reussis, controles navigateur sur fonds clairs/sombres et arret complet. Aucune publication dans cette etape. Details : docs/REACTEURS_VOLUME_ET_PARASITE_BOSS_2026-10-25.md ; preuves : output/ship-smoke-volume-2026-10-25/ et output/parasite-boss-2026-10-25/.

## 2026-10-25 — Boss Parasite rond, couronne et animation propres

Le joueur demande une distinction visuelle puis exige de conserver le corps rond. La proposition active utilise parasite-boss-v3 : six plaques de carapace autour du noyau, six grosses glandes et tentacules segmentes. L'essai allonge v2 est ecarte. Les nouveaux modules locaux parasite/bossMotion.js et bossCrown.js gerent une onde lente des six membres, leur contraction au tir, la respiration uniforme du corps et l'ouverture des plaques peintes. Le commun garde ses reglages et son animation ; sa texture, ses modules de mouvement/brume, le catalogue, l'orientation et la fumee des vaisseaux sont inchanges par empreintes. Aucun serveur ni regle modifies, aucune publication. 39 tests cibles reussis, syntaxe de sept modules et controle navigateur x1/x3 et eclat au tir sans erreur console. Details : docs/PARASITE_BOSS_ROND_COURONNE_2026-10-25.md ; preuves : output/parasite-boss-round-2026-10-25/.

## 2026-10-25 — Publication des Parasites valides et de la fumee renforcee

Lot frontend 20261025-parasite-smoke1 publie a 14 h 45 Paris : Parasite commun valide, boss rond a couronne et glandes, fumee des vaisseaux plus volumineuse et contrastee. Promotion des profils et cinq modules de rendu/mouvement/brume dans src ; adaptateur enemyParasite.js en WeakMap, branche specifique dans entities.js sans anciennes animations superposees. L'atelier reexporte les sources du jeu. Ouverture de couronne au vrai pulse recu, sans tir anticipe invente. Catalogue change uniquement pour les deux illustrations, prechargement raccorde ; orientation, poison, statistiques et poursuite conserves.

136 tests du candidat frais reussis, 350 modules et 897 imports resolus ; controles visuels avec renderer et moteurs natifs, sans compte MMO. Quatorze fichiers publics conformes, 217 cibles d'importmap accessibles ; 552 fichiers hors lot et quatorze gardes preserves. PID 2362785 inchange, aucun redemarrage, PostgreSQL sain et aucun nouvel avertissement. Seize scenarios Parasite de vraie boucle/reception/interpolation/rendu et controle natif des neuf vaisseaux relances sur les modules installes, sans etat persistant modifie. Sauvegarde /opt/avosoma-backups/20261025-parasite-smoke1-20261025T134551Z. Rapport : docs/PARASITES_REACTEURS_PUBLICATION_2026-10-25.md ; preuves : output/parasite-smoke-release-2026-10-25/.


## 2026-10-25 — Fumee ennemie renforcee, fumee joueur ajustee et Traqueur local

Apres la precision puis la correction du joueur, la fumee de son vaisseau est conservee avec une reduction legere (~9 %), tandis que les sillages des Orbes, Voraks et Parasites communs/boss sont plus volumineux et denses. Lot frontend 20261025-enemy-smoke3 publie a 15 h 19 Paris : quatre modules de fumee et index uniquement. Soixante et onze tests candidat, cinq empreintes publiques et 218 cibles d importmap valides. Apres installation, 48 scenarios natifs des ennemis et neuf vaisseaux verifies ; PID 2458909 inchange, aucun redemarrage, PostgreSQL sain et aucun avertissement recent.

Le Traqueur reste une proposition locale : les essais de pinces puis de robot cartoon sont ecartes, la derniere base bleue choisie est reprise et tournee a 180 degres. Nouvelle source abyssal-tracker-v4, six appendices articules, noyau stable, flash cyan et brume froide. Aucun changement du catalogue, de l orientation fixe, de la poursuite ou de la bombe rayon 100 / -50 % / 5 s. Huit tests locaux, sept controles de syntaxe et comparaison navigateur x1/x3 sans erreur. Aucun asset du Traqueur publie. Rapport : docs/FUMEES_TRAQUEUR_BASE_SELECTIONNEE_2026-10-25.md ; preuves : output/enemy-smoke-player-balance-release-2026-10-25/ et output/abyssal-tracker-2026-10-25/.


## 2026-10-25 — Tentacules independants du Parasite et arcs du Traqueur, local

Six enveloppes d activite distinctes remplacent la vague reguliere des Parasites commun et boss : amplitude des pointes multipliee par 1,63 a 2,07 sur trente secondes au repos, gestes de courbure et d etirement, pauses propres et retard en mouvement. Racines, noyau, coque ronde et couronne preserves. Module partage parasiteTentacles.js, six etats precalcules par dessin pour reutilisation dans le maillage. Anciennes poses figees dans trois fixtures de l atelier pour une comparaison du meme monstre avant/apres.

Le Traqueur bleu v4 recoit des arcs electriques brefs entre les appendices, lies aux points deformes, au plus deux a la fois et renforces au flash. Effet cosmetique uniquement. Cinquante-six tests reussis, douze syntaxes verifiees, aucun repli de maillage dans les poses balayees ; treize gardes d illustrations, profils, regles et fumees preserves. Comparaisons navigateur commun/boss et arcs, sans erreur console. Aucune publication dans cette etape. Rapport : docs/PARASITE_TENTACULES_ET_TRAQUEUR_ARCS_2026-10-25.md ; preuves : output/parasite-tentacles-tracker-arcs-2026-10-25/.


## 2026-10-25 — Traqueur commun et tentacules publies, boss local

Lot frontend 20261025-tracker-parasite1 publie a 15 h 51 Paris : Traqueur commun bleu v4, rig articule, brume et arcs raccordes au vrai renderer, plus nouveaux tentacules independants des Parasites commun et boss. Adaptateur Tracker en WeakMap sur les impulsions recues, preload et image catalogue mis a jour, ancien corps/attente exclus de ce commun. Sept modules/profils Tracker partages avec l atelier. Source du commun deja tournee de 180 degres : decalage asset zero pour monde et icones, orientation fixe conservee ; ancien boss inchange. Fumees precedentes et gameplay preserves.

141 tests candidat, 359 modules et 922 imports verifies. Dix-sept empreintes publiques et 226 cibles d importmap conformes ; 557 fichiers hors lot et quinze gardes preserves. Aucun redemarrage, PID 2510150 et NRestarts=0, PostgreSQL sain et aucun avertissement recent. Huit scenarios Tracker, seize Parasite et neuf vaisseaux valides apres installation sur les modules installes, sans etat persistant modifie. Sauvegarde /opt/avosoma-backups/20261025-tracker-parasite1-20261025T145145Z.

Nouvelle proposition boss locale : deux epaules blindees, crete superposee, lames segmentees, meme famille bleue et six membres. Gabarit natif 126 contre 106, facteur .94 commun et boss ; horloge visuelle .83, positions/dt/tir conserves. Vingt gardes natifs preserves, quatre syntaxes et controles navigateur x1/x3 sans erreur. Aucun nouvel asset du boss publie ; Eclanite non modifie. Rapport : docs/TRAQUEUR_PUBLICATION_ET_BOSS_2026-10-25.md ; preuves : output/tracker-parasite-release-2026-10-25/ et output/abyssal-tracker-boss-2026-10-25/.

## 2026-10-25 — Boss Traqueur publie, Eclanite en atelier

Boss valide et lot frontend 20261025-tracker-boss1r2 publie a 18 h 48 Paris : illustration blindee, profil natif partage avec le commun et horloge visuelle .83 uniquement pour corps/arcs. Positions, temps de brume, tir recu, orientation fixe, poursuite et bombe 100 / -50 % / 5 s conserves. Six fichiers, index dernier. Premiere preparation bloquee avant ecriture par index concurrent ; candidat r2 reconstruit sur production fraiche. 150 tests, 363 modules et 932 imports verifies ; six empreintes publiques et 231 cibles d importmap accessibles. 572 fichiers hors lot et 21 gardes preserves. PID 2510150, NRestarts 0, PostgreSQL sain et aucun nouvel avertissement. Seize scenarios Tracker, seize Parasite et neuf vaisseaux verifies apres installation sans donnees persistantes modifiees. Sauvegarde /opt/avosoma-backups/20261025-tracker-boss1r2-20261025T174812Z.

Premiere proposition locale de l Eclanite commun : nouvelle illustration violette, noyau fixe, six fragments detaches animes independamment, fissures lumineuses au tir et poussiere cristalline diffuse suivant les positions reelles. Corps entier non tournant, gabarit 82 et statistiques conserves ; aucun raccordement natif ni publication de cette espece. Huit tests locaux, six syntaxes et huit empreintes de regles/catalogue/fumees/Tracker preserves. Comparaisons navigateur x1/x3, mouvement et flash sans erreur console. Rapport : docs/BOSS_TRAQUEUR_PUBLICATION_ET_ECLANITE_2026-10-25.md ; preuves : output/tracker-boss-release-2026-10-25-r2/ et output/eclanite-rig-2026-10-25/.

## 2026-10-25 — Secteurs 03 des trois autres firmes, préparation locale

Nouveau module `firmSectorThreeVisuals.js` : Nereid-03 bleu, Aureon-03 or, Sylva-03 vert, à partir de la composition Helion-03 approuvée. Même placement et profondeur, sans miroir ; nébuleuse centrale complète, cristaux, halos et reflets d’Éclanite violets conservés. Palettes natives mises en cache par le mécanisme existant. Trois mini-cartes fixes 1200×540 et aperçu comparatif `assets/maps/previews/sector03-firms1/`. Overlay raccordé au client local, aucune donnée MMO modifiée, Helion et fondu hors carte inchangés.

44 tests ciblés réussis. Contrôles navigateur des trois variantes, déplacement et sorties de carte ; aucune session MMO authentifiée. Aucune publication de ce lot. Rapport : `docs/SECTEURS_03_FIRMES_2026-10-25.md` ; preuves : `output/sector03-firms-20261025/`.

## 2026-10-25 — Eclanite valide publie, fin de la refonte des corps

Lot frontend 20261025-eclanite-visual1 publie a 19 h 19 Paris : noyau violet fixe, six fragments independants, flash sur tir recu et poussiere cristalline en positions reelles. Promotion des trois modules motion/wake/sprite et du profil dans src ; adaptateur enemyEclanite.js en WeakMap, preload et illustration catalogue raccordes. Rendu exclusif sans anciennes animations superposees, wrappers atelier partageant les sources natives. Taille 82/rayon 35, vitesse 240, cooldown 1, vitesse projectile 560, orientation fixe et poursuite conserves ; autres cristaux et familles inchanges.

171 tests candidat, 368 modules et 945 imports resolus ; dix fichiers installes, index dernier. Dix empreintes publiques et 236 cibles d importmap conformes ; 573 fichiers hors lot et 27 gardes preserves. Aucun redemarrage, PID 2510150 et NRestarts 0, PostgreSQL sain et aucun avertissement nouveau. Apres installation, huit scenarios Eclanite, seize Tracker, seize Parasite et les neuf vaisseaux testes en memoire sans donnees persistantes modifiees. Sauvegarde /opt/avosoma-backups/20261025-eclanite-visual1-20261025T181916Z. Comparaison navigateur du vrai renderer sur le candidat local, aucune partie MMO authentifiee revendiquee.

Le joueur arrete ici la refonte des corps et demande des idees d attaques : Orbe a boule bleue sans trait, decharge rouge du Vorak, globule acide du Parasite, impulsion electrique du Traqueur et lame violette de l Eclanite. Propositions uniquement ; commencer par une sequence complete de l Orbe. Une vraie precharge avant tir devra suivre une intention serveur annulable, sans predictions de tirs par le renderer ni retard des degats. Rapport : docs/ECLANITE_PUBLICATION_ET_ATTAQUES_2026-10-25.md ; preuves : output/eclanite-release-2026-10-25/.

## 2026-10-25 — Locomotion plus visible et tailles Parasite/Traqueur, local

Le joueur demande des gestes moins discrets et des tailles augmentees. Parasites commun/boss : facteur .94 x 1.15 ; Traqueurs commun/boss : .94 x 1.12, sans changer les dimensions ou collisions du catalogue. Nouvelle enveloppe cosmetique enemyLocomotion.js partagee par les cinq familles, liee au mouvement reel et se calmant a l arret. Balayages/courbures des six tentacules environ doubles ; appendices Tracker x1.95 a x2.72, fragments Eclanite x2.36 a x2.49. Ailes Vorak et articulation propre des branches Orb plus lisibles. Noyaux stables, orientation/poursuite/tirs/bombe conserves, fumee joueur inchangee.

Marge dans les textures posees du Parasite pour eviter les pointes coupees ; regions et masque des pattes Tracker melanges continument pour ne pas inverser les triangles a forte amplitude. Arcs relies aux nouvelles positions. Dix-neuf modules/profils figes dans tools/vfx-lab/locomotionBefore donnent une vraie comparaison de la version publiee a gauche et de la retouche a droite, meme monstre/meme deplacement, commun ou boss. Cache local locomotion-2.

211 tests passes, seize syntaxes et treize gardes de donnees/regles/effets preserves. Mesures d amplitude, tests des cellules opaques et controle navigateur des neuf variantes sans erreur console. Aucun nouveau bitmap ni publication : dernier lot public 20261025-eclanite-visual1. Rapport : docs/MONSTRES_MOUVEMENTS_PLUS_VISIBLES_2026-10-25.md ; preuves : output/enemy-locomotion-2026-10-25/.


## 2026-10-25 — Locomotion renforcée validée et publiée

Lot frontend `20261025-enemy-motion1` publié à 20 h 21 Paris après validation : mouvements plus visibles des cinq familles et des neuf variantes déjà refaites, Parasites commun/boss +15 %, Traqueurs commun/boss +12 % en dessin. Poursuite, échantillonnage, orientations, collisions, attaques, bombe et fumée joueur conservés. Candidat reconstruit sur production fraîche, treize bases existantes identiques, un nouveau module d’enveloppe. Quatorze modules et index dernier ; 571 fichiers runtime hors lot et 32 gardes préservés.

211 tests candidat, 372 modules et 958 imports résolus ; 15 empreintes publiques conformes et 241 cibles d’importmap accessibles. Rendu natif local Parasite/Traqueur sans erreur console, neuf variantes approuvées en atelier. Tests en mémoire sur l’installation : 16 scénarios Orbe, 16 Vorak, 16 Parasite, 16 Traqueur, 8 Éclanite et neuf vaisseaux, sans état persistant modifié. PID 2510150 inchangé, NRestarts=0, aucun redémarrage, PostgreSQL/santé publics sains et aucun nouvel avertissement. Sauvegarde `/opt/avosoma-backups/20261025-enemy-motion1-20261025T192107Z`. Atelier `locomotion-live-1` avec ancienne animation et mouvements publiés. Rapport : `docs/MONSTRES_MOUVEMENTS_PUBLICATION_2026-10-25.md` ; preuves : `output/enemy-locomotion-release-2026-10-25/`.

## 2026-10-25 — Secteurs 03 : matériaux natifs et gaz fidèle à Helion

Première proposition rejetée pour son rouge résiduel. Quatorze PNG régénérés et trois étoiles SVG adaptés aux firmes ; reflets violets communs. Onze essais de gaz trop opaques archivés hors du runtime. Dernière correction du joueur appliquée : textures, filaments, alpha et paramètres exacts d’Helion pour les gaz ; couleur périphérique de firme, matériau central violet partagé et émission violette d’origine. Aucun changement du renderer, des parallaxes, du fondu hors carte ni des données MMO.

Trois mini-cartes fixes 1200×540 réexportées. 46 tests ciblés, cinq syntaxes et vérification navigateur des trois firmes : planète 90 pour caméra 1000, mini-cartes identiques avant/après mouvement, décor hors carte noir, console propre. Gardes Helion/world/sky inchangés. Aperçu local assets/maps/previews/sector03-firms2/, aucun déploiement. Rapport : docs/SECTEURS_03_FIRMES_2026-10-25.md. Prompts, sélection et preuves : output/sector03-firms-native-20261025/.


### 2026-10-25 — Secteurs 03 : silhouettes communes et violet localisé

Correction locale `aligned3`, sans publication. Nouvelle planète Helion issue du style Nereid, master RGBA commun aux quatre variantes. Structures et rochers reprennent les silhouettes exactes Helion, matériaux de firme préparés au chargement. Retrait du nuage entièrement violet : émission originale partagée et préservation locale de son éclairage dans le seul nuage principal. Quatre mini-cartes `*-03-aligned-v3.png` exportées. Audit navigateur : 229 couches/variante, 12 textures/variante, zéro différence géométrique ou alpha. 47 tests passent. Moteurs world/sky et gameplay préservés. Détails, sources, prompt et preuves : `docs/SECTEURS_03_FIRMES_2026-10-25.md` et `output/sector03-alignment-20261025/`. Ne pas publier les anciens PNG indépendants v2 ni le matériau global eclanite.


## Orion et chargement 3D - prototype local du 31 octobre 2026

Le chargement des coques est independant du moteur dans `ship3dAssets.js`. `combatSceneLoading.js` compose la preparation des ressources de la zone et la premiere image avec un ecran de chargement ; les anciens visuels remplaces sont filtres dans le cache de combat. `disposeScene3d.js` distingue les ressources privees des GLB partages. Le reacteur Orion utilise trois lots GPU partages et une trainee circulaire bornee ; aucun atlas de reacteur supplementaire. Les vues classiques gardent un moteur d apercu a la demande, libere au retour au secteur commun. Changements purement visuels, non publies. Details et limites des verifications : `docs/ORION_REACTEUR_CHARGEMENT_3D_2026-10-31.md`.
