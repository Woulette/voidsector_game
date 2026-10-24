# Finitions Boutique — 24 octobre 2026

Les offres restent dans le cadre commun de 1 440 px, avec les mêmes tarifs, quantités et commandes serveur.

## Présentation

- Tous les prix en euros sont blancs, sauf ceux du Premium OR, dorés, dans les lignes et fiches de la Boutique et du Magasin.
- Les cartes de monnaie à 24,99 € portent « Le plus populaire » ; celles à 99,99 €, « Le plus rentable ». Le premier badge est une mise en avant éditoriale demandée, pas une statistique de ventes.
- Chaque carte compare sa quantité par euro au pack à 1,99 € de la même monnaie. Le calcul utilise les centimes entiers et arrondit au dixième de point inférieur. Formule : `(quantité / prix) / (quantité de référence / prix de référence) - 1`.
- NOVA : référence, +13,9 %, +24,1 %, +36,5 %, +42,1 %, +50,6 %.
- Crédits : référence, −0,4 %, +26,7 %, +19,4 %, +27,3 %, +31,3 %. Le petit écart négatif du pack 15 millions à 5,99 € est conservé et affiché ; aucune quantité n'est changée pour créer un bonus.
- Les colonnes réservent la place au montant complet, y compris 330 000 000. Sur mobile le prix et le bouton passent sous l'image et la quantité.

## Packs et Bêta

L'onglet s'appelle maintenant « Packs ». `storePackCategories.js` définit les familles Tous, Vaisseaux, Boosters, Lasers et Ressources. Les deux offres réelles restent dans Vaisseaux ; les trois familles futures sont visibles « À venir » et désactivées tant que le catalogue ne contient pas d'offre. Les filtres ne modifient que l'état de présentation.

Les cartes Bêta affichent le vaisseau, tous les objets réels et leurs quantités en slots, le bonus de lancement et le prix. Le calendrier de 25 jours utilise la même palette et des états lisibles ; les identifiants historiques, contenus et attributs d'actions restent identiques. Les fiches et commandes existantes continuent à être utilisées.

## Validation

66 tests ciblés passent localement et sur la copie de production, avec contrôles syntaxiques des modules. Une comparaison de 1 364 instantanés d'actions Bêta avec les sources précédentes n'a trouvé aucun changement des achats, claims ou blocages.

Contrôle navigateur local : six formats de 390 à 1 912 px, montants complets sans chevauchement ni débordement, prix blancs et OR dorés, familles futures désactivées, trois packs Bêta et 25 jours visibles, aucune image manquante après chargement. Les captures et rapports se trouvent dans `output/boutique-polish-20261024/`.

Publication frontend vérifiée : `20261024-boutique4`, quinze fichiers limités à la Boutique, aux prix Premium du Magasin et à leur composition/cache. Le candidat utilise la version en ligne de `render.js`, `app.js`, `styles.css` et `index.html` afin de préserver le travail concurrent. Les quinze empreintes HTTPS sont conformes ; PostgreSQL est prêt et le processus serveur est resté identique (PID 1098285). Sauvegarde : `/opt/avosoma-backups/20261024-boutique4`. Le navigateur public confirme les badges, les six montants de crédits, les prix blancs et OR dorés, les catégories et les 25 jours Bêta. Aucune commande d'achat ni de récupération de récompense n'a été exécutée pendant cette vérification. Le paiement en euros reste à venir.
