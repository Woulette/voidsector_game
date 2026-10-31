# Audit de cohérence d’Avosoma — 22 octobre 2026

**Suivi après corrections.** A01 (tutoriel) est traité et validé par l'utilisateur après publication de `20261022-tutorial4` : le résultat lui convient, sans être considéré comme parfait. Le lot est clos ; son historique et ses limites restent dans `docs/TUTORIEL_REFONTE_2026-10-22.md` et `docs/TUTORIEL_RETOURS_2026-10-22.md`. **A02 est corrigé et publié le 22 octobre à 21:15 sous `20261022-quests1`** : 36 contrats cohérents dans les quatre firmes, migration ciblée et abandon serveur/UI. Vérifications et limites : `docs/QUETES_COHERENCE_2026-10-22.md`. **A03 est corrigé et publié à 21:44 sous `20261022-crafting1`** : clôture des fabrications redondantes avec remboursement unique, reçu serveur du paiement et récupération des anciens chantiers. Détails et limites historiques : `docs/FABRICATION_RECUPERATION_2026-10-22.md`. **A04 est corrigé et publié le 23 octobre à 11:31 sous `20261023-drones1`** : achats autoritaires, plafond de 8 standards et 2 places réservées aux futurs drones spéciaux à fabriquer. Détails : `docs/DRONES_ACHATS_2026-10-23.md`. Sept des dix priorités utilisateur sont traitées ; A05 (compétences) est reporté par décision utilisateur du 23 octobre : une refonte complète sera définie plus tard. A06 est corrigé et publié le 23 octobre à 12:26 : sessions solo indépendantes et accès Deadly vérifié. Détails : `docs/PORTAILS_SESSIONS_2026-10-23.md`. A08 (renouvellement des contrats journaliers et hebdomadaires) est également reporté par décision utilisateur du 23 octobre : le catalogue de quêtes est encore en préparation. A09 est corrigé et publié le 23 octobre à 13:46 sous `20261023-pvp3` : malus alliés, légitime défense, dette et prix, statut CIBLE et limite quotidienne de dix kills récompensés par compte cible. Détails : `docs/PVP_REPUTATION_2026-10-23.md`. A10 (skins) est reporté par décision utilisateur du 23 octobre : tous les portails seront refaits de zéro. A11 est corrigé et publié sous `20261023-m6shop1` puis `20261023-m6craft1` : retrait du magasin et recette définie par l’utilisateur, avec 10 000 unités pour 15 000 NOVA et les trois matériaux demandés. Détails : `docs/MUNITIONS_M6_2026-10-23.md`. Les dix priorités utilisateur sont désormais réparties en sept traitées et trois reportées (A05, A08, A10). **A07, A12 et A13 sont également traités et publiés le 23 octobre sous `20261023-coherence1`** : Impérial retiré avec nettoyage persistant du profil concerné ; boosters unitaires et plafond serveur de 1 000 par type ; attribution commune des grades et finition des 25 insignes d’origine après rejet des écussons. Détails : `docs/GRADES_IMPERIAL_BOOSTERS_2026-10-23.md`. A14 (affichage du prix Premium) reste ouvert ; A17 (secours du classement) reste à vérifier avec le créateur. A18 est reporté à la future refonte du calendrier. A15 et A16 sont à reprendre avec les textes et prérequis du catalogue de quêtes. Le rapport initial ci-dessous est conservé pour traçabilité.

Audit réalisé sur le jeu actuel, son interface publique et les règles client/serveur. Aucun fichier de gameplay, profil joueur ou service de production n’a été modifié par cet audit. Les seules créations sont ce rapport et ses pièces de vérification dans `output/audit-coherence-2026-10-22/`.

**Conclusion : la base fonctionne, mais plusieurs systèmes ne décrivent plus les mêmes règles.** Les problèmes les plus urgents bloquent un nouveau joueur, immobilisent son journal ou sa fabrication, font perdre une tentative de portail, ou calculent incorrectement un achat. D’autres promettent des effets ou récompenses qui n’existent pas dans le MMO. Une refonte générale ne paraît pas nécessaire pour traiter ces défauts : les corrections peuvent rester ciblées par domaine.

**Méthode et portée.** Lecture des catalogues, interfaces, actions réseau et mutations serveur ; audit parallèle économie, quêtes et combat/portails ; consultation du chat « Évaluer l’état du jeu Avosoma », notamment ses décisions sur le multijoueur, la connexion et les décors. Ce chat confirme que le jeu à considérer est le MMO en ligne et que les retouches d’Hélion-01 sont un travail visuel en cours. Les différences avec les anciennes fonctions locales ne sont donc retenues que lorsqu’elles révèlent une promesse absente du MMO.

Les reproductions utilisent les modules réels et des profils synthétiques uniquement en mémoire ; les points examinés par lecture de code seule sont précisés dans leur description. Les parcours Magasin, Boutique, Portails et Firme ont aussi été observés sur le tableau de bord public, sans achat, récompense, changement d’équipement ni combat. Le compte consulté est administrateur : la visibilité de l’Impérial sur ce compte n’a pas été prise pour une anomalie.

**Validation de la version examinée.** Douze fichiers client critiques ont été comparés aux réponses HTTPS publiques et vingt-sept fichiers serveur critiques aux fichiers du serveur de production : contenus identiques après normalisation des fins de ligne. Parmi eux : catalogues, tutoriel, magasin, quêtes, fabrication, achats, récompenses, groupes, instances et classement. Le serveur public répond correctement et PostgreSQL est prêt. Une comparaison additionnelle détaillée est conservée dans [verification-serveur-additionnelle.json](C:/Users/Ntmav/Desktop/voidsector_game/output/audit-coherence-2026-10-22/verification-serveur-additionnelle.json).

**Tests existants : 1 064/1 064 côté serveur et 40/40 côté client, soit 1 104 réussites et aucun échec.** Ces résultats ne couvrent pas les scénarios transversaux ci-dessous. Ils ne constituent pas la preuve d’une partie complète, d’une restauration de base, d’un test de charge ou d’une victoire réelle dans chaque portail.

Priorités : **P1** = blocage, perte ou intégrité de l’économie à traiter en premier ; **P2** = fonctionnement ou promesse à corriger ensuite ; **P3** = cohérence d’affichage et de récit. Les décisions de conception sont présentées séparément des anomalies.

