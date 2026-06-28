# VoidSector MMO - Notes de decoupage serveur

Objectif : reduire `server/src/index.js` sans changer le gameplay, en gardant le serveur autoritaire et le mode solo compatible pendant la migration.

## Regles de decoupage

- Extraire un domaine a la fois.
- Injecter le contexte serveur (`players`, `profileManager`, `guard`, helpers) au lieu de creer des imports globaux caches.
- Garder `index.js` comme composition serveur : creation HTTP, Socket.IO, et branchement des domaines.
- Lancer `node --check` apres chaque extraction.
- Ne pas modifier `server/data/profiles.json` pendant les refactors.

## Lecture obligatoire avant de coder

Avant toute modification MMO ou architecture, lire dans cet ordre :

1. `MMO_100_PERCENT_PLAN.md`
2. `MMO_REFACTOR_NOTES.md`
3. `REGLES_IMPORTANTES_AVANT_DE_CODER.md`

Le fichier `REGLES_IMPORTANTES_AVANT_DE_CODER.md` explique ou placer le code apres les extractions recentes. Ne pas regonfler les facades (`store.js`, `questStore.js`, `refineryStore.js`, `server/src/quests/quests.js`, `server/src/economy/refinery.js`, `server/src/index.js`) avec de la logique metier.

## Etat actuel du decoupage

Le gros decoupage structurel est en pause. Les anciens fichiers fourre-tout les plus critiques ont ete reduits en facades ou coordinateurs :

- `server/src/index.js`
- `server/src/quests/quests.js`
- `server/src/economy/refinery.js`
- `src/core/store.js`
- `src/core/questStore.js`
- `src/core/refineryStore.js`
- `src/multiplayer/client.js`
- `src/app.js`
- `src/game/combatOrchestrator.js`
- `server/src/portals/instances.js`

Regle actuelle : ne plus decouper pour decouper. Ajouter du code dans le module de domaine existant, ou creer un nouveau module si la responsabilite ne rentre pas clairement dans les fichiers actuels.

## Extraction portails - Runtime Ricky et preparation

Fait le 28 juin 2026 :

- `server/src/portals/instances.js`
  - reste le coordinateur public des instances de portail ;
  - garde `createPortalInstanceManager(...)` et les exports historiques du manager ;
  - gere lancement, completion, rewards de portail generiques et branchement du runtime Ricky ;
  - reduit d'environ 1486 lignes a 546 lignes.
- `server/src/portals/rickyPortalRuntime.js`
  - objectifs Deadly/Ricky ;
  - vagues de route, balises, final gate et summons du boss ;
  - compagnon Ricky, tirs Ricky, soin, retours des joueurs apres completion ;
  - rewards des ennemis Ricky avec split de groupe et bonus de firme.
- `server/src/portals/rickyPortalState.js`
  - constantes Ricky ;
  - definition du portail Ricky ;
  - builders purs : objectif, boss, cage, allie Ricky.
- `server/src/portals/portalPreparation.js`
  - placement/public payload du portail prepare ;
  - verification de presence au portail prepare.
- `server/src/portals/portalWaves.js`
  - creation des ennemis et vagues generiques des portails standards.

Regle de reprise :

- ne pas remettre les objectifs ou le compagnon Ricky dans `instances.js` ;
- pour modifier le contenu Deadly/Ricky, partir de `rickyPortalRuntime.js` et `rickyPortalState.js` ;
- pour modifier les portails standards, commencer par `portalWaves.js` ou le coordinateur `instances.js` selon que la modification touche les vagues ou le cycle d'instance.

Checks effectues :

- `node --check server/src/portals/instances.js`
- `node --check server/src/portals/rickyPortalRuntime.js`
- `node --check server/src/portals/rickyPortalState.js`
- `node --check server/src/portals/portalWaves.js`
- `node --check server/src/portals/portalPreparation.js`
- `node --test server/test/portal-instance-security.test.js`
- `node --test server/test/quest-level10-ricky.test.js`
- `node --test server/test/player-state-security.test.js`
- `npm test` dans `server/` : 678/678 tests OK
- `git diff --check`

## Extraction client - combatData facade

Fait le 28 juin 2026 :

- `src/game/combatData.js`
  - reste la facade publique historique du client ;
  - reexporte `MAPS`, `ENEMY_TYPES`, les constantes combat et les profils moteurs ;
  - reduit d'environ 1968 lignes a 25 lignes.
- `src/game/combatData/mapDefinitions.js`
  - garde la definition brute initiale de `MAPS`.
- `src/game/combatData/maps.js`
  - reste la facade de composition des maps client ;
  - installe le graphe secteur, le portail Ricky et les libelles publics ;
  - reduit d'environ 825 lignes a 35 lignes.
- `src/game/combatData/mapConstants.js`
  - constantes de position de portails, visuels de firme et ids internes.
- `src/game/combatData/mapUtils.js`
  - helpers purs pour templates Helion, ids/noms de firmes, portails directionnels et theming.
- `src/game/combatData/firmMapBuilders.js`
  - generation des maps de firme et de la map `CORE`.
- `src/game/combatData/sectorGraph.js`
  - construction du graphe de portails client, bridges inter-firmes et resets de zones.
- `src/game/combatData/rickyPortalClient.js`
  - verrou client du portail Ricky, portail ferme, NPC Ricky et portail deverrouille.
- `src/game/combatData/mapDisplayNames.js`
  - application des noms publics de maps et labels de portails.
- `src/game/combatData/enemies.js`
  - garde `ENEMY_TYPES` et les helpers de loot/statistiques ennemis.
- `src/game/combatData/constants.js`
  - garde les constantes combat, aggro, hit chance, drops bruts et vagues portail.
- `src/game/combatData/engineProfiles.js`
  - garde `DEFAULT_ENGINE_PROFILE` et `SHIP_ENGINE_PROFILES`.

Regle de reprise :

