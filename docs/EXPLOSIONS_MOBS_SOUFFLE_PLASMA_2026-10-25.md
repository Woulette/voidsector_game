# Explosion commune des mobs : Souffle plasma — 25 octobre 2026

Choix explicite du joueur : **A · Souffle plasma**, parmi les quatre propositions animées. Le joueur confirme « Souffle plasma c'est top ».

## État

**Publié sur Avosoma dans le lot `20261025-mob-plasma1`.** L'effet est le même pour toutes les familles, monstres communs et boss : flash blanc chaud, feu orange irrégulier, braises projetées et fumée qui se dissipe entièrement en 2,2 secondes. Aucune taille ni couleur différente selon l'espèce ou le boss. Le joueur et les cibles PvP ne reçoivent pas cet effet.

Le rendu natif est dans `src/game/render/enemyDeathExplosion.js`. Neuf petites textures procédurales sont partagées et mises en cache ; leur préparation peut se faire pendant une période inactive du navigateur. La simulation ne génère pas de particules supplémentaires dans le tableau des particules ordinaires.

`combatEnemyDeath.js` détecte la disparition des ennemis entre deux instantanés serveur successifs du même monde ou de la même instance. Les instantanés du serveur énumèrent tous les ennemis vivants : la disparition déclenche donc l'effet quelle que soit la source de dégâts, notamment les armes, Ricky et le poison, avec la dernière position visuelle disponible. Une arrivée initiale, un transfert de carte, un changement d'instance ou une déconnexion réinitialise la comparaison. Une réapparition avec le même identifiant peut produire une nouvelle explosion à sa mort.

Le système est appelé avant la synchronisation des corps dans `combatMultiplayerSync.js`. Pour les ennemis locaux, `combatEnemyRuntime.js` déclenche le même effet avant de retirer les corps à zéro PV. Aucun calcul de dégâts, récompense, collision, poursuite ou effet serveur n'est ajouté ou modifié. La bombe ralentissante du Traqueur reste indépendante.

Le pool existant fait vieillir et expirer les effets. Huit explosions de mort peuvent coexister ; le retrait de la plus ancienne préserve les autres types d'effets. Le rendu conserve quatre explosions détaillées par image, puis emploie une version allégée de la même explosion. L'affichage hors écran est ignoré ; les options graphiques d'explosions et d'étincelles/fumée sont respectées.

## Vérification

**41 tests ciblés réussis** :

```text
node --test server/test/enemy-death-explosion.test.js server/test/render-entity-culling.test.js server/test/enemy-weapon-impact.test.js server/test/vfx-release.test.js server/test/multiplayer-remote-interpolation.test.js
```

Neuf nouveaux cas vérifient notamment le raccordement réel aux instantanés et à la synchronisation, toutes les familles du catalogue, le déclenchement unique, la réapparition du même identifiant, l'absence d'explosions pendant un transfert ou une reconnexion, la mort locale, l'expiration par la mise à jour native à 30/60/144/240 Hz et les limites graphiques. Les tests existants des tirs, du bouclier, de la bombe du Traqueur, du culling et de l'interpolation restent réussis.

La comparaison animée est un aperçu isolé sans compte connecté. Après sélection, cet aperçu embarque une copie exacte du module natif de rendu, afin de revoir le visuel choisi. Aucune session MMO authentifiée ou vérification de production n'est revendiquée.

Contrôle navigateur du flash, du feu et de la fumée natifs, de la lecture/pause, du ralenti, du curseur temporel et du fond lumineux. Contrôle de la présentation à 320 pixels de large et de la fin de séquence ; aucune erreur ou alerte console. Captures `plasma-selected-native.png` et `plasma-320.png`.

Preuves locales : `output/mob-death-variants-2026-10-25/`. La comparaison initiale à quatre variantes est conservée dans `four-options-source.html` et `comparison.png`. Le générateur `build-selected-preview.ps1` reconstruit l'aperçu du choix retenu à partir du module natif.

Les fichiers de l'atelier voisin `tools/vfx-lab/` ne sont pas modifiés. Les trois raccordements minimaux ont été repris sur une capture fraîche de production, avec les deux nouveaux modules et les versions d'import dans l'index.

## Publication vérifiée

Lot frontend de **six fichiers**, installé le 25 octobre 2026 à 18:21:20 UTC, index en dernier. La copie de production contenait déjà la nouvelle Éclanite : elle est conservée, ainsi que tous les autres rendus et comportements existants.

- 41 tests réussis sur le candidat isolé, 370 modules frontend et 949 imports résolus ; 576 fichiers de code hors lot identiques à la capture.
- Archive et empreintes des six fichiers vérifiées en préparation avant installation.
- 578 fichiers hors lot et 17 gardes préservés pendant l'installation ; sauvegarde `/opt/avosoma-backups/20261025-mob-plasma1-20261025T182120Z`.
- Une publication ultérieure du vortex Azuron a actualisé l'index pendant le contrôle final. Ses changements sont conservés : les cinq modules du Souffle plasma et toutes leurs versions d'import restent conformes. Le lot n'a pas été réinstallé par-dessus cette publication.
- Six empreintes publiques vérifiées sur cet état final, 240 cibles d'importmap en HTTP 200, page d'accueil sans paramètre, `game.js`, styles et santé publique conformes.
- Neuf scénarios de mort exécutés contre les modules installés, en mémoire et sans modifier d'état persistant. Ce contrôle n'est pas une session MMO authentifiée.
- `avosoma-beta.service` actif, PID 2510150 conservé, `NRestarts=0`, aucun redémarrage. PostgreSQL sain, aucune sauvegarde en attente, aucun avertissement dans les journaux depuis la publication.

Preuves : `output/mob-plasma-release-2026-10-25/`, notamment `manifest.json`, `source-diff.patch`, `candidate-validation.json`, `candidate-tests.txt`, `staging-verification.json`, `deployment-result.json`, `concurrent-change-inspection.json`, `concurrent-index-diff.patch`, `final-public-verification.json` et `post-check.json`.

Les clients déjà ouverts doivent recharger le jeu pour charger le nouveau rendu.
