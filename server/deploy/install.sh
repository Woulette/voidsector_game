#!/bin/bash
set -e

# Deploiement automatique VoidSector sur VPS Ubuntu/Debian.
# A executer depuis le dossier server/deploy : ./install.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="${SERVER_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
PROJECT_DIR="${PROJECT_DIR:-$(cd "$SERVER_DIR/.." && pwd)}"
SERVICE_USER="${SERVICE_USER:-${SUDO_USER:-$(id -un)}}"
DB_NAME="${DB_NAME:-voidsector}"
DB_USER="${DB_USER:-voidsector}"
DB_PASS="$(openssl rand -base64 32)"
CLIENT_ORIGIN="${CLIENT_ORIGIN:-https://voidsector-game.vercel.app}"
LOAD_TEST_SECRET="$(openssl rand -base64 32)"

if [[ ! "$DB_NAME" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "DB_NAME invalide : utilise uniquement lettres, chiffres et underscore." >&2
  exit 1
fi

if [[ ! "$DB_USER" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "DB_USER invalide : utilise uniquement lettres, chiffres et underscore." >&2
  exit 1
fi

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
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
  ELSE
    ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec
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
CLIENT_ORIGIN=$CLIENT_ORIGIN
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
MAX_CONCURRENT_GAME_PLAYERS=50
LOAD_TEST_ENABLED=false
LOAD_TEST_SECRET=$LOAD_TEST_SECRET
EOF

echo "=== Exécution des migrations JSON vers PostgreSQL (si applicable) ==="
# La migration n'est pas forcément nécessaire pour un nouveau déploiement,
# mais on la rend disponible si l'utilisateur veut importer des données locales.
# npm run db:migrate-json

echo "=== Création du service systemd ==="
sudo cp "$SERVER_DIR/deploy/voidsector.service" /etc/systemd/system/voidsector.service
sudo sed -i "s|__SERVER_DIR__|$SERVER_DIR|g" /etc/systemd/system/voidsector.service
sudo sed -i "s|__SERVICE_USER__|$SERVICE_USER|g" /etc/systemd/system/voidsector.service
sudo systemctl daemon-reload
sudo systemctl enable voidsector
sudo systemctl start voidsector

echo "=== Verification readiness beta PostgreSQL ==="
npm run beta:check -- --url http://127.0.0.1:3001/health --expected-storage postgres --expected-max-game-players 50 --retries 30 --delay-ms 1000

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
