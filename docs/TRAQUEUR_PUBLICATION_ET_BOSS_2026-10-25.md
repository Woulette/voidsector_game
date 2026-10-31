# Traqueur publié et variante boss — 25 octobre 2026

> Suite : le boss a ensuite été validé et publié à 18 h 48 Paris, lot `20261025-tracker-boss1r2`. Voir `BOSS_TRAQUEUR_PUBLICATION_ET_ECLANITE_2026-10-25.md`. La section « proposition locale » ci-dessous décrit l’étape antérieure à cette validation.

## Publication du commun et des tentacules des Parasites

Lot frontend **`20261025-tracker-parasite1` publié à 15 h 51 Europe/Paris** sur `https://avosoma.absyrion.com/`, sur demande explicite du joueur.

Le Traqueur commun sélectionné est raccordé au rendu natif : illustration bleue v4 tournée à 180°, appendices articulés, brume froide issue des déplacements réels et arcs intermittents renforcés par le pulse de tir reçu. L'adaptateur `enemyTracker.js` conserve les états cosmétiques dans une WeakMap et prend les impulsions d'attaque reçues. Les anciens effets de corps et d'attente ne se superposent plus à ce commun. Le catalogue et le préchargement utilisent son illustration validée.

Les modules `trackerMotion.js`, `trackerWake.js`, `trackerElectricity.js`, `trackerSprite.js`, `enemyArticulatedSprite.js` et les profils `trackerVisuals.js` sont partagés avec l'atelier, qui les réexporte. La source étant déjà tournée de 180°, le décalage d'asset du commun devient zéro dans les vues du jeu et les icônes ; son orientation reste fixe. Le boss actuel conserve son ancien asset et son ancien décalage de rotation jusqu'à validation de sa nouvelle forme.

Les trois modules de mouvement/rendu des Parasites et le nouveau `parasiteTentacles.js` sont également installés. Commun et boss gardent les racines attachées, le noyau stable et leurs règles, avec des tentacules plus amples et des activités indépendantes.

Le lot comprend **17 fichiers** : neuf nouveaux modules/assets, sept fichiers existants et l'index publié en dernier. Aucun backend n'est modifié ou redémarré. Le catalogue ne diffère de la capture de production que par le chemin de l'image du Traqueur commun. Les quatre fumées précédemment publiées restent identiques.

### Vérifications

- **141 tests réussis** sur un candidat isolé issu de la production fraîche : natif du Traqueur, attaques reçues, objets figés, boucle à pas fixe/réception/interpolation à 30/60/120/144/240 Hz et limites FPS, Parasites, autres sillages, neuf vaisseaux, poursuite, bombe ralentissante et affichage hors écran.
- 359 modules frontend et 922 imports résolus ; syntaxe et espaces contrôlés.
- Contrôle navigateur du candidat avec le renderer natif du Traqueur, sans compte MMO connecté. Pas de session de jeu authentifiée revendiquée.
- 17 empreintes publiques conformes, 226 cibles d'importmap en HTTP 200, `game.js`, styles et `/health` public vérifiés.
- 557 fichiers hors lot et 15 gardes préservés pendant la publication. PID **2510150** conservé, `NRestarts=0`, PostgreSQL sain et aucun avertissement depuis la publication.
- Après installation, huit scénarios natifs de boucle/réception/interpolation du Traqueur, seize des Parasites et le contrôle des neuf vaisseaux réussissent sur les modules installés, en mémoire et sans modifier les données persistantes.

Sauvegarde : `/opt/avosoma-backups/20261025-tracker-parasite1-20261025T145145Z`.

Preuves : `output/tracker-parasite-release-2026-10-25/`, notamment `manifest.json`, `candidate-validation.json`, `candidate-tests.txt`, `deployment-result.json`, `public-verification.json`, `installed-loop-proof.json`, `post-check.json`, `whitespace-validation.json` et `tracker-native.png`.

Les clients déjà ouverts doivent recharger le jeu pour charger les nouvelles versions.

## Boss Traqueur — proposition locale

Le joueur demande une forme un peu différente, tout en reconnaissant la famille. La nouvelle illustration conserve la coque pointue bleue, les deux fenêtres cyan et les six appendices. Deux épaules blindées, une crête à plaques superposées, des évents cyan et des lames segmentées à petits ergots la distinguent du commun.

Le boss garde le gabarit de son catalogue, 126 contre 106 pour le commun, avec le même facteur visuel `.94`. `tools/vfx-lab/tracker/boss.js` utilise le renderer partagé avec un profil local, un angle fixe zéro pour la nouvelle source déjà tournée et une horloge visuelle à `.83` pour des gestes plus lourds. Les positions, le temps réel d'émission de brume et l'âge du tir restent conservés. Les arcs et la fumée suivent le même système que le commun.

La nouvelle illustration et son adaptateur restent exclusivement dans l'atelier. Ils ne sont pas dans le lot de production. Le profil natif `trackerVisuals.js` ne déclare que le commun, et le boss du jeu conserve son ancien visuel.

Image obtenue par l'outil intégré `image_gen` : `assets/enemies/abyssal-tracker-boss-v1/tracker-source.png`. Prompt complet : `assets/enemies/abyssal-tracker-boss-v1/prompt.txt`.

Vingt empreintes des fichiers publiés, du catalogue, des règles serveur et de la fumée joueur sont préservées pendant cet essai. Quatre contrôles de syntaxe, alpha transparent, comparaison navigateur en taille normale et ×3, avec déplacement et attaque, sans erreur console. La poursuite et la bombe à la mort restent rayon 100, vitesse réduite de 50 % pendant cinq secondes.

Aperçu : `http://127.0.0.1:8765/tools/vfx-lab/?mode=enemies&subject=boss_cuirasse_nebulaire&scenario=patrol&view=macro&revision=tracker-boss-1`.

Preuves : `output/abyssal-tracker-boss-2026-10-25/`, notamment `guards-before.json`, `validation.json`, `boss-final.png`, `boss-comparison-wide.png`, `boss-comparison-macro.png` et `browser-warnings.json`.

L'Éclanite est l'étape suivante annoncée par le joueur ; aucune modification de cette espèce dans cette intervention.