- ne pas remettre de donnees ou logique metier dans `combatData.js` ;
- ne pas remettre de logique de graphe dans `maps.js` ;
- pour les donnees brutes de map, commencer par `mapDefinitions.js` ;
- pour les routes/bridges client, commencer par `sectorGraph.js` ;
- pour les portails Ricky client, commencer par `rickyPortalClient.js` ;
- pour les themings de firme, commencer par `mapConstants.js`, `mapUtils.js` ou `firmMapBuilders.js` selon le changement ;
- pour les stats ennemies, modifier `enemies.js` et verifier la source autoritaire serveur correspondante ;
- pour les profils moteurs, garder l'alignement avec les definitions de vaisseaux.

Checks effectues :

- `node --check src/game/combatData.js`
- `node --check src/game/combatData/maps.js`
- `node --check src/game/combatData/mapDefinitions.js`
- `node --check src/game/combatData/mapConstants.js`
- `node --check src/game/combatData/mapUtils.js`
- `node --check src/game/combatData/firmMapBuilders.js`
- `node --check src/game/combatData/sectorGraph.js`
- `node --check src/game/combatData/rickyPortalClient.js`
- `node --check src/game/combatData/mapDisplayNames.js`
- `node --check src/game/combatData/enemies.js`
- `node --check src/game/combatData/constants.js`
- `node --check src/game/combatData/engineProfiles.js`
- import ESM de `src/game/combatData.js`
- `node --test server/test/canonical-map-names.test.js`
- `node --test server/test/map-portal-transitions.test.js`
- `node --test server/test/quest-level10-ricky.test.js`
- `node --test server/test/world-resource-drops.test.js`
- `node --test server/test/asterion-double-shot.test.js`
- `npm test` dans `server/` : 679/680 tests OK ; echec restant hors extraction sur `server/test/combat-server-events-performance.test.js` profiler combat.

## Reste a decouper plus tard

Pas urgent avant les corrections en jeu, mais a garder en tete :

- `server/src/players/profiles.js`
  - sensible car charge, normalise et sauvegarde les profils ;
  - a reprendre seulement si une future modification profil l'alourdit.
- `src/app.js`
  - encore coordinateur UI global ;
  - a reprendre seulement si on ajoute beaucoup de branchements UI.
- `src/game/combatOrchestrator.js`
  - encore gros ;
  - a reprendre par domaines seulement si on touche au combat client.
- `src/multiplayer/client.js`
  - deja decoupe ;
  - a reprendre seulement si de nouveaux events MMO le regonflent.
- `server/src/players/profileActions.js`
  - peut devenir gros avec l'anti-spam et les nouvelles actions autoritaires ;
  - si ca arrive, separer les domaines action par action.

Priorite suivante recommandee : corrections en jeu et securisation MMO, pas nouveau refactor structurel.

## Systeme de firme - reprise rapide

Etat au 12 juin 2026 :

- page FIRME principale et panneau Firme en jeu branches ;
- quetes quotidiennes collectives auto-actives a 06h/12h/18h avec verrouillage des prochaines rotations ;
- quetes hebdomadaires collectives separees ;
- objectifs saisonniers personnels ajoutes dans l'onglet `SAISONNIERES` :
  - progression solo ;
  - points ajoutes au joueur et a sa firme a la completion ;
  - recompense placee dans les gains en attente ;
- anti-farm niveau separe des quetes : un monstre trop bas niveau ne donne pas le point direct, mais continue de faire progresser les quetes/objectifs ;
- UI quetes : le compteur est libelle `Participation quete` pour ne pas le confondre avec la contribution saisonniere reelle ;
- Orbes de firme : utiliser le `kind` serveur `drone_pirate`; `sentinel_orb` reste seulement un alias de compatibilite pour anciens snapshots/tests ;
- fin de portail : chaque portail termine appelle la progression de quete portail pour les membres concernes ;
- barre de progression par firme restauree sous chaque quete collective ;
- texte de timer actif affiche sous forme `Ferme ...` ;
- image Vorak Rusher tournee de 180 degres dans les objectifs ;
- icone Firmaton ajoutee puis renforcee avec un grand `F` noir : `assets/icons/firmaton.svg` ;
- verifications recentes : `node --check`, `node --test` serveur 72/72, `git diff --check`.

## Securite MMO - Verrous par compte

Fait :

- `server/src/security/accountActionLocks.js`
  - verrous anti double-clic et anti-spam par compte ;
  - fallback invite par `clientId` quand le joueur n'est pas connecte ;
  - logs serveur `Account action limited` pour les abus ;
  - emission `account:action-limited` silencieuse cote gameplay.
- `server/src/config.js`
  - configuration des verrous par event sensible.
- `server/src/index.js`
  - branchement dans le `guard(eventName)` central, apres le rate-limit Socket.IO.

Regle :

- ne pas appliquer ces verrous a `player:state`, `player:laser` ou aux events de rendu combat rapides ;
- garder les delais courts pour ne pas changer le gameplay normal ;
- renforcer seulement les actions qui touchent aux donnees critiques : economie, equipement, quetes, progression, raffinerie, loot et portails.

## Securite MMO - Autorite mort, respawn et chemins client

Fait :

- `server/src/players/playerLifecycle.js`
  - radiation hors map geree cote serveur ;
  - mort joueur serveur avec `player:death` ;
  - respawn serveur avec cout NOVA, position, PV et bouclier imposes ;
  - vies de portail et abandon force apres epuisement.
- `server/src/players/playerStateValidation.js`
  - snapshots refuses quand le joueur est mort ;
  - joueur a 0 PV bloque a 0 PV avant meme l'emission de `deathState` ;
  - sortie d'un portail actif refusee tant que l'instance n'est pas terminee ;
  - ancienne session de portail sans instance live replacee sur la map de firme.
- `server/src/portals/instances.js`
  - demarrage refuse si joueur mort ;
  - demarrage refuse si le portail n'est pas deverrouille ou si le niveau requis manque ;
  - double instance active refusee.
- `src/multiplayer/profileSync.js`
  - `profile:save` n'envoie plus que les preferences UI/action bar.
- `src/game/systems/*`
  - rewards locaux, vagues portail locales, radiation persistante locale et consommation locale de munitions contre cible serveur sont bloques en session MMO autoritaire.

Checks effectues :

