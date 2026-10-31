# Hangar : statut Premium compact et page fixe

Date : 23 octobre 2026. Version : `20261023-hangar2`.
Statut : publie sur https://avosoma.absyrion.com/ et verifie.

Le statut Premium et le bouton administrateur sont integres aux actions de la
ligne pilote. Leur affichage ne cree plus une troisieme ligne d'en-tete.
Les libelles d'abonnement et de temps restant restent dans le DOM, avec leur
statut accessible et la mise a jour du temps existante ; la presentation est
compacte. Les monnaies restent affichees integralement.

Sur ordinateur, la vue « Mes vaisseaux » utilise la hauteur disponible du
viewport apres l'en-tete et les onglets. Les conteneurs flexibles remplacent le
calcul fixe de hauteur et son minimum de 405 pixels. La liste des possessions
defile independamment ; l'apercu, les statistiques et les boutons restent
visibles. Le correctif ne cache pas globalement le debordement du document.

Le comportement fixe concerne seulement la liste de vaisseaux, a partir de
1101 pixels de large et de 640 pixels de haut. L'inventaire detaille, les autres
onglets, les petits ecrans et le fort agrandissement conservent le defilement
normal pour rendre leur contenu accessible.

## Verification

- 37 tests existants hangar, monnaies, Premium et tutoriel reussis.
- Sept dimensions de viewport : 1912x947, 1912x901, 1366x768, 1366x720,
  1366x681, 1101x720 et 1280x640.
- Chaque dimension controlee sur une flotte de neuf vaisseaux sans Premium,
  puis avec Premium et bouton administrateur : document sans debordement
  horizontal ou vertical, actions entierement visibles, liste defilante.
- Positions des onglets identiques entre ces deux etats : 200 pixels sur les
  grands formats, 190 pixels sur les autres. En-tete : 164 ou 160 pixels.
- Deux soldes de 100 milliards simultanes, integralement lisibles.
- Acces au dernier vaisseau au clavier ; la page reste en position zero.
  La molette fait defiler la liste sans deplacer le document.
- Drones, Competences, Profil et inventaire detaille accessibles et defilants.
- Verification mobile 390x844 et 320x740 : contenu et Premium accessibles,
  sans debordement horizontal.
- Aucune erreur console relevee pendant ces controles.

Les comptes et profils de test appartiennent exclusivement aux API locales
isolees 3337 et 3339. Le cas Premium a ete prepare dans la copie de test ; aucun
abonnement ni compte de production n'a ete modifie pour ces essais.

Preuves : `output/hangar-layout-fix-2026-10-23/browser-layout-checks.json` et
`output/hangar-layout-fix-2026-10-23/premium-desktop-fixed.png`.

## Publication

Lot limite a `index.html`, `styles.css`, `src/styles/launcher.css` et
`src/styles/hangarShowcase.css`. La page publique courante sert de base pour
conserver les importmaps et autres travaux concurrents. Aucun fichier JavaScript,
serveur, economie, configuration ou profil de production n'est inclus.

Les quatre empreintes correspondent sur disque et par HTTPS. La page d'entree
a ete installee en dernier. Sauvegarde :
`/opt/avosoma-backups/20261023-hangar2`. Aucun redemarrage par ce lot : le PID
`3761669` et le compteur de redemarrages sont identiques avant et apres.

Controle dans le navigateur public avec la session Premium existante : badge
visible dans la ligne pilote, viewport 1912x900 et document de 900 pixels de
haut, position de page zero, bas des actions a 858 pixels. Aucune erreur console.
La selection du Velox change seulement l'apercu ; aucun achat, equipement ou
depart en combat n'a ete effectue pendant ce controle.
Capture : `output/hangar-layout-fix-2026-10-23/public-premium-fixed.png`.
