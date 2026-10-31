# Dégâts de combat et salves cumulées — 24 octobre 2026

**Rendu actuel corrigé : tous les dégâts infligés et reçus sont rouge métallique, à 21 px**, avec le cumul de 160 ms. Publié dans `20261024-damage-red1` à 21 h 10, heure de Paris. Les descriptions de blanc infligé ou de rouge uni ci-dessous retracent les versions précédentes et ne définissent plus le rendu actuel.

Publié le 24 octobre 2026 à **20 h 21, heure de Paris**, sous `20261024-damage-feedback1`, après validation de l'aperçu. Tous les chiffres de dégâts infligés sont blancs, lasers, X6, roquettes et missiles compris ; les chiffres reçus sont rouges, poison compris. Les départs proches se regroupent dans une fenêtre de 160 ms.

## Lisibilité

Les nombres utilisent un contour sombre net, un halo réduit et des milliers espacés (`-15 000`). Une impulsion de taille de 120 ms accompagne leur apparition, puis ils montent brièvement et disparaissent. Le texte est placé au-dessus du nom de la cible. Deux salves distinctes encore visibles sont décalées verticalement. Les soins et annonces de niveau conservent leur présentation antérieure.

L'aperçu utilise les vrais modules de chiffres et d'animation et des sprites du jeu : `output/combat-damage-feedback-2026-10-24/preview.html`. Il s'agit d'une scène isolée, avec des valeurs de démonstration, et non d'une session MMO. Captures navigateur : `preview.png`, `preview-spaced.png`, `preview-60ms.png` dans le même dossier.

## Cumul temporel

La fenêtre initiale est **160 ms entre les départs de tir**, pour une même cible, un même tireur et une même carte. Elle est fixée au premier départ ; chaque impact ne prolonge pas la fenêtre. Ainsi, les tirs réguliers successifs ne s'additionnent pas indéfiniment. Les événements retardés sont aussi soumis à l'écart total entre le premier et le dernier départ de la salve.

Les dates des événements serveur `combat:shot`, associées aux identifiants de tir, permettent de regrouper un laser, une roquette et des missiles partis ensemble malgré leurs temps de vol différents. En l'absence d'un événement de départ, l'horodatage d'impact moins le temps de vol serveur fournit le repli.

Le compteur cumule exclusivement les dégâts confirmés. Exemple : un laser de 3 000, une roquette de 2 000 et des missiles de 10 000 alimentent le même texte, qui atteint **15 000** à la confirmation du dernier impact. Le texte reste visible pendant l'attente des projectiles connus ; un délai borné empêche un projectile annulé de maintenir un texte indéfiniment. Les impacts et dégâts réels continuent de s'appliquer à leurs moments habituels.

Les tirs espacés restent séparés, même lorsque leurs impacts arrivent ensemble. Les dégâts de plusieurs tireurs ou cibles ne se mélangent pas ; les ticks de poison gardent leur propre groupe. Une confirmation répétée du même identifiant ne double pas le montant affiché. `MISS` est différé lorsqu'un autre projectile connu de la même salve reste à résoudre.

## Découpage

- `src/game/combatData/damageFeedback.js` porte la fenêtre de 160 ms, la durée et les deux couleurs. Le curseur de l'aperçu sert à comparer les fenêtres ; il ne crée aucun nouveau réglage de profil.
- `src/game/systems/combatDamageFeedback.js` porte les groupes persistants entre images, les identifiants de tir et les délais d'attente. Ses listes sont bornées et nettoyées au changement de carte ou au remplacement des effets de combat.
- `combatServerEvents.js` transmet les départs et impacts à ce module, en conservant les validations, mises à jour de munitions et événements existants.
- `combatHitResolution.js` retourne le texte créé pour permettre sa mise à jour ; le coordinateur transmet cette référence. Les dégâts locaux utilisent également les mêmes couleurs.
- `render/damageTexts.js` porte le rendu extrait de `canvasHud.js`, qui conserve son export public. Le système de particules conserve un déplacement ascendant pour les chiffres de dégâts.

