# Magasin — catalogue du 24 octobre 2026

La présentation validée dans les maquettes du 24 octobre remplace le cadre compact du 23 octobre. Le catalogue retrouve un défilement de page normal, avec deux grandes cartes par ligne pour les vaisseaux et trois pour les équipements en grand écran. Les petites fenêtres passent à deux, puis une colonne. Les neuf rubriques et les 46 références sont conservées.

## Présentation et navigation

- Acheter figure en bas à droite de chaque carte ; le prix garde une marge et un alignement constants à gauche. Voir la fiche ouvre une fenêtre native depuis le haut à droite. Les états actif, possédé, verrouillé, fonds insuffisants et plafond atteint sont conservés.
- Les fonds suivent la rareté du catalogue : Commun gris, Rare bleu, Très rare violet, Élite orange, Mythique doré. Les couleurs propres aux dessins des objets restent intactes. Les pictogrammes de crédits et NOVA sont ceux du jeu.
- Les vaisseaux montrent leur véritable image et trois caractéristiques essentielles. La fiche agrandie conserve les huit capacités de base et les capacités spéciales. Les armes sont regroupées en canons laser et lanceurs ; leur cadrage exploite les marges transparentes des PNG pour agrandir le dessin visible.
- Le catalogue et la recherche restent stables au changement de rubrique. Une gouttière réservée empêche le déplacement horizontal lors de l'apparition de la barre de défilement. Un changement de catégorie ramène son titre dans la fenêtre lorsque nécessaire.
- Les possessions se consultent en défilement continu, regroupées par catégorie. Le banc de contrôle a affiché les 44 références possédées de son profil synthétique.
- La fiche se ferme avec Échap, le bouton de fermeture ou le fond extérieur ; le focus revient au lien de la carte. Les neuf avantages Premium et les capacités des vaisseaux élites gardent leur fenêtre de présentation. Échap ferme d'abord cette présentation, puis la fiche.

## Achats et tutoriel

Les boutons des cartes et des fiches utilisent les commandes d'achat existantes. Les quantités de munitions et de fluide sont mémorisées par article et réinitialisées au changement de catégorie. Le prix total est calculé par la fonction partagée avec le serveur, avec remise Premium et majoration de réputation. Le nombre d'unités reçues est explicite.

Les boosters restent à l'unité, avec le plafond de 1 000 par type ; les drones restent limités à huit standards, avec les deux places de fabrication réservées. Les formations possédées s'activent sans frais. M-6 reste absente du magasin et Imperial du jeu. Les profils, recettes, catalogues et règles serveur ne sont pas modifiés par ce lot.

Le clic sur l'image sélectionne la carte et garde les attributs du tutoriel. Voir la fiche est une action distincte. Une catégorie nouvellement ouverte ne sélectionne plus automatiquement son premier article, ce qui permet à l'étape de sélection d'attendre le clic du joueur. Les commandes d'achat continuent d'appliquer les validations du tutoriel côté serveur.

## Vérifications

- 99 tests ciblés passent localement et sur le candidat construit depuis le runtime de production : affichage, prix et lots, achats, sauvegardes, plafonds, Premium et leçons du tutoriel des quatre firmes.
- Les neuf catégories ont été parcourues à 1 920 × 946, 1 366 × 768 et 390 × 844 sans débordement horizontal ni chevauchement entre prix et achat. Leur position gauche finale est constante à chaque dimension.
- Les 46 fiches distinctes ont été ouvertes à 1 366 × 658 : fenêtre bornée à l'écran, aucun débordement horizontal intérieur, zone d'achat accessible. La fiche mobile a aussi été contrôlée.
- Les vraies actions client transmettent, vers un transport de contrôle, les commandes attendues pour vaisseau, équipement, 100 et 1 000 roquettes, fluide, drone avec devis, booster à l'unité, formation achetée/possédée et pass Premium. Les débits et attributions sont couverts par les tests serveur. Aucun achat sur un compte de production.
- Le site public démarre sans erreur de console observée. Les rendus de contrôle utilisent les fichiers propres au magasin récupérés par HTTPS, avec un profil synthétique et les autres modules copiés en lecture seule depuis la production.

## Publication

`20261024-shop4` a publié cinq fichiers frontend : `shopMarkup.js`, `shopShowcase.js`, `shopWorkspace.css`, `styles.css` et `index.html`. La première tentative a été arrêtée avant toute écriture après détection d'une publication concurrente de `styles.css`. Le candidat a été reconstruit depuis la base récente, puis revalidé.

`20261024-shop5` apporte le cadrage final des cinq armes, avec trois fichiers CSS/HTML. Les nouveaux prix et les statistiques restent intacts. La vérification finale compare les cinq fichiers effectifs à ceux servis en HTTPS et contrôle PostgreSQL.

Aucun backend n'est livré ni redémarré par ces deux publications. Chaque installation a contrôlé le maintien de son PID avant/après ; une autre livraison a changé le PID entre les deux lots. Sauvegardes : `/opt/avosoma-backups/20261024-shop4` et `/opt/avosoma-backups/20261024-shop5`.

Preuves : `output/magasin-catalogue-2026-10-24/` et `output/magasin-cadrage-2026-10-24/`, notamment les manifestes, tests, captures, mesures navigateur et `effective-public-verification.json`.
