# Ricky : cle de secours pour Sauvons Deadly — 24 octobre 2026

Demande : apres un echec dans le portail Deadly, pouvoir recuperer une autre cle aupres de Ricky jusqu'a la premiere reussite, puis revenir au fonctionnement normal par drops.

## Regle

Le pilote doit avoir la quete `quest_lv10_sauvons_deadly` de sa firme active et la preparation `Maintenance impossible` terminee. S'il n'a plus de `portal_anchor_key`, il peut parler au Ricky de la carte 02 de sa propre firme et terminer le dialogue pour recevoir une cle.

Le serveur exige une interaction de proximite avec le bon PNJ, un pilote vivant et un compte authentifie. La quantite est toujours une unite ; un inventaire contenant deja une cle bloque un nouvel ajout. L'acquittement et la synchronisation suivent la sauvegarde reussie ; une erreur de persistance ne confirme aucun gain.

L'aide s'arrete si le compteur permanent `completedPortals.ricky` est positif, si l'objectif `portal` est accompli ou si la quete est terminee. Le premier de ces temoins suffit : abandonner/reprendre la mission ou recharger le profil ne reouvre pas l'aide apres une reussite. Il n'y a pas de nouveau champ de profil ni de migration de base.

La regle couvre aussi les pilotes deja bloques sans cle : elle ne reclame pas une preuve de mort ajoutee apres coup. Aucun remplacement automatique a la mort : il faut retourner au PNJ. La consommation a l'entree, les trois vies de l'instance et les drops ordinaires sont conserves.

## Modules

- `server/src/quests/rickyKeyRecovery.js` : eligibilite en lecture seule, revalidation lors de l'ajout et entree au journal d'activite.
- `server/src/socket/questHandlers.js` : interaction validee par la carte et la position serveur, sauvegarde puis synchro et confirmation `quest:key-recovered`.
- `src/game/ui/questNpcDialogue.js` : proposition dans le dialogue de Ricky, rappel de la limite et dialogue de retour normal apres la reussite.
- `src/game/combatOrchestrator.js` : transmet au dialogue le compteur de reussites du profil synchronise.
- `src/multiplayer/progressionSocketListeners.js` : notification apres confirmation serveur. Aucun objet ajoute par le client.

## Verification

60 tests cibles locaux reussis. Ils couvrent les quatre firmes, la bonne quete et ses prerequis, les doubles clics, l'absence de cumul, les tentatives distantes/mortes/non authentifiees, les donnees forgees et l'echec de sauvegarde. Un test avec une vraie connexion Socket.IO locale utilise l'entree dans l'instance, le gestionnaire de mort et de respawn, le retour chez Ricky, une seconde entree, la completion serveur puis le dialogue de fin de quete.

Sur les sources du serveur en ligne avec le correctif applique : 59 tests applicables reussis. Le cas general de preparation Azuron a une attente locale de 30 vagues alors que la production conserve son parcours a 20 vagues ; ce cas hors lot est exclu, sans modifier ni la rencontre publique ni le test du workspace.

Suite serveur globale du workspace : 1 803 tests reussis sur 1 804. Seul `ship-detail-live-stats.test.js` echoue sur une chaine de texte attendue directement dans `src/ui/render.js`, deplacee dans le module du poste d'equipement par le travail de hangar parallele. Ces sources ne sont pas publiees par ce lot.

Controle navigateur avec le vrai dialogue et son gestionnaire d'evenements : cle absente, cle deja possedee, premiere reussite enregistree et remise de quete. Desktop et mobile, sans erreur JavaScript ni reponse HTTP en echec. Ce montage UI n'est pas un compte de jeu public et n'ecrit aucun profil utilisateur.

Preuves, sources de production, candidat, manifeste et logs : `output/ricky-key-recovery-2026-10-24/`.

## Publication

Publie `20261024-ricky-retry1` le 24 octobre 2026 a 16:43 Europe/Paris : six fichiers runtime, dont deux serveur. Premier preflight bloque par une page d'entree publiee en parallele, sans ecriture en production ; les seuls alias de cache du lot ont ete reappliques sur la page fraiche.

59 tests applicables reussis en staging sur le serveur, dont le test Socket.IO reel. Archive, payload et six fichiers actifs ont les empreintes attendues ; les quatre fichiers frontend ont aussi ete verifies par HTTPS. Le dialogue et la notification ont ensuite ete controles avec les vrais modules publics sur desktop et mobile, sans erreur de console ou HTTP.

Serveur redemarre pour prendre en compte le handler : PID 1098285 vers 1125928, `NRestarts=0`. Service actif, PostgreSQL pret, aucun nouveau message d'erreur dans le journal du processus ; une session de jeu s'est reconnectee apres le redemarrage. Sauvegarde : `/opt/avosoma-backups/20261024-ricky-retry1-144353`. La page d'entree est publiee en dernier, apres les dependances et le redemarrage. Aucun profil utilisateur ni fichier `.env` n'a ete modifie manuellement.
