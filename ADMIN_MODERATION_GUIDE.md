# Guide admin et moderation serveur

Ce document explique le systeme admin serveur actuel de VoidSector : roles, commandes Socket.IO, sanctions, audit, health check, et comment passer un compte en moderator/admin/owner.

## Etat actuel

Le serveur possede un module admin cote serveur et un panneau admin accessible en jeu aux comptes staff. Le panneau regroupe les fenetres d'un meme compte, affiche uniquement les profils officiels lies a un compte et permet d'inspecter l'inventaire.

Fichiers principaux :

- `server/src/admin/adminManager.js` : logique des droits et actions admin.
- `server/src/socket/adminHandlers.js` : events Socket.IO admin.
- `server/src/admin/adminAudit.js` : journal d'audit admin.
- `server/src/storage/authStore.js` : stockage comptes, roles, ban, mute.
- `server/src/auth/accounts.js` : blocage login pour comptes bannis.
- `server/src/auth/sessions.js` : blocage anciennes sessions pour comptes bannis.
- `server/src/socket/chatHandlers.js` : blocage chat pour comptes mute.
- `server/src/groups/groups.js` : reset d'instance groupe/coop.
- `server/src/config.js` : rate limits des events admin.
- `server/test/admin-tools.test.js` : tests serveur admin.

## Roles disponibles

Les roles sont classes du plus faible au plus fort :

| Role | Niveau | Droits |
| --- | ---: | --- |
| `player` | 0 | Aucun droit admin. |
| `moderator` | 1 | Voir l'etat serveur, inspecter, kick, mute/unmute. |
| `admin` | 2 | Droits moderator + correction credits/NOVA/XP, suppression d'inventaire, ban/unban, reset instance. |
| `owner` | 3 | Niveau maximum, prevu pour le compte principal/proprietaire. |

Un role superieur peut utiliser les commandes du role inferieur.

## Comment devenir moderator/admin/owner

Pour l'instant, il n'y a pas encore de commande en jeu pour promouvoir un compte. Le role se modifie directement dans le stockage des comptes.

### Si PostgreSQL est actif

Verifier d'abord `/health`. Si `storage` vaut `postgres`, le serveur utilise PostgreSQL.

Exemples SQL :

```sql
UPDATE accounts SET role = 'moderator' WHERE username_key = 'pseudo';
UPDATE accounts SET role = 'admin' WHERE username_key = 'pseudo';
UPDATE accounts SET role = 'owner' WHERE username_key = 'pseudo';
```

Pour revenir joueur normal :

```sql
UPDATE accounts SET role = 'player' WHERE username_key = 'pseudo';
```

Le joueur doit se reconnecter pour que son socket recupere le nouveau role.

### Si le fallback JSON est actif

Si `/health` indique `storage: "json"`, les comptes sont dans :

```text
server/data/accounts.json
```

Modifier le champ `role` du compte voulu :

```json
{
  "id": "account-id",
  "username": "Pseudo",
  "role": "admin"
}
```

Roles valides :

```text
player
moderator
admin
owner
```

Avec le fallback JSON, il faut redemarrer le serveur apres une modification manuelle du fichier, puis reconnecter le compte.

## Health check serveur

URL locale :

```text
http://127.0.0.1:3001/health
```

Reponse type :

```json
{
  "ok": true,
  "service": "voidsector-realtime",
  "storage": "postgres",
  "uptimeSeconds": 123,
  "players": {
    "sockets": 4,
    "online": 4,
    "game": 2
  },
  "at": 1781426983322
}
```

Champs importants :

- `storage` : `postgres` ou `json`.
- `uptimeSeconds` : temps depuis le dernier demarrage serveur.
- `players.sockets` : sockets connectees.
- `players.online` : comptes uniques connectes, meme si un joueur ouvre plusieurs fenetres.
- `players.game` : comptes uniques ayant au moins une fenetre dans le client jeu.

## Utiliser les commandes admin

Toutes les commandes admin passent par Socket.IO. Le compte connecte doit avoir le role requis.

Si une commande echoue, le serveur renvoie :

```js
socket.on("admin:error", payload => {
  console.log(payload.message);
});
```

