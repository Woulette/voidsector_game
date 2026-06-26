# Script de deploiement Windows vers VPS Ubuntu/Debian
# À exécuter depuis la racine du projet VoidSector
# Usage : .\server\deploy\deploy.ps1 -KeyPath "C:\chemin\vers\cle.key" -ServerIp "1.2.3.4"

param(
    [Parameter(Mandatory=$true)]
    [string]$KeyPath,
    [Parameter(Mandatory=$true)]
    [string]$ServerIp,
    [string]$RemoteUser = "ubuntu",
    [string]$RemoteDir = "~",
    [string]$ArchiveName = "voidsector-deploy.zip"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Création de l'archive de déploiement ===" -ForegroundColor Cyan

# Fichiers et dossiers nécessaires
$items = @(
    "src",
    "server",
    "index.html",
    "game.js",
    "styles.css",
    "assets",
    "favicon.ico"
)

# Supprimer l'ancienne archive si elle existe
if (Test-Path $ArchiveName) {
    Remove-Item $ArchiveName -Force
}

Compress-Archive -Path $items -DestinationPath $ArchiveName -Force

Write-Host "=== Envoi sur le serveur $ServerIp ===" -ForegroundColor Cyan
scp -i $KeyPath $ArchiveName "$RemoteUser@${ServerIp}:$RemoteDir/"

Write-Host "=== Déploiement terminé ===" -ForegroundColor Green
Write-Host "Pour finaliser l'installation, connecte-toi en SSH et exécute :" -ForegroundColor Yellow
Write-Host "  ssh -i `"$KeyPath`" $RemoteUser@$ServerIp" -ForegroundColor White
Write-Host "  cd $RemoteDir && unzip -q $ArchiveName -d voidsector && cd voidsector/server/deploy && chmod +x install.sh && ./install.sh" -ForegroundColor White