- `node --test server/test/player-state-security.test.js`
- `node --test server/test/portal-instance-security.test.js`
- `node --test server/test/client-mmo-authority.test.js`
- `node --test server/test/player-lifecycle-authority.test.js`
- `npm test` dans `server/` : 168 tests OK

## Exploitation MMO - Admin et audit initial

Fait :

- `server/src/admin/adminManager.js`
  - verification de role `moderator`, `admin`, `owner` ;
  - snapshot joueurs connectes, groupes, instances et profils recents ;
  - inspection d'un joueur/profil ;
  - kick moderation ;
  - ajustement credits, NOVA et XP reserve aux admins avec raison obligatoire.
- `server/src/admin/adminAudit.js`
  - audit persistant JSON en fallback ;
  - audit PostgreSQL via table `admin_audit_log` quand `DATABASE_URL` est configure.
- `server/src/socket/adminHandlers.js`
  - events Socket.IO : `admin:sync`, `admin:inspect-player`, `admin:kick`, `admin:adjust-player`.
- `server/src/index.js`
  - branchement du manager admin ;
  - `/health` enrichi avec storage actif, uptime et compteurs joueurs.

Regles :

- aucun event admin ne doit modifier un profil sans role suffisant ;
- toute correction de credits/NOVA/XP doit avoir une raison et une entree d'audit ;
- les roles se gerent pour l'instant cote stockage compte (`role` dans `accounts`) ;
- il reste a construire une UI admin, ban/unban, mute, reset instance et logs economie/combat plus detailles.

Checks effectues :

- `node --check server/src/admin/adminManager.js`
- `node --check server/src/admin/adminAudit.js`
- `node --check server/src/socket/adminHandlers.js`
- `node --test server/test/admin-tools.test.js`

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

- `server/src/world/aggro.js`
  - regle MMO safe-zone / riposte ;
  - un joueur en zone non-agression est ignore sauf par l'ennemi qu'il vient d'attaquer ;
  - la riposte expire apres 10 secondes sans nouvelle attaque du joueur.
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
- `server/src/world/statusEffects.js`
  - effets de statut infliges par les ennemis serveur
  - poison autoritaire des Parasites et Boss Parasites
  - synchronisation visuelle des effets avec le client
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

## Extraction 7 - Store client core

Premiere passe sur `src/core/store.js` :

- `src/core/catalogStore.js`
  - getters catalogue : vaisseaux, items, munitions, drones, portails, quetes, materiaux et recettes.
- `src/core/currencyStore.js`
  - labels de prix, verification credits / NOVA et depense locale temporaire.
- `src/core/xpStore.js`
  - courbe XP, calcul du prochain niveau et synchronisation des points de competence.
- `src/core/graphicsStore.js`
  - presets et normalisation de la qualite graphique.
- `src/core/portalProgressStore.js`
  - pieces de portails, completion, conditions de vaisseaux, prestige et verrous de progression.
- `src/core/stateNormalizer.js`
  - migration / nettoyage des sauvegardes locales ;
  - protection des valeurs de profil ;
  - initialisation du starter Orion, slots, drone de reparation, quetes, raffinerie, cargo et loadouts.
- `src/core/combatStatsStore.js`
  - equipements actifs vaisseau / drones ;
  - bonus extras, drone de reparation, boosts temporaires et formations ;
  - stats combat vaisseau ;
  - XP, reputation et compteur d'utilisation des armes.

Resultat :

- `src/core/store.js` passe d'environ 950 a environ 170 lignes.
- Le fichier reste la facade publique historique du store pour limiter les changements d'import.
- Les responsabilites critiques sont maintenant separees entre catalogue, monnaie, XP, portails, normalisation d'etat et stats combat.
- Smoke test OK sur `loadState()`, `normalizeState`, XP, Orion, drone starter, slots 1 / 9, stats combat et reputation.

Prochaine extraction recommandee :

- reprendre `src/core/refineryStore.js`, qui reste un gros domaine metier avec production, upgrades, expeditions et recettes ;
- ou `src/core/questStore.js` si la prochaine priorite est la progression serveur / synchro quetes.

## Extraction 8 - Raffinerie client

Decoupage de `src/core/refineryStore.js` :

- `src/core/refineryRules.js`
  - constantes, modules, couts, courbes, durees et formules pures.
- `src/core/refineryStateStore.js`
  - niveaux materiaux, niveaux modules et activation production.
- `src/core/refineryUpgradeStore.js`
  - donnees d'upgrade ;
  - demarrage, rush et completion des jobs d'amelioration ;
  - upgrades instantanes legacy.
- `src/core/refineryShipmentStore.js`
  - capacite transport ;
  - expeditions vers la soute ;
  - rush et completion d'expedition ;
  - craft / fusion en soute.

Resultat :

- `src/core/refineryStore.js` passe d'environ 636 a environ 84 lignes.
- Il conserve les exports publics historiques via re-export pour ne pas casser les imports existants.
- Smoke test OK sur niveaux, capacite stockage, production, upgrade data, expedition et `tickRefineryProduction()`.

Prochaine extraction recommandee :

- `src/core/questStore.js`, car il reste un domaine critique pour la synchro MMO temps reel ;
- ensuite `server/src/quests/quests.js` pour aligner plus clairement la logique serveur des quetes.

## Extraction 9 - Quetes client

Decoupage de `src/core/questStore.js` :

- `src/core/questObjectiveMatchers.js`
  - matchers d'objectifs : kill, map, coordonnees, NPC, item drop, Space Caster et upgrades raffinerie.
- `src/core/questProgressStore.js`
  - quetes actives ;
  - lecture de progression ;
  - acceptation ;
  - conditions d'objectifs et progression d'objectif.
- `src/core/questFailureStore.js`
  - reset de run ;
  - echecs par perte de HP, temps limite et mort.
- `src/core/questRewardStore.js`
  - multipliers de recompense ;
  - claim local legacy et application des rewards.

Resultat :

- `src/core/questStore.js` passe d'environ 474 a environ 141 lignes.
- Il garde les exports publics historiques et devient surtout le dispatcher des evenements de progression client.
- Smoke test OK sur acceptation, claim, progression, kill, NPC et echecs.

Prochaine extraction recommandee :