## admin:sync

Role requis : `moderator`.

Permet de recuperer une vue globale serveur :

- joueurs connectes
- groupes
- instances actives
- profils recents
- dernieres actions d'audit

Exemple :

```js
socket.emit("admin:sync", {
  profileLimit: 20,
  auditLimit: 20
});

socket.on("admin:snapshot", result => {
  console.log(result.snapshot);
});
```

Reponse utile :

```js
{
  ok: true,
  snapshot: {
    generatedAt,
    totals: {
      sockets,
      online,
      game,
      groups,
      instances,
      profiles
    },
    onlinePlayers,
    groups,
    recentProfiles,
    audit
  }
}
```

## admin:inspect-player

Role requis : `moderator`.

Permet d'inspecter un joueur en ligne ou un profil sauvegarde.

Par socket joueur :

```js
socket.emit("admin:inspect-player", {
  targetId: "socket-player-id"
});
```

Par compte :

```js
socket.emit("admin:inspect-player", {
  accountId: "account-id"
});
```

Par cle de profil :

```js
socket.emit("admin:inspect-player", {
  profileKey: "account:account-id"
});
```

Reponse :

```js
socket.on("admin:player", result => {
  console.log(result.player);
  console.log(result.profile);
  console.log(result.inventory);
});
```

Le champ `inventory` contient le vaisseau actif, les objets, leur emplacement equipe et les ressources du profil.

## admin:inventory-remove

Role requis : `admin`.

Supprime definitivement un objet ou une ressource du profil officiel. Une raison est obligatoire. L'action est auditee et le profil est resynchronise sur toutes les fenetres du compte.

Objet d'inventaire :

```js
socket.emit("admin:inventory-remove", {
  profileKey: "account:account-id",
  source: "inventory",
  inventoryUid: "inv_laser_mk1_1",
  reason: "Objet duplique confirme"
});
```

Ressource :

```js
socket.emit("admin:inventory-remove", {
  profileKey: "account:account-id",
  source: "resource",
  resourceId: "cuivre_orbital",
  reason: "Ressource dupliquee confirmee"
});
```

## admin:kick

Role requis : `moderator`.

Expulse immediatement un joueur connecte. L'action est auditee.

```js
socket.emit("admin:kick", {
  targetId: "socket-player-id",
  reason: "Spam ou comportement incorrect"
});

socket.on("admin:kicked", result => {
  console.log(result.targetId);
});
```

Notes :

- `targetId` est l'id de socket du joueur.
- On ne peut pas se kick soi-meme.
- Le joueur recoit `admin:kicked`, puis sa socket est deconnectee.

## admin:adjust-player

Role requis : `admin`.

Permet de corriger certaines valeurs d'un profil :

- `credits`
- `premium` : NOVA
- `xp`

La raison est obligatoire. Les corrections sont auditees.

Ajouter 1000 credits :

```js
socket.emit("admin:adjust-player", {
  targetId: "socket-player-id",
  field: "credits",
  amount: 1000,
  mode: "add",
  reason: "Compensation bug boutique"
});
```

Definir la NOVA a une valeur precise :

```js
socket.emit("admin:adjust-player", {
  profileKey: "account:account-id",
  field: "premium",
  amount: 500,
  mode: "set",
  reason: "Correction support"
});
```

Ajouter de l'XP :

```js
socket.emit("admin:adjust-player", {
  accountId: "account-id",
  field: "xp",
  amount: 2500,
  mode: "add",
  reason: "Compensation quete bloquee"
});
```

Notes importantes :

- Pour `xp`, preferer `mode: "add"`.
- `mode: "set"` sur `xp` agit sur l'XP du niveau courant, pas comme une edition libre de tout le niveau.
- Les champs non listes sont refuses.
- Sans raison lisible, la commande est refusee.

## admin:moderate-account

Role requis :

- `moderator` pour `mute` et `unmute`.
- `admin` pour `ban` et `unban`.

Actions disponibles :

```text
mute
unmute
ban
unban
```

### Mute un compte

Bloque `chat:send` cote serveur.

```js
socket.emit("admin:moderate-account", {
  accountId: "account-id",
  action: "mute",
  durationMinutes: 30,
  reason: "Spam chat global"
});
```

