# Sélection X6 manuelle — 24 octobre 2026

Règle explicitement clarifiée par le joueur, publiée dans `20261024-laser-selection1`.

## Comportement

En tir X3, cliquer sur X6 sélectionne immédiatement X6 et coupe les nouveaux tirs X3. Si X6 est prête, sa salve peut partir dès ce clic. Si elle recharge, elle reste sélectionnée et aucun laser n'est envoyé jusqu'à la fin de cette recharge. Après sa salve, X6 reste sélectionnée et conserve sa cadence automatique de trois secondes. Pour reprendre X3, il faut cliquer sur X3.

Revenir manuellement sur X3 pendant la recharge X6 reprend les tirs normaux ; la fin de recharge X6 ne modifie ensuite aucune sélection. Les accusés réseau retardés, les refus et les changements de cible ne remplacent pas le choix du joueur. La préférence de munition mémorise désormais aussi X6 pour une cible suivante.

Cette règle remplace le retour automatique vers la dernière munition normale de la livraison `20261024-laser-input1`. La proposition de garder X3 active en attendant X6 a été rejetée pendant la clarification et n'a pas été implémentée.

La validation de stock existante reste appliquée : un stock déjà vide est refusé au clic ; un stock insuffisant pour une salve arrête le tir et ne choisit aucune autre munition automatiquement. Les recharges indépendantes, dégâts, visuels et débits serveur ne changent pas dans cette livraison.

## Modules

- `src/game/ui/combatActions.js` sélectionne X6 même pendant sa recharge, la mémorise, et conserve la sélection pour l'attaque d'une autre cible. Le retour automatique et la temporisation de confirmation de 300 ms sont retirés. Le tir immédiat d'une X6 prête est conservé pour les appuis rapides.
- `src/game/systems/weapons.js` attend la recharge de la munition active, sans retour vers une munition normale après envoi, confirmation, refus ou recharge. Les requêtes en attente restent séparées par groupe de recharge ; un retour manuel vers X3 peut donc être envoyé avant l'accusé X6.
- `src/game/combatOrchestrator.js` retire uniquement la dépendance de retour automatique devenue inutile.
- `index.html` actualise les alias des trois modules, y compris leurs anciens chemins versionnés. Les autres travaux présents dans le checkout et en production restent préservés.

## Validation

- Les 36 tests X6 passent sur les sources locales. Ils couvrent notamment la sélection immédiate pendant recharge, le maintien après tir, le retour manuel, l'annulation de ce choix par une nouvelle sélection, la cible hors portée, le stock, les refus et les réponses retardées.
- Les mêmes nouveaux tests appliqués aux anciennes sources publiques reproduisent les écarts de règle : 21 réussites et 15 échecs. Il s'agit des comportements à remplacer, pas d'une régression de la nouvelle version.
- Le candidat issu de production fraîche obtient 101 réussites, zéro échec : X6, protocole des tirs, synchronisation des munitions, sécurité du combat, autorité MMO, sauvegarde des préférences et arrêt des tirs lors du voyage.
- Un vrai échange Socket.IO entre attaquant et spectateur suit cinq salves : X6, retour manuel X3, X3, sélection d'une X6 encore en recharge sans tir normal intermédiaire, X6 après recharge, puis retour manuel X3. Les cinq tirs acceptés sont X6/X3/X3/X6/X3, chacun débité et appliqué une fois. Le compte X6 final est 98 et le compte X3 97 sur les profils éphémères de test ; les dégâts observés correspondent aux événements.
- Contrôle navigateur avec les vrais contrôleurs et la vraie barre d'actions, cible/réponses simulées : X6 sélectionnée à 2 s de recharge sans nouveau tir X3 ; après la recharge, une seule salve X6 et sélection conservée ; clic sur X3 puis nouveau tir X3. Aucune erreur console. Cette scène est isolée et n'utilise aucun compte de production. Les trois modules testés sont identiques au candidat finalement publié.
- Syntaxe des trois modules et `git diff --check` validés.

## Publication

Quatre fichiers seulement sont livrés, avec manifeste et empreintes avant/après. Les changements des fonctions sont appliqués sur la base publique fraîche ; les modifications parallèles hors de ces blocs ne sont pas copiées depuis le checkout. Une première tentative a été arrêtée avant toute écriture par la garde du PID après un redémarrage concurrent. La base et le candidat ont été reconstruits, et les 101 tests relancés avant publication.

Les quatre empreintes publiques HTTPS correspondent. Le service conserve le PID `1355453`, reste actif, `NRestarts=0`, PostgreSQL est prêt et aucune nouvelle ligne d'erreur n'est présente. Aucun fichier serveur livré et aucun redémarrage de cette livraison. Sauvegarde : `/opt/avosoma-backups/20261024-laser-selection1`.

Preuves et helpers : `output/laser-selection-2026-10-24/`, notamment `tests-x6.txt`, `tests-candidate.txt`, `regression-before.txt`, `browser-proof.json`, `x6-selection-corrigee.png`, `manifest.json`, `production-overlay.diff`, `deployment-result.json` et `public-verification.json`.