| Réf. | Priorité | Constat | Effet pour le joueur |
| --- | --- | --- | --- |
| A01 | Traité, validé | Tutoriel adapté aux quatre firmes et retours intégrés | Lot publié et accepté ; constat initial conservé ci-dessous |
| A02 | Traité, publié | 36 contrats corrigés pour les quatre firmes, abandon ajouté | Journaux anciens récupérables ; validation utilisateur à suivre |
| A03 | Traité, publié | Fabrication redondante clôturable avec remboursement unique | Chantier libéré, reçu serveur et récupération des anciens jobs ; validation utilisateur à suivre |
| A04 | Traité, publié | Achat calculé depuis le profil serveur ; 8 standards et capacité totale de 10 | Achat/craft standard limité à 8 ; 2 places réservées aux futurs drones spéciaux à fabriquer |
| A05 | Reporté, refonte à définir | Compétences à reprendre de zéro après évolution du jeu | Décision utilisateur du 23 octobre ; anomalies conservées pour la future refonte |
| A06 | Traité, publié | Sessions solo indépendantes du groupe ; Deadly seul portail solo/groupe | Entrée non-chef en solo, clés individuelles et trois vies dans Deadly ; validation utilisateur à suivre |
| A07 | Traité, publié | Impérial retiré du jeu et des profils historiques | Inventaire et monnaies conservés ; éventuel chantier clôturé et remboursé une seule fois |
| A08 | Reporté, quêtes en préparation | Renouvellement des contrats individuels à reprendre plus tard | Décision utilisateur du 23 octobre ; fonctionnement actuel conservé pendant la préparation des quêtes |
| A09 | Traité, publié | Malus alliés progressifs, légitime défense, réputation négative et limite de dix kills ennemis récompensés | Barème utilisateur appliqué et sauvegardé ; majorations du magasin et statut CIBLE actifs |
| A10 | Reporté, refonte des portails | Skins de Kharon et des Précurseurs à reprendre avec les portails | Décision utilisateur du 23 octobre : tous les portails seront refaits de zéro |
| A11 | Traité, publié | M-6 retirée du magasin ; recette serveur ajoutée selon le barème utilisateur | 10 000 unités en une minute ; 15 000 NOVA et trois matériaux définis ; achat toujours interdit |
| A12 | Traité, publié | Boosters achetés à l’unité, plafond de 1 000 par type | Contrôle serveur avant débit ; erreur explicite et aucun paiement au-delà de la réserve autorisée |
| A13 | Traité, publié | Grade attribué par le serveur partagé entre profil, classement et combat | Quotas conservés ; prochain grade correctement expliqué et 25 visuels d’origine améliorés |
| A14 | P3 | Prix Premium différent entre Magasin et Boutique | Même pass affiché à deux prix pour un abonné |
| A15 | P2/P3 | Récit de retour au relais sans objectif correspondant | Récompense automatique avant le retour annoncé |
| A16 | P3 | Deuxième épisode de Ricky accessible sans le premier | Dialogue faisant référence à une livraison jamais effectuée |
| A17 | À vérifier avec le créateur | Classement fictif de secours encore accessible | Comportement conservé dans ce lot ; son usage sera confirmé avant modification |
| A18 | Reporté, refonte du calendrier | Calendrier et libellés de récompenses discordants | Décision utilisateur du 23 octobre ; constat initial conservé pour la refonte |

**A01 — Constat initial corrigé : le tutoriel ne résolvait pas les quêtes des trois autres firmes.**

Le catalogue duplique les quêtes avec des identifiants propres à Cygnus, Solarys et Verdantis. Le serveur sait les résoudre, mais plusieurs filtres et conditions de l’interface attendent encore les identifiants Astra.

Preuve : le véritable rendu du relais, à l’étape `game_select_pass`, affiche une quête pour Astra et zéro pour chacune des trois autres firmes, avec « Aucune mission ici. ». Il ne suffit pas de corriger le premier filtre : les sélecteurs du guide et les conditions de progression ont le même défaut.

Proposition : partager un résolveur fondé sur `sourceQuestId` et la firme ; parcourir ensuite tout le tutoriel dans chacune des quatre firmes. Prévoir de reprendre correctement les tutoriels déjà immobilisés.

Sources : [identifiants par firme](C:/Users/Ntmav/Desktop/voidsector_game/src/data/progression.js:451), [identifiants attendus par le guide](C:/Users/Ntmav/Desktop/voidsector_game/src/shared/tutorial.js:1), [filtre du relais](C:/Users/Ntmav/Desktop/voidsector_game/src/game/ui/spawnPanel.js:490), [conditions du guide](C:/Users/Ntmav/Desktop/voidsector_game/src/ui/tutorialController.js:29), [résolution serveur existante](C:/Users/Ntmav/Desktop/voidsector_game/server/src/players/tutorialActions.js:18).

**A02 — Constat initial corrigé : des contrats obsolètes pouvaient remplir définitivement le journal.**

Correction publiée : cibles Éclanite/Cristanite/Astranite dans chaque carte 05 ; récits actualisés ; identifiants/récompenses conservés. Les tentatives anciennes sont clôturées une fois, sans effacer les récompenses acquises. Abandon avec confirmation dans le relais et Info, validé et sauvegardé par le serveur, protections tutoriel/Ricky/ancien butin. 1 248 tests serveur et 40 tests client réussis, parcours navigateur local vérifié. Aucun profil actif concerné à réparer au déploiement. Voir `docs/QUETES_COHERENCE_2026-10-22.md` pour les preuves et les limites d'équilibrage.

Neuf familles de quêtes demandent des boss sur la carte 05 : Boss Orbe, Vorak, Parasite, Traqueur ou Cuirasse ambre. Avec les quatre firmes, cela représente **36 quêtes : 20 normales, 8 journalières et 8 hebdomadaires**. Or le monde actuel de cette carte contient 30 Éclanites, 16 Cristanites et 4 Astranites. Les réapparitions conservent ces types. Les objectifs imposent à la fois le bon ennemi et la bonne zone.

Les Boss Orbes et Vorak existent ailleurs, les Boss Parasites et Traqueurs dans CORE. Le Boss Cuirasse ambre n’appartient à aucune population du monde ouvert actuel. Les contrats ne sont donc pas simplement difficiles.

Preuve : sur un profil synthétique de niveau 22, les cinq contrats normaux impossibles sont acceptés. La mort ne les retire pas. Une sixième mission est refusée : « Maximum 5 quetes en cours. ». Aucune action d’abandon de quête individuelle n’est exposée ; l’abandon du tutoriel est distinct.

