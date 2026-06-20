# Correctifs locaux load test (temporaires)

Ces changements facilitent les tests MMO en local. **A retirer avant mise en prod publique** ou quand les garde-fous serveur doivent etre stricts sans exception.

## Fichiers ajoutes

| Fichier | Role |
|---|---|
| `loadtest.local.env` | Active le load test + secret local + defaults bots (10 bots, 2 min) |
| `LOAD_TEST_LOCAL_FIXES.md` | Ce guide de retrait |

## Fichiers modifies

| Fichier | Changement |
|---|---|
| `src/index.js` | Charge `loadtest.local.env` en dev (apres `.env`) |
| `tools/mmo-bots.js` | Charge `loadtest.local.env`, defaults plus bas, arret rapide si le serveur refuse |
| `package.json` | Script `loadtest:server` pour demarrer le serveur avec la config load test |

## Utilisation

Terminal 1 — serveur :

```powershell
cd server
npm run loadtest:server
```

Terminal 2 — bots :

```powershell
cd server
npm run loadtest:bots
```

Monter la charge progressivement :

```powershell
$env:BOT_COUNT="25"
npm run loadtest:bots
```

## Retrait complet

1. Supprimer `loadtest.local.env`
2. Supprimer `LOAD_TEST_LOCAL_FIXES.md`
3. Dans `src/index.js`, retirer le bloc `LOAD_TEST_LOCAL_FIX` (import `dotenv` + `loadtest.local.env`)
4. Dans `tools/mmo-bots.js`, retirer :
   - le chargement de `loadtest.local.env`
   - la logique `provision-refused` / `stopAllBots`
   - remettre les defaults `BOT_COUNT=100`, `BOT_DURATION_SECONDS=600`, `BOT_RAMP_MS=80`
5. Dans `package.json`, retirer le script `loadtest:server`

## Nettoyage comptes bots

```sql
DELETE FROM accounts WHERE email LIKE '%@voidsector-load.test';
```
