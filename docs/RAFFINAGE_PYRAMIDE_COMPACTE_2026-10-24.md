# Raffinage et perfectionnement embarqués — pyramide compacte

La proposition « Pyramide compacte » a été retenue le 24 octobre 2026 pour les deux onglets en jeu.

## Présentation

- Raffinage : quatre rangées centrées de 5 minerais bruts, 3 matériaux intermédiaires, 2 composants avancés et 1 Noyau Astra. Le Catalyseur reste intermédiaire dans la présentation, sans changer son tier économique.
- Perfectionnement : quatre systèmes sur une ligne, puis matériaux regroupés en 2 / 2 / 1. Les matériaux incompatibles restent visibles et désactivés. Les réserves de bonus actives sont affichées sur les systèmes.
- Recette et commandes dans un panneau compact : ingrédients, quantité/Max, résultat, soute après fusion et action. Le Noyau conserve ses trois ingrédients.
- Fenêtre de 960 × 606 px au maximum. À 860 × 680 px de viewport, les deux onglets tiennent sans défilement. En dessous, seule la liste des matériaux défile ; les commandes restent visibles.
- Le défilement de la liste est conservé pendant les rafraîchissements habituels.

Les recettes, coûts, durées, règles de compatibilité et validations serveur sont inchangés. Le dépôt utilise toujours sa confirmation existante. La raffinerie de station et son bandeau de stocks ne sont pas modifiés.

## Vérifications

- 47 tests ciblés réussis : présentation, production, ressources autorisées, équilibre, synchronisation, perfectionnement et dialogue de dépôt.
- Syntaxe des deux modules JavaScript contrôlée.
- Rendu réel et gestionnaires d’entrée testés dans une fixture locale isolée avec données fictives : fusion Noyau × 2, dépôt de 20 Noyaux sur générateurs après confirmation, Max, changement de système, ingrédients manquants et soute vide. Les commandes y sont interceptées, sans compte MMO ni consommation réelle.
- Contrôle visuel à 1280 × 720 et 860 × 680 ; repli à 600 × 680. Aucune image manquante ni erreur console dans le rendu testé.
- Captures et mesures : `output/refining-pyramid-20261024/validation/`.

## Livraison

Token de cache : `20261024-refining-pyramid1`. Overlay frontend limité à `spawnRefineryPanel.js`, aux deux sélecteurs de défilement dans `combatPanels.js`, à `spawnRefinery.css`, puis aux références de cache dans `styles.css` et `index.html`.

Les sources précédentes sont sauvegardées dans `output/refining-pyramid-20261024/before/`. Les manifestes, vérifications et preuves de publication sont dans `output/refining-pyramid-20261024/release/`.

Publication effectuée le 24 octobre 2026 à 15:19:48 CEST : cinq fichiers vérifiés par SHA-256 sur HTTPS et 126 cibles d’importmap accessibles. Sauvegarde distante : `/opt/avosoma-backups/20261024-refining-pyramid1`. Service conservé sans redémarrage, PostgreSQL prêt et aucun nouvel avertissement ni erreur dans les journaux depuis la publication.
