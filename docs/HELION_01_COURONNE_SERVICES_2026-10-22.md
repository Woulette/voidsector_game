# Hélion 01 — couronne, raffinerie et relais de quêtes

Le joueur retient la couronne parmi les quatre architectures de QG et demande d'ajouter une raffinerie et un relais de quêtes. Deux nouveaux sprites assortis sont créés et mis en situation avec la couronne retenue. La première livraison ci-dessous était un aperçu ; son intégration en jeu a ensuite été autorisée et publiée à 20 h 26 (voir la dernière section).

## Sources et style

- Dossier : `output/helion01-crown-services/2026-10-22/`.
- `headquarters.png` est une copie identique de `output/helion01-hub-alternatives/2026-10-22/02-couronne.png`.
- `refinery.png` : cuves de traitement, stockage, conduites, radiateurs et quai de livraison.
- `quest-relay.png` : module de contrôle et trois antennes paraboliques de tailles différentes.
- Les deux services sont générés avec l'outil imagegen intégré et la couronne comme référence de matériaux, couleur et lumière. Les fichiers `*-prompt.txt` conservent les prompts complets. Originaux de génération conservés dans le dossier Codex.
- Les trois PNG sont en RGBA, 1 254 × 1 254 pixels, alpha 0–255. Le métal est opaque ; les vides et le fond sont transparents.

## Composition proposée

Dans l'aperçu isolé `tmp/helion-crown-services1/preview.html`, utilisant le vrai renderer du décor :

| Bâtiment | Taille | Décalage X depuis le spawn | Décalage Y depuis le spawn |
| --- | --- | --- | --- |
| Couronne | 1 100 | 0 | −180 |
| Raffinerie | 460 | +920 | +140 |
| Relais de quêtes | 350 | +760 | −510 |

Les services sont côté intérieur de la map, décalés l'un de l'autre, avec l'ouverture de la couronne dégagée. Ce tableau décrit uniquement les propositions visuelles, pas des coordonnées de gameplay déployées. L'intégration ultérieure devra réconcilier les emplacements et interactions client/serveur avant de déplacer les services existants. Aucune nouvelle mécanique de raffinerie ni de quêtes n'est introduite ici.

Vue d'ensemble à 78 %, vaisseau de comparaison de 90 unités au spawn. Deux vues de détail à 125 % utilisent le même modèle de vaisseau, repositionné pour comparaison. Captures JPEG de 1 880 × 1 080 pixels. Les sources PNG sans décor sont également proposées pour distinguer clairement le bâtiment des épaves lointaines du fond.

## Galerie et contrôles

- Galerie : `assets/maps/previews/helion01-crown-services1/`.
- Galerie publiée : https://avosoma.absyrion.com/assets/maps/previews/helion01-crown-services1/index.html
- Les deux PNG et leurs prompts, trois captures et le HTML composent les huit nouveaux fichiers publiables. Les liens vers la source du QG réutilisent la galerie précédente pour éviter sa duplication distante.
- Métadonnées des images, dimensions des captures, références locales du HTML et syntaxe du script d'aperçu vérifiées. Contrôle visuel des trois bâtiments et des étiquettes à chaque échelle.
- Galerie inspectée à 390 pixels et 1 440 pixels, sans débordement horizontal ; les trois images chargent. Les PNG gardent leurs proportions sur mobile.
- Publication limitée à ce répertoire d'aperçus, avec vérification des empreintes et mécanisme de retour arrière. Aucun fichier de runtime, profil ou base de données dans le manifeste ; aucune commande de redémarrage.

Publication terminée le 22 octobre 2026 à 20 h 07 min 32 s (Paris). Huit fichiers vérifiés après installation puis par HTTPS, service actif et PostgreSQL prêt. Le navigateur public charge correctement l'aperçu et les deux PNG. Les preuves sont conservées dans `tmp/helion-crown-services1/` (`deploy.log`, `public-verification.json`, `public-gallery.jpg`, métadonnées et captures mobile/ordinateur). Le serveur local d'aperçu et les onglets de vérification ont été fermés ; la galerie publique reste ouverte comme résultat.

## Intégration en jeu publiée — 20 h 26

Sur demande explicite « push sa que j'ai les maj », les trois bâtiments remplacent les éléments provisoires d'Hélion-01 avec les tailles et positions validées : QG (-4300,3120), relais (-3540,2790), raffinerie (-3380,3440). Le spawn du joueur demeure (-4300,3300). Les autres secteurs et firmes conservent leur présentation.

