# Boss Traqueur publié et première base de l’Éclanite — 25 octobre 2026

> Suite : l’Éclanite décrit ici comme proposition locale a ensuite été validé et publié à 19 h 19 Paris, lot `20261025-eclanite-visual1`. Voir `ECLANITE_PUBLICATION_ET_ATTAQUES_2026-10-25.md` pour le raccordement natif et les preuves publiques.

## Boss Traqueur validé et publié

Le joueur valide la variante du boss. Le lot frontend **`20261025-tracker-boss1r2` est publié à 18 h 48 Europe/Paris**, le 25 octobre, sur `https://avosoma.absyrion.com/`.

Le profil natif du boss utilise l’illustration bleue validée : épaules blindées, crête superposée et lames segmentées. Il partage le renderer, les arcs électriques et la brume du commun. Le facteur `.94` et le gabarit natif de 126 restent conservés. Son horloge cosmétique `.83` ralentit uniquement les mouvements du corps et les arcs : positions, émission de brume et impulsions de tir gardent leur temps réel. La source étant déjà tournée de 180°, son décalage d’asset devient zéro ; le boss conserve son orientation fixe.

Les statistiques, la poursuite échantillonnée et la bombe à la mort restent identiques : rayon 100, ralentissement de 50 % pendant 5 secondes. Le commun et les fumées précédemment validées sont conservés.

L’overlay comprend six fichiers : `trackerVisuals.js`, `trackerSprite.js`, le chemin d’image du boss dans `enemies.js`, sa compensation d’image dans `enemyVisuals.js`, son PNG et l’index publié en dernier. L’atelier reprend maintenant le profil natif, sans appliquer deux fois le ralentissement visuel.

La première préparation a rencontré un index modifié par une publication concurrente. Le contrôle a bloqué avant toute écriture des fichiers du jeu. Le candidat `r2` a été reconstruit sur la production fraîche et conserve cette autre publication.

### Vérifications de publication

- 150 tests réussis sur le candidat isolé ; 363 modules frontend et 932 imports résolus ; 570 fichiers de runtime hors modification conservés dans le candidat.
- Six empreintes publiques conformes, 231 cibles d’importmap en HTTP 200 ; `game.js`, styles et `/health` publics conformes.
- 572 fichiers hors lot et 21 gardes vérifiés pendant l’installation ; aucun backend modifié ou redémarré.
- PID 2510150 et `NRestarts=0` conservés ; PostgreSQL sain et aucun nouvel avertissement.
- Après installation, 16 scénarios de boucle/réception/interpolation Tracker, 16 Parasite et le contrôle des neuf vaisseaux passent sur les modules installés, en mémoire, sans modification persistante.
- Contrôle visuel du vrai renderer sur le candidat local ; aucune partie MMO authentifiée revendiquée.

Sauvegarde : `/opt/avosoma-backups/20261025-tracker-boss1r2-20261025T174812Z`.

Preuves : `output/tracker-boss-release-2026-10-25-r2/` : `manifest.json`, `candidate-validation.json`, `candidate-tests.txt`, `deployment-result.json`, `public-verification.json`, `installed-loop-proof.json`, `post-check.json` et `whitespace-validation.json`. Capture du rendu natif : `output/tracker-boss-release-2026-10-25/boss-native.png`. Le premier dossier conserve aussi la préparation interrompue par le changement concurrent d’index.

Recharger le jeu pour charger les nouveaux assets.

## Éclanite commun — proposition locale

Première nouvelle base violette pour le prochain monstre demandé par le joueur : noyau minéral irrégulier, six fragments détachés de tailles différentes et fissures lumineuses. Le noyau reste fixe ; les fragments flottent et pivotent légèrement, avec six fréquences et phases distinctes et une activité qui varie lentement. Ils se rapprochent avant le tir puis s’écartent brièvement ; les fissures et le noyau s’éclairent.

Le renderer local isole les sept pièces par leurs composantes alpha, une fois par image, puis les anime séparément. Il prend entièrement en charge le corps dans la colonne proposition, sans superposer les anciens éclats ambiants. La colonne actuel garde le rendu du jeu comme référence.

La poussière suit les positions réelles. Sa libération irrégulière derrière le groupe de cristaux, sa dérive latérale et quelques grains triangulaires évitent deux rails de réacteurs. Les nuages grossissent puis disparaissent en 1,2 à 1,7 seconde ; 64 particules maximum. L’historique garde les virages, cesse d’émettre à l’arrêt et se vide sur une téléportation.

Le catalogue natif de l’Éclanite reste inchangé : 82 × 82, rayon 35, vitesse 240, délai d’attaque 1 s et vitesse du projectile 560. Son orientation reste fixe et sa poursuite conserve son délai serveur. Les tirs de l’atelier restent une démonstration simulée. Cette base n’est pas publiée et attend l’examen du joueur.

Illustration générée avec l’outil intégré `image_gen`, à partir de l’ancien Éclanite : `assets/enemies/eclanite-rig-v1/eclanite-source.png`. Prompt : `assets/enemies/eclanite-rig-v1/prompt.txt`. Animation : `tools/vfx-lab/eclanite/{motion,renderer,wake}.js`.

### Vérifications locales

- Huit tests : indépendance et continuité des six fragments, charge/flash, orientation et gabarit, émission à 30/60/120/144/240 Hz avec positions répétées à 60 Hz, conservation des virages, arrêt et téléportation.
- Syntaxe de six modules contrôlée ; huit empreintes du catalogue, orientation, poursuite/attaques serveur, fumée joueur et renderer/profil Tracker préservées.
- Comparaison navigateur en taille normale et ×3, patrouille et tirs, capture du flash mis en pause puis reprise de l’animation ; aucune erreur ou alerte console.

Aperçu : `http://127.0.0.1:8765/tools/vfx-lab/?mode=enemies&subject=eclanite&scenario=patrol&view=macro&revision=eclanite-rig-1`.

Preuves : `output/eclanite-rig-2026-10-25/`, notamment `validation.json`, `guards-before.json`, `guards-after.json`, `motion-tests.txt`, `browser-warnings.json`, `patrol-macro.png`, `patrol-wide.png` et `attack-flash-paused.png`.