- `server/src/quests/quests.js`, pour clarifier la logique serveur qui doit rester l'autorite MMO ;
- ou `server/src/economy/refinery.js` si on veut aligner les formules raffinerie serveur avec le decoupage client.

## Extraction 10 - Quetes serveur

Decoupage de `server/src/quests/quests.js` :

- `server/src/quests/questState.js`
  - catalogue quetes ;
  - objectifs, progression et normalisation des champs profil ;
  - acceptation serveur ;
  - progression d'objectif.
- `server/src/quests/questMatchers.js`
  - matchers kill et actions serveur.
- `server/src/quests/questRewards.js`
  - multiplicateurs de recompense ;
  - application des rewards serveur ;
  - claim serveur.

Resultat :

- `server/src/quests/quests.js` passe d'environ 322 a environ 60 lignes.
- Il reste la facade publique des quetes serveur avec `acceptServerQuest`, `claimServerQuest`, `progressServerQuestKill` et `progressServerQuestAction`.
- Smoke test OK sur les exports publics.
- `SERVER_CHECK_OK` sur tout `server/src`.

Prochaine priorite essentielle :

- ajouter les verrous anti-spam par compte sur les actions sensibles ;
- finir les domaines encore trop clients : rang et controles admin minimum ;
- aligner ou factoriser les formules raffinerie serveur si on veut eviter les divergences client / serveur.

## Extraction 11 - Raffinerie serveur

Decoupage de `server/src/economy/refinery.js` :

- `server/src/economy/refineryRules.js`
  - constantes, modules, couts, courbes, durees et formules pures serveur.
- `server/src/economy/refineryProfile.js`
  - acces profil : materiaux, soute, vaisseaux, niveaux raffinerie et activation production.
- `server/src/economy/refineryUpgrades.js`
  - calcul des upgrades ;
  - demarrage, rush et completion des ameliorations.
- `server/src/economy/refineryJobs.js`
  - lancement / claim des jobs de raffinage simples.
- `server/src/economy/refineryProduction.js`
  - production automatique par tick serveur.
- `server/src/economy/refineryShipments.js`
  - expeditions vers soute ;
  - rush / completion expedition ;
  - craft de soute.

Resultat :

- `server/src/economy/refinery.js` passe d'environ 530 a environ 14 lignes.
- Il reste la facade publique historique utilisee par `profileActions.js` et `profiles.js`.
- Smoke test OK sur les exports raffinerie serveur.
- `SERVER_CHECK_OK` sur tout `server/src`.

Suite recommandee :

- arreter le gros decoupage structurel ;
- passer aux corrections en jeu et aux priorites MMO : anti-spam serveur, rang serveur et admin minimum.

## Extraction 12 - Cibles joueurs distants combat

Le ciblage client des joueurs distants n'est plus porte directement par `src/game/combatOrchestrator.js`.

- `src/game/systems/combatRemoteTargets.js`
  - construit la cible combat d'un joueur distant ;
  - resout une cible par id joueur pour les beams / attaques ;
  - resout la cible la plus proche au clic monde ;
  - conserve les regles existantes : meme groupe, niveau PvP, firme hostile et filtre par map courante.

Resultat :

- `src/game/combatOrchestrator.js` compose maintenant un resolver injecte avec `store`, `multiplayer` et `currentMap`.
- La logique de lock joueur distant devient testable sans charger le canvas ou Socket.IO.

Checks a relancer apres modification de ce domaine :

- `node --check src/game/systems/combatRemoteTargets.js`
- `node --check src/game/combatOrchestrator.js`
- `node --check server/test/combat-remote-targets.test.js`
- `npm test` dans `server/`

## Audit 13 - Gros fichiers jeu apres reprise

Etat inspecte le 13 juin 2026 apres l'extraction des cibles joueurs distants :

- `src/game/combatData.js` reste le plus gros fichier, mais c'est surtout un catalogue de maps, ennemis et profils. Ne pas le decouper sans besoin de domaine clair.
- `src/game/ui/combatPanels.js` reste gros car il compose plusieurs panneaux combat. Les prochains decoupages utiles sont des sous-panneaux autonomes, pas des petits wrappers.
- `src/game/render/world.js` est un gros renderer visuel. Le decouper seulement par couche de rendu claire si on touche aux fonds/parallax/spawn, car un mauvais decoupage peut casser le rendu sans gain gameplay.
- `src/game/combatOrchestrator.js` reste un coordinateur. Continuer a extraire des domaines testables quand on touche a une feature combat/MMO, mais ne pas extraire la glue pure.
- `src/game/systems/combatServerEvents.js` a maintenant des sous-domaines extraits pour effets d'armes distants et quetes serveur. Il reste candidat futur seulement si on touche aux portails, degats joueur, rewards, loot ou projectiles ennemis.

Regle appliquee : garder le decoupage conservateur. Un fichier gros n'est pas automatiquement un fichier mal decoupe si son contenu est du catalogue ou du rendu coherent.

## Extraction 13 - Carte du panneau combat

Le rendu de la carte territoriale du panneau combat n'est plus dans `src/game/ui/combatPanels.js`.

- `src/game/ui/combatMapPanel.js`
  - contient les secteurs visuels des firmes ;
  - contient les liaisons affichees sur la carte ;
  - rend le panneau carte combat a partir de `maps` et `getCurrentMap` ;
  - garde l'echappement HTML des noms de maps pour eviter une injection dans le panneau.
- `src/game/ui/combatPanels.js`
  - conserve seulement la composition, l'ouverture et le refresh du panneau `map` ;
  - appelle `renderCombatMapPanel({maps, getCurrentMap})`.
- `server/test/combat-map-panel.test.js`
  - verifie la map courante ;
  - verifie le compteur de secteurs actifs ;
  - verifie les points de portails ;
  - verifie l'echappement des noms affiches.

Resultat :

- `src/game/ui/combatPanels.js` passe d'environ 1306 a environ 1163 lignes.
- La carte devient testable sans canvas, DOM ni Socket.IO.

Checks a relancer apres modification de ce domaine :

- `node --check src/game/ui/combatMapPanel.js`
- `node --check src/game/ui/combatPanels.js`
- `node --check server/test/combat-map-panel.test.js`
- `node --test server/test/combat-map-panel.test.js`
- `npm test` dans `server/`

