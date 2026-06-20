#!/bin/bash
set -e

# Déploiement automatique VoidSector sur Ubuntu (Oracle Cloud Free Tier)
# À exécuter sur le serveur en SSH : ./install.sh

PROJECT_DIR="/home/ubuntu/voidsector"
SERVER_DIR="$PROJECT_DIR/server"
DB_NAME="voidsector"
DB_USER="voidsector"
DB_PASS="$(openssl rand -base64 32)"
LOAD_TEST_SECRET="$(openssl rand -base64 32)"

echo "=== Mise à jour du système ==="
sudo apt-get update
sudo apt-get upgrade -y

echo "=== Installation des dépendances ==="
sudo apt-get install -y curl wget git unzip build-essential nginx

echo "=== Installation de Node.js 22 LTS ==="
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v

echo "=== Installation de PostgreSQL ==="
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

echo "=== Création de la base de données ==="
sudo -u postgres psql <<EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF

echo "=== Installation des dépendances Node.js ==="
cd "$SERVER_DIR"
npm install

echo "=== Création du fichier .env ==="
cat > "$SERVER_DIR/.env" <<EOF
NODE_ENV=production
PORT=3001
CLIENT_ORIGIN=*
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
LOAD_TEST_ENABLED=true
LOAD_TEST_SECRET=$LOAD_TEST_SECRET
EOF

echo "=== Exécution des migrations JSON vers PostgreSQL (si applicable) ==="
# La migration n'est pas forcément nécessaire pour un nouveau déploiement,
# mais on la rend disponible si l'utilisateur veut importer des données locales.
# npm run db:migrate-json

echo "=== Création du service systemd ==="
sudo cp "$SERVER_DIR/deploy/voidsector.service" /etc/systemd/system/voidsector.service
sudo sed -i "s|__SERVER_DIR__|$SERVER_DIR|g" /etc/systemd/system/voidsector.service
sudo systemctl daemon-reload
sudo systemctl enable voidsector
sudo systemctl start voidsector

echo ""
echo "=========================================="
echo " Déploiement terminé !"
echo "=========================================="
echo ""
echo "Récapitulatif :"
echo "  - Projet : $PROJECT_DIR"
echo "  - Serveur : http://$(curl -s ifconfig.me):3001"
echo "  - Health check : http://$(curl -s ifconfig.me):3001/health"
echo ""
echo "Important :"
echo "  - Le mot de passe PostgreSQL a été généré automatiquement."
echo "  - Le secret de load test est : $LOAD_TEST_SECRET"
echo "  - Pense à modifier $SERVER_DIR/.env selon tes besoins."
echo "  - Pour redémarrer le serveur : sudo systemctl restart voidsector"
echo "  - Pour voir les logs : sudo journalctl -u voidsector -f"
echo ""
