# Accueil Avosoma — 24 octobre 2026

Integration de la proposition « Vue d’ensemble » validee : une page reposante dans le style du jeu, ouverte apres connexion au launcher et accessible avec le logo AVOSOMA.

- Classement limite aux trois premiers, plus la position reelle du compte connecte. Les lignes proviennent exclusivement du snapshot serveur. Les etats de chargement, d'absence de classement et de deconnexion n'inventent aucun adversaire ni position.
- Quete suivie choisie depuis les quetes actives et la selection courante. Les compteurs reutilisent les clefs et la progression du domaine quetes. Les objectifs multiples sont bornes separement ; un surplus sur un objectif ne termine pas les autres.
- Dialogue natif « Mes quetes en cours » : lecture des objectifs et compteurs, fermeture clavier, aucune acceptation ni recuperation locale de recompense.
- Vaisseau actif et raccourci vers le hangar. Les mises a jour de profil et de classement rafraichissent l'accueil sans rechargement.
- Navigation historique, depart en jeu, choix de firme et guidage du tutoriel conserves.

## Organisation

`src/ui/homePresentation.js` porte les modeles de presentation ; `src/ui/renderHome.js` compose le DOM et le dialogue ; `src/styles/home.css` reste limite a l'accueil et au bouton du logo. Les coordinateurs existants ne recoivent que les branchements.

## Verification

- 103 tests cibles locaux conformes : presentation accueil, classement, synchronisation du profil, rafraichissement, bandeau et tutoriel.
- Test navigateur sur un backend isole utilisant le code serveur deploye et quatre profils de test : authentification reelle, snapshot de classement `source=server`, position hors top 3, quete 2/3 et Velox, dialogue des quetes, navigation hangar/classement/logo.
- Changements de vaisseau effectues par les commandes authentifiees du serveur local : Orion puis Velox ; le bloc accueil suit le profil recu.
- Depart depuis l'accueil : ouverture du client jeu et affichage de l'ecran de jeu.
- Largeurs 1920, 1366, 1024, 768 et 390 px, sans debordement horizontal ; noms echappes ; aucune erreur JavaScript ni ressource HTTP en echec.
- Controle navigateur public apres publication : nouvelle feuille de style, dix nouveaux modules, trois blocs et vue initiale `home`, sans erreur JavaScript. Le contenu reste masque par la connexion requise tant que le compte n'est pas authentifie.
- Les profils et comptes de test restent dans `output/home-dashboard-2026-10-24/qa-backend/server/data/`. Aucun compte de production n'est cree ou modifie pour ces tests.

## Publication

Jeton prepare : `20261024-home1`. Candidat construit a partir des fichiers effectivement deployes, puis application des seuls changements de l'accueil. Les differences locales preexistantes dans index, styles, store et progression ne font pas partie du lot publie.

Publication effectuee le 24 octobre 2026 a 14 h 19 (Europe/Paris) : dix fichiers frontend, dix empreintes SHA-256 publiques conformes au candidat. Le meme jeu de 103 tests cibles passe aussi sur le candidat base sur le runtime deploye. Syntaxe des modules controlee avant publication locale et sur staging distant.

Sauvegarde distante : `/opt/avosoma-release-backups/20261024-home1-20261024T121938Z`. Le controle des empreintes avant ecriture confirme que les fichiers cibles n'ont pas change depuis la capture initiale. `index.html` est publie en dernier.

`avosoma-beta.service` conserve son PID `928637` et `NRestarts=0`. PostgreSQL et le endpoint public `/health` repondent correctement ; aucune nouvelle erreur pertinente dans le journal de publication. Aucun backend, compte ou profil de production n'est modifie par ce lot.

## Insignes de grade — 14 h 27

Complement demande : les trois pilotes et la ligne du compte affichent leur insigne natif, sans ajouter de colonne. `rankId` conserve le grade attribue par le serveur ; le rendu reutilise `rankIcon`, les assets existants et la derniere affectation autoritaire du compte. La taille reste de 32 x 38 px sur ordinateur et de 28 x 34 px sur petit ecran.

Publication `20261024-home-ranks1` : cinq fichiers frontend, sept tests cibles conformes, controle navigateur des quatre images contre les grades serveur et de leur chargement, absence de debordement aux largeurs 1366/768/390/320. Cinq empreintes publiques conformes et chargement public sans erreur JavaScript. Aucun redemarrage. Sauvegarde : `/opt/avosoma-release-backups/20261024-home-ranks1-20261024T122738Z`.