Effets :

- Le compte reste connecte.
- Le serveur bloque ses messages chat.
- Les sockets du compte recoivent `account:moderation`.
- L'action est auditee.

### Unmute un compte

```js
socket.emit("admin:moderate-account", {
  accountId: "account-id",
  action: "unmute",
  reason: "Sanction terminee"
});
```

### Ban un compte

```js
socket.emit("admin:moderate-account", {
  accountId: "account-id",
  action: "ban",
  durationMinutes: 1440,
  reason: "Triche confirmee"
});
```

Effets :

- Le ban est stocke sur le compte en DB/JSON.
- Le joueur ne peut plus se connecter avec login.
- Les anciennes sessions/token sont refusees.
- Si le compte est deja connecte, toutes ses sockets sont deconnectees.
- L'action est auditee.

### Unban un compte

```js
socket.emit("admin:moderate-account", {
  accountId: "account-id",
  action: "unban",
  reason: "Erreur de sanction"
});
```

Notes :

- `durationMinutes` doit etre superieur a 0 pour `ban` et `mute`.
- La duree est plafonnee a 525600 minutes, soit environ 1 an.
- Le serveur refuse de sanctionner son propre compte.
- Une raison est obligatoire pour `ban` et `mute`.

## admin:reset-instance

Role requis : `admin`.

Permet de vider une instance groupe/coop bloquee sans redemarrer le serveur.

```js
socket.emit("admin:reset-instance", {
  groupId: "G-0001",
  reason: "Instance bloquee apres vague"
});
```

Effets :

- `group.instance` est remis a `null`.
- Les joueurs du groupe recoivent `coop:enemies` avec `enemies: []`.
- Les joueurs du groupe recoivent `group:instance-reset`.
- L'action est auditee.

## Audit admin

Toutes les actions sensibles sont journalisees :

- `admin:kick`
- `admin:adjust-player`
- `admin:ban`
- `admin:unban`
- `admin:mute`
- `admin:unmute`
- `admin:reset-instance`

Stockage :

- PostgreSQL : table `admin_audit_log`.
- JSON fallback : `server/data/adminAudit.json`.

Chaque entree contient :

- date
- action
- acteur admin
- cible
- raison
- payload technique

L'objectif est de pouvoir comprendre qui a fait quoi, quand, et pourquoi.

## Rate limits admin

Les commandes admin sont limitees dans `server/src/config.js`.

Events limites :

```text
admin:sync
admin:inspect-player
admin:kick
admin:adjust-player
admin:moderate-account
admin:reset-instance
```

But :

- eviter le spam de commandes admin
- proteger le serveur
- eviter les doubles clics dangereux

Si une commande est trop rapide, le serveur peut emettre :

```js
socket.on("rate:limited", payload => {
  console.log(payload.eventName, payload.limit, payload.windowMs);
});
```

## Reponses et erreurs

Succes :

```text
admin:snapshot
admin:player
admin:kicked
admin:adjusted
admin:moderated
admin:instance-reset
```

Erreur :

```text
admin:error
```

Exemples d'erreurs possibles :

- `Droits admin insuffisants.`
- `Joueur introuvable.`
- `Compte cible introuvable.`
- `Raison admin obligatoire.`
- `Raison moderation obligatoire.`
- `Duree moderation invalide.`
- `Aucune instance active.`

## Points importants de securite

- Le client ne peut pas decider lui-meme qu'il est admin.
- Les droits viennent du compte serveur.
- Les corrections de ressources passent par le serveur et sont auditees.
- Un mute est verifie au moment du `chat:send`.
- Un ban est verifie au login et a la reprise de session.
- Un ban applique a un joueur deja connecte coupe ses sockets.
- Les sanctions restent stockees apres redemarrage serveur.

## Ce qu'il reste a faire plus tard

Pour que ce soit confortable en beta, il manque encore :

- une commande de promotion de role reservee au `owner`
- des filtres audit par joueur/action/date
- une restauration controlee d'objet supprime par erreur
- des regles de suspicion configurables sans modifier le code
- des outils de support pour restaurer un inventaire ou une quete bloquee
