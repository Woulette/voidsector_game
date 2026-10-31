# Magasin — correction d’ergonomie du 23 octobre 2026

Version publiée : **`20261023-shop2`**. Cette correction remplace la première présentation `20261023-shop1` à la suite des captures du créateur : déplacement de la rubrique Munitions, bandeau prenant de la place et défilements nécessaires pour consulter ou acheter.

## Problème reproduit

Le style historique `.shop-panel { grid-area:shop }` positionnait le panneau dans une zone nommée absente de la grille parente. Le navigateur créait des colonnes implicites. À 1 920 × 946, la position gauche variait réellement de **200 px pour Vaisseaux à 556,56 px pour Munitions**, et revenait à 55 px pour Générateurs/Drones. Le contrôle initial de simple débordement horizontal ne détectait pas cette erreur de placement.

Le défilement provenait aussi des grandes cartes, de la hauteur du bandeau et d’une hauteur de fiche estimée avec une soustraction fixe de 300 px. Les quantités de munitions se trouvaient dans le corps défilant de la fiche.

## Correction

- Placement explicite du panneau, sans zone nommée héritée. Neuf rubriques de mêmes dimensions et positions.
- Suppression du bandeau pleine largeur ; titre Magasin dans la navigation, recherche sur la même ligne que le titre de catégorie.
- Utilisation de la hauteur réellement restante sous l’en-tête, grâce au layout flex et aux requêtes CSS de conteneur. Le style `shopWorkspace.css` est limité au Magasin. Le mode ajusté concerne les fenêtres d’au moins 1 101 px de large et 650 px de haut ; les fenêtres plus petites conservent une disposition verticale avec défilement normal.
- Neuf articles maximum par page, donc toutes les références de chaque catégorie de vente restent présentes ensemble en desktop. Le filtre Possédés dispose de boutons Précédent/Suivant quand nécessaire. Le choix d’un article détermine sa page et les boutons gardent le focus au clavier.
- Quantités, unités réellement reçues, total et action regroupés dans le pied de fiche, accessibles directement. Les corrections de prix liées à Premium et à la réputation sont expliquées près du prix, sans bandeau qui agrandit le catalogue.
- Présentations longues des trois vaisseaux élites et neuf avantages Premium consultables dans une fenêtre de détails accessible. Tous les textes, capacités et avantages sont conservés. Les huit caractéristiques de base des vaisseaux restent dans la fiche. La fenêtre se ferme par Échap ou un bouton ; une synchronisation du même article conserve son ouverture.

Les 46 références, stocks, règles de prix et actions d’achat serveur sont conservés. Aucune recette, statistique, limite d’achat ou donnée de compte de production modifiée.

## Vérifications

- **97 tests réussis localement et 97 sur un candidat isolé depuis le serveur de production** : catalogue, recherche, pagination, descriptions, caractéristiques, quantités/prix, achats et sauvegardes, drones, boosters et tutoriel des quatre firmes.
- **46 fiches parcourues en navigateur**, avec mesures de géométrie à 1 920 × 946, 1 366 × 768 et 1 366 × 658 : absence de défilement de page et de fiche imposé, absence de découpe du contenu des cartes, action d’achat dans la fenêtre.
- Profil synthétique possédant 44 références : cinq pages accessibles au clavier, aucune référence perdue, aucun chevauchement du changement de page, aucun texte de carte découpé sur la fenêtre courte.
- État Premium actif et réputation négative contrôlé ; la majoration et la remise sont affichées avec le prix final. Le cas de la fiche Astralis sur fenêtre courte a aussi été vérifié après publication.
- Contrôle à 390 × 844 : pas de débordement horizontal de la page ; disposition verticale adaptée.
- Après publication, **les neuf rubriques ont exactement les mêmes coordonnées** dans le navigateur : gauche 40 px, droite 1 880 px, haut 196 px à 1 920 × 946. Aucun défilement de page ou de fiche à leur ouverture. La commande de 100 roquettes traverse les vraies actions client avec les arguments attendus, vers un transport de contrôle. Aucun achat sur un compte réel.

Le banc de contrôle inclut le dashboard complet et utilise les fonctions de rendu et de navigation existantes. Après livraison, les fichiers propres à la correction sont récupérés par HTTPS ; les autres modules proviennent d’une copie en lecture seule des sources de production. Les images sont les assets du jeu disponibles localement. Le démarrage du véritable site public est également contrôlé séparément.

Preuves : `output/magasin-ergonomie-2026-10-23/geometry-verification.json`, `local-tests.txt`, `validate.log`, `public-verification.json`, `manifest.json`, `magasin-munitions-publie.png`.

## Livraison

Sept fichiers frontend, assemblés depuis un état récent du serveur. Les correspondances d’import des quatre modules modifiés et le bloc HTML du Magasin sont fusionnés ; les autres travaux concurrents sont préservés. La nouvelle feuille de style est chargée après celle de la première présentation.

Sept empreintes HTTPS sur sept conformes. Service et PostgreSQL prêts. Aucun redémarrage lors de ce lot : PID **4003944** inchangé, compteur de redémarrages à zéro. Sauvegarde réversible : `/opt/avosoma-backups/20261023-shop2`.
