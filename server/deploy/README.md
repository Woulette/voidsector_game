# Deploiement sur VPS Ubuntu/Debian

Ce guide cible maintenant Netcup ou tout VPS Ubuntu/Debian equivalent. Les scripts utilisent le dossier reel ou le projet est decompresse et l'utilisateur qui lance `install.sh`.

Si ton VPS Netcup est deja installe, commence directement a la connexion SSH et au deploiement du projet.

---

## 1. Préparer le VPS

1. Installe Ubuntu 24.04 LTS ou 22.04 LTS.
2. Recupere l'IP publique.
3. Configure SSH.
4. Garde un acces administrateur `sudo`.

---

## 2. Vérifier la machine

Verifie que le VPS est demarre, que SSH fonctionne et que tu connais l'utilisateur distant (`root`, `debian`, `ubuntu` ou autre).

---

## 3. Ouvrir les ports

Ouvre `22/tcp` pour SSH et `3001/tcp` pour le serveur VoidSector. Si UFW est actif :

```bash
sudo ufw allow OpenSSH
sudo ufw allow 3001/tcp
sudo ufw enable
sudo ufw status
```

---

## 4. Se connecter en SSH

Sur Windows, avec PowerShell (depuis le dossier où tu as mis la clé privée) :

```powershell
ssh -i "C:\Chemin\Vers\TaCle.key" ubuntu@<IP_PUBLIQUE>
```

Remplace `<IP_PUBLIQUE>` par l'adresse IP publique du VPS.

Si la clé n'a pas les bonnes permissions, fais :

```powershell
icacls "C:\Chemin\Vers\TaCle.key" /inheritance:r /grant:r "%USERNAME%:R"
```

---

## 5. Déployer le projet

### 5.1 Envoyer le code sur le serveur

Depuis ton PC, dans PowerShell (depuis la racine du projet) :

```powershell
Compress-Archive -Path "src","server","index.html","game.js","styles.css","assets","favicon.ico" -DestinationPath "voidsector-deploy.zip" -Force
scp -i "C:\Chemin\Vers\TaCle.key" voidsector-deploy.zip ubuntu@<IP_PUBLIQUE>:~/
```

### 5.2 Installer et lancer sur le serveur

Sur le serveur (dans le SSH) :

```bash
cd ~
unzip -q voidsector-deploy.zip -d voidsector
cd voidsector/server/deploy
chmod +x install.sh
./install.sh
```

Le script va :
- Installer Node.js 22 LTS
- Installer PostgreSQL et créer la base
- Installer les dépendances npm
- Créer le fichier `.env`
- Lancer le serveur avec systemd
- Configurer systemd pour envoyer `SIGTERM`, laisser 30 secondes au shutdown propre et autoriser plus de sockets ouverts

---

## 6. Configurer l'environnement

Le script `install.sh` cree un fichier `.env` dans le dossier `server` du projet decompresse.

Modifie-le si besoin :

```bash
nano ~/voidsector/server/.env
```

Exemple minimal :

```env
NODE_ENV=production
PORT=3001
CLIENT_ORIGIN=https://voidsector-game.vercel.app
DATABASE_URL=postgresql://voidsector:mot_de_passe_fort@localhost:5432/voidsector
MAX_CONCURRENT_GAME_PLAYERS=50
LOAD_TEST_ENABLED=false
LOAD_TEST_SECRET=un-secret-de-test-tres-long
```

**Important :** en production, `CLIENT_ORIGIN` ne doit jamais etre `*`, `DATABASE_URL` doit pointer vers PostgreSQL, `MAX_CONCURRENT_GAME_PLAYERS` doit rester a `50` pour la beta limitee, et `LOAD_TEST_ENABLED` doit rester `false`.

Après modification :

```bash
sudo systemctl restart voidsector
```

---

## 7. Vérifier que le serveur tourne

```bash
sudo systemctl status voidsector
systemctl show voidsector -p Restart -p KillSignal -p TimeoutStopUSec -p LimitNOFILE
```

Ou teste depuis ton PC avec curl :

```powershell
curl http://<IP_PUBLIQUE>:3001/health
```

Tu devrais recevoir un JSON avec le statut du serveur.

Avant d'ouvrir la beta, verifie aussi que la reponse contient :

```json
"storage": "postgres"
```

Si `/health` indique `"storage": "json"`, la beta ne doit pas etre ouverte.

Verifie aussi que la limite beta est visible dans `/health` :

