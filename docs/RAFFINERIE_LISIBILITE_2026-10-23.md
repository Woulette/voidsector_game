# Raffinerie : espace et lisibilite

Correction de la refonte du 23 octobre, apres controle de la capture reelle du joueur.

- L'en-tete regroupe le titre, les trois onglets et les modules. Le grand bandeau descriptif redondant disparait de l'arbre.
- Raffinerie, Expedition et Bilan de production deviennent des boutons encadres, avec selection et focus visibles.
- Stockage et Transport affichent leur capacite, un badge Niveau explicite et, si present, le temps d'amelioration. Ils restent accessibles depuis les trois onglets.
- Les cartes affichent separement le nom, la quantite, Stock en station, le niveau complet et le debit. Le pied des cartes ne recouvre plus leur contenu.
- Le texte operationnel utilise au minimum 12 px, les noms 14 a 18 px et les actions principales 14 px. Le contraste est releve dans l'expedition, le bilan, les details et les confirmations.
- L'arbre garde ses onze materiaux et quatorze liens. Sous sa largeur lisible minimale, il defile horizontalement au lieu de reduire les textes.
- Raffinage en vol, perfectionnement et confirmation de depot utilisent les memes principes de lisibilite, avec controles de 42 a 44 px et defilement.

Le deplacement des boutons de module vers l'en-tete necessite seulement d'elargir leur delegation de clic a `.refinery-panel`. La confirmation reste dans `#refineryPanel`, les commandes et validations serveur sont inchangees.

## Verification

- Tests cibles : presentation raffinerie, synchronisation et dialogue de depot. Regression ajoutee pour l'ouverture puis la confirmation d'un module depuis l'en-tete sans mutation locale du profil.
- Controle navigateur des trois onglets, de l'amelioration de stockage en cours, du raffinage, du perfectionnement et du dialogue de depot.
- Scenarios visuels : niveaux 1, 3 et 20, stocks jusqu'a 10 millions, ecrans 1920 et 1366 px, panneaux en vol controles aussi a 860, 680 et 480 px.
- Mesures DOM : texte operationnel >=12 px, aucun recouvrement stock/pied de carte ni collision des deux valeurs du pied aux niveaux maximums. En-tete mesure a 77 px dans le scenario standard 1920 px.
- Donnees de test isolees et non persistantes. Aucune depense de materiaux ou de monnaie sur un compte reel pendant les controles.

Preuves : `output/refinery-readability-20261023/validation/`. Publication restreinte : `20261023-refinery2`, avec manifestes et sauvegarde dans le dossier `release/`.

## Publication verifiee

Les huit fichiers sont installes et leurs empreintes HTTPS concordent. Les 112 cibles d'import publiques repondent correctement. Le service conserve son PID 3943270 sans redemarrage ; PostgreSQL reste pret. Sauvegarde distante : `/opt/avosoma-backups/20261023-refinery2`.

Controle supplementaire dans une vraie session du hangar public : trois onglets ouverts, Stockage ouvre son amelioration en cours, onze materiaux et aucune image manquante. Les libelles mesures restent a 12 px minimum ; aucun recouvrement du stock par le pied des cartes et aucune alerte/erreur console. Aucune amelioration ni expedition lancee pendant ce controle.
