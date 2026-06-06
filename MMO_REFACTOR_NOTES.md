# VoidSector MMO - Notes de decoupage serveur

Objectif : reduire `server/src/index.js` sans changer le gameplay, en gardant le serveur autoritaire et le mode solo compatible pendant la migration.

## Regles de decoupage

- Extraire un domaine a la fois.
- Injecter le contexte serveur (`players`, `profileManager`, `guard`, helpers) au lieu de creer des imports globaux caches.
- Garder `index.js` comme composition serveur : creation HTTP, Socket.IO, et branchement des domaines.
- Lancer `node --check` apres chaque extraction.
- Ne pas modifier `server/data/profiles.json` pendant les refactors.

## Extraction 1 - Socket handlers autoritaires

Fait :

- `server/src/socket/questHandlers.js`
  - `quest:accept`
  - `quest:claim`
  - `quest:progress`
- `server/src/socket/progressionHandlers.js`
  - `skill:upgrade`
  - `portal:unlock`
  - `prestige:perform`
- `server/src/socket/economyHandlers.js`
  - `space-caster:run`
  - `refinery:*`
  - `shop:buy-*`
- `server/src/socket/equipmentHandlers.js`
  - `ship:equip-active`
  - `equipment:*`
- `server/src/socket/playerHandlers.js`
  - `player:hello`
  - `profile:save`
  - `player:state`
  - `player:laser`
  - `session:logout-request`
- `server/src/socket/groupHandlers.js`
  - `group:*`
  - `coop:start-test`
  - `portal:start`
- `server/src/socket/combatHandlers.js`
  - `coop:enemy-hit`
  - `combat:fire`
  - `loot:pickup`
  - `enemy:hit`
- `server/src/socket/authHandlers.js`
  - `auth:*`
- `server/src/socket/disconnectHandlers.js`
  - `disconnect`

Pourquoi :

- Ces events sont deja des actions serveur autoritaires.
- Ils partagent le meme modele : verifier rate-limit, retrouver le joueur, appliquer une action profil, emettre `profile:sync`.
- Les sortir de `index.js` reduit le bruit sans changer les fonctions monde/combat/groupes.

Checks effectues :

- `node --check server/src/index.js`
- `node --check server/src/socket/questHandlers.js`
- `node --check server/src/socket/progressionHandlers.js`
- `node --check server/src/socket/economyHandlers.js`
- `node --check server/src/socket/*.js`

## Reste dans index.js

- Boot HTTP et Socket.IO.
- Presence joueurs.
- IA ennemis monde.
- Groupes et instances.
- Portails.
- Combat et loot.
- Fonctions metier appelees par les handlers extraits.

## Extraction 2 - Definitions et etat monde

Fait :

- `server/src/world/definitions.js`
  - `WORLD_MAPS`
  - `WORLD_ENEMY_TYPES`
  - `COOP_ENEMY_TYPES`
  - `PORTAL_CONFIGS`
  - `PORTAL_DROP_RULES`
  - constantes loot monde
- `server/src/world/spawn.js`
  - serialization publique ennemi
  - RNG seed
  - choix pondere
  - safe zones
  - creation spawn ennemi monde
- `server/src/world/state.js`
  - stockage live des maps monde
  - emission `world:enemies`
  - changement de room map
  - recherche et respawn ennemi monde
  - liste des joueurs par map
- `server/src/world/constants.js`
  - constantes IA monde
- `server/src/world/ai.js`
  - selection cible ennemi
  - memoire d'aggro
  - decisions de mouvement par type d'ennemi
  - attaques ennemies contre joueurs
  - update d'un ennemi monde ou instance
- `server/src/world/loot.js`
  - ownership temporaire de loot
  - drops prives de pieces portail
  - ramassage serveur de loot
  - expiration des drops actifs
- `server/src/portals/instances.js`
  - creation ennemis portail
  - generation des vagues serveur
  - demarrage instance portail
  - completion portail et recompenses serveur
- `server/src/groups/groups.js`
  - stockage live des groupes
  - serialization publique des groupes
  - create / leave / accept invite
  - emission groupe et instance
  - instance coop de test
- `server/src/world/rewards.js`
  - rewards monde serveur
  - partage groupe
  - application profil serveur
- `server/src/quests/killProgress.js`
  - progression quete serveur sur kill