Les dégâts, chances de toucher, débits de munitions et temps de vol serveur ne changent pas. Les évolutions X6 préparées dans le chantier parallèle sont préservées.

## Vérifications

- **17/17 nouveaux tests** passent : cumul sur plusieurs images, différents temps de vol, limite 160/161 ms, absence de cumul en chaîne, séparation des tireurs/cibles/cartes, dédoublonnage, attente d'un projectile, refus de prédire des dégâts, conversion des ratés, nettoyage et couleurs.
- Un **véritable échange Socket.IO** lance les trois armes avec les commandes client et le gestionnaire serveur. Les impacts arrivent sur des images distinctes, alimentent un seul compteur, et la somme correspond exactement à la perte de PV de l'ennemi. Les stocks réels du profil éphémère perdent 1 laser, 1 roquette et 3 missiles.
- **25/25 tests X6** passent sur l'état partagé contrôlé à la fin du lot.
- Suite serveur finale : **1 921/1 922**, sans annulation ni suspension. Le seul échec concerne le texte attendu `Vie actuelle` dans `ship-detail-live-stats.test.js:7`, déjà reproduit sur les sources antérieures dans le dossier de validation du lot X6.
- Suite client : **39/40** ; l'ancien échec `element.contains is not a function` dans `vesperClient.test.js:137` reste inchangé et avait également été reproduit sur la copie antérieure.
- Les neuf sources JavaScript du lot passent `node --check`. Contrôle navigateur du rendu à 160 ms, des tirs espacés et de la fenêtre raccourcie à 60 ms : un compteur à 160 ms contre deux à 60 ms pour les départs 0/40/80 ms. L'aperçu est laissé au réglage de 160 ms.

Preuves et sauvegardes : `output/combat-damage-feedback-2026-10-24/`. Les images sont des captures du rendu Canvas local ; aucune nouvelle image générée n'est intégrée aux assets du jeu.

## Publication et contrôles publics

Le lot comporte **neuf fichiers frontend** : les trois nouveaux modules, `canvasHud.js`, `combatHitResolution.js`, `combatServerEvents.js`, `combatStatusEffects.js`, une ligne de retour dans `combatOrchestrator.js` et l'import map d'`index.html`. Il a été construit à partir d'une capture du runtime en ligne, avec fusion des seules modifications de ce lot. Les travaux locaux Helion-03 et impacts sur les ennemis restent hors de cette publication. Les corrections X6 déjà publiées dans `20261024-laser-input1` sont conservées.

Les tests ont détecté une dépendance ajoutée par le chantier d'impacts local pendant la préparation du premier candidat ; ce candidat n'a pas été publié. Le candidat corrigé `release/attempt2/` résout **245 modules sans dépendance manquante**. Les exécutions ciblées locales et distantes affichent **159 réussites**, sans échec, dont les 17 nouveaux scénarios de dégâts et les 25 scénarios X6. Trois scénarios de chantiers concurrents non présents sur le serveur (champ `shieldBefore`, opacité laser et nouvelle cadence visuelle M6) ont d'abord été reproduits en échec sur la capture en ligne inchangée, puis exclus de ce lot. Leurs noms et les journaux complets sont conservés dans les preuves de publication.

L'archive vérifiée a été installée sous verrou commun de publication, après contrôle de toutes les empreintes de départ. `index.html` a été publié en dernier. Sauvegarde de retour arrière : `/opt/avosoma-backups/20261024-damage-feedback1-20261024-182151`.

