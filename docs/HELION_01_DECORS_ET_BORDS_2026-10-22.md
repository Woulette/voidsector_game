# Hélion 1 : décors plus solides et fond resserré — 22 octobre 2026

Demande : décaler la couronne stellaire vers la droite, retirer la rémanence d'explosion sombre, revoir la transparence des objets solides et faire apparaître le vide plus près des quatre bords.

## Composition

- Couronne stellaire : ancrage X de -8 000 à -5 500, soit +162,5 unités logiques à l'écran (+126,75 pixels au zoom 78 %). Hauteur, taille et coefficient de parallaxe 0,065 conservés.
- Rémanence d'explosion retirée de la composition et de la découverte des assets de cette map. Le PNG original reste sur disque pour permettre un retour en arrière.
- Rochers : opacité de rendu de 0,72–0,84 pour les lointains, 0,86–0,96 pour les intermédiaires et 0,94–1 pour les plus proches, au lieu de 0,25–0,70. Les 350 rochers conservent leurs positions, tailles, rotations, formes et coefficients de parallaxe.
- Épaves : opacité de la frégate à 0,90 et de la station à 0,88, au lieu de 0,48 et 0,40. Leurs géométries et profondeurs restent identiques.
- Les PNG ont déjà des zones solides presque opaques ; leurs arrière-plans découpés restent transparents. L'atténuation uniforme au rendu était excessive. Le fondu des objets à l'approche des limites reste volontaire.
- Planète et répartition des nuages inchangées par rapport à la version publique `20261022-helion-planet1`.

## Fond lointain aux bords

`src/game/render/mapScenerySky.js` porte un fondu spatial opt-in : `parallaxScene.skyFade`. Hélion 1 l'active avec `inside: 900`, `outside: 120`. Le ciel s'atténue progressivement sur les 900 dernières unités intérieures et devient noir au plus tard 120 unités après la frontière, sur les quatre côtés.

Le fondu est dessiné après le ciel et les halos ambiants, avant les images de profondeur. La planète et la couronne stellaire peuvent donc encore dépasser. Il ne découpe pas le monde entier et ne dessine aucun contour. Les rochers, épaves et poches de poussière proches conservent leur fondu séparé sur leur empreinte apparente.

Aucune grande texture ni aucun buffer supplémentaire : uniquement les bandes visibles, avec un gradient doux par bord. En pleine zone intérieure, aucune bande n'est dessinée. Un bord entièrement hors secteur se remplit directement sans construire de gradient. Aucun changement pour les autres maps, le gameplay ou le serveur.

## Vérifications

- Tests serveur : 1 067 / 1 067 ; tests client : 40 / 40 ; dont 23 tests de décor Hélion.
- Contrôle raster des objets proches : 42 combinaisons qualité/zoom/vue, 204 918 points hors secteur, aucune contribution des objets proches à l'extérieur.
- Contrôle raster du ciel : 36 combinaisons, 150 852 points au-delà de la marge extérieure ; aucune contribution des nuages après 120 unités, aucune différence de nuages au-delà de 900 unités vers l'intérieur. Contribution des nuages près du bord inférieure à 15 % de la version sans fondu.
- Comparaison structurelle avec la sauvegarde : planète, nuages, géométries et parallaxes des rochers/épaves préservés.
- Mesure CPU locale du rendu à 1 880 × 950, qualité haute, 240 positions après préchauffage : moyenne 0,640 ms avant et 0,571 ms après, p95 0,900 / 0,800 ms. Mesure indicative du temps JavaScript, pas un test de FPS ou de charge GPU.
- Comparatif et vidéo de 12 secondes : `assets/maps/previews/helion01-clarity1/index.html`.

## Sauvegardes et livraison

- Sauvegarde locale des sources avant cette tâche : `C:/Users/Ntmav/.codex/backups/voidsector_game/20261022-helion-clarity-before`.
- Préparation et preuves : `tmp/helion-clarity-release/` ; manifeste à empreintes avant/après et comparaison de la base publique avant remplacement.
- Version du cache client : `20261022-helion-clarity1`.
- Livraison ciblée des seuls fichiers client et aperçus, avec sauvegarde distante et restauration sur échec. Aucun redémarrage du service et aucun accès aux profils.
- Publication effectuée le 22 octobre à 18 h 30 min 46 s (Paris), sauvegarde distante `/opt/avosoma-backups/helion-clarity-20261022`. Base de production identique à la sauvegarde avant remplacement ; 15 fichiers vérifiés à l'installation puis par HTTPS avec leurs empreintes.
- Service actif, PID 1480850 inchangé, aucun redémarrage ; `/health` et PostgreSQL prêts. Le client public charge `game.js?v=20261022-helion-clarity1` sans erreur console à l'écran de connexion.
- Vidéo publique lue jusqu'à la fin : 12,003767 s, 1 880 × 950, aucune erreur de décodage. Requête partielle vidéo : HTTP 206.
- Comparatif public : https://avosoma.absyrion.com/assets/maps/previews/helion01-clarity1/index.html