Proposition : réécrire les cibles et zones selon la difficulté souhaitée, retirer temporairement les contrats sans cible réelle, puis migrer les acceptations déjà bloquées. Ajouter un abandon serveur avec des effets explicites sur les objets de mission et la progression. Éviter un reset général des comptes.

Sources : [les neuf familles](C:/Users/Ntmav/Desktop/voidsector_game/src/data/progression.js:361), [population réelle de la carte 05](C:/Users/Ntmav/Desktop/voidsector_game/server/src/world/definitions.js:9), [apparitions effectives](C:/Users/Ntmav/Desktop/voidsector_game/server/src/world/state.js:14), [correspondance stricte des objectifs](C:/Users/Ntmav/Desktop/voidsector_game/server/src/quests/questMatchers.js:1), [limite du journal](C:/Users/Ntmav/Desktop/voidsector_game/server/src/quests/questState.js:209), [actions disponibles](C:/Users/Ntmav/Desktop/voidsector_game/server/src/players/profileActions.js:647).

**A03 — Constat initial corrigé : acheter une sortie déjà en fabrication pouvait immobiliser le chantier.**

Correction publiée : bouton « Clôturer et rembourser » pour vaisseau/formation déjà acquis ou limite de drones atteinte, sans attendre la fin du minuteur. Les nouveaux chantiers conservent les coûts réellement payés, y compris la remise Premium. Sauvegarde et restauration sur erreur, interdiction de remboursement multiple, récupération des anciens jobs au chargement et conservation des objets répétables. Aucun chantier concerné en production au déploiement. 1 266 tests serveur, 40 tests client et 37 tests ciblés du paquet publié réussis ; parcours navigateur local avec achat intermédiaire, remboursement et nouvelle fabrication vérifié. Voir `docs/FABRICATION_RECUPERATION_2026-10-22.md` pour les preuves et la compensation des anciens paiements non enregistrés.

Exemple reproduit : lancer un Valkyrie, l’acheter au magasin, puis récupérer la fabrication. L’achat réussit ; la récupération refuse « Vaisseau deja possede. ». Le `craftingJob` reste présent et tout nouveau lancement refuse « Une fabrication est deja en cours. ». Le même risque existe pour une formation obtenue ailleurs ou un drone lorsque la limite de dix est atteinte avant récupération. Aucune annulation de fabrication n’a été trouvée dans le parcours actuel.

Proposition : définir une issue pour les fabrications devenues redondantes, par exemple clôture et remboursement complet, et réparer les jobs déjà bloqués. À défaut, empêcher l’acquisition en double pendant la fabrication avec une explication claire.

Sources : [contrôle de disponibilité](C:/Users/Ntmav/Desktop/voidsector_game/server/src/economy/crafting.js:90), [blocage d’un nouveau craft](C:/Users/Ntmav/Desktop/voidsector_game/server/src/economy/crafting.js:200), [effacement tardif du job](C:/Users/Ntmav/Desktop/voidsector_game/server/src/economy/crafting.js:245), [achat indépendant](C:/Users/Ntmav/Desktop/voidsector_game/server/src/players/profileActions.js:196).

**A04 — L’achat de drones ne repart pas du nombre détenu côté serveur.**

**Corrigé et publié le 23 octobre à 11:31 sous `20261023-drones1`.** Débit et attribution sont calculés depuis le profil serveur ; une demande fondée sur un prix périmé est refusée sans paiement. La limite utilisateur de 8 drones standards s'applique aussi à leur fabrication. Les deux places supplémentaires sont réservées, les drones spéciaux et leurs recettes étant explicitement reportés. Détails et preuves : `docs/DRONES_ACHATS_2026-10-23.md`. Le constat initial est conservé ci-dessous.

Le serveur calcule le prix et le nombre final depuis `ownedCount` fourni par le client. L’action profil attribue ensuite le maximum entre le nombre existant et ce nombre annoncé. Il manque une vérification atomique du nombre réel.

Deux simulations avec un compte ordinaire : partir de zéro et annoncer neuf permet d’obtenir dix drones en payant 102 400 000 crédits, contre 204 600 000 pour les dix achats successifs normaux ; partir d’un drone avec une valeur client périmée de zéro coûte 200 000 crédits sans ajouter de drone. Aucune requête de ce type n’a été envoyée au jeu public.

Proposition : recalculer possession, tarif, limite et ajout à partir du profil serveur dans la même action. Un achat réussi doit ajouter exactement un drone et le prix confirmé doit correspondre à cet ajout.

Sources : [donnée transmise par le client](C:/Users/Ntmav/Desktop/voidsector_game/src/app/shopActions.js:93), [handler serveur](C:/Users/Ntmav/Desktop/voidsector_game/server/src/socket/economyHandlers.js:568), [calcul du prix](C:/Users/Ntmav/Desktop/voidsector_game/server/src/economy/shop.js:198), [attribution finale](C:/Users/Ntmav/Desktop/voidsector_game/server/src/players/profileActions.js:243).

**A05 — Des compétences achetées n’ont pas tous leurs effets annoncés.**

**Reporté le 23 octobre 2026 à la demande de l’utilisateur.** Le système de compétences sera repensé de zéro pour correspondre au jeu actuel. Aucune correction de gameplay de ce lot n’est engagée ; les constats suivants restent documentés pour la future refonte.

| Compétence | Promesse maximale | Comportement vérifié dans le MMO |
| --- | --- | --- |
| Condensateurs | +6 % esquive | La statistique est calculée mais aucun chemin d’attaque serveur ne l’utilise |
| Drone soutien | +12 % soute | Le client multiplie la capacité ; le serveur conserve la capacité de base du vaisseau |
| Soute optimisée | +6 % crédits | Bonus appliqué aux quêtes ; absent des gains de monstres et fins de portails |
| Protocoles NOVA | +10 % NOVA | Même différence de périmètre |

Preuves : cent attaques de 100 dégâts retirent exactement 10 000 PV avec ou sans la statistique d’esquive ; la lecture des chemins d’attaque confirme l’absence de jet. Un Astralis avec le bonus de soute maximal affiche 1 680 places, mais l’ajout serveur de 1 680 unités n’en place que 1 500 et en laisse 180. Cette limite concerne la soute embarquée et les expéditions ; les matériaux ramassés dans le monde vont dans `cargoHold`, il ne faut pas confondre ces deux stocks. Un monstre à 10 000 crédits et 10 000 NOVA donne 10 000/10 000 même avec les deux bonus économiques.

Ces compétences ont des coûts réels en monnaie et matériaux ; les rangs précédents des différentes branches sont également requis pour avancer dans le tableau. Le problème d’esquive et de capacité est fonctionnel. Pour les gains, il faut d’abord confirmer si le bonus devait être général ou limité aux quêtes.

