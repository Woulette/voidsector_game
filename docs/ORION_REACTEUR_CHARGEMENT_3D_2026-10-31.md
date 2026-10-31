# Orion : réacteur 3D et préparation de la scène

État : prototype local, non publié. La dernière publication publique reste le lot `20261031-zoom-orion2`.

## Réacteur

- Orion conserve sa coque, ses textures, sa tuyère centrale et sa palette blanc/cyan.
- `shipThruster3d.js` regroupe les tuyères, volumes de plasma et traînées en trois lots partagés. Aucun atlas ni texture de réacteur supplémentaire.
- Le plasma est intégré en douze échantillons dans un petit volume 3D. Ce travail dépend de sa surface à l'écran ; ce n'est pas un effet CSS.
- Les points de traînée utilisent un tableau circulaire de 32 emplacements par vaisseau, à 30 émissions/s et 0,85 s de durée de vie. Les positions et directions déjà émises restent dans le monde pendant les virages.
- Les déplacements, dégâts, collisions et règles serveur sont inchangés. Les autres vaisseaux et le mode 2D gardent leurs effets existants.
- Ajustement demandé ensuite : largeur des nuages multipliée par 1,25, sans ajouter de particules, de textures ou de lots de dessin.
- Les matrices de la coque sont actualisées avant celles du réacteur, et seuls les éléments utilisés sont transférés à la carte graphique.

## Chargement demandé depuis le chat des portails

- `ship3dAssets.js` charge les modèles sans créer de moteur de rendu. Le secteur partage directement les géométries, matériaux et textures des vaisseaux.
- Le moteur séparé reste disponible pour les aperçus et secteurs classiques. Il est libéré lors du retour au secteur commun ; les modèles sources restent partagés.
- `combatSceneLoading.js` prépare les modèles présents, images utiles de la zone et première image avant de retirer l'écran de chargement. Les tâches d'une ancienne zone ne peuvent pas découvrir une nouvelle scène inachevée.
- Le préchargement de combat filtre les sprites de vaisseaux convertis et anciens bâtiments remplacés. Les icônes, usages 2D et objets non convertis sont conservés. Les anciens atlas colorés propres à l'Orion sont libérés en mode 3D.
- Les bâtiments provisoires ne sont plus construits. `disposeScene3d.js` libère les ressources privées retirées, en conservant les ressources GLB partagées par les clones.
- Une image en échec est retirée du cache afin que le bouton Réessayer puisse réellement la recharger.

## Vérifications

- Tests ciblés : mouvement et limites des traînées, attache du réacteur au mouvement courant, ressources partagées, nettoyage, chargement asynchrone, échec/reprise, changements de cache et de mode, zoom, projections, lasers et interactions du QG.
- Jeu local : entrée avec cache désactivé, modèles du QG et deux services prêts lors de l'affichage, mouvement de l'Orion et absence d'erreur JavaScript ; retour 2D et réactivation 3D également contrôlés.
- Les changements de secteur et annulations de chargement sont couverts par les tests de cache et de coordination. Aucun parcours réseau manuel complet aller-retour entre deux secteurs n'est revendiqué.
- Aperçu interactif : `/tools/orion-thruster-3d/index.html`, avec 1/10/30 Orion, poussée, virages, zoom normal/maximal, inspection et vue arrière.
- Mesures brutes et captures : `output/orion-reactor-2026-10-31/` (sorties locales ignorées par Git).

Avec 30 Orion, les tableaux numériques des réacteurs représentent 364 496 octets, dont une réserve partagée dimensionnée pour 128 vaisseaux. Cela ne mesure ni la RAM totale du jeu ni toute la mémoire du pilote graphique. Le nombre de textures de l'aperçu reste à 5 avec et sans réacteurs. Après échauffement, une passe locale a mesuré 0,4 ms de rendu CPU médian et 4,3 ms d'intervalle d'image au 95e percentile. Ce banc isolé ne représente pas les performances du MMO complet ni celles d'autres ordinateurs. La modification finale de largeur dispose d'une passe séparée dans les mesures brutes.

Les modèles et images déjà présents dans le projet n'ont pas été recompressés. Aucun travail Meshy payant n'a été lancé pour ce lot.
