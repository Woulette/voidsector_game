# Transfert entre maps — 18 octobre 2026

Publié sur Netcup à 18 h 41, heure de Paris.
Version navigateur : `20261018-map-transfer1`.

## Problème et correction

Le joueur signale que l'animation du portail va jusqu'au bout mais qu'il reste parfois sur la map de départ. Trois situations ont été reproduites dans le code de production avant modification :

- La branche d'animation de quatre secondes quittait la boucle avant l'envoi de l'état du joueur. Le serveur pouvait continuer l'ancien ordre de déplacement pendant ce silence. L'arrêt est désormais envoyé immédiatement de façon fiable, suivi d'un signal d'état à faible fréquence pendant l'animation, puis d'un envoi immédiat de l'arrivée. Le maintien du déplacement à la souris est également relâché au début du transfert.
- Un état reçu avec `pageHidden: true` était réécrit sur la map précédente, même s'il demandait un vrai transfert. Les arrêts de transfert et changements de map passent maintenant par la validation habituelle du serveur, y compris en arrière-plan.
- Une correction de position produite avant la demande de transfert pouvait recharger la map de départ. Le client ignore uniquement une correction de cette map dont le numéro de séquence prouve qu'elle précède la demande, sur la même connexion. Un refus correspondant à la demande actuelle, une correction sans preuve de séquence et une mort restent traités.

L'envoi immédiat écarte un ancien état encore en attente de regroupement et conserve des horodatages strictement croissants. Les intervalles habituels de synchronisation en jeu restent couverts par les tests existants.

Le trajet précis du signalement n'a pas été observé en direct. Les cas reproduits correspondent au symptôme décrit ; ils ne permettent pas d'affirmer qu'ils expliquent tous les incidents possibles.

## Vérifications

- Six tests de régression dans `server/test/map-transfer-reliability.test.js`, exécutant les vrais gestionnaires client et serveur.
- Les 68 liaisons de portails ordinaires déclarées par les maps, pour les quatre firmes et CORE, restent validées lorsque l'onglet est masqué.
- Une demande de transfert faite loin du portail reste refusée par le serveur, avec correction de position.
- L'animation envoie un arrêt fiable, un signal d'état à faible fréquence et l'arrivée immédiate ; un ancien état regroupé ne peut pas remplacer celle-ci.
- Les corrections antérieures, les refus actuels, les corrections sans séquence, la mort et le changement de connexion sont couverts.
- Suite serveur : **1 044 / 1 044** ; suite client sous `src` : **40 / 40**.
- Syntaxe des modules publiés et du nouveau test : OK.
- Les 19 fichiers installés correspondent au manifeste ; les 18 fichiers publics modifiés ont aussi été comparés via HTTPS.
- Santé publique HTTP 200 ; PostgreSQL prêt. Service `avosoma-beta.service` actif, aucun redémarrage automatique constaté lors de la publication.
- L'onglet réel du jeu a été rechargé ; reprise du personnage depuis le serveur constatée, sans erreur console observée. Aucun passage de portail n'a été effectué avec le personnage du joueur pendant cette vérification en production.

## Publication et retour arrière

- Modifications fonctionnelles limitées à la synchronisation du transfert : `src/game/systems/combatFrameUpdate.js`, `src/multiplayer/combatCommands.js`, `src/multiplayer/playerSocketListeners.js`, `server/src/socket/playerHandlers.js`.
- Les autres fichiers publiés actualisent les versions d'import pour charger ces modules ensemble.
- Les versions de production des 19 fichiers ont été comparées à la sauvegarde locale avant remplacement. Les autres modifications du répertoire de travail ne font pas partie de cette publication.
- Sauvegarde serveur : `/opt/avosoma-backups/map-transfer-20261018`.
- Sauvegarde locale : `C:\Users\Ntmav\.codex\backups\voidsector_game\20261018-map-transfer-before`.
- Archive, manifeste, différences ciblées, résultats des tests et capture de reprise : `tmp/map-transfer-release/` en local ; outils de retour arrière : `/tmp/avosoma-map-transfer-20261018` sur le serveur.
- Aucun changement des visuels, réglages graphiques, assets, récompenses ou données de profil.

## Suite souhaitée par le créateur

Discuter ensuite du rendu et du coût des maps. Les maps portant le même numéro dans les quatre firmes doivent partager leur contenu caractéristique, dont l'ISS sur les maps 02, avec des couleurs propres à chaque firme. Cette refonte visuelle n'a pas commencé dans ce correctif.
