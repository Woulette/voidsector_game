# VoidSector - Roadmap MMO 100%

Objectif : transformer le prototype MMO actuel en version MMO complete, stable, persistante et exploitable en beta publique.

Ce document part de l'etat actuel du projet :

- client navigateur existant ;
- serveur Node.js + Socket.IO dans `server/src/index.js` ;
- presence joueurs, groupes, invitations ;
- ennemis partages et controles serveur ;
- portails serveur ;
- quetes serveur partielles ;
- recompenses serveur partielles ;
- premiere sauvegarde de profil dans `server/data/profiles.json`.

Conclusion : VoidSector n'a pas besoin d'une refonte totale pour devenir MMO. Le travail principal est de rendre le serveur autoritaire sur les donnees critiques, remplacer la sauvegarde fichier par une vraie base, ajouter les comptes, puis durcir la securite et l'exploitation.

## Etat actuel des travaux MMO

Deja en place :

- comptes joueur avec inscription / connexion ;
- sessions persistantes ;
- stockage PostgreSQL avec fallback JSON ;
- migration des anciens profils JSON ;
- sauvegarde profil liee au compte ;
- serveur decoupe en premiers modules ;
- logs serveur et rate limit Socket.IO ;
- deconnexion en jeu avec delai et annulation en mouvement / combat ;
- recompenses serveur pour ennemis monde et portails ;
- boutique serveur pour munitions, items, vaisseaux, drones et formations ;
- possessions serveur synchronisees : inventaire, munitions, vaisseaux, drones, formations ;
- equipement serveur : equiper / retirer lasers, generateurs, launchers, extras et drones avec validation d'inventaire.
- premiere passe de combat serveur : les tirs contre ennemis serveur utilisent les degats, cooldowns, distances et munitions calcules cote serveur.
- ramassage serveur initial : les pieces de portail dropees par le serveur doivent etre reclamees via `loot:pickup`, puis ajoutees au profil serveur.
- drops serveur etendus : materiaux, munitions et items rares peuvent etre generes par le serveur, ramasses via `loot:pickup`, puis sauvegardes dans le profil serveur.
- quetes serveur : acceptation, progression kill, progression visite de map, progression raffinerie, progression Space Caster et claim recompense passent par Socket.IO et sont sauvegardes dans le profil serveur.
- recompenses de quetes serveur : credits, NOVA, XP, materiaux, pieces de portail, munitions et items sont appliques cote serveur.
- Space Caster serveur : le serveur depense la NOVA, tire les recompenses, ajoute munitions / pieces de portail et synchronise le profil.
- raffinerie serveur initiale : lancement / acceleration des ameliorations, activation production, lancement / recuperation des recettes de raffinage sont valides et appliques cote serveur.
- expeditions de raffinerie serveur : le serveur valide le stock, le cout credits, la place en soute, cree l'expedition, gere le rush NOVA et livre dans `shipCargo`.
- craft de soute serveur : les recettes de fusion consomment les materiaux de `shipCargo`, verifient la capacite du vaisseau et ajoutent l'output cote serveur.
- upgrades equipement serveur : les ameliorations canon / generateur / roquette consomment les materiaux cote serveur depuis `cargoHold` ou `shipCargo`, verifient le Portail Emeraude et synchronisent `equipmentUpgrades`.
- anti-double gain initial : les ennemis monde marquent leurs rewards/drops comme deja traites, le ramassage supprime le drop avant mutation profil, les portails marquent l'instance comme rewardee et le client n'applique plus localement les munitions / completion quand `rewardAppliedByServer` est actif.
- recompenses portail serveur renforcees : fin de portail ajoute credits / NOVA / XP, compteur `completedPortals` et munitions portail directement dans le profil serveur.

Prochaine priorite : passer skills / prestige / unlock portails cote serveur, puis ajouter des verrous anti-spam par compte sur les actions sensibles.

## Definition de "MMO 100%" pour VoidSector

Le jeu est considere MMO complet quand :

- un joueur peut creer un compte et retrouver sa progression sur n'importe quel PC ;
- plusieurs joueurs peuvent jouer en meme temps sur les memes maps ;
- les groupes, portails, quetes, rewards et drops fonctionnent cote serveur ;
- le serveur decide des recompenses, de l'inventaire, de la progression et des couts ;
- le client ne peut pas s'ajouter gratuitement credits, NOVA, XP, equipements ou degats ;
- les donnees persistent dans une base fiable ;
- le serveur peut tourner 24/7 sur un hebergement public ;
- un admin peut surveiller, corriger et moderer le jeu ;
- une coupure serveur ne corrompt pas les profils.

