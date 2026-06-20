# Déploiement du serveur VoidSector

Ce dossier contient plusieurs méthodes pour déployer le serveur VoidSector en ligne.

---

## Option 1 : Render (gratuit, rapide, recommandé pour tester)

Render offre un hébergement Node.js gratuit. Le serveur s'endort après 15 min d'inactivité mais se réveille automatiquement.

### 1. Créer un compte Render

Va sur https://render.com et inscris-toi avec ton compte GitHub.

### 2. Déployer depuis GitHub

1. Dans Render, clique sur **"New +"** puis **"Blueprint"**.
2. Connecte ton repo GitHub `Woulette/voidsector_game`.
3. Render détecte automatiquement le fichier `server/deploy/render.yaml`.
4. Clique sur **"Apply"**.

Render va :
- Détecter automatiquement le fichier `render.yaml` à la racine du repo
- Créer un service web Node.js à partir du dossier `server/`
- Installer les dépendances avec `npm install`
- Lancer le serveur avec `npm start`
- Te donner une URL publique (ex: `https://voidsector-server.onrender.com`)

### 3. Ouvrir l'URL du serveur

Une fois déployé, Render te donne une URL. Tu peux tester avec :

```
https://voidsector-server.onrender.com/health
```

### 4. Jouer

Le client (ton jeu dans le navigateur) doit pointer vers l'URL Render. Par défaut il est sur `http://localhost:3001`. Dans les options du jeu, change l'URL du serveur pour ton URL Render.

**Important :** Render gratuit coupe le serveur après 15 min d'inactivité. La première connexion après une inactivité peut prendre 10-30 secondes à démarrer.

### 5. Lancer des bots de test

Sur ton PC :

```powershell
cd C:\Users\Ntmav\Desktop\voidsector_game\server
$env:BOT_COUNT="25"
$env:BOT_SERVER_URL="https://ton-url-render.onrender.com"
npm run loadtest:bots
```

### Note sur la base de données

Par défaut, `render.yaml` utilise le **stockage JSON** (pas de base de données). C'est suffisant pour tester, mais les données sont réinitialisées si le serveur redémarre.

Pour une base PostgreSQL persistante, tu peux créer une base **Supabase** gratuite et renseigner `DATABASE_URL` dans les variables d'environnement Render.

---

## Option 2 : Oracle Cloud Free Tier

Oracle Cloud offre un VPS ARM gratuit à vie (4 cœurs / 24 Go RAM).

### 1. Créer un compte Oracle Cloud

1. Va sur https://www.oracle.com/cloud/free/
2. Clique sur **"Start for free"**
3. Crée un compte (email + mot de passe Oracle)
4. Renseigne tes infos personnelles et une carte bancaire (pré-autorisation d'environ 0,93€, remboursée)
5. Choisis un **home region** proche de toi (ex: `eu-frankfurt-1` pour l'Europe)

### 2. Créer l'instance (VM)

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

### 3. Ouvrir les ports (règles de sécurité)

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

### 4. Déployer le projet

Sur ton PC, dans PowerShell, depuis `C:\Users\Ntmav\Desktop\voidsector_game` :

```powershell
.\server\deploy\deploy.ps1 -KeyPath "C:\Chemin\Vers\TaCle.key" -ServerIp "IP_PUBLIQUE"
```

Puis connecte-toi en SSH :

```powershell
ssh -i "C:\Chemin\Vers\TaCle.key" ubuntu@IP_PUBLIQUE
```

Et sur le serveur :

```bash
cd /home/ubuntu && unzip -q voidsector-deploy.zip -d voidsector && cd voidsector/server/deploy && chmod +x install.sh && ./install.sh
```

Le script installe Node.js, PostgreSQL, configure le serveur et le lance avec systemd.

### 5. Configurer l'environnement

Le script `install.sh` crée un fichier `/home/ubuntu/voidsector/server/.env`. Modifie-le si besoin :

```bash
nano /home/ubuntu/voidsector/server/.env
```

Puis redémarre :

```bash
sudo systemctl restart voidsector
```

---

## Mise à jour du serveur (Oracle)

Pour mettre à jour le code après des modifications :

```powershell
.\server\deploy\deploy.ps1 -KeyPath "C:\Chemin\Vers\TaCle.key" -ServerIp "IP_PUBLIQUE"
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

- `render.yaml` → Blueprint Render
- `deploy.ps1` → Script Windows pour envoyer le projet sur un serveur
- `install.sh` → Installation automatique sur Ubuntu
- `voidsector.service` → Service systemd