Après publication, **11 fichiers publics** (les neuf du lot, `game.js` et `styles.css`) répondent en HTTPS 200 et ont les empreintes attendues ; les **17 alias d'import** modifiés correspondent au nouveau jeton. Les **530 empreintes** du runtime déployé sont conformes, dont **521 fichiers préservés**. `avosoma-beta.service` reste actif avec le même PID `1222927`, `NRestarts=0` et sans redémarrage de cette livraison. PostgreSQL, `/health` local et public sont opérationnels, sans erreur pertinente dans le journal depuis la publication.

Preuves exactes : `release/attempt2/manifest.json`, `source-diff.patch`, `tests-local-summary.json`, `tests-remote-summary.json`, `deployment-result.json`, `public-verification.json` et `final-host-verification.json`. L'index local a reçu uniquement la mise à jour des alias concernés. L'aperçu Canvas reste une scène isolée ; aucune session de combat authentifiée en production n'a été ouverte pour cette vérification.

## Chiffres plus petits et finition métallique, publiés

Après le retour sur la taille trop importante, le rendu local passe de **28 à 20 px**, avec une impulsion limitée à 22 px au lieu de 32 px. La graisse passe de 900 à 800, le contour de 4 à 2,4 px et le halo est réduit. Le blanc utilise uniquement des nuances neutres argentées ; le rouge garde des reflets rouges et une ombre rouge sombre. Le dégradé vertical suit chaque chiffre et sa disparition, sans nouvelle animation de brillance.

L'aperçu `output/combat-damage-metal-2026-10-24/preview.html` permet de comparer le nouveau rendu et une copie sauvegardée de l'ancien renderer dans la même scène. Les deux couleurs y apparaissent ensemble. Les 17 tests ciblés existants passent, dont l'échange Socket.IO ; les deux sources JavaScript passent le contrôle de syntaxe. Les captures et les modules antérieurs sont conservés dans le même dossier. Après validation, ce rendu est publié dans `20261024-damage-metal1` ; la scène de démonstration reste isolée.

Complément demandé pour la X6 : elle alimente le même total que le laser X3, les roquettes et les missiles lorsque les quatre départs visent la même cible dans les 160 ms. Le regroupement existant distingue les identifiants de tir et n'exclut aucune munition laser ; aucune modification de mécanique ou de sélection X6 n'est nécessaire. L'échange Socket.IO du test ciblé lance désormais ces quatre munitions, contrôle quatre identifiants distincts, la somme après chaque impact confirmé, la perte totale de PV et les quatre débits de munitions. Les 17 scénarios passent. Le nouvel aperçu illustre des départs à 0/40/80/120 ms et un total de démonstration de **21 000** : X6 6 000 + X3 3 000 + roquette 2 000 + missiles 10 000. Preuves complémentaires locales : `output/combat-damage-metal-2026-10-24/x6/` et capture `preview-x6-total.png`.

Publication du **24 octobre 2026 à 20 h 51, heure de Paris**, sous `20261024-damage-metal1` : seuls `combatData/damageFeedback.js`, `render/damageTexts.js` et l'import map d'`index.html` sont livrés. Le candidat reprend le runtime actuel ; les **531 autres fichiers** restent identiques, notamment le cumul, les dégâts serveur, les impacts et la sélection X6 manuelle de `laser-selection1`. Les **111 tests ciblés passent en local et à distance**, sans exclusion, dont les 17 scénarios de dégâts et les 36 scénarios X6.

Sauvegarde : `/opt/avosoma-backups/20261024-damage-metal1-20261024-185107`. Installation sous verrou partagé, contrôle de toutes les empreintes avant écriture et `index.html` en dernier. Les **cinq empreintes HTTPS** vérifiées (trois fichiers livrés, `game.js` et `styles.css`), les deux alias de cache et les **534 empreintes du runtime** sont conformes. Service actif avec PID `1365246` et `NRestarts=0`, sans redémarrage de cette livraison ; PostgreSQL, `/health` local et public opérationnels, aucune nouvelle erreur pertinente depuis la publication.

