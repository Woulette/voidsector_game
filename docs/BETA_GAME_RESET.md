# Remise a zero des donnees de jeu beta

Cette procedure supprime uniquement les miroirs de comptes propres au serveur
Avosoma. Elle ne se connecte jamais au service d'authentification Absyrion et ne
supprime donc aucun compte plateforme.

## Ce qui est modifie

- les lignes `accounts` de role autre que `owner` ou `admin` sont supprimees
  uniquement si leur `password_hash` commence par `external:absyrion:`;
- les profils et identites de pilote associes sont supprimes par cascade;
- les comptes `owner` et `admin` restent intacts, mais chacun recoit un profil
  de jeu neuf cree par `createDefaultProfile()`;
- les anciens profils sans compte sont supprimes;
- `firm_war_state.global` est remplace par `buildInitialFirmState()` pour
  recommencer la saison et les classements a zero. La ligne n'est jamais
  simplement supprimee, car le serveur pourrait alors recharger l'ancien
  `server/data/firmWar.json`.

Les tables d'authentification de la plateforme externe ne sont jamais
contactees. `admin_audit_log` et `schema_migrations` sont conserves.

## Ordre obligatoire en production

1. Arreter `avosoma-beta.service`. Le serveur garde les profils en memoire et
   pourrait sinon reecrire une ancienne progression apres le reset.
2. Executer le dry-run depuis le dossier `server` avec le `DATABASE_URL` de la
   base de jeu:

   ```bash
   npm run db:reset-beta-game
   ```

3. Verifier dans le JSON:
   - `protectedAccounts`;
   - `accountMirrorsToDelete`;
   - `blockedNonMirrorAccounts` vide;
   - `externalAuth.platformAccountsTouched` egal a `0`;
   - tous les compteurs sous `changes`, notamment `firmWarRowsToReset`;
   - `executable` egal a `true`.
4. Copier le `confirmationToken` affiche.
5. Executer avec un dump prive situe hors de la racine web. Tous les
   `--protected-account-id` du dry-run doivent etre repetes exactement:

   ```bash
   npm run db:reset-beta-game -- \
     --execute \
     --server-stopped \
     --delete-game-account-mirrors \
     --expected-database=voidsector \
     --protected-account-id=<ID_OWNER> \
     --protected-account-id=<ID_ADMIN> \
     --confirm=<TOKEN_DU_DRY_RUN> \
     --backup-file=/var/backups/avosoma/pre-beta-reset.dump
   ```

   `--backup-file` est obligatoire en execution. Le script refuse tout chemin
   situe sous la racine du projet (`/opt/avosoma` en production), car nginx
   pourrait autrement rendre le dump et ses hashes accessibles publiquement.

6. Le script lance d'abord `pg_dump`, limite le fichier a des permissions
   privees, puis ouvre une transaction serialisable et verrouille les tables.
   Il recalcule ensuite le plan. Si une ligne a change depuis le dry-run, le
   token ne correspond plus et toute la transaction est annulee.
7. Redemarrer `avosoma-beta.service`, verifier `/health`, puis se connecter avec
   les comptes owner et admin. Ils doivent retrouver l'ecran de demarrage avec
   le profil niveau 1.

## Refus de securite

Le reset est refuse si:

- l'authentification externe n'est pas configuree;
- un compte joueur ne porte pas la signature d'un miroir Absyrion;
- le dry-run ne trouve pas exactement un owner et un admin;
- la base, les identifiants proteges ou le token ne correspondent pas au
  dry-run;
- le service n'est pas explicitement declare arrete;
- le fichier de sauvegarde existe deja, est vide ou ne peut pas etre limite
  aux permissions privees `600`.
