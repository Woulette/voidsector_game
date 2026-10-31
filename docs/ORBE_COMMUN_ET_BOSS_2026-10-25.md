# Orbe commun et boss — 25 octobre 2026

Les deux modèles ont ensuite été intégrés au jeu et publiés le 25 octobre à 12 h 15 (Paris), version `20261025-orb-family1`. Le compte rendu ci-dessous décrit la proposition initiale ; voir `ORBE_PUBLICATION_2026-10-25.md` pour le raccordement au runtime et les preuves de publication.

Le joueur valide la qualité du modèle précédent et sa fumée, mais souhaite réserver son allure imposante au boss Orbe. Il demande un nouvel Orbe commun de la même famille avec de petites pattes tournant autour du noyau.

## Résultat local

- `boss_drone_pirate` reprend l'illustration à huit branches déjà validée, sans la modifier : `assets/enemies/orb-rig-v1/orb-source.png`. Le gabarit du boss existant est de 120 unités, avec un dessin sur 90 unités avant les marges transparentes.
- `drone_pirate` reçoit une nouvelle illustration, à six pattes plus courtes et coque compacte. Palette bleue, argent et bleu gris cohérente avec le boss, silhouette proche de l'ancien premier monstre. Le dessin est ajusté aux marges transparentes de la nouvelle source pour une envergure d'environ 48 unités sur son cadre de 92 ; la luminosité ajoutée est atténuée par rapport au boss.
- Les deux modèles conservent un noyau stable, des pattes tournant lentement puis accélérant ponctuellement, une charge du noyau avant le tir et un éclat au départ de la boule bleue. Les anciennes animations de corps ne sont pas superposées à ces rendus.
- La fumée validée est conservée : `orb/wake.js` n'a pas été modifié. Même émission derrière le mouvement réel, nuages conservant leurs coordonnées après un virage et disparition progressive après l'arrêt.

Les règles, collisions, statistiques, dégâts, cadences et délais d'IA existants sont conservés. Ce sont deux rendus dans l'atelier local, sans publication ni modification du runtime du jeu dans cette étape. Le X6 et les autres monstres ne sont pas retravaillés ici.

## Illustration et organisation

Le nouveau PNG transparent est généré avec l'outil imagegen intégré, à partir du modèle validé et de l'ancien Orbe commun. Il est copié sans retouche dans `assets/enemies/orb-scout-v1/orb-source.png` ; le prompt final est conservé dans `assets/enemies/orb-scout-v1/ART_PROMPT.md`. La source de génération reste également conservée.

`tools/vfx-lab/orb/profiles.js` déclare l'illustration, le nombre et l'angle initial des pattes, les marges de chaque source, le gabarit et la luminosité. `motion.js` accepte six ou huit branches sans modifier la courbe de rotation validée. `renderer.js` charge les deux images et compose leurs couches séparées. `creatures.js` attribue chaque rendu au bon monstre. Le code de fumée reste partagé et inchangé.

## Aperçus

- Orbe commun : <http://127.0.0.1:8765/tools/vfx-lab/?mode=enemies&subject=drone_pirate&scenario=showcase&view=detail&revision=orb-family-2>.
- Boss Orbe : <http://127.0.0.1:8765/tools/vfx-lab/?mode=enemies&subject=boss_drone_pirate&scenario=showcase&view=detail&revision=orb-family-2>.

Les deux colonnes gardent le même cadrage et les mêmes fonctions de déplacement pour comparer l'ancien et le nouveau rendu. Le sélecteur de monstre permet de comparer les gabarits du commun et du boss. Les vues ×1, ×2 et ×3, le ralenti et la pause restent disponibles.

## Vérifications

`node --test tools/vfx-lab/orb/motion.test.js server/test/enemy-pursuit.test.js` : 24 tests passent. Le nouveau cas vérifie la séparation des illustrations, les six pattes du commun, les huit branches du boss, la conservation du chemin de l'illustration validée et leur différence de gabarit et de lumière. Les tests existants couvrent les rotations, le sillage borné, les virages, l'arrêt, les téléportations et les délais de poursuite de 800 à 1 500 ms.

Syntaxe des modules modifiés et contrôle visuel navigateur des deux modèles, avec rotation, tir, fumée et cadrage normal. Preuves et sauvegardes avant changement dans `output/orb-scout-and-boss-2026-10-25/`.
