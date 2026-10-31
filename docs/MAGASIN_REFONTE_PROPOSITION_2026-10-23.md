# Magasin — proposition visuelle et périmètre à conserver

Statut : **maquette validée, refonte intégrée et publiée le 23 octobre 2026, version `20261023-shop1`**. Le créateur a validé la proposition puis demandé sa réalisation. Ce document conserve l’inventaire de la proposition ; le compte rendu est dans `MAGASIN_REFONTE_2026-10-23.md`. La refonte concerne l’onglet MAGASIN ; l’onglet BOUTIQUE conserve son périmètre distinct.

## Lecture de l’existant

Modules examinés : catalogue des vaisseaux et équipements, `renderShop.js`, `shopActions.js`, `shop.css`, règles partagées de prix/Premium/réputation/boosters, calculs d’achat et handlers serveur. Les sept sources publiques contrôlées correspondent aux fichiers locaux après normalisation des fins de ligne. Copie de lecture : `output/magasin-concept-2026-10-23/source-live/`. Inventaire détaillé : `catalogue-verifie.json` dans le même dossier.

Le catalogue contient **46 références dans huit catégories de produits**, auxquelles s’ajoute le neuvième filtre de navigation, « Possédés », calculé depuis le compte.

| Catégorie | Références | Contenu et informations à conserver |
| --- | ---: | --- |
| Vaisseaux | 9 | Orion, Velox, Valkyrie, Razorion, Helion Titan, Astralis, Vesperion, Nyxaris, Asterion. Nom, classe, rareté, illustration, description et capacités de base. Possédé, actif, disponible et prérequis de portail distincts. Achat unique, puis présence au Hangar. |
| Armes | 5 | Trois canons laser MK-I/II/III, lance-roquettes et lance-missiles MK-I. Dégâts, portée, cadence/recharge et, pour les missiles, capacité et recharge totale. Stock possédé. |
| Munitions | 9 | Quatre munitions laser M-1 à M-4, trois roquettes R-1 à R-3 et deux missiles R-1/R-2. Stocks, multiplicateur de dégâts ou dégâts propres, tailles des lots et quantité finale. Les munitions exclues du magasin restent exclues, dont la M-6. |
| Générateurs | 4 | Générateurs A I/A II et de vitesse MK-I/MK-II. Bouclier, régénération, absorption, vitesse et compatibilité affichée ; valeurs issues du vrai objet. |
| Drones | 5 | Un modèle de Drone de Combat et quatre formations : Base, Cuirassé, Tir, Vitesse. Possession du drone, prix du prochain, capacité, emplacement, compatibilité ; bonus ET malus des formations, achat/activation/active distingués. |
| Extras | 8 | Puces roquette automatique, missile automatique, accélérateur de roquettes ; drones de réparation bleu/jaune/rouge ; IA d’auto-réparation ; fluide de téléportation. Effets, emplacement/usage et quantité possédée. |
| Boosters | 4 | Dégâts, bouclier, vie, crédits. S1 +10 %, unité de cinq heures, réserve restante et plafond de 1 000 unités séparément par type. |
| Premium | 2 | Pass de sept et trente jours, durée, statut/temps restant, avantages réels du catalogue et prix effectif en NOVA. Le prix indicatif de la Boutique en euros, actuellement présent dans les détails, reste une information distincte du paiement NOVA du Magasin. |
| Possédés | dynamique | Filtre transversal sur les produits du catalogue ; quantités et états réels du compte. |

## Invariants pour l’intégration

- Crédits et NOVA avec leurs bonnes icônes ; prix effectif affiché égal au prix serveur. Conserver les 5 % de remise NOVA si Premium est actif et la majoration liée à la réputation négative, avec explication lisible. Ne pas réinventer un prix ou une promotion pour la maquette.
- Munitions : multiplicateurs x1/x10/x100/x1 000 ; un lot laser représente actuellement 1 000 munitions, une roquette ou un missile représente une unité. Afficher le nombre réellement reçu et le total avant achat. Le fluide de téléportation conserve aussi ses multiplicateurs.
- Boosters : un seul par clic, cinq heures par unité, sans choix de lots. Plafond 1 000 par type, erreur et aucun débit au-delà. Préserver les réserves historiques et l’autorité serveur.
- Drones : huit standards maximum ; deux places réservées aux futurs drones spéciaux à fabriquer, capacité totale dix. Le prix du prochain drone dépend du profil serveur : base 200 000 crédits, doublement selon le nombre déjà possédé. La catégorie ne doit pas faire croire que les cinq références sont cinq modèles de drone.
- Formations : une formation déjà possédée propose son activation ; celle active est identifiée. Ne pas perdre les malus en mettant seulement les bonus en avant.
- États : fonds insuffisants, objet/vaisseau déjà possédé, limite atteinte, prérequis manquant, achat en attente, succès après sauvegarde et erreur serveur doivent rester lisibles et cohérents. L’image n’invente pas de panier ni de commande « acheter et équiper ».
- Les contrôles attendus par le tutoriel et sa progression doivent rester accessibles après changement de disposition : sélection de catégorie/article, achat du vaisseau, du laser et des roquettes. Préserver les actions serveur et les accroches de guidage lors de l’intégration.
- L’Impérial reste absent du catalogue. Les skins de portail et autres produits non commercialisés ne deviennent pas des offres. Le calendrier et les packs de la BOUTIQUE ne sont pas déplacés dans ce lot.
- Prévoir l’adaptation aux petites fenêtres : navigation accessible, catalogue resserré et fiche détaillée consultable sans masquer le prix ni l’action. La photo fournie illustre uniquement la disposition desktop.

## Direction proposée

Même identité visuelle que le Hangar récemment refait : bleu nuit, cyan, métal discret et contraste lisible. Navigation à gauche avec les neuf entrées ; grille de grandes cartes au centre ; fiche d’achat à droite avec un grand visuel, caractéristiques regroupées et prix/action clairement hiérarchisés. Les cartes exposent le nom, la rareté, le rôle, l’état et le prix, sans répéter toute la fiche technique. La recherche est une amélioration proposée, absente de l’interface actuelle.

La maquette présente Valkyrie avec les huit capacités de base vérifiées et son prix de 500 000 crédits. Les soldes et la possession d’Orion/Velox sont ceux d’un profil de démonstration. Le visuel de Valkyrie reprend l’asset fourni ; certaines autres vignettes sont illustratives. L’implémentation utilisera les assets actuels de chaque objet et vaisseau.

## Livrables

- `output/magasin-concept-2026-10-23/magasin-proposition.png` : image de proposition, générée avec l’outil imagegen intégré, puis correction ciblée des libellés de classe.
- `prompt-magasin.txt` et `prompt-correction.txt` dans ce dossier : prompts exacts ; références : capture du Hangar existant et asset réel de Valkyrie.
- `catalogue-verifie.json` : inventaire par catégorie, prix, images, caractéristiques et descriptions servant de référence pour la future intégration.

La proposition initiale n’avait modifié ni runtime ni profil de production. L’intégration autorisée ensuite reprend les règles d’économie et les actions serveur existantes ; son périmètre et ses preuves sont détaillés dans le compte rendu de refonte.
