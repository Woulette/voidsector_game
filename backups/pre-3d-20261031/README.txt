AVOSOMA — SAUVEGARDE AVANT LE PREMIER VAISSEAU 3D — 31 OCTOBRE 2026

Branche : codex/backup-avosoma-20261031-pre-3d
Code et images du projet : commit 42cd8ecf9bfe6c249f143e607fb85cb424e202e7.
Cette sauvegarde conserve la version locale ; elle ne fusionne pas les changements
avec la branche principale distante et ne publie pas une nouvelle version du jeu.

Les fichiers du projet sont présents normalement dans la branche Git.
Les anciens aperçus et copies de travail non suivis du dossier output/ sont
conservés dans une archive dédupliquée : 231171 fichiers, 37411912499 octets
avant déduplication. Les huit fichiers output/ déjà suivis restent dans Git.
Chaque fichier et chaque morceau d'archive disposent d'une empreinte SHA-256.
Les morceaux font au maximum 32 Mio avant compression.

Vérifier les objets conservés, sans écrire de fichier :
  python backups/pre-3d-20261031/restore_output.py --destination C:/Avosoma-restaure --verify-only

Restaurer les aperçus dans un dossier neuf :
  python backups/pre-3d-20261031/restore_output.py --destination C:/Avosoma-restaure

Le programme refuse d'écraser des fichiers existants et vérifie les empreintes.
Le manifeste output-manifest.jsonl.gz décrit les chemins et les dates originaux.

Les identifiants, les fichiers .env, les données privées du serveur, les
dépendances installées, les caches et les fichiers temporaires ignorés par Git
ne sont pas publiés. Il faut conserver leur sauvegarde privée séparément.
