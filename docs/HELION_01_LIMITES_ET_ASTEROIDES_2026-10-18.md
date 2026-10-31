# Helion-01 : limites du secteur et astéroïdes variés

L'essai ultérieur de nuages fixes et localisés est détaillé dans [HELION_01_NUAGES_LOCALISES_2026-10-18.md](HELION_01_NUAGES_LOCALISES_2026-10-18.md).

Révision publiée sur Netcup le 18 octobre 2026 à 19 h 28, heure de Paris.
Version navigateur : `20261018-helion-bounds1`.

## Changements visuels

La planète rouge apparaît désormais en bas à gauche du fond lointain. Le décor s'arrête au rectangle réel du secteur, de -5 000 à 5 000 horizontalement et de -4 000 à 4 000 verticalement. Un contour rouge clair est dessiné indépendamment de la grille, y compris lorsque celle-ci est masquée et en qualité basse. Au-delà, le fond est noir : nébuleuses, planète, stations, rochers et étoiles de décor ne débordent plus.

Le changement concerne l'affichage. Les déplacements hors secteur et leurs règles existantes restent gérés par le jeu ; les vaisseaux, ennemis et effets de combat continuent à être dessinés après la couche de décor.

Les anciens groupes répétés et les deux champs de rochers calculés sont remplacés sur Helion-01 par environ 350 petits astéroïdes individuels répartis dans tout le secteur. Les six silhouettes sont différentes, avec des tailles, angles et opacités variés. La disposition est déterministe ; les abords immédiats du spawn et du portail restent dégagés. Les dimensions d'affichage des cellules varient de 46 à 82 unités de largeur, avec conservation des proportions de chaque découpe. Les rochers eux-mêmes occupent une partie de ces cellules transparentes et paraissent donc plus petits.

Les six rochers utilisent une seule texture transparente de 1 536 × 1 024 pixels RGBA, pesant 2 419 661 octets : `assets/maps/decor/helion01-v2/asteroids-atlas.png`. Les limites des découpes suivent les espaces transparents de la texture ; les six objets entiers ont été contrôlés sans inclure leurs voisins. Le prompt se trouve dans `output/helion01-assets/2026-10-18/asteroids-v2-prompt.txt`, et l'original du générateur est conservé dans son répertoire Codex.

Le cache de maps ne charge la texture qu'une fois. Les objets hors écran sont écartés avant dessin et le réglage existant `backgroundAsteroids` masque aussi les nouveaux rochers. La distribution est préparée au démarrage, sans calcul aléatoire à chaque image. Les autres maps, modèles de firmes et données de gameplay gardent leur composition.

## Vérifications

- Suite serveur : **1 053 / 1 053** ; tests client : **40 / 40** ; syntaxe des huit modules JavaScript publiés : OK.
- Neuf régressions couvrent la conservation des autres maps et du gameplay, le streaming, les coordonnées monde et la parallaxe, le retrait hors écran, le réglage des rochers, les découpes de l'atlas et les limites avec une grille masquée ou un zoom différent.
- Le vrai moteur de décor a été exécuté dans un aperçu isolé, sans connexion au compte multijoueur. Le contrôle des pixels a vérifié **36 combinaisons** de positions, qualités et zooms, avec **12 870 pixels hors secteur noirs et opaques**, sans échec. Les quatre côtés, un coin et une vue entièrement extérieure sont inclus.
- Inspection des nouveaux rochers au centre du secteur et du contour dans un coin ; aucune erreur console observée. Captures : `output/helion01-assets/2026-10-18/helion-one-v2-rocks.png` et `helion-one-v2-boundary.png` dans le même dossier.
- Mesure du rendu isolé à 1 280 × 720, qualité haute, trajet identique de 240 points et caches préchauffés : moyenne **0,244 ms avant**, **0,267 ms après** ; P95 **0,4 ms** dans les deux cas. Le coût CPU reste voisin de la première version visuelle ; cette révision ne démontre pas un gain de FPS ni une mesure GPU complète. Résultats : `tmp/helion-boundaries-release/render-benchmark.json`.
- Les **10 fichiers publics** correspondent aux empreintes publiées, y compris le PNG comparé comme fichier binaire. Santé publique HTTP 200, PostgreSQL prêt, service actif, même processus et aucun redémarrage automatique.
- La page publique charge la nouvelle version sans erreur console. L'onglet Edge du compte multijoueur n'était plus disponible au moment du contrôle final : aucune reconnexion du personnage ni vérification en partie multijoueur n'est revendiquée pour cette révision.

## Publication et retour arrière

Dix fichiers client ont été publiés, dont le nouveau module de limites et le nouvel atlas. La version de production a été comparée à la sauvegarde locale avant remplacement. Les copies sont atomiques, l'index est installé en dernier, et le serveur de jeu n'a pas été redémarré. Aucun fichier de profil n'a été modifié.

- Sauvegarde serveur : `/opt/avosoma-backups/helion-boundaries-20261018`.
- Sauvegarde locale : `C:\Users\Ntmav\.codex\backups\voidsector_game\20261018-helion-boundaries-before`.
- Archive, manifeste, différences ciblées, mesures, contrôles, journaux et outil de retour arrière : `tmp/helion-boundaries-release/`, avec la copie de publication sous `/tmp/avosoma-helion-boundaries-20261018` sur le serveur.

Cette composition reste un essai visuel limité à Helion-01.