- `server/src/combat/enemyHits.js`
  - resolution hit ennemi monde et instance
  - validation combat serveur via `resolveServerCombatFire`
  - progression vague portail apres kill
  - branchement rewards, loot, quetes et respawn
- `server/src/players/equipmentLocation.js`
  - verification spawn firme
  - sessions de respawn apres changement vaisseau/equipement
  - diffusion equipement aux sockets du meme compte
- `server/src/auth/socketSession.js`
  - payload auth public
  - attachement compte/socket
  - reprise session monde
  - takeover/reconnexion socket meme compte
- `server/src/tick/serverTick.js`
  - boucle serveur monde / instances
  - emission periodic world / instance
  - expiration loot
  - tick presence

Pourquoi :

- Les definitions statiques n'ont pas a vivre dans la composition serveur.
- L'etat live `worldMaps` reste encapsule dans un manager dedie.
- `index.js` orchestre le tick serveur sans contenir les decisions IA.
- L'etat live `activeLootDrops` reste encapsule dans un manager dedie.
- Les recompenses et vagues portail restent ensemble dans le domaine portail.
- L'etat live `groups` reste encapsule dans un manager dedie, tout en restant expose pour les rewards, le tick serveur et le combat.
- Le combat, les sessions socket, l'equipement et le tick ne vivent plus dans la composition serveur.

## Prochaine extraction recommandee

Reste eventuel, non urgent :

- `server/src/http/health.js` si on veut sortir le handler HTTP.
- Tests unitaires sur les managers purs.
- Tests d'integration Socket.IO plus complets.

## Extraction 3 - Profile manager

`server/src/players/profiles.js` reste le coordinateur de stockage profil :

- chargement et persistence ;
- resolution de cle compte / legacy ;
- avance de la raffinerie au chargement ;
- protection de `profile:save` ;
- composition des sous-modules profil.

Modules extraits :

- `server/src/players/profileSanitize.js`
  - sanitization profil et session monde ;
  - protection des possessions et champs serveur autoritaires.
- `server/src/players/profileDefaults.js`
  - profil starter ;
  - garantie du drone reparation starter.
- `server/src/players/profileActions.js`
  - achats ;
  - equipement ;
  - quetes ;
  - economie / raffinerie ;
  - progression / prestige.
- `server/src/players/profileMutations.js`
  - rewards ;
  - depenses generiques ;
  - mutations atomiques profil.
- `server/src/players/profileWorldSession.js`
  - lecture profil ;
  - lecture et sauvegarde session monde.

Resultat :

- `server/src/players/profiles.js` passe de 626 a environ 162 lignes.
- L'API publique du profile manager reste identique pour ne pas casser les handlers MMO.

Regle : la prochaine extraction doit rester petite, car ces fonctions utilisent beaucoup `io`, `players`, `groups`, `presence` et `profileManager`.

## Extraction 4 - Combat client

`src/game/combatOrchestrator.js` reste le coordinateur du combat client. Les extractions conservent les branches solo et MMO sans changer les contrats avec `src/app.js`.

Modules extraits :

- `src/game/ui/combatLogoutController.js`
  - deconnexion differee ;
  - blocages mouvement / combat / portail ;
  - evenements de deconnexion serveur.
- `src/game/ui/questNpcDialogue.js`
  - recherche et interaction PNJ de quete ;
  - dialogue et progression de quete.
- `src/game/systems/combatServerActions.js`
  - choix entre action serveur autoritaire et fallback solo pour quetes, raffinerie et upgrades.
- `src/game/combatProfileTitles.js`
  - libelles statiques des titres affiches en combat.
- `src/game/systems/combatPlayerStats.js`
  - construction de l'etat joueur combat ;
  - application des statistiques du vaisseau et de l'equipement.
- `src/game/systems/combatQuestProgress.js`
  - progression quete liee au combat ;
  - branches solo / serveur pour visites et coordonnees ;
  - echecs sur mort, perte de vie et temps limite.
- `src/game/systems/combatMultiplayerSync.js`
  - synchronisation des ennemis controles serveur ;
  - application du spawn coop.
- `src/game/systems/combatSession.js`
  - demarrage et arret du combat ;
  - reprise de session monde serveur ;
  - rafraichissement du loadout actif.
- `src/game/systems/combatPortalNavigation.js`
  - sortie d'instance portail ;
  - transition entre maps monde.
