# Confort visuel du tableau de bord — 24 octobre 2026

Demande validée : conserver les nouveaux visuels, retrouver un cadre centré et une échelle homogène à 100 % de zoom, avec des marges sur grand écran et un défilement vertical normal.

## Périmètre

- Nouveau module `src/styles/dashboardComfort.css`, chargé après les styles des pages.
- Cadre commun plafonné à 1 440 px : accueil, hangar, magasin, portails, raffinerie, firme, boutique et classement.
- Bandeau, navigation et titres ramenés à une échelle fixe sur les grands écrans ; sous-pages drones, compétences et profil incluses.
- Hangar : présentation limitée à 520 px de haut, sous-pages plafonnées à une hauteur de tableau de bord de 900 px, avec adaptation aux fenêtres plus courtes.
- Magasin : illustrations et espaces des cartes réduits, deux colonnes de vaisseaux conservées, trois colonnes d’équipement lorsque la largeur le permet ; achat et fiche restent à leur place.
- Portails : navigation, dossier et Space Caster rapprochés ; zone des résultats moins haute, conservée au-dessus des commandes.
- Raffinerie, offres Premium, firme et classement : proportions des grands blocs et des titres harmonisées.
- Classement mobile : la table large défile dans son panneau et ne déborde plus de la page.

Le changement concerne la présentation du tableau de bord. Le catalogue, les prix, les commandes d’achat, les profils et le serveur ne sont pas modifiés.

## Vérification

- 101 tests locaux réussis dans 13 fichiers de tests existants.
- 100 tests applicables réussis sur le candidat construit depuis la production. Une assertion de contenu est exclue explicitement : la refonte locale d’Azuron attend 30 vagues, tandis que le jeu publié en comporte 20. Le fichier `src/data/progression.js` du candidat est contrôlé identique à celui du serveur. Cette refonte n’entre pas dans le lot CSS ; l’échec initial est conservé dans `candidate-tests-failed.txt` et l’exclusion dans `validation-exclusion.json`.
- 203 parcours de mise en page : 29 rubriques sur 1 920 × 946, 1 366 × 768, 1 024 × 768, 390 × 844, 2 560 × 1 440, 1 280 × 800 et 1 101 × 760.
- Après la publication parallèle du nouvel accueil, nouvelle lecture de la production et 56 contrôles supplémentaires des huit pages sur ces sept formats. Son HTML, ses imports et sa feuille de style sont conservés ; les dimensions communes s’appliquent aussi à l’accueil.
- Aucun débordement horizontal de page, panneau sorti du cadre, image manquante ou chevauchement prix/bouton après correction du classement mobile.
- 46 fiches d’articles ouvertes puis fermées à 1 366 × 768 : fenêtres dans l’écran, pied d’achat visible, prix et bouton distincts, focus rendu au bouton d’origine.
- Bandeau contrôlé avec Premium actif, nom long et grands montants sur trois largeurs : aucune collision ni somme tronquée.
- Contrôles avec les vrais modules de rendu publiés et un profil synthétique dans un environnement local. Aucun achat réel ni modification de compte pour les essais.

## Publication

Lot frontend publié : `20261024-comfort1`, limité à `src/styles/dashboardComfort.css`, `styles.css` et au lien CSS de `index.html`. Les imports et les travaux des autres chats sont conservés depuis la version en ligne. Le garde-fou d’empreintes a arrêté un premier envoi lors de la publication parallèle de l’accueil, avant toute écriture ; le lot a ensuite été reconstruit et validé sur cette nouvelle version.

- Trois empreintes HTTPS identiques au candidat ; nouvelle feuille effectivement chargée par le site public.
- Huit pages revérifiées avec les styles servis par HTTPS et le profil de test, sans anomalie ; captures `home-publie.jpg`, `hangar-publie.jpg`, `shop-publie.jpg` et `portals-publie.jpg`.
- Démarrage public contrôlé jusqu’à l’écran de connexion, sans erreur ni avertissement dans la console. Aucun compte réel connecté pendant cette vérification.
- Service actif, PID 928637 conservé, `NRestarts=0` ; PostgreSQL prêt ; aucune nouvelle erreur du service depuis la publication.
- Sauvegarde de retour : `/opt/avosoma-backups/20261024-comfort1`. Aucun redémarrage serveur pour ce lot.

Les archives, contrôles et captures se trouvent dans `output/dashboard-confort-2026-10-24/`. Le détail est conservé dans `manifest.json`, `validate.log`, `browser-verification.json`, `public-boot.json` et `final-verification.json`.