Proposition : utiliser les statistiques effectives du profil dans tous les calculs serveur concernés et préciser le périmètre de chaque bonus dans le texte. Examiner les achats déjà effectués pour décider d’une régularisation ciblée.

Sources : [promesses](C:/Users/Ntmav/Desktop/voidsector_game/src/data/progression.js:262), [capacité affichée](C:/Users/Ntmav/Desktop/voidsector_game/src/core/combatStatsStore.js:161), [capacité serveur](C:/Users/Ntmav/Desktop/voidsector_game/server/src/economy/refineryProfile.js:54), [expéditions](C:/Users/Ntmav/Desktop/voidsector_game/server/src/economy/refineryShipments.js:67), [attaques IA](C:/Users/Ntmav/Desktop/voidsector_game/server/src/world/ai.js:379), [application des dégâts](C:/Users/Ntmav/Desktop/voidsector_game/server/src/players/presence.js:139), [bonus sur les quêtes](C:/Users/Ntmav/Desktop/voidsector_game/server/src/quests/questRewards.js:7), [récompenses de monstres](C:/Users/Ntmav/Desktop/voidsector_game/server/src/world/rewards.js:39).

**A06 — Les portails personnels héritent de contraintes et mutations du groupe social.**

**Corrigé et publié le 23 octobre à 12:26 sous `20261023-portals2`**, après le lot principal `20261023-portals1`. Règle confirmée par l’utilisateur : tous les portails de l’onglet PORTAILS sont solo ; Deadly est l’unique exception solo/groupe. Sessions personnelles indépendantes, clés enregistrées avant l’admission et trois vies individuelles ; le troisième décès fait sortir le joueur concerné. La relance après une victoire est vérifiée. Détails, preuves et limites du contrôle global : `docs/PORTAILS_SESSIONS_2026-10-23.md`. Le constat initial est conservé ci-dessous.

Deux problèmes distincts ont la même origine. D’abord, un membre non-chef peut préparer son portail personnel, mais son entrée est refusée parce qu’il n’est pas chef, alors que l’instance créée sur le chemin actif est privée et ne fait entrer que son propriétaire. Ensuite, quitter le groupe pendant le portail ne passe pas par l’abandon normal de l’épreuve.

Preuve du second cas : le départ d’un groupe d’un seul joueur supprime le groupe et son instance ; le joueur reste sur `portal-blue`, avec `groupId:null`, sans événement `group:instance-reset`. Les tirs ne peuvent plus retrouver les cibles de l’instance. La tentative est perdue ou reste visuellement incohérente. Une exclusion ou une création de groupe peut atteindre la même logique de sortie. Le chemin de sortie ne rembourse pas non plus une clé Deadly déjà consommée.

Proposition : gérer les instances personnelles par compte indépendamment du groupe social. En attendant, protéger les mutations de groupe pendant une épreuve et proposer un abandon qui ferme l’instance, remet le joueur sur une vraie carte et sauvegarde l’état cohérent.

Sources : [préparation](C:/Users/Ntmav/Desktop/voidsector_game/server/src/portals/instances.js:671), [restriction au chef](C:/Users/Ntmav/Desktop/voidsector_game/server/src/portals/instances.js:945), [instance personnelle](C:/Users/Ntmav/Desktop/voidsector_game/server/src/portals/instances.js:992), [suppression de groupe](C:/Users/Ntmav/Desktop/voidsector_game/server/src/groups/groups.js:193), [recherche des cibles](C:/Users/Ntmav/Desktop/voidsector_game/server/src/combat/enemyHits.js:541), [bouton Quitter](C:/Users/Ntmav/Desktop/voidsector_game/src/game/ui/combatPanels.js:577).

**A07 — L’Impérial peut être fabriqué par un joueur qui ne pourra pas le piloter.**

**Corrigé et publié sous `20261023-coherence1`.** Le créateur a demandé de supprimer entièrement le vaisseau. Catalogue, recette dérivée, profil de moteurs et ancien asset retirés ; réparation persistée des possessions historiques avant normalisation. Les équipements et monnaies sont conservés, un éventuel chantier est remboursé une fois. Un profil réellement concerné a été nettoyé. Le boss partageant son image conserve un asset distinct. Voir `docs/GRADES_IMPERIAL_BOOSTERS_2026-10-23.md`. Constat initial ci-dessous.

La restriction OWN/admin est bien appliquée à l’achat et à l’activation, mais ni la génération des recettes ni le lancement/récupération serveur ne l’appliquent à la fabrication. Simulation avec `role:"player"` : recette visible, lancement et récupération réussis, vaisseau ajouté, activation refusée. Coût consommé : 15 injecteurs du vide, 16 plaques de matière noire, 7 plaques astrométalliques et 8 ampoules de condensat du vide.

Proposition : exclure les vaisseaux réservés des recettes ordinaires et vérifier les droits serveur au lancement comme à la récupération. Prévoir le traitement des fabrications déjà lancées avant la correction.

Sources : [rôles autorisés](C:/Users/Ntmav/Desktop/voidsector_game/src/data/ships.js:196), [génération des recettes](C:/Users/Ntmav/Desktop/voidsector_game/src/data/craftingRecipes.js:380), [visibilité](C:/Users/Ntmav/Desktop/voidsector_game/src/data/craftingRecipes.js:436), [validation de fabrication](C:/Users/Ntmav/Desktop/voidsector_game/server/src/economy/crafting.js:90), [activation protégée](C:/Users/Ntmav/Desktop/voidsector_game/server/src/players/profileActions.js:604).

**A08 — Les contrats individuels récurrents ne se renouvellent pas.**

**Reporté le 23 octobre 2026 à la demande de l'utilisateur.** Le catalogue de quêtes n'est pas encore entièrement préparé ; l'utilisateur confirme que le fonctionnement actuel est attendu à ce stade. Le renouvellement sera défini plus tard. Aucune modification de gameplay de ce lot n'est engagée ; les observations suivantes restent disponibles pour cette reprise.

Le relais contient quatre journalières et cinq hebdomadaires par firme. Leur achèvement est enregistré comme un booléen permanent. Après une réussite, avancer l’horloge de huit jours laisse la réacceptation refusée : « Quete deja terminee. ». Le scénario hebdomadaire a été vérifié en conservant Premium actif.

Cela ne concerne pas les quêtes collectives de firme, qui utilisent des identifiants datés et se renouvellent réellement, ni les calendriers de connexion. En revanche, les contrats hebdomadaires du relais sont annoncés parmi les avantages Premium.

