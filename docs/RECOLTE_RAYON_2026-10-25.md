# Recolte au sol : rayon descendant — 25 octobre 2026

Etat : publie en production le 25 octobre 2026, lot initial `20261025-loot-beam1`, rapprochement ajuste par `20261025-loot-height1`.

## Demande et rendu

Le vaisseau se place au-dessus de la ressource et projette un rayon vers elle. Le point d'approche partage client/serveur est a 112 unites au-dessus du butin, avec le bornage de carte existant. Ce rapprochement de 24 unites par rapport aux 136 du premier lot laisse le rayon visible. Le rayon part a 22 unites sous le centre visuel du vaisseau et suit sa correction de position reseau.

L'objet reste sur son point au sol pendant le rayon ; il se dissout dans les derniers 35 % des 700 ms. Le cone s'elargit vers le sol, les pulsations descendent et les couleurs suivent la rarete. Les materiaux, cles, fragments, munitions et objets de quete utilisent le controleur commun. Annulation, delai serveur et attribution uniquement sur confirmation sont conserves.

## Cause du chargement de l'ancienne animation

Dans la session de production ouverte, le debugger du navigateur a confirme l'execution de `combatCargo.js?v=20260726-kharon1`, conserve dans le cache. Ce module ancien n'importe pas `createLootCollectionController`, reserve son animation aux materiaux et supprime localement les autres butins a l'envoi de la requete.

Le fichier de production a jour etait disponible en HTTPS sous `?v=20261024-loot-suction1`, mais l'importmap ne contenait que l'alias sans query string. Or l'orchestrateur importe explicitement l'URL `?v=20260726-kharon1` : cette URL exacte n'etait pas redirigee. Le nouvel alias corrige ce chemin, et les quatre modules de recolte sont caches sous `20261025-loot-beam1`.

Le test `server/test/loot-collection-importmap.test.js` reproduisait cet echec avant correction et passe ensuite. L'apercu navigateur importe volontairement l'ancien specifier alors que le serveur de test sert l'ancien code capture a cette URL : la redirection doit donc charger les nouveaux modules pour que les collectes reussissent.

## Verification

- 91 tests cibles reussis : client, renderer, serveur, vrai Socket.IO, quotas, drops de ressources, quetes et abandon de quete.
- Navigateur local avec les modules reels et un profil fictif en memoire : cle Deadly en 700 ms, ressource commune en 700 ms ; annulation d'une ressource rare sans gain, puis reprise avec un seul gain en 703 ms.
- Les quatre URLs de recolte observees dans le navigateur portent `20261025-loot-beam1`, y compris lorsque la page importe l'ancien specifier.
- Rendu controle avec les images du jeu, le nom du pilote et trois raretes, sans erreur console.

Les essais complets de collecte et d'annulation restent locaux. Apres publication, la session MMO reelle s'est rechargee sur Helion-03 et le debugger a confirme l'execution des quatre modules de recolte `20261025-loot-beam1`, avec les memes empreintes que les fichiers publics verifies. Aucun butin artificiel n'a ete accorde a un compte de production.

## Fichiers et publication

Les changements runtime sont limites a `src/shared/lootCollection.js`, `src/game/systems/lootCollection.js`, `src/game/render/lootCollection.js` et aux alias de recolte dans `index.html`. Les autres alias de la page ont ete preserves. `combatCargo.js` n'a pas ete reecrit : son alias corrige doit simplement charger le controleur recent.

Publication limitee a cinq fichiers : les trois modules modifies, la copie deja compatible de `combatCargo.js` et la page d'entree reconstruite depuis la production fraiche. Les 441 alias etrangers au lot ont ete preserves ; une modification concurrente de la page a ete reprise avant le deploiement. Le module partage a ete installe avant le redemarrage, puis les modules client et enfin `index.html`.

Les 91 tests cibles ont repasse sur une copie fraiche des sources du serveur avec ce candidat. Archive et empreintes controlees avant installation ; cinq empreintes installees et cinq empreintes HTTPS conformes. PID `2458909` vers `2491946`, `NRestarts=0`, PostgreSQL pret, aucun message d'erreur dans les journaux du nouveau processus. Le WebSocket public anonyme se connecte et exige l'authentification pour `player:hello`.

Sauvegarde : `/opt/avosoma-backups/20261025-loot-beam1-20261025T142202Z`. Les sessions deja ouvertes doivent recharger la page. Aucun push Git ni commit global du checkout n'a ete effectue.

Une autre publication a ensuite actualise cinq alias de l'arene Azuron dans la page d'entree. Le controle final confirme que les neuf alias de recolte et les quatre empreintes de modules sont preserves ; l'empreinte de la derniere page publique correspond bien a celle du serveur. Cette mise a jour concurrente a ete conservee sans repasser sur la page plus ancienne du lot de recolte.

## Ajustement de hauteur apres retour visuel

Le createur a demande de baisser un peu le vaisseau pendant la recolte. L'ecart passe de 136 a 112 unites, soit 24 de moins (environ 18 %), sans changement du rayon ni de sa duree. Le rendu a ete controle dans l'apercu, puis les 91 tests ont repasse sur une nouvelle copie des sources de production avec cette constante.

Lot `20261025-loot-height1` limite au module partage et a `index.html`, avec conservation de 449 alias etrangers. Deux empreintes installees et deux empreintes HTTPS conformes, serveur actif, PostgreSQL pret, aucun message d'erreur du nouveau processus. PID `2491946` vers `2510150`, `NRestarts=0`. Les trois alias du module partage pointent vers la nouvelle version ; les autres modules de recolte conservent leur version deja validee.

Sauvegarde de cet ajustement : `/opt/avosoma-backups/20261025-loot-height1-20261025T144007Z`. Un rechargement de la page est necessaire pour les sessions deja ouvertes.
