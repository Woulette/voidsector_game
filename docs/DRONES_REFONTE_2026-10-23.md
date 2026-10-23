# Refonte de la baie de drones — 23 octobre 2026

La page Drones du Hangar reprend la maquette validée : aperçu et achat à gauche, huit places standards et deux places supplémentaires au centre, équipement du drone sélectionné et inventaire à droite. Les assets, noms, raretés, prix et caractéristiques viennent du catalogue réel.

## Inventaire et équipement

- Une ligne par modèle, avec image réelle, rareté, quantité possédée, exemplaires disponibles et équipés. Les filtres proposent Tous, Lasers, Boucliers et Overdrive. Les matériaux et objets incompatibles restent dans les autres vues de l'inventaire.
- Le clic ouvre les exemplaires individuels et leurs emplacements réels : disponible, vaisseau ou drone. Le bouton « Équiper / Déplacer sur Drone XX » utilise l'UID de l'exemplaire choisi et l'index du drone sélectionné. Un remplacement remet le module précédent dans l'inventaire via le serveur existant.
- Les sélections Ctrl, le glisser-déposer et la vente existante conservent leurs contrôleurs. Le double clic sur un seul exemplaire et le bouton nommé ciblent le drone sélectionné ; une sélection multiple conserve le remplissage groupé existant. Une inspection du corps d'une tuile ne retire aucun module.
- Les groupes sont repliés au repos, y compris les modèles possédés en un seul exemplaire. L'actualisation conserve le défilement et le focus quand le contrôle existe toujours.

## Règles réelles conservées

- Huit drones standards achetables ; les anciens comptes possédant neuf ou dix drones conservent leurs drones utilisables sur les places supplémentaires. Les places non possédées n'acceptent aucun équipement.
- Prix du prochain drone : 200 000 × 2^nombre possédé crédits, jusqu'au plafond standard. Aucun changement du prix serveur.
- Canon MK-I Commun, MK-II et MK-III Rares, MK-IV Très rare, canons Élite et vrais générateurs A I / A II. Aucun générateur A III inventé.
- Le Noyau Overdrive exige La Faille de Vesper terminée. Il est consommé à l'installation et devient permanent : +50 % dégâts du laser ou capacité du bouclier, sans bonus de régénération ni retrait du noyau.
- Les données critiques ne sont jamais modifiées par le modèle de présentation. Achat, déplacement, remplacement, retrait et installation utilisent les commandes serveur existantes.

## Modules et mise en page

`renderDroneBay.js` compose la page et traite la sélection locale ; `droneBayModel.js` projette les getters existants et groupe les exemplaires ; `droneBayIcons.js` contient les pictogrammes ; `droneBay.css` limite les styles à cette page. L'ancien rendu inline est retiré de `render.js`, qui importe et réexporte la fonction historique. `app.js` branche le contrôleur avant les handlers UID existants et délègue le double clic d'un exemplaire au drone sélectionné.

À partir de 1101 × 720, la baie utilise la hauteur disponible du Hangar et seul l'inventaire défile. Sur tablette et mobile, les panneaux s'empilent avec le défilement normal de la page. Les grandes monnaies et le Premium restent gérés par l'en-tête existant.

## Validation

- 47 tests ciblés : 17 contrôles de présentation/intégration et 30 régressions achat, plafond, équipement multiple et Overdrive.
- 20 vérifications sur une copie du serveur de production : commandes Socket.IO réelles, persistance, refus et rollback, sans mutation de compte de production.
- Essais navigateur avec zéro, deux, huit et dix drones ; achat du premier drone, remplacement d'un canon choisi, installation d'un noyau, verrouillage avant Vesper et double clic ciblant le drone 10 sans modifier le drone 1.
- Contrôles de dimensions 1672 × 941, 1366 × 768, 1280 × 720, 1101 × 720, 1024 × 768, 720 × 900, 390 × 844 et 320 × 740 ; absence de débordement horizontal et hauteur unique sur les tailles desktop vérifiées. Premium et soldes de 100 milliards testés.
- Captures, mesures et rapports : `output/drones-refonte-2026-10-23/`.

## Publication

Version frontend : `20261023-dronebay1`. Manifeste limité à huit fichiers frontend ; aucune modification de serveur, de base, de profil, de combat ou de configuration.

Publiée sur Netcup et vérifiée sur `https://avosoma.absyrion.com/` : huit empreintes publiques conformes, treize aliases des modules modifiés vérifiés, santé PostgreSQL disponible et aucun nouvel avertissement pertinent. Le processus serveur 3768128 reste actif avec zéro redémarrage. Sauvegarde : `/opt/avosoma-backups/20261023-dronebay1`.

Contrôle navigateur public avec le compte existant et Premium actif : vrais objets et quantités, groupe ouvrable, fiche MK-III, achat non effectué et équipement désactivé sans drone. À 1912 × 901, la page mesure exactement la hauteur du viewport, les trois panneaux ne débordent pas et toutes les images sont chargées. Capture : `drone-public-premium.png`. Les essais d'achat et d'équipement ont été effectués uniquement dans le sandbox privé.
