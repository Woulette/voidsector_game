# Lisibilité des combats et recharge X6 — 24 octobre 2026

Règle de sélection remplacée ensuite par la clarification publiée `20261024-laser-selection1` : le clic sur X6 coupe immédiatement la munition normale, même pendant la recharge ; X6 reste sélectionnée après le tir et le retour à X3 est manuel. Détails : `SELECTION_X6_MANUELLE_2026-10-24.md`. Le retour automatique décrit ci-dessous correspond à la règle antérieure.

Choix visuel validé ensuite : **tous les dégâts infligés blancs, dégâts reçus rouges**, avec un cumul des tirs partis dans une fenêtre de 160 ms. L'implémentation et l'aperçu réel des chiffres sont décrits dans `docs/COMBAT_DEGATS_CUMULES_2026-10-24.md`. Les couleurs de la première maquette ci-dessous constituent donc la proposition initiale, remplacée par ce choix.

La première proposition visuelle ci-dessous est conservée comme maquette historique. Les corrections de munitions sont publiées dans `20261024-laser-input1` ; l'affichage blanc/rouge et le cumul de 160 ms sont ensuite publiés dans `20261024-damage-feedback1`, le 24 octobre à 20 h 21, heure de Paris. Détails et contrôles publics dans `COMBAT_DEGATS_CUMULES_2026-10-24.md`.

Mise à jour ultérieure : la séparation de recharge décrite ici est publiée dans `20261024-laser-input1` à 18 h 13, avec la correction des appuis rapprochés et de l'attente de confirmation X6. La maquette de lisibilité reste distincte. Détails : `VFX_LASERS_VARIANTES_2026-10-24.md`.

## Proposition visuelle

Image : `output/combat-x6-readability-2026-10-24/combat-readability-concept.png`, générée avec l'outil intégré imagegen à partir de la capture fournie, en conservant les vaisseaux, la vue de dessus et l'interface existante. Le prompt est conservé à côté de l'image.

- Dégâts laser infligés blancs, missiles dorés et dégâts reçus rouges.
- Milliers espacés (`-10 000`), contour sombre fin et halo réduit.
- Léger agrandissement initial, montée courte, puis disparition ; limiter les chevauchements au-dessus des noms et des jauges.
- Étincelles et petite onde d'impact localisées sur la cible.

Les montants illustrent la lisibilité, sans proposer de modification des dégâts ou de nouvelle règle de critique. Aucun nouveau rendu de dégâts ni impact n'est appliqué au jeu par cette maquette.

## Fonctionnement X6 préparé

La X6 possède sa recharge indépendante de 3 secondes. Les X1, X2, X3 et X4 conservent leur recharge commune et leurs bonus de cadence existants : changer de munition normale ne réinitialise pas cette recharge. Une salve X6 et une salve normale peuvent être acceptées au même instant, dans les deux ordres, si chacune est prête.

La sélection X6 conserve en mémoire la dernière munition normale. Après confirmation de sa salve, ou si la X6 recharge ou ne possède plus assez de stock pour tous les lasers équipés, le client reprend cette munition normale lorsqu'elle est encore assignée et dispose du stock nécessaire. Il respecte sa recharge restante. À défaut, il choisit une autre munition normale assignée avec assez de stock. Sans autre munition, une X6 encore approvisionnée conserve son tir automatique toutes les 3 secondes ; si aucune salve laser n'est possible, le tir s'arrête.

Les réponses retardées ne remplacent pas une nouvelle sélection et ne relancent pas un tir arrêté. Un refus serveur `COOLDOWN` ou `NO_AMMO` provoque également le retour à la munition normale, lorsqu'elle existe. Les consommations, les dégâts, les chances de toucher et les quatre impulsions visuelles X6 restent calculés comme avant.

## Modules

- `src/shared/weaponCooldowns.js` définit les groupes de recharge, utilisés par le serveur et le client. La X6 conserve la classe d'arme `laser` dans le protocole.
- `server/src/combat/damage.js` utilise le groupe distinct X6 avec le verrou existant par compte, y compris après changement de socket.
- `src/game/systems/projectiles.js` réutilise la même clé pour les jauges de recharge.
- `src/game/systems/weapons.js` sépare également les tirs en attente et les délais après refus, pour qu'une requête X6 ne bloque pas une munition normale.
- `src/game/ui/combatActions.js` conserve la dernière munition normale et porte le retour automatique ; `combatOrchestrator.js` transmet cette commande au système d'armes.

## Vérifications

`server/test/combat-x6.test.js` couvre 22 scénarios : les quatre munitions normales dans les deux ordres de tir, cadence commune conservée, X6 à 3 secondes, reconnexion du compte, requêtes simultanées, stock nul ou insuffisant pour une salve, sélection déplacée, absence de munition de secours, réponse retardée et refus serveur.

Un échange Socket.IO réel relie les commandes client, le gestionnaire serveur, les munitions du profil et les dégâts de l'ennemi. Un second client observe les trois salves X6 / X3 / X6, avec un seul débit par salve et des dégâts correspondant exactement aux événements diffusés. Il s'agit d'un test local avec profils éphémères, sans session ou compte de production.

Les 19 premiers scénarios ont été exécutés avant correction pour reproduire les défauts, puis les 22 scénarios finaux passent. Les sept fichiers JavaScript ajoutés ou modifiés passent `node --check`.

Les journaux et les sauvegardes des fichiers avant intervention se trouvent dans `output/combat-x6-readability-2026-10-24/`. La suite client complète obtient 39/40 : l'échec `element.contains is not a function` de `vesperClient.test.js:137` est reproduit avec les modules antérieurs à la correction, dans `validation/baseline/`. Le test de fiche vaisseau attendant le texte `Vie actuelle` échoue également sur cette copie antérieure. Un premier lancement serveur est resté suspendu sur `beta-reward-socket.test.js` ; seul ce processus de test a été arrêté. Le même test Beta passe ensuite seul sur la copie antérieure.

La nouvelle exécution complète du serveur, bornée à 15 secondes par test, se termine en 4,6 secondes : **1 882/1 883 tests passent**, sans annulation ni suspension. Son seul échec est celui de la fiche vaisseau mentionné ci-dessus. Les 22 scénarios X6 passent également dans cette suite globale. Résultat exact : `server-tests-final.log`.
