# Ramassage des objets au sol — 24 octobre 2026

## Comportement

Un clic sur un butin mène le vaisseau 48 unités au-dessus de son point au sol. À l'arrivée, l'objet monte vers la prise sous le vaisseau et rétrécit pendant 700 ms. Le faisceau et ses particules reprennent la couleur de rareté. Les clés, fragments, objets de quête, munitions et minerais suivent le même protocole.

Le déplacement reste disponible. Un nouveau clic de navigation annule immédiatement la récupération ; un déplacement de plus de 18 unités, la mort, un changement de carte, la déconnexion ou l'expiration l'annulent également. L'objet retrouve son rendu au sol et aucun gain n'est accordé. Une petite tolérance absorbe la fin de l'approche. Le point d'approche respecte les limites de déplacement aux bords de carte.

## Autorité MMO

`src/shared/lootCollection.js` contient les constantes et le point d'approche partagés. `src/game/systems/lootCollection.js` ne gère que la présentation et les commandes. Il n'altère ni les coordonnées canoniques du butin ni les inventaires et n'immobilise pas le vaisseau.

L'événement existant `loot:pickup` reçoit `start`, `finish` ou `cancel`, avec un identifiant de tentative. `server/src/world/lootCollection.js` conserve au maximum un canal par socket et l'avance dans le tick de nettoyage existant. Il vérifie propriétaire, carte, état du joueur, distance, durée et déplacement. `finish` ne peut accorder le butin avant l'échéance serveur. Les messages tardifs d'une ancienne tentative ne peuvent terminer ou annuler la suivante.

La transaction de récompense existante reste dans `server/src/world/loot.js`. Seul `loot:picked` fait disparaître le butin côté client et affiche le gain. À la fin visuelle, l'objet est masqué jusqu'à cette confirmation ; un refus le rétablit. Les deux quotas de `loot:pickup` passent à 60 requêtes par 10 secondes pour supporter les phases et les annulations, avec validation de durée côté serveur conservée.

## Vérification

- Tests du contrôleur client : tous les types de butin, durée, absence de gain local, déplacement, annulation, reprise, mort, expiration, bord de carte et corrélation des tentatives.
- Tests serveur et Socket.IO réel : durée minimale, finalisation anticipée, tentatives répétées, annulation, propriété, carte, état et récompenses existantes.
- Tests des vrais quotas : 14 collectes successives en 9,8 secondes et annulation/reprise immédiate acceptées ; rafale limitée à la 61e requête.
- Tests du renderer : état du canvas restauré, positions et taille du rendu, visibilité hors point d'origine, fin masquée et budget de particules borné.
- Navigateur local avec vrais modules et Socket.IO : clé Deadly en 712 ms, ressource commune en 701 ms ; ressource rare interrompue à 280 ms sans gain, puis reprise terminée en 700 ms avec un seul gain. Profil de test en mémoire, sans compte de production.

Les preuves se trouvent dans `output/loot-collection-20261024/validation/`. L'aperçu local sur le port 8878 sert uniquement à vérifier ce flux ; il ne représente pas une session MMO de production authentifiée.

La suite complète du checkout a donné 1 810 tests réussis sur 1 811. L'échec hors lot est `ship-detail-live-stats.test.js`, dont l'assertion cherche « Vie actuelle » directement dans `render.js` alors que ce rendu est délégué à `hangarWorkshopMarkup.js`. Aucun fichier du hangar n'est corrigé dans ce lot.

## Publication

Lot `20261024-loot-suction1` publié le 24 octobre à 17:01:46 Europe/Paris : 13 fichiers runtime. Le module partagé et les trois fichiers serveur ont été installés avant l'unique redémarrage ; la page d'entrée a été publiée en dernier avec les alias des neuf modules client et partagés. Les modifications concurrentes déjà publiées sont préservées, notamment les effets des armes, les animations des ennemis, les portails et les quêtes.

Le candidat exact a passé 116 tests ciblés, 12 vérifications de syntaxe et la résolution de 242 modules sans import manquant. Les 306 alias étrangers au lot sont conservés. Après publication : 13 empreintes installées et 10 empreintes HTTPS concordantes, les trois sources serveur restant privées ; 157 cibles d'importmap accessibles. Service actif, PID 1 136 591 → 1 144 897, `NRestarts=0`, PostgreSQL prêt, aucune erreur ou alerte dans les journaux du nouveau PID. Le handshake WebSocket public anonyme reçoit bien `auth:required`, sans authentification ni écriture persistante demandée.

Sauvegarde limitée : `/opt/avosoma-backups/20261024-loot-suction1`. Rapports et empreintes : `output/loot-collection-20261024/release/`. L'essai complet d'aspiration avec gain reste un test local Socket.IO ; aucun compte de production n'a été utilisé pour accorder du butin pendant la vérification. Les sessions ouvertes doivent recharger la page pour obtenir le nouveau protocole.
