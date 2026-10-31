# Fabrication — récupération des chantiers bloqués (A03)

Le cas corrigé est l'acquisition d'un vaisseau ou d'une formation pendant sa fabrication, ainsi que l'atteinte de la limite de drones. Le refus « déjà possédé » conservait le chantier et bloquait toutes les fabrications suivantes.

## Comportement

Une fabrication devenue redondante peut être clôturée depuis le chantier avec **Clôturer et rembourser**, sans attendre la fin du minuteur. Le serveur conserve les possessions acquises, rend le coût de fabrication et libère le chantier. Les objets et munitions dont plusieurs exemplaires sont autorisés restent récupérables normalement : posséder déjà un laser n'annule pas sa fabrication.

Chaque nouvelle fabrication enregistre un identifiant et un reçu `paidCosts` serveur : matériaux, crédits, NOVA et mode de paiement effectivement débité. Le reçu survit aux sauvegardes et rechargements. Le remboursement reprend ces valeurs, y compris une remise Premium passée, sans recalculer un prix ou une remise au moment de la clôture.

L'effacement du chantier et le remboursement font partie de la même sauvegarde de profil. Une deuxième récupération est refusée ; un échec d'écriture restaure le chantier et les soldes. Le client envoie seulement l'action de récupération et ne peut injecter ni montant ni reçu par `profile:save`. Une activité « Fabrication remboursée » est conservée.

Les chantiers déjà redondants sont réparés et persistés au chargement du serveur, y compris pour les joueurs hors ligne. La réparation ne touche pas les autres fabrications. Une réparation financière non sauvegardée est restaurée avant de continuer ; les profils suivants ne sont pas modifiés à l'avance.

**Compatibilité historique.** Les anciens chantiers ne contiennent pas le paiement réellement débité. Pour leurs sorties uniques à paiement fixe, une compensation unique utilise le barème nominal de la recette serveur (matériaux, crédits et NOVA). Une ancienne remise NOVA n'est donc pas reconstructible exactement. Aucune monnaie n'est inventée pour une ancienne recette offrant un choix de paiement ; un reçu présent mais invalide est refusé au lieu d'être remplacé par une supposition. L'inventaire de production avant publication compte zéro fabrication en cours et zéro chantier bloqué : cette compensation historique n'a pas été nécessaire sur les profils présents.

## Organisation

- `server/src/economy/craftingJobs.js` : normalisation commune des chantiers et reçus.
- `server/src/economy/craftingRecovery.js` : validation de redondance, remboursement et activité.
- `crafting.js` : enregistre le reçu au lancement et coordonne récupération/remboursement.
- `profileSanitize.js` : préserve le reçu, sans mutation financière pendant une normalisation.
- `profiles.js` : applique et persiste la réparation des chantiers anciens au chargement.
- `src/data/craftingRecipes.js` : raison de redondance partagée par client et serveur.
- `spawnPanel.js`, `economyHandlers.js`, `serverEventController.js` : bouton, réponse sauvegardée et message de remboursement.

## Vérification

1 266 tests serveur et 40 tests client réussis, dont 18 tests nouveaux couvrant les quatre firmes, les trois types de blocage, le paiement réellement débité avec Premium, les objets répétables, les anciens chantiers, la persistance hors ligne, les échecs de sauvegarde et les données client falsifiées.

Parcours réel dans le navigateur local isolé : lancer le Valkyrie, l'acheter au magasin, constater le bouton de remboursement, clôturer, contrôler les quatre stocks revenus à 1 000, conserver un seul Valkyrie et les 500 000 crédits dépensés au magasin, puis lancer le Razorion. Après rechargement, le nouveau reçu et l'unique remboursement sont conservés. Le second parcours Razorion valide l'affichage final et l'absence de chevauchement entre titre et coûts. Deux erreurs internes Electron sont présentes dans le navigateur de test ; aucune erreur applicative n'a été observée. Les comptes de production n'ont pas servi à ces scénarios.

Preuves : `output/crafting-recovery-2026-10-22/` (captures, données serveur isolées, résultats de tests et paquet). Les onglets créés et les serveurs locaux 3317/3318 ont été fermés après vérification.

## Publication

Publié le **22 octobre 2026 à 21:44:36 (Paris)** sous `20261022-crafting1`. Les 12 fichiers installés ont été contrôlés sur le serveur ; les 6 contenus frontend correspondent aux réponses HTTPS publiques. Le navigateur public charge les nouveaux modules et styles sans erreur, avec une seule URL du client réseau conservée. Serveur actif, PostgreSQL prêt, capacité 50, PID 2856426, NRestarts=0 après redémarrage contrôlé.

Sauvegarde du code : `/opt/avosoma-backups/20261022-crafting1`. Inventaire privé des chantiers : `/opt/avosoma-account-backups/20261022-crafting1.json` (0600). Zéro fabrication et zéro chantier bloqué au déploiement ; aucune compensation de profil n'a été nécessaire.

Une extraction du relais de quêtes, en cours dans l'autre chat, touchait simultanément `spawnPanel.js`. Le paquet est construit à partir de sa version LIVE avec uniquement les sept retouches de fabrication examinées : il n'inclut ni n'écrase cette refonte locale. Le fichier local conserve les deux travaux. Les 37 tests de fabrication ont également été exécutés contre une copie isolée du paquet réellement déployé : tous réussis.

Archive SHA-256 : `0750cb5643320856045df3876c07fd2c04a536242a00a4511021353110f1c34e`. Preuves supplémentaires : `deployment-log.txt`, `public-verification.json`, `public-browser.json`, `staged-crafting-tests.txt` dans le dossier de vérification.
