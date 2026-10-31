# Réacteurs plus volumineux et boss Parasite — 25 octobre 2026

Le joueur valide à 100 % le Parasite commun et demande sa variante boss. Il demande aussi davantage de volume et de contraste pour la fumée des vaisseaux, trop peu visible devant les décors. Cette étape est **locale, sans publication**.

## Fumée des vaisseaux

`src/game/render/shipEngineWake.js` conserve l'historique de mouvement, la fréquence d'émission, les durées et les sorties des réacteurs existants. Le ruban additif fin est remplacé par des nuages irréguliers, qui s'élargissent avec l'âge puis s'effacent. Au milieu de leur durée de vie, leur largeur vaut environ 3,1 fois la largeur d'émission, contre 1,85 pour l'ancien ruban. Un corps teinté en composition normale conserve du contraste sur les décors clairs, avec un cœur doux en composition écran pour l'espace sombre.

Deux textures de 96 × 96 sont mises en cache par teinte. Un numéro par événement d'émission, commun aux tuyères, permet de dessiner un nuage sur deux sans supprimer la fumée de certaines sorties. Le rendu reste borné à 72 dessins de texture par tuyère. Les teintes des vaisseaux, flammes, positions des moteurs et courbure des jets restent celles déjà validées.

L'atelier réexporte le même module de fumée que le jeu. Deux modules de comparaison figent uniquement l'ancien rendu ; ils ne sont pas chargés par le jeu. Le sélecteur « Décor » permet de comparer sur Helion-01, Helion-03 et l'espace sombre, avec les mêmes réacteurs et la même caméra dans les deux panneaux. Les scènes viennent des définitions actuelles et utilisent `drawWorldLayer`, sans les marqueurs de gameplay. La caméra de démonstration reste dans un voisinage de la zone choisie. Le cache de la fumée est actualisé dans les deux index locaux.

## Boss Parasite

Nouvelle illustration dérivée du commun validé, produite via l'outil intégré `image_gen` et conservée sans retouche dans `assets/enemies/parasite-boss-v1/parasite-source.png`. Le prompt exact est dans `ART_PROMPT.md` à côté.

Le boss conserve six tentacules, le noyau vert et la brume du commun. Les racines sont légèrement plus épaisses, la carapace plus renforcée et les veines un peu plus présentes. Les valeurs natives de 104 contre 86, avec le même facteur de dessin 0,94, donnent un gabarit environ 20,9 % plus grand. Aucun agrandissement supplémentaire ni nouvel appendice.

`tools/vfx-lab/parasite/profiles.js` sépare les deux illustrations, le découpage du noyau et les réglages cosmétiques. Le commun garde exactement ses paramètres antérieurs : racine 0,192, noyau 0,207, souplesse et lumière à 1. Les six tentacules du boss partagent le même système d'animation, avec des racines ancrées et des pointes indépendantes. Le corps suit son angle existant ; aucune rotation automatique ajoutée.

Le boss est comparé au commun validé à gauche. Le PNG commun, le catalogue des ennemis et les règles d'orientation sont inchangés par empreinte SHA-256. Aucun code serveur, vitesse, collision, poursuite, poison, cadence ou projectile modifié. Cette famille Parasite reste pour le moment dans l'atelier.

## Vérification

- **74 tests ciblés réussis** : 7 fumée des vaisseaux, 16 Parasite, 16 Vorak, 6 Orbe, 18 poursuite et 11 régressions VFX existantes.
- Fumée : émission identique à 30/60/120/144/240 Hz sur trois tuyères, expansion, virage conservé, arrêt, expiration complète, compositions adaptées au décor, budget et historique non muté par le dessin.
- Parasite : mêmes paramètres communs, gabarit natif et orientation, racines du boss ancrées, six pointes souples, brume avec positions simulées à 60 Hz et rendu jusqu'à 240 Hz.
- Syntaxe vérifiée sur 11 modules. Contrôles navigateur sur décor clair, poussières et espace sombre, Orion, Helion Titan et Asterion ; virages, arrêt et disparition de la fumée. Boss en ×1/×3, poursuite et vol avec tirs ; capture pendant « Éclat du noyau ». Aucun avertissement ou erreur console observé sur les deux comparaisons finales.

Preuves : `output/ship-smoke-volume-2026-10-25/` et `output/parasite-boss-2026-10-25/`, dont `tests.txt`.

Comparaisons locales :

- `/tools/vfx-lab/?mode=engines&subject=orion&motion=turn&decor=helion3&revision=parasite-boss-smoke-1`
- `/tools/vfx-lab/?mode=enemies&subject=boss_chasseur_spectral&scenario=showcase&view=macro&revision=parasite-boss-smoke-1&surface=shield`
