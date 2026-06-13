# Refonte complete du systeme de firme

## Objectif

Construire un systeme MMO de firme complet, persistant et autoritaire serveur autour de trois valeurs :

- reputation : debloque les paliers de la boutique de firme ;
- firmatons : monnaie personnelle depensee dans la boutique de firme ;
- points de firme : alimentent le classement saisonnier des quatre firmes.

Ce document sert aussi de relais entre sessions ou IA. Il doit etre mis a jour apres chaque bloc termine.

## Decisions validees avec le createur

- Conserver la regle actuelle : un monstre de niveau adapte rapporte 1 point de firme.
- Un point gagne pour la firme compte aussi comme contribution saisonniere personnelle.
- Un kill PvP ennemi rapporte 100 points pendant les 5 premiers kills quotidiens de la meme cible, puis 5 points.
- Le classement individuel saisonnier regroupe tous les joueurs des quatre firmes.
- La recompense individuelle ne depend pas du classement final de la firme.
- La recompense collective de firme exige au moins 10 000 points de contribution personnelle sur la saison.
- Les firmatons sont visibles uniquement dans la page principale FIRME.
- Le bouton CLASSEMENT existant est hors perimetre et ne doit pas etre modifie.
- Le bouton FIRME du menu principal ouvre la page detaillee complete.
- Le bouton Firme en jeu ouvre une interface condensee :
  - classement des firmes ;
  - classement individuel ;
  - recompenses ;
  - quetes de firme et progression ;
  - position de sa firme face aux concurrentes.
- L'ancienne interface firme en jeu est un prototype a remplacer entierement.
- Le serveur est autoritaire sur les points, contributions, firmatons, achats, boites et recompenses.
- Le mode local legacy doit rester jouable ; les fonctions MMO avancees peuvent afficher un etat indisponible hors connexion.

## Perimetre fonctionnel final

### Page principale FIRME

- vue d'ensemble de la saison et de la firme du joueur ;
- firmatons, reputation et prochain palier boutique ;
- boutique de firme avec verrouillage par reputation ;
- inventaire et ouverture des boites ;
- quetes quotidiennes et hebdomadaires ;
- classement des quatre firmes ;
- classement individuel global ;
- recompenses collectives et individuelles prevues ;
- recompenses en attente et historique recent.

### Interface Firme en jeu

- resume de saison ;
- classement des quatre firmes ;
- classement individuel global ;
- quetes quotidiennes/hebdomadaires et contribution du joueur ;
- recompenses prevues ;
- aucune boutique et aucun affichage des firmatons.

### Quetes quotidiennes

- 06h00 : tuer 5 000 Orbes ;
- 12h00 : tuer 5 000 Vorak Rushers ;
- 18h00 : terminer 100 portails ;
- duree maximale : 24 heures apres activation ;
- points de firme : 25 000 / 18 750 / 12 500 / 0 selon completion en moins de 6h / 12h / 24h ou echec ;
- aucune recompense personnelle de contribution : la quete donne uniquement des points a la firme ;
- une prime de reclamation de 5 firmatons est disponible pour les membres de la firme quand leur firme termine la quete, meme sans contribution personnelle ;
- contribution affichee a titre de suivi, sans alimenter le classement individuel.

### Quetes hebdomadaires

- 3 objectifs collectifs actifs par semaine ;
- progression automatique, sans acceptation joueur ;
- points de firme attribues uniquement a la firme qui termine l'objectif ;
- aucun point individuel et aucune recompense personnelle directe depuis ces quetes.

### Saisons

- duree cible : environ 1 mois ;
- classement des firmes par points ;
- classement individuel global par contribution ;
- recompense collective conditionnee par le seuil personnel de 10 000 points ;
- une seule recompense individuelle, correspondant au meilleur rang/palier ;
- recompenses mises en attente et reclamees explicitement par le joueur.

### Boutique et boites

- paliers de reputation par rarete :
  - Commun : 10 000 / 25 000 / 50 000 ;
  - Rare : 75 000 / 125 000 / 200 000 ;
  - Tres rare : 300 000 / 450 000 / 650 000 ;
  - Elite : 900 000 / 1 200 000 / 1 600 000 ;
  - Mythique : 2 000 000 / 3 000 000 / 5 000 000 ;
