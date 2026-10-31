# Vorak rusher commun — base animée et points lumineux

Proposition du 25 octobre 2026, ensuite **validée et publiée avec le boss à 13 h 25 (Paris)** dans `20261025-vorak-family1` ; voir `VORAK_PUBLICATION_2026-10-25.md`. Le joueur valide la silhouette dans son ensemble puis demande davantage de points lumineux.

Retour suivant du joueur : la version avec les sept lampes est validée. La variante boss mesurée est décrite dans `VORAK_BOSS_VARIANTE_2026-10-25.md`.

## Direction retenue

Petit intercepteur rouge et anthracite, coque effilée, deux ailes courtes sur charnières et deux réacteurs arrière physiques. Le boss Vorak sera travaillé séparément. Le PNG transparent est conservé dans `assets/enemies/vorak-rusher-v1/vorak-source.png` avec le prompt exact `ART_PROMPT.md`, généré avec l’outil intégré `image_gen`.

Le dessin utilise 75 unités pour une entité de 120 : la silhouette visible occupe environ 69 × 63 unités à l’échelle ×1. Le noyau rond imposant de l’ancienne illustration est remplacé par une coque d’intercepteur.

## Animation et éclairage

- Le corps garde l’angle existant du monstre ; seule l’articulation des deux ailes reçoit une faible animation locale, accentuée à la préparation du tir.
- Le canon avant s’illumine brièvement au départ du tir, avec un léger recul cosmétique. La coque n’est pas agrandie pendant l’attaque.
- Deux jets texturés partent des deux vraies tuyères. La vapeur gris chaud reste dans les coordonnées de la scène quand le monstre tourne, puis se dilate et s’évapore. Un arrêt coupe progressivement les jets sans supprimer brutalement la fumée déjà émise.
- Après le retour du joueur : sept repères lumineux blancs chauds entourés de rouge, quatre sur les ailes et trois sur la coque. Ils restent visibles hors attaque, avec une modulation discrète ; les quatre éclairages des ailes suivent leurs charnières.

`tools/vfx-lab/vorak/motion.js` définit les poses et les montages ; `wake.js` gère l’historique borné de vapeur ; `renderer.js` prépare les couches de la nouvelle illustration, les ailes, les moteurs et les lampes. Le chemin `raider_astral` de `creatures.js` remplace les anciennes animations locales, sans les empiler. Les autres monstres utilisent leurs chemins précédents.

Les statistiques, dimensions de l’entité, collisions, logique de poursuite, délais d’observation et projectiles restent ceux du jeu. La nouvelle illustration n’est pas raccordée au catalogue du runtime. L’atelier conserve sa simulation comparative et ne constitue pas une partie MMO authentifiée.

## Vérification

Commande : `node --test tools/vfx-lab/vorak/motion.test.js tools/vfx-lab/orb/motion.test.js server/test/enemy-pursuit.test.js` : **33 tests réussis**. Les neuf nouveaux scénarios contrôlent le gabarit, les montages arrière, l’absence d’attaque inventée, l’émission avec une simulation à 60 Hz et un dessin à 30/60/120/144/240 Hz, l’arrêt, les virages et les téléportations. La densité de vapeur est échantillonnée à cadence fixe pour éviter une variation sur les écrans à 144 Hz.

Syntaxe vérifiée des modules modifiés. Inspection de l’atelier en vue d’ensemble et gros plan, poursuite et combat ; aucune erreur ou alerte console observée. Le PNG est RGBA avec transparence réelle.

Captures : `output/vorak-rusher-2026-10-25/vorak-lights-wide.png` et `vorak-lights-macro.png`. La seconde montre les sept lampes ajoutées après le retour du joueur.

Ouvrir `/tools/vfx-lab/?mode=enemies&subject=raider_astral&scenario=pursuit&view=macro&revision=vorak-lights-2&surface=shield` ; la proposition se trouve à droite.