```json
"limits": {
  "maxConcurrentGamePlayers": 50
}
```

Tu peux faire le controle automatiquement depuis le serveur :

```bash
cd ~/voidsector/server
npm run beta:check -- --url http://127.0.0.1:3001/health --expected-storage postgres --expected-max-game-players 50
```

La commande doit afficher `Beta readiness OK`. Si elle echoue, la beta ne doit pas etre ouverte.

---

## 8. Preparer le compte owner/admin

Le plus simple : cree ton compte normalement depuis le jeu, puis depuis le serveur SSH :

```bash
cd ~/voidsector/server
npm run admin:bootstrap -- --email ton-email@example.com --role owner --yes
sudo systemctl restart voidsector
```

Si le compte n'existe pas encore, tu peux le creer depuis SSH :

```bash
cd ~/voidsector/server
npm run admin:bootstrap -- --create --email ton-email@example.com --username TonPseudo --password "mot-de-passe-temporaire" --role owner --yes
```

Cette commande est locale au serveur, elle n'ajoute pas d'endpoint public. Garde un seul compte `owner` et utilise `admin` ou `moderator` pour les autres comptes d'equipe.

---

## 9. Jouer depuis le client

Pour une beta publique, configure d'abord l'URL du serveur dans `index.html` :

```html
<meta name="voidsector-server-url" content="http://<IP_PUBLIQUE>:3001" />
```

Si tu mets un domaine/API avec HTTPS plus tard, remplace la valeur par exemple par `https://api.ton-domaine.fr`. Une URL de test peut aussi etre forcee temporairement avec `?serverUrl=http://<IP_PUBLIQUE>:3001`.

Apres modification du client, tu peux verifier que le backend et le `index.html` public sont coherents :

```bash
cd ~/voidsector/server
npm run beta:check -- --url http://127.0.0.1:3001/health --expected-storage postgres --expected-max-game-players 50 --client-index ../index.html --expected-client-server-url http://<IP_PUBLIQUE>:3001
```

Dans un terminal sur ton PC :

```powershell
cd C:\Users\Ntmav\Desktop\voidsector_game
python -m http.server 8765 --bind 127.0.0.1
```

Puis ouvre `http://127.0.0.1:8765/index.html`. Le jeu se connectera automatiquement à ton serveur local (`http://localhost:3001`).

---

## 10. Lancer des bots de test (optionnel)

Avant les bots, valide au moins une sauvegarde et une restauration de test PostgreSQL :

```bash
cd ~/voidsector/server
npm run db:backup
sudo -u postgres createdb voidsector_restore_test
RESTORE_TEST_DATABASE_URL=postgresql://voidsector:mot_de_passe_fort@localhost:5432/voidsector_restore_test \
  npm run db:restore-test -- --file ~/voidsector/server/backups/<dump>.dump
```

Le restore doit viser une base separee. Le script refuse la base de production et les noms de base qui ne ressemblent pas a une base de test.

Sur ton PC :

```powershell
cd C:\Users\Ntmav\Desktop\voidsector_game\server
$env:BOT_COUNT="25"
npm run loadtest:bots
```

Les bots de provisionnement demandent `LOAD_TEST_ENABLED=true`, ce qui est refuse en `NODE_ENV=production`. Lance-les seulement sur une fenetre de test/staging controlee, puis repasse le serveur beta en `NODE_ENV=production` avec `LOAD_TEST_ENABLED=false`.

---

## 11. Mettre à jour le serveur

Pour mettre à jour le code après des modifications :

```powershell
# Sur ton PC
Compress-Archive -Path "src","server","index.html","game.js","styles.css","assets","favicon.ico" -DestinationPath "voidsector-deploy.zip" -Force
scp -i "C:\Chemin\Vers\TaCle.key" voidsector-deploy.zip ubuntu@<IP_PUBLIQUE>:~/
```

Puis sur le serveur :

```bash
cd ~
sudo systemctl stop voidsector
rm -rf voidsector.old
mv voidsector voidsector.old
unzip -q voidsector-deploy.zip -d voidsector
cp voidsector.old/server/.env voidsector/server/.env
cd voidsector/server
npm install
cd ../server/deploy
sudo systemctl start voidsector
```

---

## Fichiers de déploiement

- `deploy.ps1` → Script Windows pour envoyer le projet sur un serveur
- `install.sh` → Installation automatique sur Ubuntu
- `voidsector.service` → Service systemd
