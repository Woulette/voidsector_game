# Boutique : offres de monnaie en lignes

La rubrique NOVA et credits reprend la presentation validee par le createur : six lignes de comparaison, avec illustration et reserve complete a gauche, avantage par euro au centre, prix blanc et commande dans deux colonnes alignees a droite. Le montant apparait directement sur le fond bleu nuit, sans encadre interieur. Les offres a 24,99 euros et 99,99 euros conservent leurs badges et se distinguent par un liseret cyan ou dore.

Chaque avantage indique explicitement sa monnaie : par exemple « +50 % de NOVA par euro ». Les pourcentages restent entiers, arrondis vers le bas comme auparavant. La premiere offre affiche « Pack de reference ». La note sous la liste precise la quantite et le prix de reference ainsi que le fait que les quantites comprennent deja cet avantage. La meme regle s'applique aux credits, y compris au rendement legerement inferieur de l'offre a 5,99 euros.

Les prix, quantites, identifiants d'offres, vraies illustrations du jeu et actions de consultation sont conserves. Les achats en euros restent indisponibles. Aucune logique serveur ou attribution de monnaie n'est modifiee.

Les quatre colonnes partagent leurs dimensions entre l'en-tete et les offres. Sur petit ecran, la disposition se replie pour conserver les quantites entieres et des commandes accessibles sans defilement horizontal. Les rubriques Premium, Packs et calendriers conservent leur presentation.

Publication frontend selective 20261024-currency-rows1, avec index.html en dernier et sans redemarrage serveur. Captures, validations et manifestes : output/currency-rows-20261024/.

Validation : 60 tests cibles reussis et syntaxe JavaScript verifiee. Le navigateur controle les deux monnaies sur 14 largeurs de 320 a 1 912 pixels : 28 presentations sans debordement de page, de ligne ou de montant, et sans chevauchement entre prix et boutons. Les couleurs des badges et la lisibilite des 330 000 000 credits sont aussi inspectees en image. La fiche du pack 265 000 NOVA ouvre bien le prix de 99,99 euros et conserve le bouton de paiement indisponible.
