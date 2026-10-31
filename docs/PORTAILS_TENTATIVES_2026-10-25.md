# Portails à fragments — tentatives payées et fin d’Azuron

Publié le **25 octobre 2026 à 13 h 17, heure de Paris**, version `20261025-portal-attempts1`.

## Règles actives

- La règle s’applique aux **neuf portails à fragments**. Ricky/Deadly conserve son fonctionnement par clé ; les restrictions de disponibilité des futurs contenus restent actives.
- Réunir la quantité complète de fragments et assembler le portail crée **une tentative inutilisée**. Les fragments sont consommés à l’assemblage. Un seul exemplaire assemblé par type peut être stocké.
- L’invocation consomme cette tentative et crée un portail personnel avec **trois vies**. Un seul portail peut être invoqué par compte, tous types confondus. L’assemblage invoque automatiquement lorsqu’aucune tentative n’est en cours, comme auparavant.
- Pendant une tentative, le joueur peut réunir les fragments et assembler la suivante. Cette réserve ne permet aucune seconde invocation simultanée. À la victoire ou à la troisième mort, le portail courant disparaît ; une tentative déjà assemblée reste disponible pour l’invocation suivante. Un échec propre au scénario, par exemple la destruction de la station de Nox, termine aussi sa tentative.
- La sortie intermédiaire d’Azuron conserve la série et les vies restantes de **la même tentative**. Depuis le complément de 14 h 49 (`20261025-azuron-death1`), une mort dans Azuron renvoie automatiquement dehors sans question de résurrection. La reprise repart du début de la série sauvegardée, avec les créneaux vides des vagues nettoyées et uniquement les ennemis survivants. Dans les autres portails, le choix de sortie après une mort conserve aussi la tentative. Reprendre ne dépense jamais l’exemplaire assemblé suivant. Voir [AZURON_MORT_REPRISE_2026-10-25.md](AZURON_MORT_REPRISE_2026-10-25.md).
- Une victoire ne donne plus d’accès gratuit permanent. Les victoires, compétences, recettes et autres déblocages de progression déjà obtenus restent conservés.

## Récompenses et délais

La victoire d’Azuron ajoute **1 000 000 crédits, 100 000 XP et 10 000 réputation**, ainsi que les récompenses existantes : 10 000 NOVA, 10 000 munitions X4 et Laser MK-IV garanti au premier nettoyage puis 25 %. La réputation provient du calcul serveur sur les 100 000 XP, sans seconde attribution additionnelle.

Les gains sont attribués et sauvegardés à la victoire. Leur notification de fin apparaît **sept secondes après** le dernier ennemi, y compris si le joueur prend la sortie pendant ce délai. Le dossier Portails affiche les cinq récompenses numériques.

La porte de sortie d’Azuron lance l’animation commune et attend **quatre secondes** avant le changement de carte. Le serveur mesure aussi ce délai et revalide l’état et la proximité du joueur. Une requête de changement de carte envoyée directement par le client ne peut pas anticiper la sortie. Les portes entre séries, la cadence de quinze secondes, le rayon fixe de 2 000 unités et le décor publié plus tôt restent en place.

## Sauvegarde et migration

`src/shared/portalAttempts.js` normalise la tentative ; `server/src/portals/portalAttempts.js` porte invocation, reprise, fin et sauvegarde. Les profils conservent `portalAttemptsVersion: 1` et une unique `portalAttempt` protégée côté serveur. `unlockedPortals` représente désormais les exemplaires assemblés non consommés.

L’invocation écrit ensemble la consommation de l’exemplaire, l’identifiant de tentative et le portail préparé. Les vies sont sauvegardées. Une ancienne entrée préparée ou une épreuve sauvegardée est préservée comme tentative en cours. Un ancien déverrouillage payé et jamais joué conserve un exemplaire ; un déverrouillage permanent déjà gagné sans épreuve en cours n’est pas converti en accès gratuit. La migration ne se répète pas après enregistrement de la version.

La fin de l’ancienne arène est distinguée d’une nouvelle tentative éventuellement invoquée depuis le lanceur : sortir ou mourir dans l’arène déjà gagnée ne consomme pas cette nouvelle réserve.

## Vérifications

- **891 tests ciblés réussis**, sans exclusion, sur candidat de staging puis sources effectivement déployées. Couverture : les neuf types de fragments, file d’attente, invocation concurrente refusée, vies, profils protégés, migration, sauvegardes, récompense unique, sortie contrôlée par le serveur et annulation si le pilote s’éloigne.
- Parcours Socket.IO complets en WebSocket et polling sur les 30 vagues avec horloge de jeu accélérée. Le délai de sortie est contrôlé à 3 999 puis 4 000 ms ; la notification est absente à 6 999 ms et présente à 7 000 ms.
- Navigateur avec copie isolée du serveur et compte local : sortie animée mesurée à **4 020 ms**, retour dans la même tentative, assemblage suivant pendant une invocation, gain puis consommation d’une nouvelle tentative, absence d’invocation gratuite à 0/15. Les crédits, XP et réputation ont été vus dans le popup après environ sept secondes ; la fiche montre les cinq gains. La victoire est déclenchée avec un bouton QA dans cette copie : ce contrôle n’est ni un run gagné normalement, ni une partie authentifiée sur le MMO public. Aucun profil public n’a été modifié pour la QA.
- Suite complète locale : **2 035 réussites sur 2 036**, un échec préexistant `ship-detail-live-stats.test.js` sur `/Vie actuelle/`, reproduit avec les sources antérieures à cette tâche. Ce module est extérieur à la livraison. Syntaxe et `git diff --check` du périmètre validés.

Captures et rapports : `output/azuron-attempts-2026-10-25/`, notamment `browser-rewards-dossier-detail.png`, `browser-exit-animation.png`, `browser-before-reward.png`, `browser-reward-after-delay.png`, `baseline-ship-detail.log` et `verification.json`.

## Publication

**28 fichiers livrés**, **18 empreintes publiques HTTPS** conformes, contrôle de **552 empreintes** dont **524 fichiers préservés**. Les modifications locales et publiques concurrentes sont conservées ; seuls les changements de cette tâche ont été reportés sur la base publique fraîche. Tests et outils QA sont exclus du payload.

Sauvegarde des sources et de PostgreSQL avant modification : `/opt/avosoma-backups/20261025-portal-attempts1-121726`, dont `postgres-before.dump`. Dépendances partagées installées avant redémarrage, `index.html` publié en dernier. `avosoma-beta.service` actif au contrôle, PID **2362785**, `NRestarts=0`, PostgreSQL prêt et aucune erreur du nouveau processus. Résultats complets : `deploy-result.json`, `verify-result.json`, `manifest.json` et `source-guards.json` dans le dossier de preuves.