## Extraction 14 - Effets d'armes joueurs distants

Les animations d'armes recues des autres joueurs ne sont plus codees directement dans `src/game/systems/combatServerEvents.js`.

- `src/game/systems/combatRemoteWeaponEvents.js`
  - consomme `multiplayer.remoteEffects` ;
  - filtre les effets par map courante ;
  - rejoue les lasers distants via le systeme de beams ;
  - cree les projectiles visuels des roquettes et missiles distants ;
  - conserve l'ammo exacte, le sprite projectile, la couleur, la cible et les courbes de salve.
- `src/game/systems/combatServerEvents.js`
  - conserve son API publique historique ;
  - delegue `applyRemoteWeaponEvents()` au processeur dedie.
- `server/test/combat-remote-weapon-events.test.js`
  - verrouille le rendu laser distant avec ammo/couleur/cible ;
  - verrouille les missiles distants avec sprite `missile_m2`, cible joueur locale et courbes ;
  - verifie que les effets d'une autre map sont conserves brievement au lieu d'etre perdus.

Resultat :

- `src/game/systems/combatServerEvents.js` passe d'environ 512 a environ 460 lignes.
- La zone fragile des animations de ton pote est testable sans canvas ni Socket.IO.

Checks a relancer apres modification de ce domaine :

- `node --check src/game/systems/combatRemoteWeaponEvents.js`
- `node --check src/game/systems/combatServerEvents.js`
- `node --check server/test/combat-remote-weapon-events.test.js`
- `node --test server/test/combat-remote-weapon-events.test.js`
- `npm test` dans `server/`

## Extraction 15 - Evenements de quetes serveur en combat

Les evenements de quetes recus pendant le combat ne sont plus traites directement dans `src/game/systems/combatServerEvents.js`.

- `src/game/systems/combatQuestServerEvents.js`
  - traite la progression de quete serveur ;
  - traite les recompenses de quetes claim ;
  - traite les echecs de quetes temps / perte de vie ;
  - construit les libelles compacts de recompenses de quete ;
  - accepte des dependances injectees pour etre teste sans lancer le jeu.
- `src/game/systems/combatServerEvents.js`
  - garde les methodes publiques `applyQuestProgressEvents()` et `applyQuestFailureEvents()` ;
  - delegue aussi le claim de quete dans `applyAll()`.
- `server/test/combat-quest-server-events.test.js`
  - verifie la progression locale depuis un event serveur ;
  - verifie le reset et retrait d'une quete echouee ;
  - verifie le dedoublonnage d'un claim ;
  - verifie les libelles de recompenses items / munitions / portails / materiaux.

Resultat :

- `src/game/systems/combatServerEvents.js` passe d'environ 460 a environ 355 lignes.
- La logique de quetes combat est relisible et testable sans canvas ni Socket.IO.

Checks a relancer apres modification de ce domaine :

- `node --check src/game/systems/combatQuestServerEvents.js`
- `node --check src/game/systems/combatServerEvents.js`
- `node --check server/test/combat-quest-server-events.test.js`
- `node --test server/test/combat-quest-server-events.test.js`
- `npm test` dans `server/`

## Extraction 16 - Bindings de barre d'action combat

Les interactions de la barre d'action combat ne sont plus melangees aux bindings souris/clavier monde dans `src/game/ui/inputBindings.js`.

- `src/game/ui/combatActionBarInput.js`
  - installe les listeners de clic, dragstart, dragend, dragover et drop de `#gameActionBar` ;
  - gere le deplacement d'un slot vers un autre ;
  - gere la suppression d'un slot quand il est tire hors de la barre au-dela de 72 px ;
  - gere les drops d'extras, formations drones, munitions et CPU missile ;
  - expose `setCombatAssetDragImage()` reutilise par le panneau rapide combat.
- `src/game/ui/inputBindings.js`
  - garde les interactions monde, minimap, panneaux utilitaires, panneau spawn et raccourcis clavier ;
  - delegue la barre d'action a `installCombatActionBarInputHandlers()`.
- `server/test/combat-action-bar-input.test.js`
  - verrouille le seuil de suppression d'un slot ;
  - verrouille la lecture des payloads de drop ;
  - verifie l'assignation d'un extra dans un slot ;
  - verifie la suppression d'un slot tire hors barre.

Resultat :

- `src/game/ui/inputBindings.js` passe d'environ 688 a environ 598 lignes.
- Le code sensible des slots et munitions devient testable sans lancer le jeu.

Checks a relancer apres modification de ce domaine :

- `node --check src/game/ui/combatActionBarInput.js`
- `node --check src/game/ui/inputBindings.js`
- `node --check server/test/combat-action-bar-input.test.js`
- `node --test server/test/combat-action-bar-input.test.js`
- `npm test` dans `server/`

## Ajout MMO - Chat combat

Le chat combat MMO est decoupe en modules dedies :

- `server/src/socket/chatHandlers.js`
  - reception `chat:send` ;
  - validation du canal ;
  - nettoyage du texte ;
  - diffusion `chat:message` globale.
- `src/multiplayer/chatSocketListeners.js`
  - reception `chat:message` ;
  - reception `chat:error` ;
  - stockage temporaire dans `multiplayer.chatMessages`.
- `src/game/ui/combatChat.js`
  - fenetre chat redimensionnable ;
  - onglets Global, Firme, Guilde et Log ;
  - sauvegarde taille / position dans `uiLayout.combatChatPanel` ;
  - journal personnel des rewards combat via `voidsector:combat-log`.

Etat actuel :

- canal Global MMO fonctionnel ;
- canaux Firme et Guilde affiches mais bloques tant que la logique firmes / guildes n'existe pas ;
- onglet Log alimente par les rewards serveur et le legacy solo.

Regle :

- ne pas mettre de logique chat dans `server/src/index.js`, `src/game/combatOrchestrator.js` ou `src/multiplayer/client.js` au-dela du branchement minimal.

## Ajout MMO - Systeme de firme

La refonte firme ajoute un domaine serveur autoritaire dedie :

