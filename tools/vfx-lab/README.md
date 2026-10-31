# Atelier des effets — recherche visuelle du 24 octobre 2026

L'atelier reste une scène locale de contrôle, sans compte et sans connexion MMO. La première version des effets a été intégrée au jeu public dans `20261024-vfx1` : voir `docs/VFX_REACTEURS_MOBS_2026-10-24.md`. Les deux Orbes sont publiés dans `20261025-orb-family1`, et les deux Voraks validés dans `20261025-vorak-family1` à 13 h 25 (Paris). Les autres refontes de corps décrites ci-dessous restent locales.

## Publication des Voraks validés

Les modules `vorak/` réexportent les sources partagées du jeu : `combatData/vorakVisuals.js`, `render/vorakMotion.js`, `vorakWake.js`, `vorakSprite.js`. Le raccordement du jeu lit les vrais tirs et conserve son état cosmétique hors des entités serveur. Les anciennes animations de corps ne sont plus superposées aux deux Voraks. Statistiques, collision, poursuite et projectiles restent identiques. 87 tests du candidat et 16 scénarios sur les modules installés passent ; treize empreintes publiques et 209 cibles d’importmap sont vérifiées. Détails : `docs/VORAK_PUBLICATION_2026-10-25.md`.

## Parasite commun — nouvelle proposition locale

Après publication des Voraks, la reprise passe au Parasite commun : six tentacules souples et indépendants, noyau stable, flash vert du noyau et des veines au tir, brume organique avec quelques spores qui se dissipe. Les vrais pixels des tentacules se déforment en dix bandes par membre, avec un retard dans le déplacement. Gabarit courant, règles et poison conservés. La variante boss viendra après examen de cette première base.

Ouvrir `/tools/vfx-lab/?mode=enemies&subject=chasseur_spectral&scenario=pursuit&view=macro&revision=parasite-rig-1&surface=shield`. Seule la colonne droite utilise cette nouvelle illustration et les modules dédiés `parasite/` ; aucun raccordement au jeu public. 49 tests ciblés passent, contrôle navigateur en ×1/×3 et du flash vert au tir. Détails : `docs/PARASITE_COMMUN_BASE_ANIMEE_2026-10-25.md`.

## Boss Vorak — variante locale mesurée du 25 octobre

Le commun avec ses sept lumières est désormais validé. Sa variante boss renforce les épaules et le blindage, ajoute deux petits éclairages et reste environ 20 % plus présente à l’écran. Les deux ailes et les deux moteurs sont conservés, avec une articulation plus retenue et la même vapeur qui s’évapore. Les profils sont séparés dans `vorak/profiles.js`, avec une illustration propre dans `assets/enemies/vorak-boss-v1/`.

Ouvrir `/tools/vfx-lab/?mode=enemies&subject=boss_raider_astral&scenario=pursuit&view=macro&revision=vorak-boss-1&surface=shield`. À gauche : le commun validé, référence de gabarit. À droite : le boss validé, désormais publié avec le commun. Les autres sélections retrouvent leur comparaison habituelle. Le boss conserve son orientation fixe existante. La conception locale avait 40 tests ciblés réussis ; publication vérifiée : `docs/VORAK_PUBLICATION_2026-10-25.md`.

## Vorak commun — proposition locale du 25 octobre

La silhouette de l’intercepteur rouge et anthracite est validée dans son ensemble ; le joueur demande ensuite plus de points lumineux puis valide cette nouvelle version. Nouvelle illustration séparée, deux ailes courtes articulées, canon avant lumineux et deux moteurs arrière avec vapeur qui se dissipe. Sept repères blancs chauds et rouges éclairent maintenant les ailes et la coque même hors attaque. Le gabarit reste celui d’un monstre courant. La variante boss est décrite ci-dessus.

Ouvrir `/tools/vfx-lab/?mode=enemies&subject=raider_astral&scenario=pursuit&view=macro&revision=vorak-lights-2&surface=shield`. La colonne de droite utilise les modules partagés réexportés dans `vorak/` et l’illustration `assets/enemies/vorak-rusher-v1/vorak-source.png`. Cette base validée est publiée avec le boss ; voir `docs/VORAK_PUBLICATION_2026-10-25.md`. Conception initiale : `docs/VORAK_RUSHER_REFONTE_2026-10-25.md`.

## Choix du 25 octobre : Orbe commun et boss distincts

Correctif de fumée publié à 12 h 42, `20261025-orb-wake1` : l'émission fonctionne aussi lorsque le jeu dessine plus vite que sa simulation à 60 Hz. La forme validée reste identique. Seize scénarios de cadence et d'interpolation passent sur les modules installés ; détails : `docs/ORBE_TRAINEE_CADENCE_2026-10-25.md`.

Le joueur valide le modèle à huit branches pour le **boss Orbe**, sa silhouette étant trop imposante pour le premier monstre du jeu. Son illustration reste exactement `assets/enemies/orb-rig-v1/orb-source.png` ; le boss la reprend avec le même rendu animé, au gabarit propre au boss.

