# Publication des deux Voraks validés — 25 octobre 2026

Lot frontend **`20261025-vorak-family1`**, publié à **13 h 25 Europe/Paris**. Le commun avec sept repères lumineux et sa variante boss mesurée sont intégrés au rendu du jeu : deux ailes articulées, éclair du canon au vrai tir, deux réacteurs texturés et vapeur qui suit le déplacement puis s’évapore. Le boss garde son orientation fixe existante et un gabarit visible environ 20 % plus présent que le commun.

Les illustrations approuvées sont conservées sans retouche. Les profils sont dans `src/game/combatData/vorakVisuals.js` ; pose, vapeur et dessin dans `render/vorakMotion.js`, `vorakWake.js`, `vorakSprite.js`. Le raccordement `render/enemyVorak.js` utilise un état cosmétique en WeakMap et lit les vrais événements `attackT`, sans attaque périodique inventée ni mutation des entités serveur. Le rendu de corps précédent est remplacé pour ces deux types uniquement, y compris pendant le décodage des textures. Les modules de l’atelier réexportent ces sources partagées.

Le catalogue change uniquement les deux chemins d’image. Statistiques, collisions, vitesse, délai de poursuite, attaque, projectile et récompenses restent identiques. La correction d’orientation concerne les nouveaux sprites dessinés le nez vers le haut ; les règles de rotation des monstres restent inchangées. Les icônes de quête affichent les nouvelles illustrations entières. Aucun fichier serveur n’est modifié.

## Vérification

- Copie fraîche de la production : **87 tests ciblés réussis**, dont les deux Voraks à 30/60/120/144/240 Hz et avec limites de rendu ; les régressions Orbe, poursuite et performances restent vertes.
- **342 modules frontend et 871 imports** résolus ; syntaxe et diff vérifiés. Comparaison du catalogue avant/après strictement identique une fois les deux chemins d’image retirés. Le lot préserve notamment l’ordre d’imports de production qui différait du checkout. Inspection du renderer partagé dans l’atelier sans erreur console.
- **13 fichiers** installés et empreintes locales/staging/hôte/publiques concordantes ; `index.html` publié en dernier. **209 cibles d’importmap** en HTTP 200 ; alias étrangers conservés.
- **545 fichiers runtime hors lot** et **11 gardes** conservés. Aucun redémarrage : PID **2362785**, `NRestarts=0`, service actif, PostgreSQL et `/health` sains, aucun nouvel avertissement.
- **16 scénarios supplémentaires exécutés sur les modules installés**, avec vraie boucle fixe, réception de paquets au format serveur, interpolation et renderer. Ces sondes isolées ne modifient aucune donnée persistante et ne constituent pas une partie MMO authentifiée.

Sauvegarde : `/opt/avosoma-backups/20261025-vorak-family1-20261025T122506Z`.

Preuves et manifeste : `output/vorak-family-release-2026-10-25/`, notamment `deployment-result.json`, `public-verification.json`, `candidate-validation.json` et `installed-loop-proof.json`.