- `server/src/firms/firmRules.js`
  - constantes de saison, seuil collectif, paliers reputation, boutique, recompenses, quetes et boites.
- `server/src/firms/firmState.js`
  - etat global persistant, migration et sanitization.
- `server/src/firms/firmSeason.js`
  - points, contributions, classements, cloture de saison et recompenses en attente.
- `server/src/firms/firmQuests.js`
  - quetes quotidiennes 06h/12h/18h en heure locale serveur ;
  - snapshots avec quetes ouvertes et prochaines quetes verrouillees ;
  - quetes hebdomadaires auto-actives, progression collective et classements de contribution sans gain personnel de contribution ;
  - reclamation de prime de quete terminee, une seule fois par joueur.
- `server/src/firms/firmEconomy.js`
  - firmatons, achats boutique, ouverture de boites et application des recompenses.
- `server/src/firms/firmPvp.js`
  - anti-farm PvP quotidien.
- `server/src/firms/firmWar.js`
  - facade compatible avec les appels existants.
- `server/src/socket/firmHandlers.js`
  - sync, achat, ouverture, reclamation de recompense et reclamation de prime de quete.

Client :

- `src/ui/renderFirm.js` rend la page principale FIRME ;
- `src/styles/firm.css` contient le style de la page FIRME ;
- `src/game/ui/combatFirmPanel.js` rend le panneau firme condense en combat ;
- `src/multiplayer/firmCommands.js` et `src/multiplayer/firmSocketListeners.js` isolent les commandes et events Socket.IO du domaine.

Regles importantes :

- les firmatons ne doivent etre visibles que dans la page principale FIRME ;
- le bouton `CLASSEMENT` existant reste hors perimetre ;
- les broadcasts globaux doivent utiliser `firm:ranking`, pas `firm:snapshot`, pour ne pas ecraser le snapshot personnel d'un joueur ;
- `firmatons`, `firmBoxes` et `firmRewardHistory` sont proteges contre les sauvegardes client ;
- les nouvelles actions sensibles sont rate-limitees dans `server/src/config.js`.
- les primes de quete donnent 5 firmatons mais ne donnent aucun point individuel.
- la participation affichee sur une quete mesure uniquement les actions du joueur sur cette quete ; elle n'ajoute pas de contribution individuelle ;
- la colonne gauche des quetes ne cumule plus des objectifs de tailles differentes et liste les sessions du jour sans celles du lendemain ;
- les montants de Firmatons sont affiches avec l'icone apres le nombre dans la page FIRME.
- la boutique FIRME est structuree en zones de rarete filtrables ; chaque rarete contient 3 paliers de reputation et 9 offres catalogue.
- les offres de munitions laser de la boutique utilisent les noms et assets du catalogue d'equipement, pas des libelles temporaires.
- les coffres de firme utilisent des assets SVG dedies par rarete dans `assets/firm/chests/`.
- une planche de preview locale existe dans `assets/firm/chests/preview.html` pour comparer les 5 coffres de rarete et les 3 concepts alternatifs.
- `firm:box-open` renvoie maintenant la rarete du coffre ouvert et declenche cote client une animation centrale : rotation du coffre, ouverture du couvercle, puis revelation de la recompense avec son asset et sa quantite.

## Ajout MMO - Progression des monstres et drops de ressources

- Les plages de niveaux sont autoritaires cote serveur :
  - cartes 1 a 5 : `1-4`, `5-9`, `10-14`, `15-19`, `20-24` ;
  - noyau central : `25-34` ;
  - les regles de drop couvrent deja les futures zones trou noir `35-50`.
- Chaque espece conserve un niveau de base. Chaque niveau supplementaire applique :
  - `+5 %` vie, bouclier et degats ;
  - `+10 %` XP, credits, NOVA et donc reputation issue de l'XP.
- `server/src/world/resourceDrops.js` contient les taux par rarete et tire les ressources cote serveur.
- `server/src/world/loot.js` cree des drops prives, valide la distance et ajoute la ressource au profil lors du ramassage.
- Les objets au sol utilisent un asset leger, un halo de rarete, une rotation et une oscillation verticale.
- A l'arrivee sur une ressource, le client joue une aspiration de `0,7 s`, bloque le mouvement puis demande la validation finale du ramassage au serveur.
- La boutique commune contient un coffre et les huit nouvelles ressources de craft.
- Chaque achat de ressource commune ajoute exactement une unite au profil.

Checks effectues :

- `npm test` dans `server/` : 81 tests OK ;
- `node --check` sur les fichiers JS modifies : OK ;
- `git diff --check` : OK ;
- verification visuelle navigateur non effectuee dans la session, car le navigateur integre etait indisponible.

## Verrou MMO-only - Autorite serveur et fin des fallbacks locaux

La passe MMO-only retire les derniers chemins actifs qui pouvaient encore doubler la logique serveur cote client.

- `src/core/store.js` ne sauvegarde plus l'etat complet dans `localStorage`.
- `src/core/localPreferencesStore.js` ne persiste que les preferences locales :
  - qualite graphique ;
  - raccourcis de slots ;
  - layout UI.
- Les anciens saves locaux complets sont relus uniquement pour migrer ces preferences, puis reecrits en format preferences-only.
- `src/multiplayer/profileSync.js` n'envoie plus que les preferences non critiques au serveur :
  - action slots ;
  - action slots par vaisseau ;
  - dernier laser selectionne.
- `server/src/players/profiles.js` rejette les sauvegardes non authentifiees et ignore les champs critiques envoyes par le client.

Progression et combat :

- XP, credits, NOVA, niveaux, inventaire, munitions, ressources, quetes, portails, kills, stats de tir et temps de jeu ne doivent plus etre modifies localement.
- Les recompenses, drops, ramassages, tirs et quetes attendent la validation serveur puis un `profile:sync`.
- Les evenements client de recompense ou de quete servent a afficher des notifications, pas a appliquer la progression.
- Les cibles non serveur sont refusees par le systeme d'armes MMO-only.
- Les drops au sol ne sont ramassables que s'ils sont explicitement `serverControlled`.
- Les titres de profil sont valides cote serveur via `profile:title-set`.

Tests de protection ajoutes ou mis a jour :

