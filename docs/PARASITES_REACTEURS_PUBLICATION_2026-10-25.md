# Publication des Parasites et de la fumée des réacteurs — 25 octobre 2026

**Publié à 14 h 45 Europe/Paris**, lot frontend `20261025-parasite-smoke1`, sur `https://avosoma.absyrion.com/`.

Le joueur valide le boss Parasite rond à couronne puis autorise la publication, avec la fumée plus volumineuse des vaisseaux déjà préparée. Le lot contient le Parasite commun validé, le boss rond à six plaques mobiles et glandes vertes, ainsi que la fumée épaissie et contrastée de tous les réacteurs. Les silhouettes allongées et les anciennes variantes de boss ne sont pas publiées.

## Intégration dans le jeu

Les six modules locaux de la famille sont promus dans `src/game/combatData/parasiteVisuals.js` et `src/game/render/parasiteMotion.js`, `parasiteWake.js`, `parasiteBossMotion.js`, `parasiteBossCrown.js`, `parasiteSprite.js`. L'atelier réexporte maintenant ces modules au lieu de conserver une copie du rendu.

`render/enemyParasite.js` relie les deux espèces au vrai rendu des ennemis. Une WeakMap garde les états cosmétiques hors des entités serveur interpolées. Les anciens effets de corps et d'attente ne sont plus superposés pour ces deux Parasites ; les autres espèces gardent leur rendu. Le flash vert et l'ouverture de la couronne répondent au pulse d'attaque reçu, sans anticiper un tir hypothétique. Le préchargement et les images du catalogue client pointent vers les deux PNG validés. Orientation, dimensions, rayon de collision et règles restent inchangés.

`shipEngineWake.js` remplace le ruban fin par des nuages en expansion, avec une matière teintée en composition normale et un cœur doux en écran. Cette fumée conserve les couleurs, les moteurs et la trace des virages ; elle s'évapore après l'arrêt. Il s'agit du module partagé déjà examiné sur les décors lumineux, désormais installé dans le jeu.

## Vérification et publication

- **136 tests réussis** sur un candidat isolé construit depuis une capture fraîche de la production. Contrôles des deux nouvelles animations, objets serveur figés, vraie boucle à pas fixe, réception des paquets et interpolation à 30/60/120/144/240 Hz et avec limites d'affichage. Les neuf modèles de vaisseaux dessinent la nouvelle fumée avec leurs moteurs natifs puis la dissipent à l'arrêt.
- 350 modules frontend et 897 imports résolus. Syntaxe et contrôle des espaces réussis. Le catalogue ne diffère de la production que par les deux chemins d'illustration ; tous les paramètres de combat sont conservés.
- Contrôle navigateur du renderer natif et des moteurs natifs du candidat sur la scène Helion-03, sans compte connecté. Pas d'erreur ou d'alerte console observée. Les attaques et déplacements de cette scène restent simulés ; aucune session MMO authentifiée revendiquée.
- **14 fichiers installés**, index publié en dernier. Archive et empreintes validées en préparation ; les 14 empreintes HTTPS correspondent ensuite au lot. **217 cibles d'importmap accessibles en HTTP 200**, ainsi que l'entrée `game.js`, les styles et le `/health` public.
- 552 fichiers hors lot et 14 gardes préservés pendant l'installation. PID `2362785` conservé, `NRestarts=0`, aucun redémarrage du backend. PostgreSQL et `/health` restent sains ; aucun nouvel avertissement dans les journaux depuis la publication.
- Après installation, les **16 scénarios de boucle/réception/interpolation/rendu des Parasites** et la vérification native des **neuf vaisseaux** sont relancés contre les modules installés, en mémoire et sans modifier l'état persistant.

Sauvegarde du lot : `/opt/avosoma-backups/20261025-parasite-smoke1-20261025T134551Z`.

Preuves : `output/parasite-smoke-release-2026-10-25/`, notamment `manifest.json`, `candidate-validation.json`, `candidate-tests.txt`, `deployment-result.json`, `public-verification.json`, `public-entrypoints-health.json`, `installed-loop-proof.json`, `post-check-logs.json`, `native-parasites.png` et `native-smoke.png`.

Les clients déjà ouverts doivent recharger le jeu pour prendre le nouvel importmap.
