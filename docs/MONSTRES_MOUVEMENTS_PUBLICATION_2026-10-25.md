# Publication des mouvements des monstres — 25 octobre 2026

Après validation explicite du joueur, lot frontend `20261025-enemy-motion1` publié le **25 octobre 2026 à 20 h 21, heure de Paris** (`19:21:07 UTC`). Les cinq familles approuvées ont des mouvements plus lisibles : Orbe, Vorak, Parasite, Traqueur et Éclanite. Les Parasites commun et boss sont agrandis de **15 %**, les Traqueurs commun et boss de **12 %**, par rapport à leurs facteurs de dessin précédents.

Les positions et collisions, la poursuite et son échantillonnage, l’orientation du corps, les tirs et la bombe du Traqueur restent ceux du jeu existant. Les fumées du joueur et les armes n’ont pas été modifiées par ce lot. Les détails des gestes et du maillage figurent dans [le rapport local](MONSTRES_MOUVEMENTS_PLUS_VISIBLES_2026-10-25.md).

## Lot et préservation de la production

Quatorze modules frontend et `index.html`, publié en dernier. Treize modules existants correspondaient exactement à la base approuvée ; seul `enemyLocomotion.js` est nouveau. Le candidat a été construit sur un instantané frais du serveur, en conservant les autres mises à jour. Archive et syntaxe contrôlées en staging avant installation. Les 32 gardes de règles, données, adaptateurs et effets sont restées conformes ; 571 fichiers runtime hors lot ont été vérifiés inchangés pendant l’installation.

Sauvegarde : `/opt/avosoma-backups/20261025-enemy-motion1-20261025T192107Z`.

## Vérifications

- **211 tests** réussis dans le candidat isolé ; 372 modules frontend et 958 imports résolus. Les 569 fichiers des dossiers source hors lot du candidat correspondent à l’instantané de production ; les deux points d’entrée supplémentaires expliquent les 571 gardes lors de l’installation.
- Syntaxe des modules et absence d’erreurs de whitespace vérifiées avant publication.
- Rendu natif du candidat contrôlé dans le navigateur pour le Traqueur en vue large et le Parasite en gros plan : appendices visibles, agrandissement cohérent, pointes non coupées ; aucun avertissement ou erreur console. Les neuf variantes avaient aussi été contrôlées dans l’atelier avant validation.
- **15 empreintes publiques SHA-256** conformes au payload et aux fichiers installés, HTTP 200 ; **241 cibles d’importmap** accessibles. `game.js` et `styles.css` publics correspondent également aux fichiers installés.
- Tests en mémoire sur les modules réellement installés : 16 scénarios Orbe, 16 Vorak, 16 Parasite, 16 Traqueur et 8 Éclanite, plus les **9 vaisseaux du joueur**. Aucun état persistant modifié.
- Service `avosoma-beta.service` actif, PID **2510150** inchangé, `NRestarts=0`, aucun redémarrage pour ce lot frontend. PostgreSQL prêt, santé et persistance publiques correctes, aucun nouvel avertissement dans le journal depuis l’installation.

Les contrôles visuels portent sur le renderer natif dans une scène locale isolée ; aucune partie MMO authentifiée n’est revendiquée. Le contrôle public porte sur les modules effectivement servis, les empreintes et la santé du serveur.

Preuves : `output/enemy-locomotion-release-2026-10-25/` (`candidate-validation.json`, `candidate-tests.txt`, `staging-verification.json`, `deployment-result.json`, `public-verification.json`, `final-host-verification.json`, `post-check.json`, preuve des boucles installées et captures natives). Atelier local actualisé sous `locomotion-live-1`, ancienne animation à gauche et mouvements publiés à droite.
