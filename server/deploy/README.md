# Déploiement sur Oracle Cloud Free Tier

Ce guide explique comment déployer le serveur VoidSector sur une instance **Oracle Cloud Free Tier** (ARM, 4 OCPU / 24 Go RAM, gratuit à vie).

---

## 1. Créer un compte Oracle Cloud

1. Va sur https://www.oracle.com/cloud/free/
2. Clique sur **"Start for free"**
3. Crée un compte (email + mot de passe Oracle)
4. Renseigne tes infos personnelles et une carte bancaire (pas de prélèvement immédiat, c'est juste pour vérification)
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

Par défaut, seul le SSH (port 22) est ouvert. Il faut ouvrir **3001** (serveur de jeu) et éventuellement **8765** (client web si tu veux le servir aussi).

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

Répète pour le port `8765` si tu veux servir le client web depuis le serveur.

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
# Récupère d'abord Node.js si ce n'est pas déjà fait
# Puis compresse le projet
Compress-Archive -Path "src","server","index.html","game.js","styles.css","assets","favicon.ico" -DestinationPath "voidsector-deploy.zip" -Force

# Envoie sur le serveur
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
LOAD_TEST_SECRET=un-secret-de-test-tres-long-change-moi
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

### Option A : Client servi localement
Depuis ton PC :

```powershell
cd C:\Users\Ntmav\Desktop\voidsector_game
python -m http.server 8765 --bind 127.0.0.1
```

Puis ouvre `http://127.0.0.1:8765/index.html` et change l'URL du serveur dans les options pour `http://<IP_PUBLIQUE>:3001`.

### Option B : Client servi par le serveur Oracle
Si tu as ouvert le port 8765 et lancé le client web sur le serveur, tu peux accéder directement à :

```
http://<IP_PUBLIQUE>:8765/index.html
```

---

## 9. Lancer des bots de test (optionnel)

Sur ton PC, avec le serveur distant :

```powershell
cd C:\Users\Ntmav\Desktop\voidsector_game\server
$env:BOT_COUNT="25"
$env:BOT_SERVER_URL="http://<IP_PUBLIQUE>:3001"
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
# Recopie l'ancien .env et les données si nécessaire
cp voidsector.old/server/.env voidsector/server/.env
cd voidsector/server
npm install
cd ../server/deploy
sudo systemctl start voidsector
```

---

## Notes

- Le tier gratuit Oracle est suffisant pour **quelques dizaines de joueurs** en test.
- Pour plus de joueurs, il faudra passer à une instance payante ou optimiser le code.
- N'oublie pas de désactiver `LOAD_TEST_ENABLED` en production publique.
