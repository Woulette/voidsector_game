# Première version visuelle d'Helion-01

Le présent document décrit la première publication. La planète en bas à gauche, les limites visibles et les astéroïdes variés sont détaillés dans [HELION_01_LIMITES_ET_ASTEROIDES_2026-10-18.md](HELION_01_LIMITES_ET_ASTEROIDES_2026-10-18.md). L'essai de nuages localisés est décrit dans [HELION_01_NUAGES_LOCALISES_2026-10-18.md](HELION_01_NUAGES_LOCALISES_2026-10-18.md). La révision actuelle, avec plusieurs plans de parallaxe et sans contour tracé, est décrite dans [HELION_01_PROFONDEUR_ET_PARALLAXE_2026-10-18.md](HELION_01_PROFONDEUR_ET_PARALLAXE_2026-10-18.md).

Publiée le 18 octobre 2026 à 19 h 10, heure de Paris, sur Netcup.
Version navigateur : `20261018-helion-one1`.

## Rendu et périmètre

Helion-01 utilise maintenant une planète rocheuse rouge détaillée, placée dans le quart inférieur droit du fond lointain, trois couches de nébuleuse rouge réutilisant une même texture, des groupes d'astéroïdes indépendants répartis dans les coordonnées du monde et une épave de station éloignée du relais de quêtes. Le dock et les stations interactives existants restent à leurs coordonnées de jeu.

Trois vrais assets séparés et transparents ont été créés avec l'outil intégré imagegen :

- `assets/maps/decor/helion01-v1/planet-crimson.png`
- `assets/maps/decor/helion01-v1/nebula-crimson.png`
- `assets/maps/decor/helion01-v1/asteroid-cluster.png`

Le générateur a livré chaque PNG en 1 254 × 1 254 pixels RGBA. La planète est dessinée dans un carré de 1 180 unités de rendu, les groupes rocheux dans des carrés de 380 à 620 unités. Il ne s'agit pas d'une image globale agrandie sur les 10 000 × 8 000 unités du secteur. Les couches nébuleuses restent volontairement plus douces et lointaines. Les trois PNG totalisent environ 5,45 Mo ; leurs chemins sont versionnés et pris en charge par le cache de maps existant. Une épave déjà présente dans les fichiers mais inutilisée sur cette map est également employée : `assets/maps/decor/astra02_station_wreck.png`.

Les prompts exacts sont conservés dans `output/helion01-assets/2026-10-18/prompts.json`. Les originaux du générateur restent dans le dossier des images générées de Codex ; les fichiers consommés par le jeu sont bien dans `assets/maps/decor/helion01-v1/`.

## Intégration

`src/game/combatData/helionOneVisuals.js` construit une variante visuelle de la liste de maps au démarrage de `createCombatGame`. Le tableau partagé et les modèles utilisés pour fabriquer les autres firmes ne sont pas modifiés. Les autres maps gardent leurs objets d'origine, y compris Helion-02 et les trois autres maps 01.

Le rendu existant des images de décor accepte désormais `space: "world"` pour ancrer les éléments aux coordonnées de la map. Les anciens calques sans cette propriété conservent leur parallaxe habituelle. Les groupes de rochers suivent le réglage `backgroundAsteroids`, et les nouvelles nébuleuses suivent le réglage existant des nébuleuses. Les images hors écran sont écartées par le rendu existant.

Les listes de nuages calculés au premier plan et les poussières ajoutées ont été supprimées de cette variante. Le nombre d'étoiles proches parcourues passe de 4 280 à 420 et les deux champs d'astéroïdes calculés contiennent 38 éléments au total. Les décors générés sont réutilisés, sans filtre de couleur dynamique ni calcul de texture à chaque image.

Les portails, dimensions, spawn, zones sûres, ennemis, récompenses et validations serveur conservent leurs données. Le changement ne rajoute aucune collision ni interaction avec les décors.

## Vérifications

- Suite serveur : **1 048 / 1 048** ; tests client sous `src` : **40 / 40** ; syntaxe des sept modules publiés : OK.
- Quatre régressions couvrent la conservation des autres maps et des données de jeu, la découverte des assets par le cache de maps, la distinction entre coordonnées monde et parallaxe, le retrait des décors hors écran et le réglage des astéroïdes.
- Inspection visuelle dans un aperçu isolé utilisant les vraies fonctions de rendu du jeu, à l'accueil, au centre et au portail ; vérification du réglage bas et du réglage haut. Aucune erreur console observée.
- Comparaison avant/après du décor, avec les mêmes 240 positions sur un trajet identique, en qualité haute et en 1 280 × 720. Après préchauffage des caches, temps CPU moyen de préparation et d'envoi des commandes de dessin : **0,676 ms avant**, **0,220 ms après**, soit environ **67 % de moins**. P95 : **0,9 ms avant**, **0,4 ms après**.
- Cette mesure concerne le rendu isolé du décor dans ce navigateur. Elle ne mesure pas le temps GPU complet, le réseau ni les performances de tout le jeu sur tous les appareils. Résultats bruts : `tmp/helion-one-release/render-benchmark.json`.
- Publication vérifiée : les 11 fichiers publics correspondent aux empreintes attendues, y compris les PNG comparés comme fichiers binaires. La dépendance existante de l'épave a aussi été comparée à sa version publique.
- Le véritable onglet multijoueur a été rechargé sur Helion-01 : reprise du personnage depuis le serveur, nouveaux décors visibles et aucune erreur console observée. Capture : `output/helion01-assets/2026-10-18/helion-one-live.png`.
- Santé publique HTTP 200, PostgreSQL prêt. Publication du client et des images uniquement, sans redémarrage du serveur de jeu ; service actif et aucun redémarrage automatique constaté.

## Publication et sauvegardes

- Onze fichiers publiés : huit fichiers JavaScript/HTML dont cinq changements de version d'import, et trois nouveaux PNG. Les autres modifications locales ne font pas partie de la publication.
- Vérification des versions de production avant remplacement ; copie atomique des fichiers et mise à jour d'`index.html` en dernier.
- Sauvegarde serveur : `/opt/avosoma-backups/helion-one-20261018`.
- Sauvegarde locale : `C:\Users\Ntmav\.codex\backups\voidsector_game\20261018-helion-one-before`.
- Archive, manifeste, différences ciblées, captures, journaux de tests et outils de retour arrière : `tmp/helion-one-release/` en local et `/tmp/avosoma-helion-one-20261018` sur le serveur.

Cette première composition doit maintenant être jugée en jeu par le créateur avant toute déclinaison sur les autres maps.
