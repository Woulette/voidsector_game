# Azuron — arène agrandie et reprise par séries

Mort et reprise corrigées à **14 h 49**, `20261025-azuron-death1` : chaque mort renvoie automatiquement dehors sans choix de résurrection ; la même tentative conserve la série et les ennemis éliminés. Les vagues déjà nettoyées gardent leurs chronos et restent vides. Détails et preuves : [AZURON_MORT_REPRISE_2026-10-25.md](AZURON_MORT_REPRISE_2026-10-25.md).

Correction visuelle publiée à **13 h 54**, `20261025-azuron-blue1` : portails existants réutilisés pour continuer et sortir, nouveau fond de nébuleuse bleue et mini-carte assortie. Le décor industriel décrit dans l’historique ci-dessous est remplacé. Voir [AZURON_BLEU_2026-10-25.md](AZURON_BLEU_2026-10-25.md).

Complément publié à **13 h 17**, `20261025-portal-attempts1` : tentative payée à chaque nouvelle épreuve, gains crédits/XP/réputation, notification à sept secondes et sortie animée de quatre secondes. Les règles actuelles et les preuves sont dans [PORTAILS_TENTATIVES_2026-10-25.md](PORTAILS_TENTATIVES_2026-10-25.md).

Publié le 25 octobre 2026 à 12 h 32, heure de Paris, version `20261025-azuron2`. Cette livraison remplace le calendrier et les apparitions de `20261024-azuron1`.

## Règles actives

- Arène de **7 800 × 5 400 unités**, entrée au centre `(0, 0)`.
- Apparitions sur un cercle de **2 000 unités autour du centre fixe**, quelle que soit la position du joueur. La première vague de chaque série apparaît immédiatement ; les quatre suivantes arrivent à +15, +30, +45 et +60 secondes, même si des ennemis précédents vivent encore.
- Six séries de cinq vagues, 30 vagues et 250 ennemis au total. Les familles, les statistiques de niveau 10 et les récompenses restent celles de la livraison précédente. La poursuite garde son placement à 150–160 unités du pilote arrêté.
- Les deux portes s’ouvrent après l’élimination du dernier survivant de la série. Aucune minuterie ne lance la série suivante.
- À gauche du point d’entrée, porte cyan `(-360, 0)` : continuer les cinq vagues suivantes. À droite, porte ambrée `(360, 0)` : sortir en conservant la progression et les vies restantes. Approcher, puis cliquer à portée ou appuyer sur **J**. Le serveur vérifie une distance de 170 unités.
- La sortie prépare une entrée personnelle sur la carte de départ de la firme. Cette entrée reprend directement la série sauvegardée ; elle conserve les PV et le bouclier lors de la sortie. Après la vague 30 nettoyée, seule la sortie est proposée ; une nouvelle épreuve exige un nouvel exemplaire payé en fragments et invoqué.
- Le profil conserve l’identifiant d’épreuve, le prochain début de série, les vies et les ennemis déjà récompensés dans une série interrompue. Une reconnexion à l’instance existante garde son état ; après un redémarrage, la série peut être reconstruite sans redonner les gains des ennemis déjà éliminés. Les trois vies épuisées terminent la reprise. Depuis le complément de 14 h 49, toute mort dans Azuron renvoie automatiquement à la base sans question ; reprendre le même portail rejoue le calendrier de la série sauvegardée, avec uniquement les survivants.

## Décor et modules

Nouvelle composition industrielle bleu sombre et cuivre : grand anneau métallique brisé, centre creux, balises cyan et débris en parallaxe. Le PNG transparent créé avec `imagegen` est `assets/maps/decor/azuron-salvage-v1/salvage-ring.png` ; provenance et prompt dans `output/azuron-checkpoints-2026-10-25/imagegen-prompt.md`. Le prototype violet historique reste une proposition indépendante.

`src/data/azuronPortal.js` partage géométrie, calendrier et portes. `server/src/portals/azuronPortal.js` gère les vagues et la projection publique de leur objectif. `server/src/portals/azuronJourney.js` attend la sauvegarde avant les transitions, prépare le retour et contrôle les interactions. Le checkpoint protégé et les reçus de gains passent par `src/shared/azuronProgress.js` et les mutations de profil existantes ; les gains et leur reçu sont écrits dans le même profil. Les limites de déplacement et le tick serveur utilisent la nouvelle géométrie.

Le client utilise `combatData/azuronArena.js` et `render/azuronGate.js`. Les commandes passent par Socket.IO ; `portal:paused` applique la position de retour autoritaire et vide l’ancienne scène d’instance. Le HUD affiche « PORTES OUVERTES AU CENTRE ». Le mode local conserve son chemin de sortie historique.

## Vérifications et limites

- **827 tests ciblés sur 827**, sans tests ignorés, sur candidat local, staging distant et sources effectivement déployées. Couverture : autres portails, profils, mutations, quêtes, combat, vies, limites de carte et déplacements en arrière-plan.
- Parcours Socket.IO réels en WebSocket et polling : préparation, cinq portes de continuation, sortie après la vague 5 et retour à la vague 6, 30 vagues, 250 gains d’ennemi, récompense finale unique et isolement d’un spectateur. Le test accélère les minuteries de jeu sans changer l’horloge réseau.
- Persistance testée avec le vrai gestionnaire de profils et un stockage isolé : retour après redémarrage, vies conservées, éliminations partielles, refus d’un checkpoint forgé, refus des gains répétés, sauvegarde en échec et reprise après rétablissement.
- Navigateur relié à une copie isolée du serveur avec son propre compte : cadence observée à 15 secondes, cumul jusqu’à 50 ennemis, portes ouvertes après nettoyage, sortie avec J à droite, retour par l’entrée extérieure à la vague 6, puis continuation avec J à gauche vers la vague 11. Les pertes de vie et la fin des trois vies ont aussi été observées. Console sans erreur ni avertissement. Le bouton QA élimine les survivants uniquement dans cette copie : ce n’est pas un run gagné normalement ni une partie authentifiée sur le MMO public. Capture : `output/azuron-checkpoints-2026-10-25/browser-continuation.png`.
- Suite complète du workspace : **2 004 réussites sur 2 009** ; les cinq échecs restants (quatre assertions de décor Helion-03 et une de fiche vaisseau) sont reproduits sur la copie des sources antérieures à cette tâche. Rapports `full-server-tests.log` et `baseline-unrelated-tests.log`. Ces fichiers ne font pas partie de la livraison.
- Syntaxe de tous les modules livrés et `git diff --check` vérifiés. Le packaging exclut données, comptes QA, tests et outils de déploiement.

## Preuves de publication

29 fichiers livrés, dont un nouveau PNG ; 15 empreintes publiques HTTPS conformes. Contrôle de 550 empreintes, dont 521 fichiers conservés. Le premier contrôle a détecté une publication concurrente de `orbVisuals.js` et de l’index ; le candidat a été reconstruit sur cette nouvelle base avant la livraison.

`index.html` publié en dernier, après les dépendances serveur et le redémarrage. `avosoma-beta.service` actif, PID **2314836**, `NRestarts=0` ; PostgreSQL prêt, santé serveur correcte, aucune erreur du nouveau processus au contrôle. Les accès publics contrôlés correspondent aux empreintes du candidat.

Sauvegarde : `/opt/avosoma-backups/20261025-azuron2-113236`. Manifestes, archives, résultats et copie des sources antérieures : `output/azuron-checkpoints-2026-10-25/`, notamment `deploy-result.json`, `verify-result.json`, `manifest.json` et `source-guards.json`. Aucun profil public modifié pour la vérification.