- raretes : commun / rare / tres rare / elite / mythique ;
- boites achetables en firmatons ;
- ouverture et tirage entierement serveur ;
- probabilite de la table du rang de la boite : 33%, sinon table inferieure, sauf boite commune ;
- les references a des munitions ou ressources inexistantes dans le catalogue actuel doivent utiliser le meilleur equivalent existant sans inventer silencieusement un nouvel equipement.

## Architecture cible

### Serveur

`server/src/firms/firmWar.js`

- reste une facade compatible avec les appels existants ;
- compose les sous-domaines ;
- expose les snapshots publics.

Sous-modules a creer :

- `server/src/firms/firmRules.js`
  - constantes, paliers, catalogues, recompenses et fonctions pures ;
- `server/src/firms/firmState.js`
  - etat initial, migration et sanitization ;
- `server/src/firms/firmSeason.js`
  - points, contributions, classement, cloture et recompenses en attente ;
- `server/src/firms/firmQuests.js`
  - rotations quotidiennes/hebdomadaires, progression automatique et classements de contribution ;
- `server/src/firms/firmEconomy.js`
  - firmatons, boutique, boites, ouverture et application des gains ;
- `server/src/firms/firmPvp.js`
  - compteur anti-farm quotidien ;
- `server/src/socket/firmHandlers.js`
  - sync, achat, ouverture, reclamation et erreurs.

Donnees personnelles protegees dans le profil :

- `firmatons` ;
- `firmBoxes` ;
- `firmRewardHistory` ;
- `firmPendingRewards` si necessaire.

Donnees globales persistantes dans l'etat firme :

- dates de saison ;
- points par firme ;
- contributions individuelles ;
- quetes et progression par firme ;
- contributions par quete ;
- anti-farm PvP quotidien ;
- derniere saison cloturee et recompenses calculees.

### Client

Nouveaux modules cibles :

- `src/ui/renderFirm.js` : page FIRME principale ;
- `src/styles/firm.css` : page FIRME et composants partages ;
- `src/multiplayer/firmCommands.js` : commandes Socket.IO du domaine ;
- `src/multiplayer/firmSocketListeners.js` : snapshots, resultats et erreurs ;
- `src/game/ui/combatFirmPanel.js` : rendu condense utilise par `combatPanels.js`.

Les facades existantes (`app.js`, `client.js`, `combatPanels.js`, `combatOrchestrator.js`) ne recoivent que le branchement minimal.

## Contrat de donnees public vise

`firm:snapshot` contient au minimum :

- saison en cours et temps restant ;
- classement des firmes ;
- classement individuel global ;
- resume personnel du joueur ;
- quetes actives et progression des quatre firmes ;
- recompenses prevues et en attente ;
- catalogue boutique uniquement lorsque demande depuis la page principale.

Actions client :

- `firm:sync` ;
- `firm:shop-buy` ;
- `firm:box-open` ;
- `firm:reward-claim`.
- `firm:quest-claim`.

## Ordre d'implementation

1. Extraire les regles pures et migrer `firmWarManager` sans changer le gameplay actuel.
2. Ajouter contributions individuelles, saison mensuelle et anti-farm PvP.
3. Ajouter firmatons/boites aux profils avec protection contre `profile:save`.
4. Ajouter boutique, ouverture de boites et reclamation de recompenses serveur.
5. Ajouter quetes quotidiennes collectives et progression par evenements serveur.
6. Creer la page principale FIRME sans toucher au bouton CLASSEMENT.
7. Remplacer l'interface firme en jeu par le panneau condense.
8. Ajouter tests serveur, tests purs client et verification visuelle.
9. Mettre a jour `MMO_REFACTOR_NOTES.md`.

## Etat de reprise

Derniere mise a jour : 13 juin 2026.

Etat actuel :