- `src/shared/helionOneHub.js` installe la même configuration client/serveur après la création des quatre firmes. `spawnStations` fournit les positions au clic et au guidage du tutoriel ; `questStations` référence le même relais côté serveur. Les identifiants et fonctions existants sont conservés : `quests` pour les missions, `commerce` pour la vente de matériaux. Aucun nouveau mécanisme de raffinage.
- La protection du QG couvre le nouvel ensemble : rectangle X [-5000,-3000], Y [2500,3950], identique des deux côtés. Elle englobe les services déplacés à droite.
- `src/game/render/spawnHub.js` isole le rendu des bâtiments et conserve les anciens bâtiments pour les autres maps. Le nouveau hub est opaque, stable et accompagné de petits repères !/C et de noms. Le décor, les nuages, les limites et le parallax acceptés restent inchangés.
- Trois WebP sans perte sous `assets/spawn/helion01-crown-v1/`, 1254 × 1254 : 4 160 622 octets contre 6 195 631 pour les PNG. Comparaison pixel par pixel RGBA réussie ; sources PNG conservées. Les textures du hub sont chargées avec Hélion-01 par le cache de maps.
- Les templates de cartes sont clonés avant construction. Les imports avec des versions différentes ne peuvent ainsi recopier le hub Hélion dans les cartes des autres firmes.

Validation : six tests de régression du hub (clics, protection, serveur/client, guidage, autres firmes, textures et imports multiples), suite locale complète de 1 173 tests serveur et 40 tests client réussie, vérification syntaxique des JS publiés. Le navigateur utilise un contrôle isolé avec le vrai renderer et les vraies positions : les deux clics identifient respectivement `quests` et `commerce`, les trois images chargent et aucune erreur console n'est relevée. Il ne s'agit pas d'un parcours multijoueur manuel connecté en production. Capture : `tmp/helion-hub-live1/integration-overview.jpg`.

Publication ciblée `20261022-helion-hub1` : 35 fichiers, dont un backend et trois textures, avec sauvegarde `/opt/avosoma-backups/helion-hub-live1-20261022`. Les fichiers locaux avant modification ont été comparés à la production ; le précontrôle de publication refuse tout changement concurrent. Les autres travaux locaux, notamment les retours du tutoriel encore non publiés, sont exclus de ce lot. Les profils ne sont pas modifiés par le déploiement. Aucun commit ou push Git n'a été réalisé dans le checkout partagé.

Installation vérifiée par empreintes pour les 35 fichiers, puis HTTPS pour les 34 fichiers publics. Arrêt gracieux réussi, serveur redémarré à 20:26:05 et prêt à 20:26:06, PID 2778948, `NRestarts=0`, PostgreSQL disponible. Configuration du hub rechargée vérifiée par import serveur. Archive `avosoma-helion-hub-live1-20261022.tar.gz`, SHA256 `3e5bf2cc1b8cbe6d6a3ae7fe92b68a07d28b4f2d4d751b8b63c98a5df5897bbb`. Preuves, manifeste, patch limité à cette tâche et scripts de retour arrière sous `tmp/helion-hub-live1/`.

## Placement demandé sur capture — publié à 20 h 34

Le joueur demande la raffinerie dans le cercle bleu, en haut à gauche du QG, et le relais un peu plus haut. Version `20261022-helion-hub2` : raffinerie déplacée de (-3380,3440) à (-4920,2610), relais de (-3540,2790) à (-3540,2610), soit 180 unités plus haut. Taille, apparence et position du QG conservées.

Le cercle chevauche le bord gauche de la map : le centre de la raffinerie demeure 80 unités à l'intérieur du secteur, son image peut dépasser légèrement dans le vide. Les cibles des clics, les marqueurs et le guidage suivent automatiquement les mêmes positions. La protection est remontée à Y=2300, sans étendre la limite gauche au-delà de X=-5000 ; la radiation hors map reste inchangée.

31 tests ciblés réussis (hub, relais Hélion-05, guidage, validation des quêtes) et syntaxe JS vérifiée. Contrôle navigateur isolé avec une caméra proche de celle de la capture : clics `commerce` et `quests` reconnus aux nouveaux centres, aucune erreur console relevée. Capture dans `tmp/helion-hub-layout2/positions.jpg` ; aucun parcours connecté de production simulé.

Publication limitée à `src/shared/helionOneHub.js` et `index.html`. L'importmap renouvelle seulement la configuration du hub, y compris depuis les anciens imports en cache. Le précontrôle a arrêté une première tentative sans écriture en production : le checkout contenait déjà des modifications du tutoriel 3 préparées dans l'autre chat. Le HTML publiable a donc été reconstruit à partir du HTML de production avec uniquement les deux alias du hub et le numéro de chargement. Les modifications locales du tutoriel sont préservées dans le checkout mais exclues de ce paquet.

