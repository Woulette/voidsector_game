# Compagnon du portail Deadly : IA autonome — 24 octobre 2026

La demande concerne la soucoupe alliee qui accompagne le joueur dans le portail Sauvons Deadly, nommee Ricky dans le runtime. Le joueur souhaite une selection autonome des monstres et un retour prioritaire quand il s'eloigne de plus de 200 sur X ou Y. Il a confirme que ces 200 sont les coordonnees affichees sur la mini-carte.

## Comportement

- Acquisition du monstre vivant le plus proche dans un rayon de 900 unites internes, soit 90 coordonnees de mini-carte. Aucune priorite a la cible selectionnee ou attaquee par un joueur. Une cible valide reste conservee jusqu'a sa mort ou sa sortie de la zone accessible.
- Approche autonome et tirs dans la portee existante de 600 unites internes. La poursuite reste bornee dans le carre d'escorte autour du joueur pour ne pas provoquer des allers-retours a sa limite.
- Retour prioritaire si `abs(joueur.x - allie.x) > 2000` OU `abs(joueur.y - allie.y) > 2000`. `miniMapChrome.js` affiche les positions divisees par 10 : cela correspond a 200 sur la mini-carte. L'egalite est autorisee ; une diagonale de 200 sur chaque axe ne declenche donc pas le retour.
- Pendant le retour : cible abandonnee, aucun nouveau tir laser/roquette, aucune consommation des cooldowns. Le compagnon rejoint une distance de 120 unites internes (12 sur la mini-carte) avant de pouvoir reprendre ses attaques. Cela empeche les changements de decision repetes des qu'il repasse juste sous 200.
- Sans cible, le suivi calme est distinct du rappel de combat : il laisse le joueur prendre de l'avance, suit avec un espace regulier puis se rapproche a l'arret. Les distances du suivi calme sont precisees dans l'ajustement ci-dessous.
- Le chef vivant present dans le portail reste le joueur suivi ; un autre membre vivant present peut prendre le relais s'il est absent. Sans membre actif, les attaques et deplacements sont suspendus.

`server/src/portals/rickyCompanionAi.js` possede la navigation et le choix de cible. `rickyPortalRuntime.js` conserve les tirs, degats, cooldowns, aggro des monstres, soins, recompenses et progression du portail. `rickyPortalState.js` declare les distances initiales a partir des constantes d'IA. Vitesse de 500, degats, statistiques et soin conserves.

Aucun fichier client publie : le compagnon transmet toujours ses positions, vitesses et tirs par les messages existants, utilises par ses animations et le HUD.

## Verification

Treize nouveaux scenarios couvrent l'acquisition apres apparition d'un monstre, le maintien et le changement de cible, les quatre sens des axes, la diagonale exacte, le retour complet, la poursuite bornee, l'attente, l'absence/mort du chef, les pas de temps nuls et deux parcours reseau. Le test d'integration existant qui imposait la cible du joueur verifie maintenant son independance et l'interruption des tirs pendant le retour.

Les parcours Socket.IO utilisent deux vrais clients, en WebSocket puis en polling force. Ils passent par le runtime serveur, la serialisation normale du groupe et le listener client `coop:enemies`. Les deux clients recoivent les memes frappes sur la cible autonome, suivent le retour sans frappe et observent la reprise sur un monstre proche du joueur.

82 tests cibles reussis sur le candidat local et le candidat distant, dont les quetes, les cles de secours, les sessions de portail, le soin, les animations et le tick serveur. Syntaxe des trois modules et `git diff --check` conformes.

Le passage global initial du workspace totalise 1 953 tests reussis sur 1 954 : seul le test statique des libelles de fiche de vaisseau dans `src/ui/render.js` echoue apres leur extraction dans l'atelier. L'echec est reproduit sur la copie de production anterieure a cette IA. Sur le candidat public, le test general de preparation d'Azuron attend 30 vagues alors que la production en contient 20 ; cette meme divergence est reproduite sur les sources anterieures. Ce seul scenario Azuron est exclu de la suite ciblee distante ; le portail public n'est pas modifie par ce lot.

## Publication

