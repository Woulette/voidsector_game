# Libellé des monstres et propositions de maps

## Libellé publié

Publié sur le jeu public le 18 octobre 2026 à 18 h 46, heure de Paris, version `20261018-enemy-label1`.

Le nom sélectionné apparaît à gauche du niveau sur une seule ligne. Le rendu mesure les deux textes avec leurs polices respectives et centre leur largeur cumulée au-dessus du monstre et de ses barres. Le nom conserve sa couleur claire et le niveau sa couleur rose. Les noms longs conservent la limite de largeur de 260 pixels. Le niveau d'un monstre non sélectionné récemment touché conserve son affichage existant.

- Vérification visuelle avec la vraie fonction `drawEnemies`, le sprite Vorak rusher et le Canvas du navigateur ; aucun problème de centrage ou erreur console observé dans cet aperçu isolé.
- Test existant adapté pour vérifier le centre de l'ensemble et la ligne commune. Suite serveur : 1 044 / 1 044 ; tests client : 40 / 40 ; syntaxe des modules publiés : OK.
- Publication de sept fichiers : un changement fonctionnel dans `src/game/render/entities.js`, six fichiers pour propager sa nouvelle version de cache.
- Les sept versions précédentes ont été comparées à la production avant remplacement, puis les sept empreintes publiques ont été vérifiées via HTTPS.
- Sauvegarde serveur : `/opt/avosoma-backups/enemy-label-20261018` ; sauvegarde locale : `C:\Users\Ntmav\.codex\backups\voidsector_game\20261018-enemy-label-before`.
- Manifeste, archive, différences, aperçu et résultats des vérifications : `tmp/enemy-label-release/`.
- Publication du client seulement ; aucun redémarrage du serveur de jeu.

## Images de proposition

Créées avec l'outil intégré imagegen et conservées dans `output/map-concepts/2026-10-18/` :

- `helion-01-proposition-v1.png` : planète rouge, zone d'accueil orbitale, modules de service et décor rocheux en périphérie ; centre dégagé.
- `helion-02-proposition-v1.png` : planète rouge, station inspirée de l'ISS, épave et arcs d'astéroïdes ; centre dégagé.
- `prompts.md` : descriptions complètes envoyées au générateur.

La capture fournie du portail de Ricky sert de référence de direction : décor composé, planète marquante, épave et profondeur. Les références n'ont pas été modifiées. Les deux images sont de nouvelles propositions, sans HUD complet, pas des captures de nouvelles maps déjà intégrées. Aucun changement de définition de map, asset, réglage graphique ou gameplay n'a été publié.

Le créateur doit encore valider la direction. Une future intégration devra conserver les éléments communs aux maps de même numéro des quatre firmes, notamment l'ISS pour les maps 02, avec leurs palettes respectives. L'objectif technique sera d'évaluer un fond précalculé et quelques calques de décor réutilisables. Les images ne prouvent pas un gain de performances ; il faudra mesurer le rendu réel après intégration.
