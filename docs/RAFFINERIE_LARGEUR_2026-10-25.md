# Raffinerie sur toute la largeur — 25 octobre 2026

Le correctif `20261025-orbital-fit1` faisait tenir le panneau dans la fenêtre mais réduisait une illustration entière dans un cadre plus large. Il créait les grandes bandes latérales signalées par l’utilisateur. La nouvelle composition `20261025-orbital-fluid1` remplace ce centrage par des éléments placés séparément dans une scène qui occupe toute la largeur et toute la hauteur réservées.

## Résultat et périmètre

Les cinq collecteurs restent à gauche. Alliage, Catalyseur et Plaque sont superposés au centre, Conducteur au-dessus de Blindage dans la colonne suivante, Noyau Astra tout à droite. Stockage et Transport restent en bas. Les silhouettes sont rendues à partir d’un atlas transparent ; leurs proportions sont conservées. La colonne centrale et les bras métalliques constituent le raccord architectural adaptable. Le décor spatial couvre le panneau sans bandes unies ni étirement de l’image complète.

Les zones de sélection partagent exactement la position et les dimensions de leur élément graphique. Elles affichent seulement quatre coins. Les étiquettes sont placées à l’extérieur, avec quelques ancres spécifiques pour dégager les coins des modules voisins. Les quatorze flèches d’ingrédients sont toujours issues des recettes réelles ; la sélection montre sa recette directe et la case des liaisons permet d’afficher la chaîne complète.

Le bandeau garde les onze noms sans icône, la quantité courante plus grande, puis la jauge remplie contenant uniquement le maximum numérique. La hauteur du panneau conserve la marge de 12 px en haut et en bas après défilement, sur les formats de bureau vérifiés. Les petits écrans conservent l’index des modules et leur défilement naturel.

Aucun changement du catalogue, des règles de production, des coûts, des stocks persistés, des validations ou des commandes économiques. Les onglets Expédition et Bilan gardent leurs fonctions existantes.

## Sources et images

- `src/ui/refineryStationLayout.js` porte le repère de chaque élément, le rendu de l’atlas et les bras adaptables.
- `src/ui/refineryOrbitalStation.js` conserve les sélections, les commandes du module courant et les flèches de recettes.
- `src/styles/refineryOrbital.css` porte les dimensions du panneau, les étiquettes et les quatre coins.
- `styles.css` et `index.html` référencent le cache `20261025-orbital-fluid1`.
- `assets/refinery/orbital-v3/station-cutout.png` : atlas RGBA de 1 672 × 941, alpha de 0 à 255.
- `assets/refinery/orbital-v3/backdrop.png` : décor RGB de 1 672 × 941.

Les deux images proviennent de l’outil intégré `image_gen.imagegen`, avec l’illustration approuvée `orbital-v2/station.png` comme référence d’édition. Les fichiers générés ont été copiés sans conversion dans le projet. Prompts exacts, fichiers sources, dimensions et empreintes : `output/refinery-fluid-layout-20261025/asset-generation-v3.json`. La première tentative de bandes étirées a été abandonnée avant publication ; elle ne fait pas partie du runtime final.

## Vérifications

42 tests ciblés réussis localement et sur le candidat distant reconstruit depuis le runtime de production. Syntaxe des deux modules et contrôle des espaces du diff vérifiés.

Les contrôles navigateur couvrent 30 rendus sur six formats et cinq états de station, 36 scénarios de jauges représentant 396 lectures, 78 survols sur six formats de bureau, puis 20 contrôles de défilement sur dix formats. Ils vérifient les nombres, les jauges, les recettes, les commandes, la sélection mobile, l’absence de débordement et de chevauchement d’étiquettes, ainsi que la visibilité des quatre coins. Le défilement vérifie aussi la largeur complète de la scène, les proportions et les limites des treize éléments, et la présence du panneau et des commandes entiers sur les formats de bureau.

Le candidat gelé puis les fichiers chargés depuis HTTPS ont été contrôlés sur les 30 rendus et les 20 cas de défilement. Les 78 survols ont aussi été réexécutés avec les fichiers publics, sans échec ; leurs preuves sont dans `release/public-hover/`. Les interactions utilisent un profil synthétique et des commandes neutralisées : il ne s’agit pas d’une session MMO authentifiée ni d’une mutation d’un compte réel. Le contrôle de rafraîchissement conserve le même élément graphique et la mise à jour du stock ; les quantités et le focus de saisie d’expédition restent conservés.

Preuves : `output/refinery-fluid-layout-20261025/`, notamment `browser-verification.json`, `hover-verification.json`, `stocks-verification.json`, `local-scroll-verification.json`, `candidate-scroll-verification.json`, `public-scroll-verification.json`, `release/candidate-browser/` et `release/public-browser/`. Les captures publiques `public-1920x948.png` et `public-1366x768.png` montrent le panneau entier au bas de la page.

## Publication

Publié le 25 octobre 2026 à 14 h 49 min 14 s (Paris) sur https://avosoma.absyrion.com/, cache `20261025-orbital-fluid1`. Sept fichiers frontend livrés, index en dernier. Leurs sept empreintes publiques correspondent au paquet et aux fichiers installés ; 561 fichiers sources contrôlés hors livraison sont préservés. L’importmap est reconstruit depuis l’index public courant, en conservant les 443 alias existants hors modification de la station et en ajoutant celui du nouveau module.

Sauvegarde : `/opt/avosoma-backups/20261025-orbital-fluid1-134751`. Service `avosoma-beta.service` actif, même PID `2362785`, `NRestarts=0`, aucun redémarrage. PostgreSQL prêt, aucune écriture en attente ni nouvelle erreur dans les journaux depuis publication au contrôle final. Manifestes et résultats : `release/manifest.json`, `release/publish-result.json`, `release/verify-result.json` et `release/public-verification.json`.
