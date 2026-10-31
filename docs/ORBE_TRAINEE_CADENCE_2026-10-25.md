# Traînée des Orbes : correction de cadence — 25 octobre 2026

Le joueur ne voyait pas la fumée des Orbes en jeu, alors qu'elle était visible dans la démonstration. L'effet était bien publié. Le défaut a été reproduit sur une copie fraîche du runtime public avant modification.

## Cause confirmée

`combatLoop` simule les positions à 60 Hz et peut dessiner à 120, 144 ou 240 Hz. Entre deux mises à jour, plusieurs images réutilisent la même position. `advanceOrbWake` effaçait son compteur fractionnaire dès qu'une image ne comportait aucun déplacement. À fréquence élevée, le seuil d'émission n'était jamais atteint. Les validations précédentes n'avaient pas couvert les deux horloges distinctes du jeu.

Avec la vraie boucle publiée, trois secondes de mouvement à 60 unités/seconde produisaient 136 ou 138 nuages à 30/60 Hz et **zéro** à 120/144/240 Hz. Les nouveaux scénarios utilisant aussi les paquets serveur et l'interpolation échouaient dans huit cas sur seize avec la version publique antérieure.

## Correctif

Seul le timing d'émission de `src/game/render/orbWake.js` change. Les images sans nouveau déplacement conservent la fraction d'émission ; la vitesse et les naissances de nuages utilisent l'intervalle complet entre deux positions différentes. Un arrêt réel continue à couper les émissions, puis les anciens nuages disparaissent. Le retour d'un onglet masqué et les téléportations conservent leur protection existante.

Texture, couleurs, opacité, taille, dissipation, dérive et borne de 88 nuages restent identiques. Le facteur visuel de l'Orbe commun reste à 0,66 (+10 %). Aucun changement du boss, de la poursuite, des collisions, des dégâts ni des délais de réaction.

## Vérifications et publication

- Après correction, le même scénario de trois secondes émet 138 nuages à chacune des fréquences 30/60/120/144/240 Hz.
- Seize tests de régression utilisent `createCombatLoop`, les paquets construits par `publicEnemy`, leur réception par `replaceServerEnemies`, `syncServerControlledEnemies` et le vrai `drawEnemies`. Ils couvrent l'Orbe commun et son boss à cinq fréquences, ainsi que les limites de 60/120 FPS sur des rafraîchissements supérieurs. Les nuages sont réellement dessinés, restent bornés et disparaissent après l'arrêt du monstre.
- **48 tests réussis sur le candidat public**, dont ces seize cas, la poursuite existante, le raccordement du renderer et les contrôles du runtime client. Les douze tests de pose/fumée et de rendu de base ont également été validés localement avant la composition.
- Les seize scénarios ont ensuite été relancés sur les **modules installés en production**, sans échec. Paquets et horloges simulés dans un processus isolé ; aucun compte ou état persistant réel modifié et aucune session MMO authentifiée revendiquée.
- Publication `20261025-orb-wake1` à **12 h 42 Europe/Paris** : deux fichiers (fumée et index de cache), deux empreintes publiques concordantes, 199 cibles d'importmap HTTP 200 et douze gardes de règles vérifiées.
- Une mise à jour concurrente de l'index a arrêté la première tentative avant écriture. L'index frais a été repris en conservant les ajouts Azuron ; 546 fichiers hors correctif sont restés identiques pendant l'installation.
- Service actif, PID **2314836** inchangé pendant cette publication, `NRestarts=0`, PostgreSQL sain et aucun nouvel avertissement. Aucun fichier serveur installé ni redémarrage.

Sauvegarde : `/opt/avosoma-backups/20261025-orb-wake1-20261025T114233Z`.

Preuves : `output/orb-wake-fix-2026-10-25/` contient reproduction avant/après, tests en échec avant correction, tests du candidat, manifeste, diff, reprise d'index, vérifications de publication et tests des modules installés. Recharger le jeu charge l'URL corrigée de la fumée.