Un nouvel **Orbe commun** reprend la famille argent et bleu avec six petites pattes, une silhouette compacte et un éclairage plus discret. Son illustration est dans `assets/enemies/orb-scout-v1/orb-source.png`, avec le prompt conservé à côté. Les deux modèles gardent le noyau stable, la rotation lente puis accélérée et l'éclat au tir. Le module de fumée validé reste inchangé et sert aux deux.

- Orbe commun : `/tools/vfx-lab/?mode=enemies&subject=drone_pirate&scenario=showcase&view=detail&revision=orb-family-2`.
- Boss Orbe : `/tools/vfx-lab/?mode=enemies&subject=boss_drone_pirate&scenario=showcase&view=detail&revision=orb-family-2`.

Le même sélecteur permet de passer de l'un à l'autre. Publication le 25 octobre à 12 h 15 (Paris), `20261025-orb-family1`. Les modules de pose, fumée et dessin sont partagés avec le jeu depuis `src/game/render/orbMotion.js`, `orbWake.js` et `orbSprite.js` ; les fichiers `orb/` de l'atelier les réexportent. Les profils sont dans `src/game/combatData/orbVisuals.js`. Le raccordement au jeu gère l'état cosmétique séparément des données serveur et réagit aux vrais tirs. Statistiques, collision et délais de poursuite conservés. 73 tests ciblés sur la copie de production, douze empreintes publiques conformes et service sans redémarrage. Détails : `docs/ORBE_PUBLICATION_2026-10-25.md`.

## Première base animée du 24 octobre : désormais attribuée au boss

La reprise commence désormais par l'Orbe, avant le Vorak, le Parasite, le Traqueur et l'Éclanite. Cette étape concerne uniquement l'Orbe dans l'atelier local : son nouveau visuel n'est pas encore intégré au MMO public.

Ouvrir `/tools/vfx-lab/?mode=enemies&subject=drone_pirate&scenario=showcase&view=macro&revision=orb-rig-1`. La nouvelle illustration argent et bleu possède huit branches séparées qui tournent autour d'un noyau stable. Une rotation lente est interrompue par une relance de 171° en 1,05 seconde, sans remise à zéro de l'angle. Le noyau charge puis s'illumine au départ du tir. Deux émissions de vapeur suivent la direction réelle du déplacement et s'évaporent en 1,15 à 1,8 seconde ; les nuages déjà émis gardent leur position dans le monde lors d'un virage.

Les modules `orb/motion.js`, `orb/wake.js` et `orb/renderer.js` isolent ces trois responsabilités. Le nouveau rendu remplace entièrement les anciennes animations de corps et de sillage pour l'Orbe. L'illustration et son prompt sont conservés dans `assets/enemies/orb-rig-v1/` ; le sprite du jeu reste intact.

« Vol et tirs · démonstration » permet d'observer les effets en mouvement avec la patrouille simulée existante. Les vues ×1, ×2 et ×3 et le ralenti sont disponibles, avec le même cadrage dans les deux colonnes. Les situations de combat et poursuite gardent les fonctions et délais existants. Le projectile reste une boule bleue. Le bouclier du joueur utilise le maillage hexagonal validé et n'apparaît qu'à l'impact dans cette démonstration.

Contrôles : 23 tests ciblés réussis (animation, sillage, poursuite existante), syntaxe et inspection navigateur des rotations, du tir et de la vue d'ensemble. Détails : `docs/ORBE_REFONTE_BASE_ANIMEE_2026-10-24.md`.

La prochaine recherche X6 est reportée à la demande du joueur : couleur orange, impulsions plus lisibles et visuel distinct des X1–X4. Cette étape n'apporte aucun changement au X6.

## Proposition précédente : cinq monstres

La colonne de gauche utilise le rendu intégré. La colonne de droite remplace entièrement l'animation du corps et les effets ambiants pour l'Orbe, le Vorak, le Parasite, le Traqueur et la Cuirasse ambre. Elle ne superpose donc plus l'ancien balancement ni le grossissement au tir aux nouveaux effets. Les autres espèces et les boss gardent le rendu intégré et sont signalés comme restant à retravailler.

- Parasite : déformation des vrais tentacules du sprite, extrémités souples avec retard dans le déplacement, noyau stable, masque des parties vertes qui s'illumine au tir, brume et spores qui se dissipent.
- Orbe : charge du noyau, éclat bleu au tir et sillage de sustentation pendant le déplacement.
- Vorak : deux sorties de propulsion texturées, sillage rouge bref et éclat rouge localisé sur la coque.
- Traqueur : animation des pinces, circuits bleus au tir et sillage électrique, sans changer son orientation fixe.
- Cuirasse : deux moteurs orange aux sorties de la coque, sillage plus persistant et éclaircissement des zones chaudes au tir.