Proposition : dater les acceptations et réussites avec une période serveur, sans réinitialiser les quêtes narratives. Si leur unicité est volontaire, les renommer et les retirer de la promesse de récurrence Premium.

Sources : [catalogue](C:/Users/Ntmav/Desktop/voidsector_game/src/data/progression.js:357), [onglets du relais](C:/Users/Ntmav/Desktop/voidsector_game/src/game/ui/spawnPanel.js:100), [achèvement permanent](C:/Users/Ntmav/Desktop/voidsector_game/server/src/quests/questRewards.js:76), [refus et condition Premium](C:/Users/Ntmav/Desktop/voidsector_game/server/src/quests/questState.js:203), [véritable récurrence des quêtes de firme](C:/Users/Ntmav/Desktop/voidsector_game/server/src/firms/firmQuests.js:68).

**A09 — Les récompenses PvP ne suivent pas entièrement la règle inter-firmes et anti-répétition.**

**Corrigé et publié le 23 octobre 2026 à 13:46 sous `20261023-pvp3`.** Règles validées avec le créateur : −1 000 puis doublement à chaque récidive dans les sept jours glissants ; légitime défense et cible alliée sans malus ni récompense ; réputation négative, majoration du magasin jusqu’à +50 % et statut CIBLE à −500 000. Pour une cible ennemie : cinq gains complets, cinq à 5 %, puis aucun. Les compteurs sont liés aux comptes et protégés des doubles sockets. Détails, tests, publication et limites : `docs/PVP_REPUTATION_2026-10-23.md`. Le constat initial ci-dessous est conservé pour traçabilité.

Le plan parle de kills ennemis et les objectifs affichés de pilotes ennemis, mais le calcul ne compare pas les firmes. Il protège les membres du groupe et les niveaux inférieurs à dix. Un kill de même firme peut donc alimenter les récompenses et compteurs. Cela ne prouve pas que le tir allié doit être interdit : c’est le caractère récompensable du kill qui est incohérent avec le texte.

L’anti-répétition réduit les points de firme de 100 à 5 après les cinq premières morts quotidiennes d’une même cible. La réputation reste `niveau cible × 1 000` à chaque mort, sans utiliser cette réduction. Une cible de niveau 50 rapporte ainsi 50 000 de réputation à chaque fois. Le respawn de base est gratuit ; les joueurs doivent néanmoins se retrouver hors des zones protégées. Aucun scénario de farm n’a été joué en public ; le constat repose sur les chemins actifs et leurs conditions.

Proposition : distinguer cible attaquable et kill récompensable. Exiger une firme adverse pour les progressions inter-firmes, puis définir une politique commune de répétition pour réputation, objectifs et classement. Régulariser les comptes seulement si des journaux prouvent un abus ; cet audit ne prétend pas qu’il y en a déjà eu.

Sources : [intention documentée](C:/Users/Ntmav/Desktop/voidsector_game/FIRM_SYSTEM_REWORK_PLAN.md:17), [conditions PvP](C:/Users/Ntmav/Desktop/voidsector_game/server/src/index.js:679), [récompenses](C:/Users/Ntmav/Desktop/voidsector_game/server/src/index.js:866), [réputation](C:/Users/Ntmav/Desktop/voidsector_game/server/src/index.js:881), [réduction des points de firme](C:/Users/Ntmav/Desktop/voidsector_game/server/src/firms/firmPvp.js:12), [objectifs ennemis](C:/Users/Ntmav/Desktop/voidsector_game/server/src/firms/firmRules.js:263).

**A10 — Les skins annoncés en récompense ne sont pas enregistrés.**

**Reporté le 23 octobre 2026 à la demande de l'utilisateur.** Tous les portails seront refaits de zéro ; leurs skins et récompenses seront repris à cette occasion. Aucune attribution de skin ni modification de leur table de récompenses n'est engagée dans ce lot. Les constats initiaux ci-dessous restent ouverts pour la refonte.

Kharon annonce un tirage de skin à 33 %. Le Sanctuaire des Précurseurs annonce 50 % pour un skin ancestral, avec +20 % attaque ou bouclier selon le module. Le serveur peut sélectionner ces résultats, mais renvoie toujours `awarded:false`, `selected:true`, `pending:true`. Il n’enregistre ni skin ni droit de récupération dans le compte.

Preuve : tirages déterministes sélectionnant chacun de ces skins, puis comparaison du profil avant/après : JSON strictement identique pour cette récompense bonus. Les gains ordinaires du portail sont un traitement distinct. Le Sanctuaire est actuellement activé ; le vieux document qui le dit seulement conçu est périmé.

Proposition : activer stockage, équipement et bonus avant de promettre ces résultats. Si la livraison doit attendre, enregistrer au minimum un droit persistant, visible dans le profil, et préciser que l’effet est futur. Autre solution provisoire : retirer ces issues de la table active et annoncer les chances réelles.

Sources : [promesse Kharon](C:/Users/Ntmav/Desktop/voidsector_game/src/data/progression.js:69), [promesse Précurseurs](C:/Users/Ntmav/Desktop/voidsector_game/src/data/progression.js:181), [résultat sans attribution](C:/Users/Ntmav/Desktop/voidsector_game/server/src/portals/portalRewards.js:70).

**A11 — La fiche M-6 propose un achat impossible.**

**Corrigé et publié le 23 octobre 2026.** `20261023-m6shop1` filtre les munitions exclues de la vente, comme le magasin de combat le faisait déjà. L'utilisateur confirme une obtention par fabrication ; la vérification a révélé qu'aucune recette M-6 n'existait encore. Il définit alors la recette : **10 000 M-6 en une minute, 15 000 NOVA, 2 filaments cosmiques, 1 fragment de noyau stellaire et 4 cristaux de phase encapsulés**, après correction de son premier choix de matériaux. `20261023-m6craft1` ajoute la recette commune au client et au serveur ; `20261023-m6craft2` applique ensuite les matériaux corrigés. La remise Premium habituelle et les 43 autres recettes sont conservées. Le coût reste provisoire à la demande de l’utilisateur ; l’absence actuelle de zones de butin mythique est documentée pour la future reprise de l’équilibrage. L'achat reste interdit côté serveur. Détails, vérifications et preuves publiques : `docs/MUNITIONS_M6_2026-10-23.md`. Le constat initial est conservé ci-dessous.

