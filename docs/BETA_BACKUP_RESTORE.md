# VoidSector beta backup and restore

La beta publique doit tourner sur PostgreSQL. Si `/health` indique `"storage": "json"`, ne pas ouvrir la beta.

## Backup PostgreSQL

Depuis le serveur :

```bash
cd ~/voidsector/server
npm run db:backup
```

Par defaut, le dump est cree dans `server/backups/` au format PostgreSQL custom (`.dump`). Ce dossier est ignore par Git.

Options utiles :

```bash
npm run db:backup -- --output ~/backups/voidsector_beta.dump
npm run db:backup -- --out-dir ~/backups
```

La commande echoue si `DATABASE_URL` n'est pas configure ou si `pg_dump` n'est pas installe.

## Restore test

Ne restaure jamais directement sur la base beta. Cree une base separee dont le nom contient `test`, `restore`, `staging` ou `sandbox` :

```bash
sudo -u postgres createdb voidsector_restore_test
```

Puis lance le restore de validation :

```bash
cd ~/voidsector/server
RESTORE_TEST_DATABASE_URL=postgresql://voidsector:mot_de_passe_fort@localhost:5432/voidsector_restore_test \
  npm run db:restore-test -- --file ~/voidsector/server/backups/voidsector_YYYYMMDD_HHMMSSZ.dump
```

Le script refuse de restaurer si la destination est la meme base que `DATABASE_URL`, et refuse aussi une base qui ne ressemble pas a une base de test. Apres `pg_restore`, il lance une verification `psql` sur les tables `accounts`, `player_profiles` et `schema_migrations`.

## Checklist de validation

- [ ] creer un compte test
- [ ] jouer quelques minutes
- [ ] gagner XP, credits, NOVA et items
- [ ] acheter et equiper
- [ ] se deconnecter
- [ ] redemarrer le serveur
- [ ] se reconnecter
- [ ] verifier que la progression est conservee
- [ ] lancer `npm run db:backup`
- [ ] creer une base `voidsector_restore_test`
- [ ] lancer `npm run db:restore-test -- --file <dump>`
- [ ] verifier que le restore de test reussit sans toucher la base beta