## Priorite 0 - Garder ce qui marche

Ne pas supprimer le prototype actuel.

Elements a conserver :

- Socket.IO ;
- synchro positions joueurs ;
- groupes ;
- maps monde serveur ;
- ennemis serveur ;
- IA ennemie serveur ;
- portails serveur ;
- recompenses serveur ;
- quetes serveur ;
- profil serveur temporaire.

Regle importante : le mode solo doit rester jouable. Le MMO doit progressivement devenir le mode principal, mais le solo sert encore de fallback et de banc de test.

## Priorite 1 - Comptes joueurs

Probleme actuel : la sauvegarde est liee au pseudo. Un joueur peut reprendre ou ecraser un profil si le pseudo est connu.

A faire :

- ajouter inscription / connexion ;
- stocker un `accountId` stable ;
- utiliser email + mot de passe, ou pseudo + mot de passe pour commencer ;
- hasher les mots de passe avec `bcrypt` ou `argon2` ;
- creer un token de session ;
- lier chaque profil a un `accountId`, pas au pseudo ;
- empecher deux connexions concurrentes non gerees sur le meme compte.

Schema minimal :

```txt
accounts
- id
- username
- passwordHash
- createdAt
- lastLoginAt
- role

sessions
- id
- accountId
- tokenHash
- expiresAt
- createdAt
```

## Priorite 2 - Base de donnees

Probleme actuel : `server/data/profiles.json` est suffisant pour tester, pas pour un MMO.

Choix recommande pour beta :

- PostgreSQL si tu veux une base solide des maintenant ;
- SQLite seulement si tu veux aller tres vite en beta fermee locale ;
- Prisma ou Drizzle pour eviter les requetes SQL dispersees partout.

Donnees a migrer en premier :

- compte ;
- profil joueur ;
- credits ;
- NOVA ;
- XP / niveau ;
- rang ;
- inventaire ;
- equipement ;
- munitions ;
- soute cargo ;
- competences ;
- portails termines ;
- pieces de portail ;
- quetes ;
- raffinerie.

Regle : aucune donnee importante ne doit seulement vivre dans `localStorage`.

## Priorite 3 - Serveur autoritaire sur la progression

Probleme actuel : le client envoie encore de gros blocs de profil au serveur. Pour un MMO complet, le serveur doit accepter des actions, pas accepter directement le resultat final.

Mauvais modele :

```txt
client -> serveur : voici mon nouveau profil complet
```

Bon modele :

```txt
client -> serveur : je veux acheter cet item
serveur -> verifie credits, niveau, stock, regles
serveur -> sauvegarde achat
serveur -> renvoie le nouveau profil valide
```

Actions a rendre serveur :

- achat magasin ;
- vente / recyclage ;
- equiper / desequiper item ;
- upgrade equipement ;
- depense de NOVA ;
- gain credits / XP / NOVA ;
- ajout munitions ;
- loot ;
- validation quete ;
- recompense portail ;
- progression rang ;
- raffinerie ;
- expedition cargo ;
- craft.

Le client peut afficher l'UI et demander une action. Le serveur decide si l'action est valide.

## Priorite 4 - Degats et combat serveur

Probleme actuel : le client peut envoyer un montant de degats a appliquer. C'est acceptable pour prototype, pas pour MMO public.

Etape beta acceptable :

- le client envoie `enemyId`, arme utilisee, timestamp, position, cible ;
- le serveur retrouve l'equipement du joueur ;
- le serveur calcule les degats theorique ;
- le serveur valide distance, cooldown, munition et ligne de tir approximative ;
- le serveur applique les degats.

Evenements recommandes :

```txt
combat:fire
- weaponSlot
- targetId
- clientAimX
- clientAimY
- clientTime

combat:use-extra
- slot
- targetId

combat:use-ammo
- ammoId
```

Le serveur doit verifier :

- joueur vivant ;
- joueur sur la bonne map ;
- ennemi vivant ;
- distance raisonnable ;
- cadence de tir ;
- arme equipee ;
- munition disponible ;
- degats maximum possible ;
- cooldown extras ;
- pas de spam d'evenements.

## Priorite 5 - Inventaire serveur

