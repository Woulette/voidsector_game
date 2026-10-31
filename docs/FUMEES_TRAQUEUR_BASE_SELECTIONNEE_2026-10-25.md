# Fumées et base sélectionnée du Traqueur — 25 octobre 2026

## Publication de la fumée

Lot frontend `20261025-enemy-smoke3` publié à **15 h 19 Europe/Paris** sur `https://avosoma.absyrion.com/`.

Le joueur précise d'abord que l'augmentation visait les ennemis, puis conserve la nouvelle fumée de son vaisseau en demandant une légère diminution. Cette dernière correction prévaut : la fumée du joueur est conservée, avec environ 9 % de largeur et d'opacité en moins par rapport à `20261025-smoke-volume2`. Les jets et tuyères ne changent pas.

Les sillages des Orbes, Voraks et Parasites, communs et boss, gagnent environ un tiers de largeur, une matière plus claire et une densité plus soutenue. Le nombre de particules, leurs positions historiques, les fréquences d'émission et les durées sont conservés. La fumée continue de suivre les déplacements réels et de s'évaporer à l'arrêt.

Le lot contient uniquement `shipEngineWake.js`, `orbWake.js`, `vorakWake.js`, `parasiteWake.js` et l'index avec les versions de cache. Il remplace l'augmentation du joueur publiée à 15 h 03 dans `20261025-smoke-volume2`.

- 71 tests réussis sur un candidat isolé issu d'une capture fraîche de production ; 351 modules et 899 imports vérifiés.
- Contrôle navigateur des moteurs natifs sur Helion-03 et du Parasite natif en mouvement. Aucune erreur ni alerte console observée. Scènes de démonstration sans compte MMO connecté.
- 5 empreintes publiques conformes, 218 cibles d'importmap en HTTP 200, entrées `game.js`, styles et `/health` public vérifiés.
- 560 fichiers hors lot et 13 gardes préservés ; PID `2458909` et `NRestarts=0` conservés, aucun redémarrage serveur. PostgreSQL sain, aucun avertissement depuis la publication.
- Après installation, 48 scénarios natifs de boucle/réception/interpolation des trois familles et le contrôle des neuf vaisseaux réussissent sur les modules installés, en mémoire, sans modifier les données persistantes.

Sauvegarde : `/opt/avosoma-backups/20261025-enemy-smoke3-20261025T141952Z`.

Preuves : `output/enemy-smoke-player-balance-release-2026-10-25/`, notamment `manifest.json`, `candidate-validation.json`, `candidate-tests.txt`, `deployment-result.json`, `public-verification.json`, `installed-loop-proof.json`, `post-check.json`, `player-native-balanced.png` et `enemy-native-smoke.png`.

Les clients déjà ouverts doivent recharger le jeu pour charger les nouvelles versions.

## Traqueur abyssal — proposition locale uniquement

Le joueur écarte la proposition à pinces et le robot à quatre pattes au rendu cartoon, puis sélectionne finalement l'illustration bleue d'origine en demandant une rotation de 180°. La proposition active repart exclusivement de cette dernière base : coque centrale pointue, métal bleu sombre et acier, fenêtres cyan et six appendices périphériques.

Image dérivée avec l'outil intégré `image_gen`, alpha conservé : `assets/enemies/abyssal-tracker-v4/tracker-source.png`. Instruction complète : `assets/enemies/abyssal-tracker-v4/prompt.txt`. La source est déjà tournée à 180° ; le renderer compense une seule fois l'ancien décalage de l'asset. Le corps garde son orientation fixe.

`tools/vfx-lab/tracker/` porte la pose périphérique, l'éclairage au tir et une brume froide basée sur les positions réelles. Le noyau reste ancré et les six membres ont des phases distinctes. L'atelier charge cette image séparément ; le catalogue du jeu conserve son image et ses statistiques actuelles. Le boss Traqueur n'est pas refait.

Les anciennes propositions restent des essais écartés. Aucune illustration ni animation du nouveau Traqueur n'est incluse dans le lot public de fumée.

Huit tests locaux de pose, racines, orientation et émission à 30/60/120/144/240 Hz réussissent. Syntaxe de sept modules vérifiée, alpha transparent contrôlé, captures navigateur aux tailles normale et ×3 et au flash de tir, sans erreur console. Les empreintes du catalogue, de l'orientation et de la poursuite serveur correspondent au début de l'intervention. La bombe à la mort reste rayon 100, ralentissement de 50 % pendant 5 secondes.

Aperçu : `http://127.0.0.1:8765/tools/vfx-lab/?mode=enemies&subject=cuirasse_nebulaire&scenario=showcase&view=macro&revision=tracker-selected-4`.

Preuves : `output/abyssal-tracker-2026-10-25/`, notamment `validation.json`, `tests.txt`, `guards-before.json`, `tracker-selected-wide.png`, `tracker-selected-final.png` et `browser-warnings.json`.