- specification finale relue ;
- decisions du createur consignees ;
- domaine serveur firme extrait et rendu autoritaire :
  - points de firme et contribution personnelle ;
  - saison mensuelle ;
  - classement firme et classement individuel global ;
  - seuil collectif personnel de 10 000 points ;
  - anti-farm PvP quotidien ;
  - quetes quotidiennes et hebdomadaires auto-actives ;
  - quetes quotidiennes calees sur 06h/12h/18h en heure locale serveur, avec 3 prochaines quetes verrouillees dans le snapshot ;
  - completion de quete attribuant uniquement des points a la firme ;
  - reclamation individuelle de prime de quete terminee, une seule fois par joueur et par firme ;
  - objectifs saisonniers personnels separes des quetes collectives, avec points joueur + firme et recompense en attente ;
  - progression des quetes de monstres separee du point de firme direct : un monstre trop bas niveau ne donne pas le point direct, mais compte quand meme pour les quetes ;
  - participation de quete affichee separement de la contribution saisonniere reelle ;
  - Orbes corriges sur le vrai `kind` serveur `drone_pirate`, avec alias `sentinel_orb` pour compatibilite ;
  - completions de portails comptent `+1` pour les quetes de portail de chaque membre concerne ;
  - boutique de firme, remises par reputation, boites et ouverture serveur ;
  - recompenses en attente et reclamation explicite ;
- champs personnels de firme proteges contre `profile:save` :
  - `firmatons` ;
  - `firmBoxes` ;
  - `firmRewardHistory` ;
- page principale FIRME ajoutee dans le menu principal, sans modifier le bouton `CLASSEMENT` ;
- onglet `SAISONNIERES` ajoute aux quetes de la page FIRME, avec cartes compactes adaptees aux nombreux objectifs solo ;
- icone Firmaton creee puis renforcee visuellement : `assets/icons/firmaton.svg` ;
- affichage Firmaton uniformise dans la page FIRME :
  - montant suivi de l'icone, sans libelle repete dans la boutique, les primes de quete et les recompenses ;
  - F noir agrandi et contraste de la piece renforce pour rester lisible en petit ;
- boutique de firme restructuree :
  - 5 zones de rarete (`Commun`, `Rare`, `Tres rare`, `Elite`, `Mythique`) ;
  - filtres `Global` + une entree par rarete ;
  - 3 paliers de reputation par rarete, avec 3 offres par palier ;
  - 9 offres minimum par rarete, soit 45 offres catalogue ;
  - cartes boutique avec visuel d'objet, prix en Firmaton et etat verrouille/debloque ;
  - offres de munitions laser alignees sur le catalogue d'equipement (`Munition M-2`, `Munition M-3`, `Munition M-4`, `Munition M-6`) et leurs vrais assets ;
- coffres de firme ajoutes :
  - 5 SVG de coffres par rarete dans `assets/firm/chests/` ;
  - 3 concepts SVG supplementaires (`concept_vault`, `concept_relic`, `concept_crate`) pour choix artistique futur ;
  - planche de comparaison locale : `assets/firm/chests/preview.html` ;
  - inventaire de coffres affiche avec les assets de rarete, plus seulement des libelles texte ;
  - ouverture de coffre affichee au centre de l'ecran avec rotation, ouverture du couvercle et revelation de la recompense ;
  - recompense revelee avec l'asset reel et la quantite (`Munition M-2 x 5000`, ressource, credits, nova, firmatons, coffre, etc.) ;
