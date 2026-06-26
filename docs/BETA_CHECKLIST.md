# VoidSector beta checklist

## Avant ouverture beta 50 joueurs

- [ ] VPS configure
- [ ] Node.js installe
- [ ] PostgreSQL installe
- [ ] `DATABASE_URL` configure
- [ ] `NODE_ENV=production`
- [ ] `CLIENT_ORIGIN` configure avec le vrai domaine client
- [ ] `CLIENT_ORIGIN` n'est pas `*`
- [ ] `index.html` contient le vrai serveur public dans `<meta name="voidsector-server-url" content="http://<IP_PUBLIQUE>:3001">` ou l'equivalent HTTPS
- [ ] `MAX_CONCURRENT_GAME_PLAYERS=50`
- [ ] `LOAD_TEST_ENABLED=false`
- [ ] `/health` repond
- [ ] `/health` indique `"storage": "postgres"`
- [ ] `/health` indique `"limits": {"maxConcurrentGamePlayers": 50}`
- [ ] `npm run beta:check -- --url http://127.0.0.1:3001/health --expected-storage postgres --expected-max-game-players 50` OK
- [ ] `npm run beta:check -- --url http://127.0.0.1:3001/health --expected-storage postgres --expected-max-game-players 50 --client-index ../index.html --expected-client-server-url http://<IP_PUBLIQUE>:3001` OK
- [ ] redemarrage auto systemd ou PM2 configure
- [ ] `systemctl show voidsector -p Restart -p KillSignal -p TimeoutStopUSec -p LimitNOFILE` verifie
- [ ] `npm run db:backup` OK
- [ ] `RESTORE_TEST_DATABASE_URL=postgresql://.../voidsector_restore_test npm run db:restore-test -- --file <dump>` OK
- [ ] restauration PostgreSQL testee sur une base separee, jamais sur la base beta
- [ ] bots 10 joueurs OK
- [ ] bots 25 joueurs OK
- [ ] bots 50 joueurs OK
- [ ] bots 100 joueurs OK sur staging avec `MAX_CONCURRENT_GAME_PLAYERS=100` ou `0`
- [ ] apres staging, `MAX_CONCURRENT_GAME_PLAYERS=50` remis avant ouverture publique
- [ ] aucun crash pendant test bots
- [ ] compte owner/admin pret avec `npm run admin:bootstrap -- --email <email> --role owner --yes`
- [ ] kick teste
- [ ] ban teste
- [ ] mute teste
- [ ] correction credits/NOVA/XP testee
- [ ] parcours joueur complet teste
- [ ] message beta/reset possible prepare

## Parcours joueur complet

- [ ] inscription
- [ ] connexion
- [ ] choix firme
- [ ] arrivee en jeu
- [ ] combat monstre
- [ ] loot
- [ ] quete terminee
- [ ] recompense recue
- [ ] achat boutique
- [ ] equipement hangar
- [ ] changement de map
- [ ] mort
- [ ] respawn
- [ ] deco/reco
- [ ] progression conservee

## Surveillance pendant test bots

- [ ] `sudo journalctl -u voidsector -f`
- [ ] CPU
- [ ] RAM
- [ ] latence bots
- [ ] erreurs serveur
- [ ] erreurs PostgreSQL
- [ ] deconnexions
- [ ] sauvegardes apres redemarrage
