# Orion : réacteur 3D et préparation de la scène

État : réacteur publié le 31 octobre 2026 (`20261031-orion-reactor2`), puis courbure de la flamme corrigée (`20261031-orion-turn1`). Les 4 fichiers de cette correction sont vérifiés publiquement. Le serveur de jeu n’a pas redémarré.

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

## Publication

Le contrôle public initial a détecté une dépendance absente de `ship3dAssets.js`. Le correctif publie `ship3dSurface.js` et renouvelle les adresses des modules. Le test `ship-3d-dependencies.test.js` vérifie désormais les imports statiques et différés des moteurs 3D, ainsi que la conservation des matériaux approuvés de l’Orion. Les 133 tests du candidat et de la préparation distante passent. Le contrôle dans le navigateur public a confirmé le vaisseau 3D, une flamme active et sa traînée ; aucune nouvelle erreur n’a été relevée après cette vérification. Les anciens avertissements de la première tentative restent distingués des erreurs nouvelles.

La publication conserve l’ordre des imports de production et exclut l’habillage local non publié des secteurs 3. Les modèles des autres vaisseaux, nouveaux astéroïdes et changements des portails en cours dans les autres chats ne font pas partie de ce lot. Preuves : `docs/ORION_REACTEUR_PUBLICATION_2026-10-31.json` et `output/reactor-live-fix-2026-10-31/`.


## Courbure de la flamme pendant les virages

La vitesse de rotation provoque maintenant un retard latéral progressif du plasma dans les deux sens. La base reste sur la tuyère, le volume englobe la courbe sans couper la flamme, et l’épaisseur du jet est conservée. La flamme se redresse progressivement quand le cap se stabilise. La fumée et sa largeur ne changent pas.

Le correctif ne crée aucune texture ni aucun lot de dessin supplémentaire et réutilise les tableaux existants. Il agrandit le petit volume de calcul du plasma pendant les virages ; son coût graphique dépend toujours de la surface visible. Une passe dans l’aperçu avec 30 Orion a relevé 0,30 ms de préparation médiane, 0,90 ms de rendu CPU médian et 16,7 ms d’intervalle d’image au 95e percentile, avec 364 496 octets de tableaux de réacteurs et zéro texture de réacteur. Ce résultat isolé ne mesure pas la mémoire totale du jeu et ne constitue pas une comparaison directe avec les passes précédentes.

135 tests passent localement et en préparation distante, dont les nouveaux cas virage gauche/droite, redressement, attache et épaisseur du jet. Le navigateur public a chargé les trois modules `20261031-orion-turn1`, affiché le secteur 3D et la flamme lors d’une courte manœuvre dans la zone protégée, sans erreur nouvelle. Publication limitée aux trois modules de réacteur et à leurs adresses dans `index.html`. Sauvegarde : `/opt/avosoma-backups/20261031-orion-turn1-182846`. Preuves : `docs/ORION_REACTEUR_VIRAGES_PUBLICATION_2026-10-31.json` et `output/orion-turn-live-2026-10-31/`.