La M-6 est définie avec `shop:false` et prix zéro. Le magasin ajoute néanmoins toutes les munitions, affiche « GRATUIT » et active « ACHETER ». Le catalogue de vente serveur exclut correctement la M-6 : `getAmmoPurchase("ammo_x6")` renvoie `null`. Le clic est donc refusé. L’affichage a été observé dans le jeu public sans effectuer l’achat.

Proposition : filtrer `shop:false` comme pour les autres objets ; indiquer les portails ou sources de butin si l’on souhaite garder une fiche informative.

Sources : [définition M-6](C:/Users/Ntmav/Desktop/voidsector_game/src/data/equipment.js:312), [liste du magasin](C:/Users/Ntmav/Desktop/voidsector_game/src/ui/renderShop.js:28), [bouton](C:/Users/Ntmav/Desktop/voidsector_game/src/ui/renderShop.js:496), [catalogue serveur](C:/Users/Ntmav/Desktop/voidsector_game/server/src/economy/shop.js:8). [Capture réelle de la fiche](C:/Users/Ntmav/Desktop/voidsector_game/output/audit-coherence-2026-10-22/munition-m6-bouton-achat.png).

**A12 — Une rafale d’achats de boosters peut être facturée au-delà de la quantité attribuée.**

**Corrigé et publié sous `20261023-coherence1`.** Selon la règle utilisateur : une unité par clic, 1 000 unités maximum séparément pour chaque type. Réserve vérifiée côté serveur avant paiement ; dépassements refusés sans débit, y compris les clics unitaires regroupés. Anciennes réserves supérieures conservées, achats bloqués tant qu’elles dépassent la limite. Voir `docs/GRADES_IMPERIAL_BOOSTERS_2026-10-23.md`. Constat initial ci-dessous.

Le calcul autorise une quantité par achat multipliée par les répétitions de la rafale. Le helper d’attribution réduit ensuite silencieusement la quantité à 1 000. Simulation : lot autorisé de 2 000 boosters S1 dégâts, 20 000 000 NOVA débités, 10 000 heures annoncées, 5 000 heures attribuées. Le cas est extrême mais appartient au domaine accepté par le serveur ; il commence au-delà de 1 000 unités dans un lot agrégé.

Proposition : valider une seule quantité commune au prix, à l’attribution et au message final ; fractionner ou refuser le dépassement avant débit.

Sources : [rafales](C:/Users/Ntmav/Desktop/voidsector_game/src/app/serverActionBurstQueue.js:2), [calcul du lot](C:/Users/Ntmav/Desktop/voidsector_game/server/src/economy/shop.js:173), [attribution](C:/Users/Ntmav/Desktop/voidsector_game/server/src/players/profileActions.js:147), [plafond silencieux](C:/Users/Ntmav/Desktop/voidsector_game/src/shared/firmBoosters.js:129), [durée annoncée](C:/Users/Ntmav/Desktop/voidsector_game/server/src/socket/economyHandlers.js:440).

**A13 — Le profil et le classement peuvent donner deux grades au même pilote.**

**Corrigé et publié sous `20261023-coherence1`.** Même attribution compétitive serveur utilisée par le dossier, les profils publics et le combat ; un client ne peut plus déclarer son propre insigne. Les seuils et quotas existants sont conservés et la condition de classement du grade suivant est affichée. Les 25 silhouettes d’origine ont été conservées et leur métal/relief améliorés selon la direction visuelle confirmée. Voir `docs/GRADES_IMPERIAL_BOOSTERS_2026-10-23.md`. Constat initial ci-dessous.

Le classement serveur attribue les grades supérieurs selon des quotas compétitifs. Le bandeau et le profil personnel utilisent uniquement le seuil de points via `getCurrentRank`. Ils ne reprennent pas le grade attribué par le serveur.

Preuve : trois profils synthétiques à 5 549 000 points sont respectivement Maréchal, Général d’armée et Général de corps d’armée dans le classement serveur. Le calcul utilisé par le bandeau donne Maréchal aux trois.

Proposition : fournir le grade serveur au bandeau, au profil, aux icônes et aux barres de progression. Pour les grades compétitifs, expliquer le seuil et la place requise ; une simple barre de points ne décrit pas toute la condition.

Sources : [attribution compétitive](C:/Users/Ntmav/Desktop/voidsector_game/server/src/players/leaderboard.js:40), [calcul local du grade](C:/Users/Ntmav/Desktop/voidsector_game/src/core/rankStore.js:32), [bandeau](C:/Users/Ntmav/Desktop/voidsector_game/src/ui/render.js:114), [profil](C:/Users/Ntmav/Desktop/voidsector_game/src/ui/render.js:673), [classement utilisant le grade serveur](C:/Users/Ntmav/Desktop/voidsector_game/src/ui/renderLeaderboard.js:383).

**A14 — Le pass Premium n’affiche pas partout son prix effectif.**

Avec Premium actif, le pass de trente jours est affiché à 75 000 NOVA dans la Boutique, mais à 71 250 dans le Magasin. Le débit serveur est bien 71 250, avec les 5 % de réduction. Le problème est l’affichage de la carte et de sa fiche, pas une surfacturation.

Proposition : partager le prix effectif entre les pages ; afficher éventuellement le prix de base barré et le montant de la remise.

Sources : [carte Boutique](C:/Users/Ntmav/Desktop/voidsector_game/src/ui/render.js:844), [fiche Boutique](C:/Users/Ntmav/Desktop/voidsector_game/src/ui/render.js:1029), [Magasin](C:/Users/Ntmav/Desktop/voidsector_game/src/ui/renderShop.js:83), [débit serveur](C:/Users/Ntmav/Desktop/voidsector_game/server/src/players/progression.js:106).

**A15 — Certains récits décrivent un retour dangereux qui n’existe pas dans les objectifs.**

Le cas le plus net est « Échantillions contaminé » : le texte annonce que mourir avant de rapporter l’échantillon au relais le fait perdre. La quête n’a pourtant qu’un objectif de récupération. Dès le prélèvement, le serveur verse les récompenses et retire la quête du journal. La simulation confirme notamment les 350 000 crédits immédiatement attribués, sans phase de retour.

L’autovalidation des missions ordinaires est une intention déjà documentée dans la roadmap. Il ne faut donc pas la supprimer globalement. Proposition : réécrire les récits pour les missions automatiques ; réserver un objectif explicite de rapport au relais aux missions dont le retour fait réellement partie de l’épreuve, comme cela existe déjà pour Maintenance.