- sauvegarde locale preferences-only ;
- sauvegarde profil client limitee aux preferences autorisees ;
- rejet des cibles et butins locaux ;
- absence de consommation locale des munitions ;
- absence de calcul de degats local ;
- stats de tir et temps de jeu persistants cote serveur ;
- validation serveur des titres publics.

Checks effectues :

- `node --check` sur les fichiers modifies clefs : OK ;
- tests cibles MMO-only : OK ;
- `npm test` dans `server/` : 241 tests OK ;
- recherches `rg` sur les mutations locales sensibles : aucune mutation active hors application du `profile:sync` serveur.

Regle de maintenance :

- Ne pas recreer de branche `else saveState()` pour quetes, recompenses, achats, raffinage, tirs ou drops.
- Si une action touche a la progression MMO, elle doit passer par une commande socket serveur, puis etre appliquee au client uniquement par `profile:sync`.
- Les modules legacy de `src/core/*Store.js` peuvent rester tant qu'ils ne sont pas appeles par les workflows actifs ; leur suppression doit se faire par domaine, avec tests dedies.

## Verrou MMO-only - Compte obligatoire

- `server/src/security/gameplayAccountGuard.js` applique une politique privee par defaut : tout event socket exige un `accountId`, sauf auth, `player:hello` et classement.
- `player:hello` n'envoie plus de profil invite. Un token en attente peut terminer `auth:session`, mais aucun gameplay n'est accepte avant l'attachement du compte.
- Les sockets non authentifiees ne rejoignent plus automatiquement la map 0 et ne sont plus publiees dans `players:list`.
- Les commandes client combat, economie, profil, firme, groupe et social attendent maintenant un compte et un `profile:sync` termines.
- Un logout compte ferme proprement la socket afin que l'ancien vaisseau ne reste pas actif sous une identite invitee.
- Tout nouveau handler Socket.IO doit appeler `guard(eventName)` ; un test structurel controle cette regle.

## Securite MMO - Identite pilote et rendu HTML

- `server/src/players/profileIdentity.js`
  - normalise les noms de pilote en texte affichable ;
  - conserve lettres, accents, chiffres, espaces, points, tirets et `_` ;
  - retire les caracteres de controle et de balisage HTML ;
  - limite les noms a 24 caracteres.
- `server/src/players/profileSanitize.js`
  - nettoie aussi les noms deja stockes lors du chargement des profils.
- `src/ui/render.js` et `src/ui/renderLeaderboard.js`
  - echappent explicitement les noms avant insertion avec `innerHTML`.
- `server/test/profile-name-security.test.js`
  - verrouille la normalisation serveur ;
  - verrouille le nettoyage des anciens profils ;
  - controle les deux rendus client sensibles.

Checks effectues :

- `node --check` sur les modules modifies ;
- `npm test` dans `server/` : 256 tests OK ;
- `git diff --check` sur les fichiers de cette passe.

## Persistance MMO - Ecritures atomiques et arret gracieux

- `server/src/storage/profileStore.js`
  - serialise les ecritures dans une file unique ;
  - execute les sauvegardes PostgreSQL dans une transaction ;
  - refuse qu'une ancienne version `updatedAt` remplace une version plus recente ;
  - fusionne les profils modifies avec le contenu JSON existant ;
  - ecrit le fallback JSON dans un fichier temporaire unique, force la synchronisation disque puis effectue un renommage atomique.
- `server/src/players/profiles.js`
  - sauvegarde uniquement le profil concerne par une action ;
  - attribue une version `updatedAt` strictement croissante ;
  - expose `flushPersistence()` pour attendre toutes les sauvegardes en cours.
- `server/src/lifecycle/gracefulShutdown.js`
  - arrete le tick serveur et les nouvelles connexions ;
  - force une derniere capture des joueurs connectes ;
  - attend la fin de la persistance avant de fermer PostgreSQL ;
  - rend l'arret idempotent pour eviter une double fermeture.
- `server/src/index.js`
  - branche cet arret propre sur `SIGINT` et `SIGTERM`.
- `server/test/profile-persistence.test.js`
  - controle la serialisation, la fusion JSON, les fichiers temporaires, les versions obsoletes et la transaction PostgreSQL.
- `server/test/graceful-shutdown.test.js`
  - controle l'ordre complet de fermeture et l'idempotence.

Checks effectues :

- `node --check` sur les 99 fichiers JavaScript serveur : OK ;
- `npm test` dans `server/` : 260 tests OK ;
- `git diff --check` sur les fichiers de cette passe : OK.

## Exploitation MMO - Configuration production et readiness

- `server/src/config.js`
  - refuse un port hors plage ;
  - valide une ou plusieurs origines HTTP(S) separees par des virgules ;
  - interdit `CLIENT_ORIGIN=*` en production ;
  - exige `DATABASE_URL` en production pour empecher un demarrage accidentel sur le fallback JSON.
- `server/src/db/client.js`
  - expose un controle PostgreSQL reel avec `SELECT 1` et mesure de latence.
- `server/src/monitoring/health.js`
  - construit un etat de readiness testable sans demarrer tout le serveur ;
  - retourne HTTP 503 quand PostgreSQL est configure mais indisponible ;
  - conserve les compteurs sockets, comptes en ligne et sessions de jeu.
- `server/src/index.js`
  - utilise cette readiness pour `/health`.
- `server/.env.example`
  - documente les variables obligatoires en production.
- `.gitignore`
  - exclut tous les magasins JSON d'execution, y compris `server/data/profiles.json`.
- `server/test/production-safety.test.js`
  - controle les erreurs de configuration production et les reponses 200/503 de readiness.
- `server/test/live-server-config.test.js`
  - controle que tous les fichiers JSON runtime sont exclus de Git.

Attention :

- `server/data/profiles.json` etait deja suivi par Git avant l'ajout de la regle. La regle empeche les futurs ajouts une fois le fichier retire de l'index, mais le retrait de l'index doit etre fait explicitement sans supprimer la copie locale.

Checks effectues :

- `npm test` dans `server/` : 266 tests OK ;
- `node --check` sur les 158 fichiers JavaScript de `server/src` et `server/test` : OK ;
- `git diff --check` sur les fichiers de cette passe : OK.

