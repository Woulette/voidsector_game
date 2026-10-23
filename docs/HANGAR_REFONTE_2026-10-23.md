# Hangar Avosoma - premiere etape graphique

Date : 23 octobre 2026. Statut : publie sur https://avosoma.absyrion.com/,
version `20261023-hangar1`.

## Perimetre

La maquette approuvee est traduite en HTML/CSS et utilise les vrais assets Orion,
Velox et le logo Avosoma. Cette premiere etape concerne l'en-tete du lanceur,
la navigation du hangar et la page « Mes vaisseaux ». Les autres pages profitent
de l'en-tete ; leur contenu ne fait pas encore l'objet d'une refonte.

La liste des possessions est placee a gauche, l'apercu au centre et les statistiques
calculees ainsi que les actions a droite. La liste defile avec une flotte complete.
Sur tablette et mobile, les colonnes se reorganisent et la page reste defilable.

Les compteurs affichent les nombres complets, avec espaces francaises et chiffres
tabulaires. Les deux monnaies ont ete verifiees a 100 000 000 000 simultanement.
Le montant exact reste disponible au survol et dans le nom accessible. Aucun
changement de solde, de prix ou de regle economique n'est introduit.

## Integration

- `src/styles/launcher.css` : en-tete, identite, monnaies et onglets ; selecteurs
  limites a `#dashboard` pour conserver l'interface de combat.
- `src/styles/hangarShowcase.css` : presentation et adaptations d'ecran du hangar.
- `src/ui/renderHangarShowcase.js` : modele de presentation et rendu ; aucun achat,
  equipement ni mutation de profil. Conservation du focus et du defilement.
- `src/ui/launcherCurrency.js` : formatage integral des monnaies du lanceur.
- `src/ui/render.js` : composition a partir des possessions filtrees par role,
  de `getShipCombatStats` et des equipements reels.
- `src/app.js` : selection d'apercu distincte de l'ouverture d'inventaire ;
  changement de vaisseau par le chemin serveur deja existant.
- `src/app/profileController.js` : conservation de l'apercu local pendant une
  synchronisation, repli sur une possession valide si elle disparait.
- `src/ui/tutorialStages.js`, `src/styles/tutorial.css` : reperes selection puis
  inventaire ; la progression attend toujours le vrai panneau d'equipement.
- `index.html`, `styles.css` : structure et chaine d'imports versionnee
  `20261023-hangar1`.

L'inventaire detaille, les onglets drones/competences/profil, le statut premium et
le dock administrateur conservent leurs points d'entree et leurs conditions.
Le serveur reste l'autorite pour le vaisseau actif et les equipements.

## Verifications

Suite serveur complete : **1 358 / 1 358 tests reussis**, apres la mise a jour
concurrente du domaine poursuite des ennemis. Le premier passage avait rencontre
15 echecs dans ce domaine ; ces fichiers ont ensuite ete modifies par un autre
travail. Aucun fichier d'IA ni de combat n'a ete corrige par cette refonte.

Suite ciblee tutoriel, profil, hangar et monnaies : **167 / 167**. Les derniers
ajustements de presentation ont egalement passe les 16 tests hangar, monnaies,
en-tete et premium. Syntaxe des modules modifies et `git diff --check` valides.

Verification navigateur sur API isolee `127.0.0.1:3337`, client `127.0.0.1:3338` :

- Comptes jetables separes des profils reels, aucune configuration de production.
- Montants de 100 milliards simultanes ; pas de debordement horizontal a
  1912, 1366, 768, 390 et 320 pixels de large.
- Selection Orion sans activation ; activation Orion puis Velox confirmee par le
  serveur ; ouverture du bon inventaire et retour depuis les autres onglets.
- Neuf vaisseaux : selection du dernier et defilement de la liste.
- Navigation vers magasin, portails, raffinerie, firme, boutique et classement.
- Tutoriel : ouverture du magasin, achat Velox et MK-I, ouverture Orion,
  desequipement confirme, selection puis inventaire Velox, activation,
  equipement de trois lasers distincts, drone et lance-roquette, depart.
- Arrivee en vie sur Helion-01 avec Velox et passage a `game_open_quests_2`,
  confirme dans le profil serveur isole. Credits 140 000 et NOVA 5 000 apres achats.
- Aucun message d'erreur console dans le parcours verifie.

La premiere quete est une fixture preparee avec les actions serveur de quete.
La verification navigateur commence au retour au hangar ; elle ne constitue pas
une execution complete du tutoriel ni une partie de combat complete.

## Preuves et reprise

Dossier : `output/launcher-hangar-2026-10-23/`.

- `before/` : copies des fichiers touches avant cette intervention.
- `server-tests-final.log`, `server-tests-final-context.json` : suite et contexte.
- `focused-final-tests.log` : tests cibles.
- `browser-tutorial-result.json` : assertions sur le vrai profil de test persiste.
- `tutorial-new-inventory-target.png`, `tutorial-departure-verified.png` : parcours.
- `hangar-integre-100-milliards.png` : rendu reel de la premiere etape.
- `runtime-manifest.json` et `review.diff` : fichiers et changements de ce lot.

Le lanceur local peut etre relance avec
`node output/launcher-hangar-2026-10-23/start-sandbox.mjs`.
Ne pas recopier les fichiers d'identifiants, les donnees de test ni toute la copie
de travail vers la production.

## Publication

Le lot de 11 fichiers frontend est publie sur Netcup. Les empreintes ont ete
controlees sur disque puis par HTTPS pour les 11 fichiers. La page d'entree est
installee en dernier ; les alias des autres travaux deja publies sont conserves.
Le service n'a pas ete redemarre : PID `3688379` inchange, PostgreSQL disponible.
Sauvegarde : `/opt/avosoma-backups/20261023-hangar1`.

Les 167 tests cibles passent egalement sur une copie du code reel de production
avec ce seul lot ajoute. Verification dans le navigateur public avec la session
existante : hangar charge, Orion et Velox presents, selection d'apercu et
statistiques du Velox actif conformes, aucune erreur console relevee. Aucun
achat, equipement ou combat sur le compte de production pour ce controle.

Preuves : `release/deployment.log`, `release/public-verification.json`,
`release/staged-focused-tests.log` et `release/public-hangar.png` dans le dossier
de preuves. Le code deja publie mais absent de l'ancien historique Git est
enregistre comme base distincte avant le commit de refonte ; les travaux locaux
non publies restent dans la copie de travail.

Une publication concurrente `20261023-minimap4` a ensuite ajoute ses alias dans
la page d'entree publique. Le HTML du lanceur reste identique hors importmap et
les dix autres fichiers du lot conservent leurs empreintes. Le commit Git garde
ces alias ainsi que les fichiers du push concurrent. Preuves :
`release/public-index-concurrent.json` et `release/public-index-concurrent.html`.
Les 25 fichiers de tests anciens devenus incompatibles avec le code deja publie
ont ete synchronises avec leurs versions locales verifiees : 299 tests cibles,
puis 823 tests de la copie Git preparee passent. Aucun code de production n'a
ete modifie pour adapter ces anciens tests.
