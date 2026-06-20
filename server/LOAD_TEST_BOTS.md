# Test MMO avec 100 bots

Ce banc de charge lance de vrais clients Socket.IO. Chaque bot :

- cree ou reconnecte un compte dedie `@voidsector-load.test` ;
- choisit une firme ;
- recoit un Razorion, 8 lasers MK-III et 5 000 000 de munitions M-1 ;
- apparait sur une carte repartie parmi les 21 cartes monde ;
- se deplace, cherche les ennemis, tire et ramasse les drops ;
- traverse progressivement les portails entre cartes ;
- accepte jusqu'a 5 quetes compatibles et execute les interactions de position simples ;
- rejoint un groupe de 4 ;
- certains chefs de groupe lancent un Portail Bleu ;
- respawn automatiquement apres une mort.

Le provisionnement est refuse sauf si le serveur est lance hors production avec un secret explicite.

## 1. Configurer le serveur

Dans `server/.env` :

```env
LOAD_TEST_ENABLED=true
LOAD_TEST_SECRET=change-moi-avec-au-moins-16-caracteres
```

Puis lancer le serveur :

```powershell
cd server
npm start
```

Ne jamais activer `LOAD_TEST_ENABLED` sur le serveur public. Le serveur refuse d'ailleurs de demarrer avec cette option quand `NODE_ENV=production`.

## 2. Lancer 100 bots

Dans un second terminal :

```powershell
cd server
$env:LOAD_TEST_SECRET="change-moi-avec-au-moins-16-caracteres"
npm run loadtest:bots
```

Valeurs par defaut :

- 100 bots ;
- montee progressive de 80 ms entre connexions ;
- test de 10 minutes ;
- snapshot joueur toutes les 200 ms ;
- changement de carte environ toutes les 55 secondes.

## Options

```powershell
$env:BOT_COUNT="100"
$env:BOT_DURATION_SECONDS="900"
$env:BOT_RAMP_MS="100"
$env:BOT_TICK_MS="200"
$env:BOT_MAP_CHANGE_SECONDS="55"
$env:BOT_RUN_ID="beta01"
$env:BOT_SERVER_URL="http://127.0.0.1:3001"
$env:BOT_MEASURE_BYTES="true"
$env:BOT_RESET_QUESTS="true"
npm run loadtest:bots
```

`BOT_RUN_ID` permet de reutiliser les memes comptes entre deux executions. Changer cette valeur cree une nouvelle population de bots.

## Commencer petit

Avant 100 bots :

```powershell
$env:BOT_COUNT="10"
$env:BOT_DURATION_SECONDS="120"
npm run loadtest:bots
```

Le script affiche toutes les 10 secondes :

- bots connectes et groupes ;
- nombre de cartes occupees ;
- tirs, impacts et recompenses ;
- changements de carte ;
- quetes acceptees et terminees ;
- morts et respawns ;
- corrections serveur et rate limits ;
- debit d'evenements ;
- volume reseau approximatif si `BOT_MEASURE_BYTES=true`.

## Nettoyage

Les comptes de test utilisent toujours le domaine :

```text
@voidsector-load.test
```

Ils peuvent donc etre supprimes de PostgreSQL apres le test :

```sql
DELETE FROM accounts WHERE email LIKE '%@voidsector-load.test';
```

La suppression cascade vers les sessions, profils et identites pilote.