Version `20261024-ricky-ai1`, publiee le 24 octobre 2026 a 20 h 32 Europe/Paris apres accord explicite du joueur pour le redemarrage malgre une session en jeu. Trois fichiers serveur uniquement, dix empreintes de sources protegees. Archive SHA-256 : `e563a5ae3755b52960c3424ca2243a09d411eb8d4a96ecac0d69364ff3208ef7`.

Sauvegarde : `/opt/avosoma-backups/20261024-ricky-ai1-183227`. Service redemarre : PID 1346787 vers 1355453 ; NRestarts 0, PostgreSQL pret, `/health` public OK, aucune nouvelle erreur du processus. Les trois empreintes du runtime servi correspondent au payload verifie.

Apres publication, les treize scenarios d'IA, dont les deux parcours reseau a deux clients, sont reexecutes avec des liens vers les modules reellement presents dans `/opt/avosoma/server/src` et `/opt/avosoma/src` : tous passent. Il s'agit de serveurs Socket.IO de validation isoles sur l'interface locale, avec les sources de production ; aucun compte utilisateur ni profil de production n'est cree ou modifie par ces tests. Le processus public et son stockage sont controles separement.

Preuves : `output/ricky-companion-ai-2026-10-24/`, avec `candidate.patch`, manifests, archives, tests locaux et distants, `live-runtime-tests.json`, resultats de deploiement et verification.

## Ajustement du suivi calme — 21 h 12

Le joueur a precise que la limite de 200 sur X ou Y concerne Ricky lorsqu'il est occupe a combattre. Sans monstre a attaquer, il doit suivre le joueur beaucoup plus pres, laisser un petit espace au depart et se rapprocher lorsque le joueur s'arrete.

Le suivi calme demarre au-dela de 300 unites internes (30 coordonnees de mini-carte). Une fois lance, il maintient environ 240 unites (24 coordonnees) pendant le deplacement du joueur. Cette difference entre depart et suivi evite les alternances de marche et d'arret au seuil. Apres 250 ms sans mouvement observe sur les positions serveur du joueur, Ricky rejoint 120 unites (12 coordonnees), puis s'immobilise. Au prochain depart, il laisse de nouveau l'espace monter a 30 avant de suivre. Un court deplacement inferieur a ce seuil se termine lui aussi a 12 si le joueur s'arrete.

Une cible valide conserve la priorite sur le suivi calme. Pendant le combat, le seuil strict de plus de 200 sur X OU Y et le retour jusqu'a 12 restent inchanges. La disparition des monstres rend la main au suivi calme ; un nouveau monstre proche peut l'interrompre. Le changement ou l'absence du joueur suivi remet cet etat a zero. Le soin automatique, les vitesses maximales, tirs, cooldowns et recompenses restent dans leurs chemins existants.

Seul `server/src/portals/rickyCompanionAi.js` est publie pour cet ajustement. Ses trois champs de suivi et ses positions precedentes sont internes au serveur ; les clients continuent de recevoir les positions et vitesses normales du compagnon.

Sept scenarios supplementaires couvrent les deux directions des deux axes, le court deplacement, la transition combat/suivi et la diagonale avec changement de joueur. Le scenario d'attente est adapte au rapprochement a 12. Les deux parcours reseau existants sont prolonges par depart, suivi regulier, arrivee proche et nouveau depart : deux clients recoivent les memes positions, sans tir parasite, en WebSocket puis en polling force.

119 tests cibles reussis localement et sur le candidat distant. Les vingt scenarios d'IA sont ensuite relances avec des liens vers les modules effectivement installes : tous passent. Les serveurs Socket.IO de validation restent isoles sur l'interface locale avec des etats ephemeres, sans compte ou profil de production ; ce controle ne constitue pas une partie MMO authentifiee. Les divergences anterieures de test global et de preparation Azuron decrites plus haut ne sont pas modifiees.

Version `20261024-ricky-follow1`, publiee a 21 h 12 Europe/Paris, un fichier serveur et douze empreintes protegees. Archive SHA-256 `7f6c5791772a4b1f577ab2919d6d354bbe5119e28a6c2d2129ca0de739eb6451`. Sauvegarde `/opt/avosoma-backups/20261024-ricky-follow1-191232`. PID 1389965 vers 1397806, NRestarts 0, PostgreSQL pret et aucune nouvelle erreur du processus. Empreinte du module installe conforme au payload. Aucun fichier frontend publie. Preuves : `output/ricky-follow-spacing-2026-10-24/`.
