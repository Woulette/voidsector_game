# Raffinerie : stocks et capacites visibles avant l'arbre

Le bandeau des onze stocks de station est retabli au-dessus de l'arbre de fabrication. Chaque case affiche le materiau, la quantite actuelle, une jauge proportionnelle au remplissage et le maximum numerique dans cette jauge. Aucun passage par le bilan ni survol n'est necessaire pour lire ces valeurs.

`refineryStocksHtml()` utilise les memes `stock` et `cap` que les cartes de l'arbre. Les plafonds proviennent du module Stockage actuel et des regles existantes de chaque type de materiau. Aucun plafond, cout, debit, recette ou profil n'est modifie par ce changement. Le remplissage reste borne a 100 % sans tronquer la quantite affichable si un ancien stock depasse sa capacite.

L'arbre, ses onze materiaux, ses quatorze connexions et les boutons d'amelioration et ON/OFF restent presents. La classe `.sky-stock-row` retablit aussi l'ancre deja utilisee par le tutoriel. L'affichage est actualise par le rendu existant et son patch DOM, sans nouvelle minuterie ni requete serveur.

Le bandeau mesure environ 85 px sur une ligne. Il conserve onze colonnes sur grand ecran, puis six/quatre/deux colonnes selon la place disponible. Les chiffres actuels restent a 18 px et les maxima a 12 px, y compris les grandes capacites de dix millions.

## Verification

- 36 tests cibles valides sur la copie exacte du serveur public avec la correction : presentation, production, perimetre des materiaux, regles et synchronisation.
- Trois tests supplementaires couvrent les onze materiaux et leurs vrais plafonds, les jauges vides, une capacite nulle, un stock excedentaire, les grands nombres et l'independance entre niveau de production et capacite de stockage.
- Deux modules JavaScript valides avec `node --check`.
- Controle navigateur isole avec le vrai rendu de raffinerie, donnees fictives et commandes serveur neutralisees. Le cuivre passe de 23 000 / 25 000 (92 %) a 24 000 / 25 000 (96 %) sans navigation vers le bilan. Les onze jauges et leurs plafonds sont visibles, sans texte coupe, sur 1920 et 1366 px, y compris au stockage maximum.
- Aucun achat, envoi, changement de production ou sauvegarde sur un compte reel pendant les controles.

Publication frontend `20261024-refinery-stock1` : cinq empreintes HTTPS concordent, 123 cibles d'import sont disponibles et PostgreSQL reste pret. Les 259 alias hors de ce changement sont preserves. Le service conserve le PID 4125505 sans redemarrage. Sauvegarde : `/opt/avosoma-backups/20261024-refinery-stock1`.

Les nouvelles propositions visuelles restent des apercus locaux ; la publication retablit seulement le bandeau fonctionnel dans la raffinerie actuelle. Preuves : `output/refinery-stock-overview-20261024/release/` et `validation/`.