Sources : [mission et condition de mort](C:/Users/Ntmav/Desktop/voidsector_game/src/data/progression.js:630), [briefing](C:/Users/Ntmav/Desktop/voidsector_game/src/data/questBriefings.js:17), [autovalidation](C:/Users/Ntmav/Desktop/voidsector_game/server/src/players/profileActions.js:676), [retrait du journal](C:/Users/Ntmav/Desktop/voidsector_game/server/src/quests/questRewards.js:78).

**A16 — La narration de Ricky suppose une étape non obligatoire.**

Un profil niveau dix n’ayant jamais accompli « Un apelle a l’aide » peut accepter « Maintenance impossible ». Ricky évoque pourtant les fluides déjà rapportés et explique les conserver. L’épisode suivant, Sauvons Deadly, possède bien son prérequis Maintenance.

Proposition : chaîner les trois épisodes, ou écrire un dialogue d’entrée alternatif si le premier doit rester facultatif. Ce point ne bloque pas mécaniquement le joueur.

Sources : [premier épisode](C:/Users/Ntmav/Desktop/voidsector_game/src/data/progression.js:637), [Maintenance sans prérequis](C:/Users/Ntmav/Desktop/voidsector_game/src/data/progression.js:764), [dialogue](C:/Users/Ntmav/Desktop/voidsector_game/src/game/ui/questNpcDialogue.js:86), [épisode suivant](C:/Users/Ntmav/Desktop/voidsector_game/src/data/progression.js:786).

**A17 — Le classement conserve un secours de démonstration incompatible avec la lecture MMO.**

Si aucune ligne serveur n’est disponible, l’interface reprend le classement local contenant des pilotes de démonstration. Le classement complet ajoute alors 493 pilotes générés et les présente comme des pilotes classés. Le branchement est confirmé dans le code actif ; il n’a pas été forcé sur le compte public. Cela concerne une absence de classement serveur, pas l’état nominal lorsque ses lignes sont reçues.

Proposition : en session MMO, conserver la dernière réponse valide ou afficher « classement en cours de chargement / indisponible ». Réserver les exemples à un mode de démonstration explicite.

Sources : [repli de la liste](C:/Users/Ntmav/Desktop/voidsector_game/src/ui/renderLeaderboard.js:88), [493 pilotes synthétiques](C:/Users/Ntmav/Desktop/voidsector_game/src/ui/renderLeaderboard.js:259), [premiers pilotes fictifs](C:/Users/Ntmav/Desktop/voidsector_game/src/data/ranks.js:59).

**A18 — Le calendrier mélange disponibilité, prochaine récompense et noms internes.**

**Reporté par décision utilisateur du 23 octobre.** Le calendrier sera refait ; le constat initial est conservé ci-dessous.

Observation publique : après réception du jour 1, le résumé indique « Récompense beta déjà réclamée aujourd’hui » et le bouton est bloqué ; la case du jour 2 dit pourtant « À réclamer ». Le calcul `isNext` ne tient pas compte de `canClaim`. Certaines récompenses utilisent également « Munition M-4 » dans leur titre et « AMMO X4 » dans la quantité détaillée.

Proposition : afficher « Demain » ou « Suivant » tant que la récompense ne peut pas être réclamée, et utiliser partout le nom public de l’objet. L’attribution quotidienne elle-même n’est pas mise en cause. Le serveur est en CET/CEST, comme le joueur en France ; aucune panne de calendrier due à UTC n’a été retenue.

Sources : [état du calendrier](C:/Users/Ntmav/Desktop/voidsector_game/src/data/premium.js:168), [case suivante](C:/Users/Ntmav/Desktop/voidsector_game/src/ui/render.js:879), [noms internes](C:/Users/Ntmav/Desktop/voidsector_game/src/ui/render.js:802).

**Décisions de contenu et d’économie à trancher.**

Ces points sont vérifiés mais ne doivent pas être présentés comme des régressions ou des choix de design forcément mauvais.

1. **Fragments sans usage après déverrouillage.** Les fragments ouvrent définitivement un portail, dont les tentatives suivantes sont gratuites. Le Space Caster continue pourtant de vendre des chances de fragments de ce même portail : après une victoire, sa condition les maintient indéfiniment. Simulation Azuron : 100 NOVA dépensés et un fragment inutilisable ajouté. Je privilégierais, si l’accès permanent est conservé, de retirer ces fragments des tirages et d’indiquer « portail assemblé ». Les supprimer ne doit pas réduire secrètement la valeur attendue du tirage : annoncer la table restante. Autres options à décider : coût par tentative ou seconde utilisation des surplus. Sources : [déverrouillage permanent](C:/Users/Ntmav/Desktop/voidsector_game/server/src/players/progressionActions.js:154), [éligibilité au tirage](C:/Users/Ntmav/Desktop/voidsector_game/server/src/economy/spaceCaster.js:28).

2. **Drone ancestral annoncé, noyau futur livré.** Le Nexus annonce un drone ancestral à 33 %, mais livre un `ancestral_drone_core`, classé `slotType:"future"`. L’objet est bien conservé, contrairement aux skins A10, mais aucune utilisation serveur n’a été trouvée. Proposition immédiate : annoncer « Noyau de drone ancestral — usage futur ». Terminer le drone est une tâche de contenu distincte. Sources : [annonce](C:/Users/Ntmav/Desktop/voidsector_game/src/data/progression.js:160), [objet effectivement livré](C:/Users/Ntmav/Desktop/voidsector_game/server/src/portals/portalRewards.js:37), [définition future](C:/Users/Ntmav/Desktop/voidsector_game/src/data/equipment.js:131).

3. **Plafond réel de progression : niveau 50.** Huit portails de progression sont activés. Le Cœur de l’Éternel reste désactivé, et le prestige exige les neuf. Un profil niveau 50 ayant terminé les huit reçoit « Manquants : Le Cœur de l’Éternel ». L’ascension et les niveaux 51–100 sont donc inaccessibles dans le parcours normal actuel. Cela peut être une limite volontaire de bêta. Il faut l’annoncer clairement et traiter Éternel comme contenu restant à produire ; débloquer le prestige sans ce portail serait une modification du design. Sources : [Éternel indisponible](C:/Users/Ntmav/Desktop/voidsector_game/server/src/portals/portalDefinitions.js:174), [conditions du prestige](C:/Users/Ntmav/Desktop/voidsector_game/server/src/players/progressionActions.js:175), [plafond](C:/Users/Ntmav/Desktop/voidsector_game/server/src/players/progression.js:6).