## Stabilite 24/7 - Rate limits et cooldowns

- `server/src/socket/rateLimit.js`
  - purge periodiquement les buckets expires ;
  - expose un nettoyage par socket ;
  - supprime immediatement les buckets d'une socket deconnectee.
- `server/src/security/accountActionLocks.js`
  - conserve les verrous par `accountId` lors d'une reconnexion ;
  - purge periodiquement les comptes inactifs sans attendre un seuil de 5 000 entrees.
- `server/src/combat/damage.js`
  - lie les cooldowns d'armes a l'identite stable du compte ;
  - empeche de contourner une recharge en changeant de socket ;
  - purge les cooldowns expires.
- `server/src/socket/disconnectHandlers.js`
  - declenche le nettoyage des rate limits socket a chaque deconnexion.
- `server/test/rate-limit-lifecycle.test.js`
  - controle la liberation memoire ;
  - controle la conservation des verrous compte apres reconnexion ;
  - controle le cooldown combat stable par compte.

Checks effectues :

- `npm test` dans `server/` : 269 tests OK ;
- `node --check` sur les 159 fichiers JavaScript de `server/src` et `server/test` : OK ;
- `git diff --check` sur les fichiers de cette passe : OK.

## Schema MMO - Migrations versionnees et identites uniques

- `server/src/db/migrations.js`
  - remplace les modifications SQL dispersees au demarrage par des migrations identifiees ;
  - stocke les versions appliquees dans `schema_migrations` ;
  - execute chaque migration dans sa propre transaction ;
  - utilise un verrou consultatif PostgreSQL pour empecher deux instances de migrer simultanement ;
  - cree `pilot_identities` avec une cle de nom unique et un seul nom reserve par compte ;
  - bloque la migration si des noms de pilote deja configures sont en conflit.
- `server/src/db/client.js`
  - lance le moteur de migrations lors de l'initialisation PostgreSQL.
- `server/src/players/profileIdentity.js`
  - produit une cle d'identite NFKC insensible a la casse.
- `server/src/storage/pilotIdentityStore.js`
  - reserve ou remplace le nom d'un compte dans une transaction ;
  - refuse un nom possede par un autre compte ;
  - detecte aussi la course ou une autre instance insere le nom entre la verification et l'ecriture.
- `server/src/players/profiles.js`
  - serialise les configurations d'identite dans le processus ;
  - refuse les doublons locaux deja configures ;
  - attend la reservation PostgreSQL avant de modifier le profil.
- `server/src/db/migrateJson.js`
  - reserve les noms des anciens profils configures pendant l'import JSON.
- `server/src/socket/playerHandlers.js`
  - attend la reservation et renvoie une erreur temporaire propre si PostgreSQL echoue.
- `server/test/database-migrations.test.js`
  - controle migrations en attente, transactions, rollback et liberation du verrou.
- `server/test/pilot-identity.test.js`
  - controle normalisation, doublons locaux, proprietaire PostgreSQL, renommage et course concurrente.

Checks effectues :

- `npm test` dans `server/` : 276 tests OK ;
- `node --check` sur les 163 fichiers JavaScript de `server/src` et `server/test` : OK ;
- `git diff --check` sur les fichiers de cette passe : OK.

## Optimisation MMO - Cadence de sauvegarde session monde

- `server/src/players/profileWorldSession.js`
  - expose `WORLD_SESSION_SAVE_INTERVAL_MS = 15_000` ;
  - limite les sauvegardes non forcees de session monde a une fois toutes les 15 secondes par joueur ;
  - conserve les sauvegardes forcees immediates pour mort, deconnexion, respawn, changement de vaisseau, Portgun et retours de portail.
- `server/src/world/playerActivity.js`
  - aligne les sauvegardes de mouvement serveur/background sur la meme cadence de 15 secondes.
- `server/src/socket/playerHandlers.js`
  - force la sauvegarde quand un snapshot valide change de map, donc transition portail/map sauvegardee immediatement.
- Les gains importants restent immediats car ils passent par les mutations profil :
  - kill mob : `applyReward()` persiste le profil ;
  - ressource / item / piece de portail ramasse : `loot:pickup` mute le profil puis persiste ;
  - quetes, achats, equipement, raffinerie et progression : actions serveur avec persistance immediate.
- `server/test/server-profile-stats.test.js`
  - controle la cadence 15 secondes et l'exception `force:true`.
- `server/test/firm-setup.test.js`
  - controle qu'une transition de map force une sauvegarde immediate.

Checks effectues :

- `npm test -- test/server-profile-stats.test.js test/firm-setup.test.js test/player-background-intent.test.js` dans `server/` : 11 tests OK ;
- `node --check` sur les fichiers JS modifies de cette passe : OK ;
- `npm test` dans `server/` : 278 tests OK ;
- `git diff --check` : OK, uniquement des avertissements CRLF.

## Parametres client en jeu

Etat au 22 juin 2026 :

- `src/core/settingsSchema.js` porte le schema local versionne, les presets graphiques et leur normalisation ;
- `src/core/settingsStore.js` expose les mutations de preferences sans ajouter de logique a la facade `store.js` ;
- `src/game/ui/combatSettingsPanel.js` gere la fenetre a quatre onglets et la capture des touches ;
- `src/game/systems/combatSettingsRuntime.js` centralise l'application immediate au HUD, au chat, au panneau PERF et au canvas ;
- les preferences restent locales au navigateur et ne deviennent pas des donnees MMO autoritaires ;
- les anciens champs `graphicsQuality`, `slotKeybinds` et `uiLayout` sont conserves et migres ;
- la boucle de combat accepte un limiteur FPS sans modifier les ticks serveur caches ;
- les options graphiques ne changent que le rendu client et jamais les degats, collisions, drones ou projectiles autoritaires.

Checks effectues :

- `node --check` sur les modules de parametres et de rendu modifies : OK ;
- tests cibles parametres, migration et FPS : 9/9 OK ;
- `npm test` dans `server/` : 433/433 OK ;
- verification visuelle locale a 1280x720 : OK ;
- `git diff --check` : OK, uniquement des avertissements CRLF.