Tout ce qui a une valeur doit etre gere cote serveur.

Donnees critiques :

- credits ;
- NOVA ;
- ammo ;
- items ;
- loadout vaisseau ;
- loadout drones ;
- extras ;
- materiaux ;
- pieces de portail ;
- recompenses de boss ;
- items rares.

Regle : le client ne doit jamais pouvoir dire "ajoute-moi cet item". Il doit seulement declencher une action valide qui peut produire cet item.

Exemples :

```txt
loot:pickup
- lootId

shop:buy
- itemId
- quantity

equipment:equip
- inventoryUid
- slotId
```

## Priorite 6 - Quetes serveur

Les quetes doivent avoir une source de verite serveur.

A faire :

- stocker les quetes actives par joueur ;
- stocker la progression par objectif ;
- incrementer uniquement via evenements serveur valides ;
- donner la recompense cote serveur ;
- empecher double validation ;
- permettre quetes solo, groupe, daily, weekly.

Types d'objectifs utiles :

- tuer X ennemis d'un type ;
- finir X portails ;
- ramasser X objets ;
- crafter X ressources ;
- atteindre une map ;
- tuer boss ;
- evenement de groupe.

## Priorite 7 - Portails et instances

Le systeme actuel est une bonne base.

A durcir :

- creation instance cote serveur ;
- membres autorises ;
- lock d'entree ;
- etat des vagues ;
- vies restantes ;
- mort / respawn ;
- abandon ;
- reconnexion en instance ;
- recompense une seule fois ;
- logs de clear ;
- prevention du farm anormal.

Le serveur doit stocker :

```txt
instances
- id
- type
- portalId
- leaderId
- members
- wave
- status
- startedAt
- completedAt
```

## Priorite 8 - Monde partage

Pour VoidSector, le meilleur modele n'est pas forcement un monde unique massif. Le modele recommande :

- maps partagees par zone ;
- instances de portails ;
- groupes ;
- channels ou shards si trop de joueurs sur une map ;
- ennemis serveur par map ;
- respawn serveur.

Objectif beta :

- 20 a 50 joueurs par serveur ;
- maps partagees stables ;
- portails instancies ;
- groupes de 2 a 4 joueurs.

Objectif plus tard :

- plusieurs shards ;
- transfert de joueur entre serveurs ;
- file d'attente si serveur plein ;
- regions Europe / US si besoin.

## Priorite 9 - Decoupage du serveur

Probleme actuel : `server/src/index.js` contient trop de responsabilites.

Structure cible :

```txt
server/src/
  index.js
  config.js
  socket.js
  db/
    client.js
    schema.js
  auth/
    accounts.js
    sessions.js
  players/
    players.js
    profiles.js
    presence.js
  world/
    maps.js
    enemies.js
    loot.js
  combat/
    damage.js
    weapons.js
    validation.js
  groups/
    groups.js
    invites.js
  portals/
    instances.js
    waves.js
    rewards.js
  quests/
    questProgress.js
    questDefinitions.js
  economy/
    shop.js
    inventory.js
    currency.js
  admin/
    commands.js
    moderation.js
```

Regle de migration : extraire un domaine a la fois, avec `node --check` apres chaque extraction.

## Priorite 10 - Anti-triche minimum

Le but n'est pas un anti-cheat parfait au debut. Le but est d'empecher les triches faciles.

Checks minimum :

- rate limit par socket ;
- validation des degats max ;
- validation des distances ;
- validation des cooldowns ;
- validation des munitions ;
- validation des rewards ;
- logs des gains importants ;
- detection de vitesse impossible ;
- detection de farm anormal ;
- serveur ignore les profils client non signes ;
- serveur ne fait pas confiance a `localStorage`.

Logs suspects :

- trop de degats par seconde ;
- trop de kills par minute ;
- trop de NOVA gagnee ;
- trop de portails termines ;
- position qui saute trop loin ;
- trop de reconnexions ;
- appels socket invalides repetes.

## Priorite 11 - Admin et moderation

Un MMO a besoin d'outils admin simples.

A faire :

- voir joueurs connectes ;
- voir profil joueur ;
- modifier credits / NOVA / XP avec raison ;
- ban / unban ;
- kick ;
- mute plus tard si chat ;
- logs economie ;
- logs portails ;
- logs erreurs serveur ;
- commande de give reservee admin ;
- reset instance bloquee.

Role minimal :

