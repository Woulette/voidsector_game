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
$frontendItems = @(
    "src",
    "index.html",
    "game.js",
    "styles.css",
    "assets",
    "vendor",
    "favicon.ico",
    "robots.txt"
)

# Liste blanche backend. Les secrets et donnees d'execution ne sont jamais
# copies : server/.env, server/data, node_modules, logs, backups et tests.
$serverItems = @(
    "server/src",
    "server/tools",
    "server/deploy",
    "server/package.json",
    "server/package-lock.json",
    "server/.env.example"
)

$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$stagingDir = Join-Path $tempRoot ("voidsector-deploy-" + [guid]::NewGuid().ToString("N"))
$stagingFullPath = [System.IO.Path]::GetFullPath($stagingDir)
if (-not $stagingFullPath.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Dossier temporaire de deploiement invalide."
}

New-Item -ItemType Directory -Path $stagingFullPath | Out-Null
try {
    foreach ($item in $frontendItems) {
        if (Test-Path -LiteralPath $item) {
            Copy-Item -LiteralPath $item -Destination $stagingFullPath -Recurse -Force
        }
    }

    $stagingServer = Join-Path $stagingFullPath "server"
    New-Item -ItemType Directory -Path $stagingServer | Out-Null
    foreach ($item in $serverItems) {
        if (Test-Path -LiteralPath $item) {
            Copy-Item -LiteralPath $item -Destination $stagingServer -Recurse -Force
        }
    }

    if (Test-Path -LiteralPath $ArchiveName) {
        Remove-Item -LiteralPath $ArchiveName -Force
    }
    Compress-Archive -Path (Join-Path $stagingFullPath "*") -DestinationPath $ArchiveName -Force
}
finally {
    if (Test-Path -LiteralPath $stagingFullPath) {
        Remove-Item -LiteralPath $stagingFullPath -Recurse -Force
    }
}

Write-Host "=== Envoi sur le serveur $ServerIp ===" -ForegroundColor Cyan
scp -i $KeyPath $ArchiveName "$RemoteUser@${ServerIp}:$RemoteDir/"

Write-Host "=== Déploiement terminé ===" -ForegroundColor Green
Write-Host "Pour finaliser l'installation, connecte-toi en SSH et exécute :" -ForegroundColor Yellow
Write-Host "  ssh -i `"$KeyPath`" $RemoteUser@$ServerIp" -ForegroundColor White
Write-Host "  cd $RemoteDir && unzip -q $ArchiveName -d voidsector && cd voidsector/server/deploy && chmod +x install.sh && ./install.sh" -ForegroundColor White
