# Boutique : quantites de monnaie mises en valeur

Les six packs NOVA et les six packs credits conservent leurs quantites, leurs prix et leurs illustrations. Le montant recu dispose maintenant d'un encadre dore pour les NOVA et cyan pour les credits, avec un libelle de monnaie distinct. Le prix en euros reste blanc. Les badges du pack a 24,99 euros et de celui a 99,99 euros sont conserves.

Le bonus par euro s'affiche en pourcentage entier, arrondi vers le bas comme auparavant. Le calcul conserve sa precision interne ; la reference reste le pack a 1,99 euro, et une offre moins rentable reste identifiee par un pourcentage negatif. Les bonus sont places dans une pastille discrete sous le montant.

Les changements se limitent a supportStorePanels.js, storeCollections.css et aux versions de cache du navigateur. Aucun catalogue, montant attribue, prix, achat ou comportement serveur n'est modifie. Publication selective 20261024-currency-emphasis1 ; preuves dans output/currency-emphasis-20261024/.

Validation : 59 tests cibles et controles de syntaxe. Le navigateur verifie les deux monnaies sur 13 largeurs de 320 a 1 912 pixels : les 26 presentations gardent les montants complets dans leurs cadres, y compris 330 000 000 credits. Les cartes passent sur une colonne sous 600 pixels pour conserver une taille de texte lisible.
