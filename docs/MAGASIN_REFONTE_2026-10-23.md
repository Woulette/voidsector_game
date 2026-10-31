# Refonte du Magasin — 23 octobre 2026

Historique de la première livraison. La correction d’ergonomie **`20261023-shop2`** est maintenant publiée ; voir `MAGASIN_ERGONOMIE_2026-10-23.md` pour les positions fixes, l’utilisation de l’écran et les quantités toujours accessibles.

La maquette validée est intégrée et publiée sous `20261023-shop1`. Le Magasin présente ses neuf rubriques à gauche, les cartes des vrais articles au centre et une fiche d’achat à droite. Il conserve ses 46 références commercialisées. La recherche filtre la catégorie courante, accepte les accents et les débuts de mots ; recliquer une catégorie efface la recherche. Les petites fenêtres disposent d’une navigation horizontale et de la fiche sous le catalogue.

## Fonctions conservées

- Vrais visuels, descriptions, raretés, capacités, stocks et prix issus des catalogues et du profil. États actif, possédé, prérequis manquant, fonds insuffisants et plafond atteint. Huit capacités de base des vaisseaux regroupées, capacités spéciales conservées.
- Munitions et fluide : ×1, ×10, ×100, ×1 000, unités reçues et total calculé avec la fonction de prix partagée avec le serveur.
- Drones : huit standards et deux places réservées aux futurs drones spéciaux à fabriquer, prix progressif. Formations avec bonus, malus et activation lorsqu’elles sont possédées.
- Boosters S1 : un par clic, cinq heures, plafond de 1 000 séparément par type, conservation des réserves historiques.
- Premium : deux durées, neuf avantages existants, statut, prix NOVA et indication distincte du prix Boutique en euros. Remise Premium explicitée sur les prix NOVA ; majoration pour réputation négative expliquée dans le catalogue.
- Attributs de sélection, de quantité et d’achat attendus par `app.js` et le tutoriel conservés. La sélection du premier laser précède toujours son achat. Cartes utilisables au clavier, focus de recherche conservé, défilement de fiche conservé lors d’une synchronisation du même article.

Les actions d’achat et validations serveur existantes restent le circuit utilisé. Aucun achat ni changement de profil de production pendant les contrôles. Boutique, calendrier, recettes et équilibrage restent dans leur périmètre précédent.

## Répartition du code

`src/ui/renderShop.js` conserve le point d’entrée de l’application. `shopShowcase.js` coordonne l’affichage et la recherche ; `shopCatalog.js` construit et filtre les références ; `shopProductModel.js` projette les données de présentation ; `shopMarkup.js` produit les cartes et fiches ; `shopIcons.js` contient les pictogrammes. `src/styles/shopShowcase.css` limite la présentation à `#dashboard .shop-view`. Les styles communs et ceux de la Boutique restent disponibles.

## Vérification

- **94 tests ciblés réussis localement, puis 94 sur un candidat isolé construit depuis le runtime de production.** Présentation, catalogue, recherche, descriptions échappées, caractéristiques, quantités/prix, Premium, achats serveur, sauvegardes/échecs, drones, boosters et tutoriel roquettes des quatre firmes.
- Contrôle navigateur des neuf rubriques, recherche sans résultat, catégories, sélection clavier, possédé, verrouillé, huit drones, mille boosters dégâts et réserve indépendante du bouclier. Les boutons transmettent les commandes attendues via les vraies actions client, vers des fonctions de transport de contrôle : vaisseau, équipement, 100 roquettes, fluide, drone avec prix attendu, formation et pass Premium. Débits et livraisons serveur couverts par les tests ; aucun achat sur un compte de production.
- Rendu à **1 920 × 1 080, 1 366 × 768 et 390 × 844**, sans débordement horizontal de page. Les huit capacités de Valkyrie et l’achat sont visibles en grand écran ; sur fenêtre courte, défilement intérieur de la fiche. Sur petite fenêtre, sélectionner une carte dirige vers sa fiche.
- Après publication : **9/9 empreintes SHA-256 conformes sur HTTPS**, démarrage du site public sans erreur de console, puis rendu de la fiche avec les modules/styles publics sur un profil synthétique. Neuf visuels de vaisseaux et celui de la fiche chargés à la capture.

Preuves : `output/magasin-refonte-2026-10-23/local-tests.txt`, `validate.log`, `deploy.log`, `public-verification.json`, `manifest.json` et `magasin-publie-desktop.png`. La capture représente la vraie interface sur un profil de contrôle.

## Livraison et retour arrière

Neuf fichiers frontend seulement, préparés depuis un état récent du serveur. Le bloc HTML du Magasin, les correspondances d’import de ses six modules et le lien de style ont été fusionnés en conservant les autres changements de l’espace de travail et du serveur. Aucun backend déployé, aucun redémarrage : PID **3943270** inchangé, service actif, compteur de redémarrages à zéro, PostgreSQL prêt.

Sauvegarde : `/opt/avosoma-backups/20261023-shop1`, avec fichiers remplacés et manifeste des ajouts. Les scripts vérifient les empreintes avant remplacement et publient `index.html` en dernier.