- pipeline des futures ressources dropables defini dans `ASSET_PIPELINE.md` :
  - master realiste transparent en PNG `512x512` ;
  - derive WebP `256x256` pour boutique/inventaire ;
  - derive WebP `128x128` pour les drops au sol ;
  - gamme complete de huit ressources communes produite dans `assets/resources/common/` :
    - cables de cuivre ;
    - plaques d'acier ;
    - polymere isolant ;
    - circuits imprimes ;
    - condensateurs ceramiques ;
    - lentilles optiques ;
    - poudre propulsive ;
    - reservoirs pressurises ;
  - masters transparents conserves dans `assets/resources/common/masters/` ;
  - planche de validation complete : `assets/resources/common/preview.html` ;
  - poids mesure : 251,9 Ko en PNG 512, 16,9 Ko en WebP 256 et 5,8 Ko en WebP 128 ;
  - total mesure des huit assets : 110,2 Ko pour la boutique et 39,2 Ko pour les drops ;
  - les huit ressources communes sont branchees au catalogue, a la boutique de firme et aux drops serveur ;
  - la zone commune de la boutique contient maintenant exactement 1 coffre et 8 ressources ;
  - chaque achat de ressource commune donne exactement 1 unite ;
  - gammes Rare, Tres rare, Elite et Mythique produites en v2 dans `assets/resources/rare/`, `assets/resources/veryRare/`, `assets/resources/elite/` et `assets/resources/mythic/` ;
  - chaque rarete avancee contient exactement 8 ressources craftables + 1 coffre dans la boutique de firme ;
  - tous les achats de ressources de firme donnent exactement 1 unite, quelle que soit la rarete ;
  - les pools de drops serveur utilisent maintenant 8 ressources par rarete, avec `dropImg` WebP 128 ;
  - preview globale de validation : `assets/resources/preview_all_v2.png` ;
  - les drops au sol utilisent les derives WebP 128, tournent sur eux-memes et oscillent legerement ;
  - le ramassage d'une ressource joue une aspiration de 0,7 seconde et bloque temporairement le mouvement ;
  - les drops de ressources sont prives, tires et valides cote serveur ;
- colonne gauche des quetes simplifiee :
  - suppression de la progression cumulee artificielle et de la mission suivie ;
  - affichage compact des sessions datees du jour, ouvertes ou prevues plus tard dans la journee, sans celles du lendemain ;
  - prochaine session affichee sous forme de compte a rebours ;
- libelles de participation de quete clarifies pour ne pas les confondre avec la contribution individuelle saisonniere ;
- interface firme en jeu remplacee par un panneau condense :
  - resume ;
  - firmes ;
  - joueurs ;
  - quetes ;
  - gains ;
  - aucun affichage de boutique ni de montant de firmatons ;
- broadcasts temps reel corriges :
  - `firm:ranking` reste public ;
  - `firm:snapshot` reste personnel et n'est plus diffuse globalement par kills/portails ;
- tests serveur ajoutes et passes.

Dernieres verifications effectuees :

- `node --check` sur les fichiers JS modifies : OK ;
- `node --test` dans `server` : 73 tests OK ;
- `node --test server/test/firm-war.test.js server/test/firm-system.test.js` : 17 tests OK apres separation anti-farm/quetes ;
- `git diff --check` : OK, uniquement avertissements LF/CRLF Windows ;
- `npm test` dans `server/` : 75 tests OK ;
- `git diff --check` : OK ;
- `npm test` dans `server/` apres ajout coffres/animation : 76 tests OK ;
- `npm test` dans `server/` apres niveaux, multiplicateurs et drops de ressources : 81 tests OK ;
- `git diff --check` apres ajout coffres/animation : OK, uniquement avertissements LF/CRLF Windows ;
- verification visuelle navigateur : non effectuee, car le navigateur integre `iab` etait indisponible dans cette session.

Prochaine action recommandee si reprise :

- ouvrir le jeu sur `http://127.0.0.1:5500`, cliquer sur le nouveau bouton `FIRME`, verifier les onglets `Vue d'ensemble`, `Boutique`, `Quetes`, `Classements`, `Recompenses`, puis ouvrir le panneau Firme en combat ;
- verifier visuellement que les quetes journalieres affichent 3 quetes ouvertes, 3 prochaines verrouillees, les images d'objectifs et le bouton de reclamation quand une firme termine une quete ;
- si un ajustement visuel est necessaire, le faire dans `src/styles/firm.css` et `src/styles/game.css` uniquement, sauf bug fonctionnel.

## Verification obligatoire

- `node --check` sur chaque fichier JS modifie ;
- `npm test` dans `server/` ;
- tests dedies aux classements, seuil de 10 000 points, anti-farm, quetes, achats et boites ;
- `git diff --check` ;
- verification visuelle de la page FIRME et du panneau firme en jeu ;
- confirmation que le bouton CLASSEMENT existant reste inchange.
