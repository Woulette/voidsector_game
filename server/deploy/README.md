# Déploiement sur Oracle Cloud Free Tier

Ce guide explique comment déployer le serveur VoidSector sur une instance **Oracle Cloud Free Tier** (ARM, 4 cœurs / 24 Go RAM, gratuit à vie).

---

## 1. Créer un compte Oracle Cloud

1. Va sur https://www.oracle.com/cloud/free/
2. Clique sur **"Start for free"**
3. Crée un compte (email + mot de passe Oracle)
4. Renseigne tes infos personnelles et une carte bancaire (pré-autorisation d'environ 0,93€, remboursée)
5. Choisis un **home region** proche de toi (ex: `eu-frankfurt-1` pour l'Europe)

---

## 2. Créer l'instance (VM)

1. Dans la console Oracle, va dans **Compute → Instances**
2. Clique sur **"Create instance"**
3. Nomme-la `voidsector-server`
4. Image : choisis **Canonical Ubuntu 24.04** (ou 22.04)
5. Shape : choisis **VM.Standard.A1.Flex** (ARM, gratuit)
   - OCPU : 4
   - Memory : 24 Go
6. SSH keys : génère une nouvelle paire de clés et télécharge la clé privée (`*.key`)
7. Network : laisse le VCN par défaut
8. Clique sur **"Create"**

Attends que l'instance soit en statut **RUNNING**.

---

## 3. Ouvrir les ports (règles de sécurité)

Par défaut, seul le SSH (port 22) est ouvert. Il faut ouvrir **3001**.

1. Va sur la page de ton instance
2. Clique sur le **Subnet** (ex: `subnet-...`)
3. Clique sur le **Security List** par défaut
4. Ajoute une règle d'entrée (**Ingress rule**) :
   - Stateless : `No`
   - Source Type : `CIDR`
   - Source CIDR : `0.0.0.0/0`
   - IP Protocol : `TCP`
   - Destination Port Range : `3001`
   - Description : `VoidSector game server`

---

## 4. Se connecter en SSH

Sur Windows, avec PowerShell (depuis le dossier où tu as mis la clé privée) :

```powershell
ssh -i "C:\Chemin\Vers\TaCle.key" ubuntu@<IP_PUBLIQUE>
```

Remplace `<IP_PUBLIQUE>` par l'adresse IP publique affichée dans la console Oracle.

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
scp -i "C:\Chemin\Vers\TaCle.key" voidsector-deploy.zip ubuntu@<IP_PUBLIQUE>:/home/ubuntu/
```

### 5.2 Installer et lancer sur le serveur

Sur le serveur (dans le SSH) :

```bash
cd /home/ubuntu
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

---

## 6. Configurer l'environnement

Le script `install.sh` crée un fichier `/home/ubuntu/voidsector/server/.env` avec des valeurs par défaut.

Modifie-le si besoin :

```bash
nano /home/ubuntu/voidsector/server/.env
```

Exemple minimal :

```env
NODE_ENV=production
PORT=3001
CLIENT_ORIGIN=*
DATABASE_URL=postgresql://voidsector:mot_de_passe_fort@localhost:5432/voidsector
LOAD_TEST_ENABLED=true
LOAD_TEST_SECRET=un-secret-de-test-tres-long
```

**Important :** en production, change `LOAD_TEST_SECRET` et mets `LOAD_TEST_ENABLED=false` si tu ne fais pas de tests de charge.

Après modification :

```bash
sudo systemctl restart voidsector
```

---

## 7. Vérifier que le serveur tourne

```bash
sudo systemctl status voidsector
```

Ou teste depuis ton PC avec curl :

```powershell
curl http://<IP_PUBLIQUE>:3001/health
```

Tu devrais recevoir un JSON avec le statut du serveur.

---

## 8. Jouer depuis le client

Dans un terminal sur ton PC :

```powershell
cd C:\Users\Ntmav\Desktop\voidsector_game
python -m http.server 8765 --bind 127.0.0.1
```

Puis ouvre `http://127.0.0.1:8765/index.html`. Le jeu se connectera automatiquement à ton serveur local (`http://localhost:3001`).

---

## 9. Lancer des bots de test (optionnel)

Sur ton PC :

```powershell
cd C:\Users\Ntmav\Desktop\voidsector_game\server
$env:BOT_COUNT="25"
npm run loadtest:bots
```

---

## 10. Mettre à jour le serveur

Pour mettre à jour le code après des modifications :

```powershell
# Sur ton PC
Compress-Archive -Path "src","server","index.html","game.js","styles.css","assets","favicon.ico" -DestinationPath "voidsector-deploy.zip" -Force
scp -i "C:\Chemin\Vers\TaCle.key" voidsector-deploy.zip ubuntu@<IP_PUBLIQUE>:/home/ubuntu/
```

Puis sur le serveur :

```bash
cd /home/ubuntu
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
