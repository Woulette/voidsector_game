# Magasin : catalogue et fiche latérale

Présentation validée sur les deux maquettes `output/magasin-triptyque-concepts-2026-10-24/`, puis publiée le 24 octobre 2026 sous `20261024-shop6`.

## Présentation

Le cadre commun reste centré à 1 440 px. Les catégories occupent la colonne de gauche, le catalogue deux colonnes de cartes au centre et la fiche du produit sélectionné la colonne de droite. La sélection se fait sur toute la carte ; l'achat et les quantités se trouvent exclusivement dans la fiche. Le catalogue affiche le prix unitaire ou celui d'un lot, tandis que la fiche calcule le total choisi.

Les fonds suivent les raretés : Commun gris, Rare bleu, Très rare violet, Élite orange et Mythique doré. Les véritables sprites, les pictogrammes de devises et une texture de carte existante sont réutilisés. Aucun nouveau catalogue, prix ou équipement n'est créé.

Depuis l'ajustement `20261024-shop7`, le catalogue défile dans son panneau central sur les formats de bureau. Le cadre, l'en-tête, les rubriques et l'achat restent en place. L'illustration de la fiche adapte sa hauteur pour laisser les caractéristiques visibles ensemble. Sur mobile, les rubriques passent en navigation horizontale, le catalogue garde deux colonnes dans une zone défilante et la sélection amène la fiche dans la fenêtre.

Les armes ont des filtres Tout, Canons laser et Lanceurs. La recherche, les possessions regroupées, les huit capacités de base des vaisseaux, les présentations des capacités spéciales et les avantages des quatre pass Premium sont conservés.

## Compatibilité

Les 48 références et leurs commandes serveur existantes sont réutilisées. Les boosters restent à l'unité avec le plafond de 1 000 par type ; les drones standards restent limités à huit et les deux places de fabrication restent réservées. Les formations possédées s'activent sans coût. Les pass affichent leurs prix en euros avec le paiement indisponible. Les remises et les majorations de réputation utilisent toujours le calcul partagé avec le serveur.

Une fiche s'affiche par défaut sans marquer la carte comme un choix explicite. Le sélecteur `.selected` utilisé par le tutoriel n'est ajouté qu'après un clic du joueur. Cette distinction évite de valider automatiquement la première leçon de sélection des lasers.

## Vérifications

- 108 tests ciblés réussis localement et sur un candidat composé des sources actuellement déployées et des seuls changements du magasin : prix, achats, lots, plafonds, tutoriel des quatre firmes, pass Premium, statistiques et échappement des textes.
- Neuf rubriques parcourues sur sept tailles : 1 920 × 946, 1 745 × 861, 1 366 × 768, 1 280 × 720, 1 024 × 768, 768 × 1 024 et 390 × 844. La sélection des 48 références a été contrôlée ; 132 contrôles géométriques locaux sont enregistrés sans débordement horizontal ou achat hors de sa fiche.
- Onze cas d'interface enregistrés : 44 articles possédés, plafonds, fonds insuffisants, filtres, recherches, sélection explicite du tutoriel, maintien des quantités après synchronisation et remise à un au changement de rubrique, présentations Premium et capacités, prix avec dette et remise, accès mobile à la fiche.
- Neuf commandes produites par les véritables actions client et capturées dans un transport local : achat de vaisseau et de laser, 100 et 1 000 lots de roquettes, 10 fluides, drone avec devis, achat et activation d'une formation et booster à l'unité. Aucun achat sur un compte de production.
- Quatre fenêtres d'avantages sur bureau et une sur mobile vérifiées ; Échap et la fermeture conservent l'accès à la fiche.
- Après publication, neuf rubriques ont été revérifiées dans un aperçu utilisant les modules, styles et images récupérés en HTTPS sur le site public, avec un profil synthétique. Aucun message d'erreur de console observé. Les 51 images et pictogrammes utilisés par les 48 articles et le décor répondent en HTTP 200 et correspondent aux fichiers locaux.

## Livraison

Cinq fichiers frontend : `src/ui/shopShowcase.js`, `src/ui/shopMarkup.js`, `src/styles/shopWorkspace.css`, `styles.css` et le seul bloc magasin / les alias de cache de `index.html`. Le style du magasin se charge après les réglages de confort communs. Les autres imports et les publications parallèles sont préservés.

Sauvegarde : `/opt/avosoma-backups/20261024-shop6`. Aucun backend ou profil livré, aucun redémarrage du serveur par ce lot. Service actif avec le PID `1144897`, PostgreSQL disponible et aucune erreur fraîche après publication lors de la vérification finale.

Les cinq empreintes publiques étaient conformes immédiatement après publication. Une autre publication a ensuite modifié l'index partagé : les quatre autres empreintes restent exactes et le bloc magasin ainsi que ses alias de cache ont été revérifiés dans l'index plus récent, sans le remplacer.

Manifeste, sauvegardes de sources, résultats, captures et vérifications : `output/magasin-fiche-laterale-2026-10-24/`. Les captures `vaisseaux-publies.jpg` et `armes-publiees.jpg` utilisent les fichiers publics avec un profil de contrôle.

## Ajustement du défilement — 20261024-shop7

Le catalogue utilise la hauteur restante du lanceur, avec une zone accessible à la molette et au clavier. La recherche et les filtres restent au-dessus ; une sélection ou une synchronisation conserve la position, tandis qu'une nouvelle recherche ou rubrique repart en haut. Le cadre centré de 1 440 px est conservé.

La fiche ajuste son illustration et ses espacements à sa propre hauteur. Dans les fenêtres plus courtes, le prix et le bouton sont côte à côte. Pour les trois vaisseaux spéciaux, leur présentation complète reste accessible dans le bouton de présentation existant lorsque la fiche manque de hauteur. Les huit capacités restent affichées. Les petites tablettes en paysage et les mobiles conservent un flux de page naturel ; un défilement de secours reste disponible dans les fenêtres exceptionnellement courtes.

Validation : 108 tests ciblés locaux et 108 sur le candidat distant ; 48 références contrôlées sur trois formats de bureau, huit formats supplémentaires de la fiche Astralis, navigation au clavier et à la molette, maintien de position et ouverture de la présentation spéciale. Après publication, les neuf rubriques ont été revérifiées avec les fichiers publics et un profil synthétique : aucun débordement de page ou défilement nécessaire dans la fiche sur le format 1 891 × 870, aucun avertissement ou erreur de console observé. Aucun achat sur un compte réel.

Quatre fichiers frontend publiés : `shopShowcase.js`, `shopWorkspace.css`, `styles.css` et les seuls attributs d'accessibilité du catalogue / alias de cache de `index.html`. Les quatre empreintes publiques sont conformes ; service actif, PID `1182716`, zéro redémarrage, PostgreSQL disponible et aucune erreur fraîche lors de la vérification. Sauvegarde `/opt/avosoma-backups/20261024-shop7` ; preuves et capture dans `output/magasin-defilement-2026-10-24/`.