- `src/game/systems/combatEnemyDamage.js`
  - choix entre hit ennemi serveur et degats locaux temporaires ;
  - application bouclier / coque pour les ennemis non serveur.

Resultat intermediaire :

- `src/game/combatOrchestrator.js` passe d'environ 1447 a environ 1051 lignes.
- L'orchestrateur continue de composer les systemes combat, le rendu, les inputs et le cycle de vie.
- Les changements ont ete verifies avec `node --check` apres chaque extraction.

Prochaine extraction recommandee :

- ne pas extraire artificiellement les petits wrappers qui servent de liaison entre systemes ;
- traiter ensuite `src/multiplayer/client.js`, qui concentre encore connexion, profil, economie, groupes, monde et combat.

## Extraction 5 - Client multijoueur

`src/multiplayer/client.js` reste le point d'entree public du multijoueur et conserve tous ses exports existants.

Modules extraits :

- `src/multiplayer/authController.js`
  - inscription, connexion et deconnexion compte ;
  - action auth en attente pendant la connexion Socket.IO ;
  - application des succes et erreurs auth.
- `src/multiplayer/profileSync.js`
  - construction et emission du profil client temporaire vers `profile:save`.
- `src/multiplayer/socketCommands.js`
  - commandes sortantes progression, economie, equipement, quetes, raffinerie et loot.
- `src/multiplayer/combatCommands.js`
  - snapshot joueur ;
  - tirs serveur et effets laser.
- `src/multiplayer/groupCommands.js`
  - commandes groupe, coop et portail ;
  - lecture des joueurs distants du groupe.
- `src/multiplayer/playerSocketListeners.js`
  - profil, reprise monde, joueurs distants, effets, degats, rewards et loot.
- `src/multiplayer/economySocketListeners.js`
  - magasin, equipement, combat, raffinerie et Space Caster.
- `src/multiplayer/progressionSocketListeners.js`
  - quetes, competences, portails et prestige.
- `src/multiplayer/worldSocketListeners.js`
  - monde, ennemis serveur, groupes et instances.
- `src/multiplayer/socketState.js`
  - interpolation joueurs distants ;
  - remplacement des ennemis serveur ;
  - effets distants.
- `src/multiplayer/domHandlers.js`
  - delegation des actions DOM multijoueur et compte.

Resultat :

- `src/multiplayer/client.js` passe de 996 a environ 352 lignes.
- Il conserve la composition, la connexion Socket.IO, les evenements connexion/auth/session et la remise a zero de l'etat.
- Les 47 exports publics existants restent disponibles.
- Un smoke test verifie l'installation unique des 55 listeners et les flux joueurs, magasin, quetes, monde et commandes sortantes.

Prochaine extraction recommandee :

- `src/app.js`, qui concentre encore navigation, rendu, magasin, equipement, progression, raffinerie et branchements MMO.

## Extraction 6 - Coordinateur application

Premiere passe sur `src/app.js` :

- `src/app/profileController.js`
  - scope de sauvegarde invite / compte ;
  - sauvegarde et synchronisation du profil ;
  - application des snapshots profil serveur.
- `src/app/serverEventController.js`
  - consommation des achats serveur ;
  - application des evenements equipement, quetes, raffinerie et Space Caster ;
  - reactions aux changements auth.
- `src/app/shopActions.js`
  - achats vaisseaux, items, munitions, drones et formations ;
  - priorite aux commandes serveur avec fallback local temporaire.
- `src/app/equipmentActions.js`
  - equipement automatique et manuel ;
  - compatibilite vaisseaux / drones ;
  - retrait d'equipement et commandes serveur.
- `src/app/refineryActions.js`
  - delegation des clics raffinerie ;
  - jobs, production, upgrades, rush et expeditions.
- `src/app/progressionActions.js`
  - Space Caster ;
  - deverrouillage portails ;
  - amelioration des competences.

Resultat intermediaire :

- `src/app.js` passe de 1337 a environ 655 lignes.
- Les responsabilites profil MMO, evenements serveur, magasin, equipement, raffinerie et progression ne sont plus melangees a l'initialisation.

Prochaines extractions recommandees :

- extraire les derniers branchements UI generiques seulement si cela clarifie leur domaine ;
- traiter ensuite `src/core/store.js`, qui reste le prochain fichier critique melangeant etat, sauvegarde et logique metier.