`creatures.js` compose les profils, `creatureRig.js` gère la déformation du sprite et son émission lumineuse, et `creatureWake.js` conserve l'historique borné des émissions dans les coordonnées de la scène. Un virage ne réoriente pas les traces déjà émises. Un arrêt coupe l'émission ; les anciennes traces finissent de disparaître. La vitesse visuelle est mesurée sur la position réelle dans la scène, afin qu'une limite de l'arène ne crée pas de propulsion fictive.

Le cadrage « Détail du monstre ×2 » suit le monstre avec le même agrandissement dans les deux colonnes. « Vue d'ensemble » montre le duel complet. Le ralenti est maintenant disponible pour les monstres aussi. Les deux colonnes continuent à utiliser les mêmes fonctions et délais de poursuite existants ; aucun changement des règles serveur, de la vitesse, des dégâts ou de la bombe n'est inclus dans cette proposition.

## X6 B retenu et impacts temporaires

Choix suivant publié à 21 h 01 : `20261024-shield-assigned1`. Le joueur reçoit le maillage hexagonal, les ennemis la membrane réfractive. L'atelier `/tools/vfx-lab/shields.html?revision=shield-assigned-1` montre ces deux attributions en utilisant les mêmes formes que le jeu. Le coup fatal sans bouclier est conservé. Détails : `docs/VFX_BOUCLIERS_ATTRIBUTION_2026-10-24.md`.

Correctif suivant publié à 20 h 41 : `20261024-shield-lethal1`. Un coup qui tue le monstre n'affiche aucune réaction de bouclier, même s'il en possédait encore. Trois nouveaux styles sont proposés uniquement dans `/tools/vfx-lab/shields.html?revision=shield-proposals-3` : membrane réfractive, maillage hexagonal et champ magnétique. La page permet de comparer le même tir et de vérifier le cas « Détruit en un coup ». Voir `docs/VFX_BOUCLIERS_VARIANTES_2026-10-24.md`.

Le X6 B « Filaments croisés » est publié dans `20261024-shield-x6b1` à 20 h 24 (Paris). Les deux colonnes utilisent ce rendu partagé : quatre impulsions noires et blanches de 120 ms, espacées de 90 ms, depuis l'avant et ses deux côtés. La salve complète dure 390 ms ; sa recharge reste de trois secondes. Les X1–X4 conservent leurs deux passages de 200 ms et leur longueur 130. Les correctifs de lancement rapproché de `20261024-laser-input1` sont conservés.

En mode « Bouclier actif », la protection n'apparaît qu'à la réception d'un tir : bref contour bleu, éclair au contact et onde qui se dissipe. Aucun cercle permanent n'est dessiné sur la cible ennemie. En mode « Sans bouclier · coque », le tir atteint directement le corps ; un flash et des étincelles disparaissent sans laisser de fissure ni de brûlure. La couche de marques persistantes ajoutée précédemment a été retirée du rendu.

Le jeu lit la valeur du bouclier avant les dégâts, fournie par le serveur, y compris pour un coup qui le vide. L'atelier force l'état choisi dans son sélecteur et emploie la même géométrie et le même rendu temporaire. Les règles de dégâts restent inchangées. Détails : `docs/VFX_BOUCLIER_X6_B_2026-10-24.md`.

## Version déjà intégrée

Ouvrir `/tools/vfx-lab/` depuis un serveur statique lancé à la racine du dépôt. Ne pas confondre ce contrôle avec une session MMO authentifiée.

- Neuf vaisseaux et 24 sorties de moteurs : plasma animé visible, courbure en virage, historique du sillage et dissipation après arrêt. Le sélecteur « À l'arrêt » conserve le sillage déjà émis jusqu'à son évaporation ; le cycle complet recommence la démonstration.
- Dix munitions : roquettes, missiles et lasers, dont la M-6 blanc et noir à quatre passages visuels rapides toutes les trois secondes. Le ralenti aide à distinguer les départs.
- Quatorze monstres et boss dans le catalogue : petits effets autour du corps, filaments, braises, motes, arcs et éclats dans le rendu intégré `entities.js`. L'Éclanite garde son orientation fixe.
- Les anciennes trajectoires proposées ont été retirées. Les deux colonnes utilisent désormais les mêmes fonctions pures de poursuite existantes ; leur délai de 800 à 1 500 ms reste inchangé. Les situations de combat, poursuite et patrouille sont illustratives.
- Traqueur : sa capacité publiée est une bombe à la mort, rayon 100, ralentissement de 50 % pendant 5 secondes. La scène de comparaison montre le corps et les projectiles, sans simuler une mort de compte joueur.

Les phases de tir de cet atelier restent simulées. La cadence réelle, les dégâts, les consommations et la bombe sont contrôlés par le serveur dans le jeu publié. Aucun calcul de dégâts ou de consommation n'est ajouté par les quatre animations M-6.

La texture de plasma est un atlas WebP de 256 × 256 px ; les sources et consignes de génération sont dans `assets/GENERATION.md`.

Vérifications de publication : 295 tests ciblés, syntaxe, 14 cycles visuels de monstres et boss, empreintes des 27 fichiers installés et des 20 ressources publiques, service, base et journaux. Voir le rapport lié pour les limites exactes des contrôles.