```txt
player
moderator
admin
owner
```

## Priorite 12 - Deploiement public

Client :

- Vercel possible.

Serveur :

- VPS recommande pour controle total ;
- Railway / Render / Fly.io possible pour beta ;
- processus Node permanent ;
- variable `CLIENT_ORIGIN` configuree ;
- HTTPS ;
- domaine propre ;
- logs persistants.

Base :

- PostgreSQL heberge ;
- backups automatiques ;
- migrations versionnees.

Monitoring :

- endpoint `/health` ;
- logs erreurs ;
- nombre joueurs connectes ;
- latence moyenne ;
- memoire ;
- CPU ;
- nombre d'instances actives.

## Priorite 13 - Tests

Tests serveur indispensables :

- creation compte ;
- login ;
- chargement profil ;
- sauvegarde profil ;
- achat item ;
- equipement item ;
- hit ennemi valide ;
- hit ennemi invalide ;
- kill ennemi ;
- reward groupe ;
- portail start ;
- portail complete ;
- quete progression ;
- reconnexion ;
- migration DB.

Tests manuels beta :

- 2 joueurs meme map ;
- 2 joueurs meme groupe ;
- 2 joueurs portail ;
- deco / reco pendant portail ;
- fermeture navigateur ;
- serveur restart ;
- achat puis refresh ;
- loot puis refresh ;
- quete puis refresh.

## Ordre de travail recommande

### Phase A - Stabiliser la base actuelle

1. Ajouter un fichier `.env.example` pour le serveur.
2. Ajouter logs serveur propres.
3. Ajouter rate limit simple Socket.IO.
4. Decouper `server/src/index.js` en modules sans changer le gameplay.
5. Ajouter tests simples sur les fonctions pures du serveur.

### Phase B - Comptes + DB

1. Installer PostgreSQL ou SQLite temporaire.
2. Ajouter schema DB.
3. Ajouter comptes.
4. Ajouter sessions.
5. Migrer `profiles.json` vers DB.
6. Charger le profil par compte.
7. Sauvegarder le profil par compte.

### Phase C - Autorite serveur economie

1. Deplacer credits / NOVA cote serveur.
2. Deplacer inventaire cote serveur.
3. Deplacer magasin cote serveur.
4. Deplacer equipement cote serveur.
5. Deplacer munitions cote serveur.
6. Deplacer recompenses cote serveur.

### Phase D - Autorite serveur combat

1. Remplacer `enemy:hit { amount }`.
2. Envoyer action de tir au serveur.
3. Calculer les degats serveur.
4. Valider cooldowns et distance.
5. Consommer munitions serveur.
6. Appliquer rewards seulement apres kill serveur valide.

### Phase E - MMO beta publique

1. Heberger serveur 24/7.
2. Heberger DB.
3. Ajouter backups.
4. Ajouter admin minimal.
5. Ajouter monitoring.
6. Faire test charge avec plusieurs clients.
7. Ouvrir beta fermee.

## Ce qui peut attendre apres la beta

- chat global ;
- amis ;
- guildes / firmes avancees ;
- marche entre joueurs ;
- hotel des ventes ;
- trading ;
- shards multi-regions ;
- anti-cheat avance ;
- matchmaking automatique ;
- outils admin web complets ;
- launcher dedie.

## Definition de beta MMO acceptable

La beta MMO est acceptable quand :

- un joueur cree un compte ;
- il se connecte depuis un autre PC et retrouve sa progression ;
- deux joueurs se voient sur une map ;
- ils peuvent grouper ;
- ils peuvent tuer les memes ennemis ;
- les rewards viennent du serveur ;
- les portails serveur donnent leurs recompenses ;
- l'inventaire et les monnaies persistent en DB ;
- le client ne peut pas tricher facilement avec les degats ou les monnaies ;
- le serveur peut tourner plusieurs jours sans reset manuel.

## Regles pour les futures IA

- Ne pas supprimer le multi actuel.
- Ne pas refaire tout le jeu en une fois.
- Ne pas transformer le serveur en microservices trop tot.
- Ne pas faire confiance au client pour les donnees critiques.
- Toujours garder le solo jouable pendant la migration.
- Quand une feature devient MMO, ajouter d'abord l'API serveur puis brancher le client.
- Un commit doit faire soit du refactor, soit du gameplay, pas les deux.
- Tester `node --check` sur les fichiers modifies.