Deux empreintes vérifiées sur le serveur puis via HTTPS ; service et PostgreSQL disponibles après redémarrage, PID 2787974, `NRestarts=0`. Publication terminée le 22 octobre 2026 à 20:34:50 (Paris). Sauvegarde : `/opt/avosoma-backups/helion-hub-layout2-r2-20261022`. Archive SHA256 `489d765e61ce663754e5d3198bd698ca23021caccbb4586f46b81831f00b9f72`. Manifeste, patch et preuves dans `tmp/helion-hub-layout2/`. Aucun commit ou push Git dans le checkout partagé.

## Relais rapproché et noms au-dessus — publié à 20 h 43

Version `20261022-helion-hub3`, à la demande du joueur : relais déplacé de 120 unités vers la gauche, centre (-3660,2610) ; raffinerie conservée à (-4920,2610). Les marqueurs ! et C sont retirés. Les deux noms restent centrés et passent au-dessus des bâtiments, avec 28 unités de marge au-dessus de la boîte du sprite. Le QG et son nom sont inchangés.

Les clics restent portés par les bâtiments, sans cible invisible à l'ancien emplacement des badges. Configuration du relais toujours commune au serveur, au client et au guidage. 31 tests ciblés réussis, deux JS vérifiés avec `node --check` ; rendu et clics sur les deux bâtiments contrôlés dans le navigateur isolé, aucune erreur console relevée. Capture : `tmp/helion-hub-labels3/labels-above.jpg`.

Publication de trois fichiers seulement : `src/shared/helionOneHub.js`, `src/game/render/spawnHub.js` et `index.html`. Les alias d'importmap renouvellent les deux modules depuis leurs anciennes URL. Le HTML publié est construit sur le HTML réel de production pour conserver le tutoriel 3 qui vient d'être publié par l'autre chat, sans écraser les variantes locales. Pas de nouvelle texture ni de changement de taille.

Empreintes des trois fichiers vérifiées sur le serveur et par HTTPS, configuration serveur du relais rechargée vérifiée, service actif et PostgreSQL disponible. Publication terminée le 22 octobre 2026 à 20:43:12 (Paris), PID 2796801, `NRestarts=0`. Sauvegarde : `/opt/avosoma-backups/helion-hub-labels3-20261022`. Archive SHA256 `77e6ca4ba1e48fd3febf74b47ec928e94b1c4f8538d436984d43424364162352`. Preuves et manifeste sous `tmp/helion-hub-labels3/`. Ces contrôles ne constituent pas un parcours multijoueur manuel connecté ; aucun commit ou push Git n'a été fait dans le checkout partagé.

## Survol des services — 22 octobre 2026, 21:12 — publié

- Les noms de la raffinerie/commerce et du relais d’Hélion-01 ne sont plus permanents. Au survol : halo suivant la silhouette (ambre pour le commerce, bleu pour les quêtes), curseur main, nom centré au-dessus et indication « Cliquer pour ouvrir ». Apparition en 140 ms, retrait dès la sortie. Taille du texte conservée avec le zoom.
- Positions, sprites opaques, QG, planète et interactions existantes conservés. Aucun nouvel asset ni modification serveur. Le contrôleur reprend le hit-test des clics et reprojette avec la caméra courante. Les panneaux DOM, la minimap, les réglages, le verrouillage de mouvement, la perte de focus et l’arrêt de partie désactivent le survol.
- Le halo est construit une fois par texture/style dans un petit canevas puis réutilisé ; aucun flou par image. Aucun chiffre de gain FPS n’est avancé.
- Contrôles : 21 tests ciblés (survol, hub et guidage), syntaxe des 6 modules et chargement navigateur du graphe de combat réussis. Vue isolée utilisant le vrai renderer et le vrai hit-test : repos, commerce, quêtes, zoom 0,68/1,25, déplacement de caméra sous souris immobile, suppression du survol sur les contrôles ; aucune erreur console. L’essai brut d’import sous Node sans DOM échouait sur `window` dans le client existant ; vérification reprise dans le navigateur. Aucun compte joueur utilisé pour cette QA.
- Version publique `20261022-helion-hover1`, 7 fichiers ciblés. Sauvegarde : `/opt/avosoma-backups/helion-station-hover1-20261022`. Empreintes serveur et publiques HTTPS conformes, PostgreSQL disponible. PID 2796801 et compteur de redémarrages 0 inchangés. Les alias du tutoriel4 sont préservés. Publication directe contrôlée, sans commit/push Git du checkout partagé.
- Sources du lot, manifeste, patch, captures et preuve HTTPS : `tmp/helion-station-hover1/`. Captures : `idle.jpg`, `refinery-hover.jpg`, `relay-hover.jpg`. La QA utilise le rendu isolé du jeu, pas une session MMO connectée.