4. **Packs bêta payants dans le texte, gratuits dans l’action.** Les tarifs de soutien de 0,99 / 2,99 / 9,99 € sont affichés, mais « Activer pack bêta » attribue le contenu directement sans preuve de paiement, avec un prix serveur nul. Des droits pour le lancement officiel sont également créés. Aucun argent n’a été dépensé ni achat public effectué pendant cet audit. Si ce fonctionnement sert les tests, afficher explicitement « gratuit pendant les tests » et séparer ces activations des achats réellement payés et de leurs droits futurs. Sources : [activation proposée](C:/Users/Ntmav/Desktop/voidsector_game/src/ui/render.js:1015), [achat à zéro](C:/Users/Ntmav/Desktop/voidsector_game/server/src/economy/shop.js:230), [attribution et droits futurs](C:/Users/Ntmav/Desktop/voidsector_game/server/src/players/profileActions.js:384).

5. **Les plus gros packs de monnaie ne donnent pas le meilleur rendement.** 75 000 NOVA coûtent 24,99 €, alors que 35 000 + 35 000 + 5 000 coûtent 23,97 € pour la même quantité. Même cas pour les crédits ; le palier 15 000 est aussi légèrement moins intéressant que trois fois 5 000. Les prix viennent du plan de conception et les paiements de ces offres sont actuellement désactivés. Proposition : vérifier toute la grille en quantité par euro avant d’activer la vente et rendre explicite l’avantage des grands lots. Source : [tarifs](C:/Users/Ntmav/Desktop/voidsector_game/src/data/premium.js:209).

6. **L’accompagnement par les quêtes s’arrête bien avant la progression annoncée.** Le catalogue compte 40 familles par firme, soit 160 quêtes, mais aucune quête individuelle ne demande un niveau supérieur à 22. La présence de portails 25–50 ne remplace pas forcément cette progression guidée. La récompense de 3 000 000 XP de Sauvons Deadly fait, à elle seule, passer un niveau 10 à XP zéro au niveau 13 avec 4 000 XP restantes. Ce n’est pas une preuve de déséquilibre sans mesurer la durée et la difficulté de la mission. Proposition : dresser une progression niveau → secteur → équipement → contrat → portail et mesurer le temps réel entre les paliers avant de changer prix ou XP. Sources : [Sauvons Deadly](C:/Users/Ntmav/Desktop/voidsector_game/src/data/progression.js:791), [courbe XP](C:/Users/Ntmav/Desktop/voidsector_game/src/data/xpCurve.js:13).

**Ordre de correction proposé.**

| Lot | Travail concret | Condition de validation |
| --- | --- | --- |
| 1 — Débloquer les parcours | A01 tutoriel quatre firmes ; A02 contrats/journal ; A03 fabrication ; A06 sortie de groupe/portail | Un nouveau joueur peut poursuivre ; une quête ou sortie devenue impossible ne condamne pas le compte ; migration ciblée des états déjà bloqués |
| 2 — Fiabiliser les coûts et effets | A04 drones ; A05 compétences ; A07 Impérial ; A09 récompenses PvP ; A12 boosters | Le serveur calcule possession, coût et effet depuis son profil ; débit et attribution correspondent ; reconnexion conserve le résultat |
| 3 — Aligner les promesses | A08 récurrence ; A10 skins ; A11 M-6 ; A13–A18 prix, grades, textes et états | Tout effet et gain annoncé existe, chaque condition affichée correspond à la règle active |
| 4 — Compléter puis équilibrer | Décisions fragments, noyau ancestral, Éternel, packs bêta et progression après 22 | Choix de design écrits ; mesures de parties réelles ; catalogue, interface et serveur reprennent la même règle |

Pour les lots 1 et 2, prévoir des régressions qui croisent les systèmes : achat pendant fabrication, changement de groupe pendant portail, tutoriel dans une autre firme, état client périmé pendant un achat, niveau/capacité avec compétences. Les tests actuels isolés ne suffisent pas à couvrir ces interactions. Éviter de multiplier des tests qui répètent simplement les valeurs du catalogue.

**Ce qui est déjà cohérent dans les vérifications effectuées.**

- Prix et quantités des équipements et munitions achetables concordent entre catalogue et serveur, hors M-6.
- Les contenus affichés des trois packs bêta correspondent aux attributions codées ; leur statut commercial reste la décision exposée plus haut.
- Les probabilités du Space Caster totalisent 100 % et les fragments annoncés à 4 % ont bien ce poids. Le problème concerne leur utilité après ouverture du portail.
- La remise Premium et l’accélération des transferts de raffinerie existent dans les chemins serveur.
- Les quêtes collectives de firme se renouvellent ; il ne faut pas leur appliquer le diagnostic A08 du relais individuel.
- Les 160 quêtes contrôlées ne possèdent pas de référence manquante vers les objets de récompense, munitions, matériaux, vaisseaux, cartes ou prérequis d’objectifs. Une référence valide ne garantit toutefois pas que l’ennemi apparaît réellement dans la zone.
- Les restrictions d’achat et d’activation de l’Impérial fonctionnent ; c’est la voie de fabrication qui manque de contrôle.
- Aucun asset statique littéral manquant n’a été détecté dans les références JS examinées. Cela ne couvre pas toutes les URLs construites dynamiquement.
- Aucune erreur console n’a été relevée pendant les écrans publics consultés. Cela ne certifie pas toutes les situations de combat.

**Documentation et continuité.** Le README décrit encore une publication Vercel et un ancien état du projet. La référence des portails de juillet présente le Sanctuaire comme seulement conçu alors que son gameplay est activé. Git contient de nombreux changements antérieurs à cet audit ; les commits de tête consultés datent de juin. Il faut donc documenter la version réellement en production et enregistrer les changements par lots maîtrisés, sans faire un commit global aveugle du dossier. Les retouches visuelles d’Hélion-01 actuellement traitées dans l’autre chat ne sont pas comptées ici comme un défaut de gameplay.

**Limites précises.** Aucune partie intégrale n’a été jouée jusqu’au niveau 50, aucun portail n’a été gagné en production pour tester ses récompenses, aucune charge de cinquante joueurs ni restauration de base n’a été lancée. Les simulations démontrent les règles et blocages décrits ; elles ne permettent pas de juger seules le ressenti du combat, le rythme des gains ou la difficulté des boss. Ces sujets demandent une session jouée et des mesures après les corrections de cohérence.

Commandes de validation déjà exécutées : `node --test` dans `server/`, puis `node --test` sur les huit fichiers `*.test.js` trouvés sous `src/`. Le journal de la suite serveur est conservé avec les pièces de l’audit.
