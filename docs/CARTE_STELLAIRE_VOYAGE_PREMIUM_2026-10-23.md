# Carte stellaire et voyage automatique Premium

## Comportement

La grande carte reprend la proposition « Carte stellaire » validée le 23 octobre 2026 : 21 secteurs, quatre systèmes, CORE central, petites planètes, position actuelle cyan et connexions issues des vrais portails. Le panneau permet de sélectionner une destination et de consulter ses niveaux ennemis et ses voisins. La mini-carte et ses décors restent ceux de la version validée auparavant.

Un abonné Premium peut lancer « Voyage automatique ». Le serveur choisit un chemin en nombre de sauts, déplace le vaisseau à sa vitesse habituelle, rejoint chaque portail et attend les quatre secondes de transfert ordinaires. À l'arrivée dans le secteur demandé, le vaisseau s'arrête à la sortie du dernier portail. Le voyage ne contourne aucune porte fermée et n'entre pas dans les instances de progression.

Un ordre manuel de déplacement dans l'espace ou sur la mini-carte annule d'abord le voyage, puis applique la nouvelle destination. La collecte manuelle et les interactions de navigation rendent également les commandes au joueur. Déplacer ou redimensionner la mini-carte ne constitue pas un ordre de navigation. Un bouton « Arrêter » reste disponible dans le bandeau de voyage et dans la carte.

Le Premium est vérifié depuis le profil canonique serveur au départ et pendant le voyage. Les données reçues du client ne peuvent pas accorder cet avantage, changer la route, la vitesse, les coordonnées ou la map du voyage. Le client prédit seulement le mouvement pour l'affichage. Le serveur poursuit la simulation quand l'onglet est en arrière-plan. Une déconnexion, un décès, une expiration Premium, un changement de vaisseau, un changement de secteur inattendu ou un Portgun interrompent le trajet. Le voyage n'est pas repris après reconnexion.

Le mode de sélection Portgun reste distinct et conserve ses règles et ses coûts.

## Répartition du code

- `src/game/ui/combatMapPanel.js`, `sectorMapPresentation.js`, `src/styles/sectorMap.css` : présentation et commandes de la carte.
- `src/game/ui/sectorTravelHud.js` : bandeau de destination et arrêt.
- `src/game/systems/sectorAutoTravel.js` : intention, prédiction, arrêt immédiat et rejet des réponses tardives côté client.
- `src/multiplayer/sectorTravel.js` : connexion aux événements de voyage, sans multiplier les écouteurs après reconnexion.
- `server/src/travel/sectorTravelRoutes.js` : route sur le graphe des cartes existantes.
- `server/src/travel/sectorTravel.js` : abonnement, déplacement, attente au portail, transfert canonique, persistance et interruption.
- `server/src/socket/travelHandlers.js` : commandes authentifiées `travel:start` et `travel:cancel`.

Les coordinateurs existants branchent ces modules. L'animation automatique est un état d'affichage distinct : `combatFrameUpdate` ne décide jamais de la fin d'un saut automatique. Les coordonnées monde, les cartes, la parallaxe et les vitesses de base ne sont pas modifiées.

Le serveur émet `travel:state` au démarrage, à chaque étape, à la fin et au maximum toutes les 200 ms pendant le voyage. La révision et l'identifiant de requête évitent les reprises dues à des événements retardés. Le tick serveur reste de 50 ms. L'annulation de son propre voyage demeure possible si le limiteur de fréquence est atteint.

## Validation et aperçu

Les tests dédiés couvrent le Premium canonique, les routes et portes réelles, la vitesse et le ralentissement, l'attente de quatre secondes, les arrêts, la reprise manuelle et les états tardifs. Les tests d'intégration relient le gestionnaire serveur aux vrais modules client et aux transferts de session. Un test Socket.IO utilise des profils fictifs et un port local éphémère.

Aperçu visuel isolé : `http://127.0.0.1:8765/tmp/sector-autotravel-20261023/index.html`. Cet aperçu utilise le vrai rendu de carte et simule seulement son état de voyage ; il ne pilote aucun compte. Les tests réseau vérifient séparément le déplacement réel des modules.

Validation finale : 74/74 tests ciblés du lot et 40/40 tests client passent. Le contrôle serveur complet donne 1497/1498 réussites. Le seul échec, `profile-name-security.test.js:24`, recherche l'ancien balisage de profil dans `src/ui/render.js` ; ce test et ces fichiers de profil ne sont pas modifiés par ce lot. La présentation actuelle échappe les noms dans son module de profil dédié.

Un test supplémentaire reproduit les paquets de l'ancienne map reçus après l'arrivée. Une garde serveur temporaire maintient le secteur canonique jusqu'à l'acceptation d'un nouvel état client sur celui-ci, puis laisse les mouvements manuels ordinaires reprendre. Le test passe avec les vrais Socket.IO et après deux sauts.

Les résultats finaux et empreintes du lot sont conservés sous `output/sector-autotravel-2026-10-23/`, notamment `verification.json`, `feature-tests.log`, `client-tests.log` et `server-tests.log`.

## Conservation et publication

Les fichiers d'intégration client antérieurs au lot sont conservés avec leurs empreintes dans `output/sector-autotravel-2026-10-23/client-before/`. Les sources serveur antérieures sont conservées dans `server-before/` du même dossier. Ces copies incluent les changements locaux déjà présents au début de ce travail : elles ne remplacent pas le dépôt par une ancienne révision Git.

Pour un retour ciblé, comparer d'abord les empreintes finales du lot aux fichiers courants et préserver les éventuelles modifications ultérieures. Restaurer uniquement les fichiers de ce lot ; ne pas réinitialiser le checkout partagé.

La version `20261023-sector-travel1` a été publiée sur Avosoma le 23 octobre 2026 à 15:35:56 (heure de Paris), après autorisation explicite. Le lot comprend 8 fichiers serveur et 14 fichiers client. La sauvegarde distante est `/opt/avosoma-backups/20261023-sector-travel1`.

Le candidat a été construit sur les dernières sources de production afin de conserver les publications parallèles. Sur cette version assemblée, 74 tests de la fonctionnalité, 40 tests client et 79 tests de compatibilité passent. Les 22 empreintes installées, dont 14 servies en HTTPS, correspondent au candidat validé. Après redémarrage, `avosoma-beta.service` est actif, PostgreSQL est disponible et le nouveau processus ne produit aucune erreur au contrôle. Une connexion Socket.IO anonyme ne peut pas démarrer un voyage avec un faux Premium. Aucun trajet n'a été déclenché sur un compte réel pour les essais.

Les manifestes, journaux et contrôles publics sont conservés dans `output/sector-autotravel-2026-10-23/release/`, notamment `manifest.json`, `deployment-result.json`, `public-verification.json` et `validation/verification.json`.