Preuves de cette seconde livraison : `output/combat-damage-metal-2026-10-24/release/attempt1/`. Le fichier `public-preview.html` utilise le renderer et ses paramètres téléchargés en HTTPS, ainsi que les autres modules inchangés de la capture en ligne. Il confirme visuellement les chiffres de 20 px, les deux finitions et un seul total de démonstration de 21 000 ; il ne constitue pas une session MMO authentifiée. L'index local a reçu uniquement les deux alias de cache concernés.

## Ajustement final : 21 px et dégâts reçus rouge uni

À la demande d'augmenter légèrement la police et de rétablir les dégâts reçus rouges, les chiffres passent de **20 à 21 px (+5 %)** ; leur impulsion maximale passe de 22 à 23 px. Les dégâts reçus retrouvent le rouge uni `rgba(255,96,96,...)`, avec leur contour sombre et leur disparition habituels. Le dégradé entrant a été retiré ; seul le blanc des dégâts infligés conserve sa finition métallique. Le cumul de 160 ms et les mécaniques de tir restent identiques.

Publié le **24 octobre 2026 à 20 h 57, heure de Paris**, sous `20261024-damage-tuning1`. Le lot reprend le même périmètre de trois fichiers et une nouvelle capture du runtime en ligne. Les **111 tests passent sur candidat local et distant**, sans exclusion. Les cinq fichiers HTTPS et les 534 empreintes du runtime sont conformes, dont **531 fichiers préservés**. Deux alias de cache sont actualisés ; le service garde son PID `1365246` et `NRestarts=0`, sans redémarrage. PostgreSQL et la santé locale/publique restent opérationnels ; aucune nouvelle erreur pertinente dans le journal.

Sauvegarde : `/opt/avosoma-backups/20261024-damage-tuning1-20261024-185736`. Preuves : `output/combat-damage-tuning-2026-10-24/release/attempt1/`, avec manifeste, diff, tests, vérifications publiques et aperçu utilisant les sources téléchargées en HTTPS. La scène de contrôle conserve le total de démonstration de 21 000 et les dégâts reçus rouges ; elle reste distincte d'une session MMO authentifiée.

## Correction de l'interprétation : rouge métallique infligé et reçu

La demande explicite porte sur **le même rouge métallique pour les dégâts que le joueur inflige et ceux qu'il reçoit**. L'interprétation précédente blanc métallique infligé / rouge uni reçu était incorrecte. Les deux directions utilisent maintenant la palette partagée `metallicDamage`, la même couleur de repli rouge et le même halo rouge. La taille reste 21 px, l'impulsion maximale 23 px et le cumul 160 ms. Les couleurs propres aux soins et annonces sont conservées ; les calculs de dégâts, les événements serveur et les règles de sélection X6 ne changent pas.

Publié le **24 octobre 2026 à 21 h 10, heure de Paris**, sous `20261024-damage-red1`. Les trois fichiers livrés sont toujours `combatData/damageFeedback.js`, `render/damageTexts.js` et l'import map d'`index.html`. Les assertions de couleur des tests existants ont été adaptées au rouge infligé. Les **111 tests ciblés locaux et distants passent**, sans exclusion. Les cinq empreintes HTTPS et les **539 empreintes du runtime** sont conformes, dont **536 fichiers préservés**. Deux alias de cache sont actualisés, `index.html` publié en dernier et le service reste actif au même PID `1389965`, `NRestarts=0`, sans redémarrage de cette livraison. PostgreSQL et la santé publique/locale sont opérationnels ; aucune nouvelle erreur pertinente dans le journal.

Sauvegarde : `/opt/avosoma-backups/20261024-damage-red1-20261024-191038`. Preuves : `output/combat-damage-red-2026-10-24/release/attempt1/`. Le contrôle navigateur avant publication, puis avec les modules publics téléchargés en HTTPS, montre les dégâts de démonstration **-21 000 infligés et -1 250 reçus dans la même finition rouge métallique**. Cette scène reste isolée d'une session MMO authentifiée.
