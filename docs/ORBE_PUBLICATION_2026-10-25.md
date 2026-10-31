# Publication des deux Orbes — 25 octobre 2026

Correctif ultérieur de la traînée publié à 12 h 42 : la fréquence d'affichage supérieure aux 60 mises à jour de simulation empêchait l'émission de fumée. Voir `ORBE_TRAINEE_CADENCE_2026-10-25.md` pour la reproduction avant/après et les vérifications sur les modules installés.

Publication demandée explicitement après validation du nouvel Orbe commun et de l'attribution du grand modèle au boss. Lot `20261025-orb-family1`, installé le 25 octobre à **12 h 15 Europe/Paris** (11 h 15 UTC). Les autres monstres et le X6 ne font pas partie du lot.

## Rendu intégré

L'Orbe commun reçoit ses six petites pattes, le boss ses huit grandes branches. Les illustrations validées sont conservées sans retouche. Rotation lente avec accélération ponctuelle, noyau stable, éclat au tir et fumée qui s'évapore sont maintenant utilisés par le vrai chemin de rendu `drawEnemies`.

Les anciennes animations de corps, de grossissement et d'effets ambiants sont remplacées pour ces deux espèces. Les barres de vie, la sélection et les règles de combat restent celles du jeu. L'icône du boss utilise le cadrage entier pour ne pas couper ses branches dans les quêtes. Les deux textures sont préchargées pour le combat.

- `src/game/combatData/orbVisuals.js` : profils des deux modèles.
- `src/game/render/orbMotion.js`, `orbWake.js`, `orbSprite.js` : mêmes pose, fumée et composition que la proposition validée.
- `src/game/render/enemyOrb.js` : raccordement au jeu. Un `WeakMap` conserve l'état visuel à côté des objets ennemis interpolés. Il ne modifie ni leur position, ni leurs statistiques, ni leur IA. L'éclat est déclenché par le signal de tir existant ; aucun minuteur de tir périodique n'est inventé par le dessin. Le retour d'un onglet masqué ne crée pas de ligne de fumée sur le déplacement sauté.

L'atelier réexporte ces modules pour conserver une seule implémentation. Sa colonne de rendu courant utilise le vrai renderer sur des objets stables, comme le client MMO. Les tirs de démonstration restent simulés dans cet atelier ; la préparation anticipée du noyau n'est pas utilisée pour prévoir artificiellement les attaques du jeu.

## Composition et vérifications

Le candidat a été composé sur une capture fraîche des 540 fichiers de runtime public. Les modifications des fichiers partagés ont été ajoutées par blocs contrôlés, en préservant les imports et changements concurrents. En retirant seulement les ajouts de ce lot, les quatre fichiers partagés retrouvent exactement leur contenu public antérieur. Seuls les deux chemins d'illustration changent dans les définitions des ennemis ; statistiques et fonctions de combat sont identiques.

- **73 tests ciblés réussis sur le candidat de production** : rendu réel avec données serveur figées, séparation des modèles, tirs réels et extinction, sélection, préchargement, poursuite et délais de réaction existants, équilibre et attaques. Six tests complémentaires de pose et fumée avaient également été validés localement via les modules partagés.
- Syntaxe vérifiée ; 333 modules client, 846 liens d'import et 195 cibles d'importmap résolus.
- Contrôle navigateur du vrai rendu courant et de la proposition partagée pour les deux Orbes, avec fumée, rotations et éclairage. Captures locales dans le dossier de preuves ; aucune erreur console pendant le contrôle.
- Douze fichiers installés : neuf modules JavaScript, deux illustrations et `index.html`, publié en dernier. Archive et chaque fichier vérifiés par SHA-256 dans le staging, sur disque public puis en HTTPS.
- Les douze empreintes HTTPS concordent ; les 195 cibles publiques d'importmap répondent HTTP 200. Les 377 alias étrangers à la mise à jour ont été conservés.
- 534 fichiers de runtime hors lot vérifiés inchangés pendant l'installation, avec huit gardes spécifiques sur les règles et systèmes existants. Aucun fichier serveur, donnée persistante, secret, test ou outil installé dans le runtime.
- `avosoma-beta.service` actif, PID **1406267** conservé, `NRestarts=0`. Aucun redémarrage. PostgreSQL sain et journaux sans nouvel avertissement pendant l'installation.
- Sonde sur les modules installés : vrai chemin `drawEnemies`, ancien sprite supprimé pour les deux Orbes, six ou huit branches, position/PV/bouclier inchangés sur objets figés, éclairage au signal d'attaque et fumée entièrement expirée après arrêt. Cette sonde ne touche aucun état persistant et ne constitue pas une session MMO authentifiée.

Sauvegarde : `/opt/avosoma-backups/20261025-orb-family1-20261025T111558Z`.

Preuves : `output/orb-family-release-2026-10-25/` contient manifeste, archive, diff exact, contrôles de portée et d'import, tests du candidat, vérifications du staging, publication, empreintes publiques et sonde installée. Recharger le jeu permet aux sessions ouvertes d'utiliser les nouvelles URL de modules.

## Retouche de taille — 12 h 25 Paris

Lot `20261025-orb-size1` : taille visuelle de l'Orbe sentinelle commun augmentée exactement de 10 %, facteur de dessin de 0,60 à 0,66. Le cadre dessiné passe de 55,2 à 60,72 unités pour le monstre de largeur 92. Boss et tous les autres paramètres graphiques identiques ; rayon de collision, règles, fumée et poursuite inchangés.

Un seul paramètre du profil et son URL de cache dans `index.html` sont publiés. Six tests existants du runtime Orbe réussis, syntaxe et comparaison exacte des paramètres contrôlées. Deux empreintes publiques conformes, 195 cibles d'importmap accessibles, huit gardes et 542 fichiers hors lot préservés. PID 1406267 inchangé, PostgreSQL sain, aucun redémarrage ni nouvel avertissement. Sauvegarde `/opt/avosoma-backups/20261025-orb-size1-20261025T112548Z` ; preuves dans `output/orb-size-2026-10-25/`.
