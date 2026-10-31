# Helion-01 : ajustement de la planète

Publiée sur Netcup le **22 octobre 2026 à 18 h 12**, heure de Paris. Version navigateur : `20261022-helion-planet1`.

La taille de la planète passe de 1 560 à **1 380 unités**, soit environ **12 % de moins**. Son coefficient passe de 0,12 à **0,07**, soit un défilement environ **42 % plus lent**. Un déplacement de caméra de 1 000 unités la décale donc de 70 unités logiques au lieu de 120.

L'ancrage devient **(-10 560, 11 870)**. Au spawn, son centre apparent est décalé de **132 unités vers la droite** et **60 vers le bas**, quelle que soit la résolution ou le zoom. Le retrait de taille et cette légère translation renforcent son impression de distance.

L'ordre de profondeur reste cohérent : la source stellaire à 0,065 demeure derrière la planète, puis viennent les vestiges, les rochers et les voiles proches. La composition de la scène en dehors de la planète est identique à la version précédente, vérifiée par comparaison JSON dans l'aperçu.

Les tests existants vérifient le décalage vers le bas et la droite, le retrait modéré de taille et la présence de la planète après un trajet de **6 000 unités vers la droite** à plusieurs résolutions et zooms. La vérification visuelle et le film utilisent le moteur réel du décor, à une taille de vue correspondant à la capture du créateur. Aucun déplacement du compte multijoueur n'a été effectué pour cet aperçu.

Les modifications concernent uniquement la composition de Helion-01, dans `src/game/combatData/helionOneVisuals.js`, et ses assertions de régression. Aucun asset, renderer, autre map ou gameplay n'est modifié.

- Sauvegarde locale : `C:\Users\Ntmav\.codex\backups\voidsector_game\20261022-helion-planet-before`.
- Préparation et preuves : `tmp/helion-planet-release/`.
- Aperçu : [planète Helion-01](https://avosoma.absyrion.com/assets/maps/previews/helion01-planet1/index.html).

Les suites serveur **1 064 / 1 064**, client **40 / 40** et les vingt tests visuels passent. L'aperçu est enregistré en 1 880 × 950, au zoom de 78 %, sur un trajet horizontal de (-4 730, 3 650) à (1 270, 3 650). Le film H.264 de dix secondes fait **2 453 266 octets**. Les captures montrent l'avant et l'après au même emplacement, puis l'arrivée après 6 000 unités.

La publication porte sur six fichiers du client, dont cinq ne changent que leurs liens de cache, et cinq fichiers de démonstration. Les **11 fichiers publics** correspondent aux empreintes attendues. La vidéo est décodée sans erreur dans le navigateur et les requêtes Range répondent en 206. Le client public charge la nouvelle version jusqu'à son écran de connexion. Le serveur et PostgreSQL restent prêts, avec le même PID et aucun redémarrage.

La version précédente a été comparée et sauvegardée avant le remplacement atomique des fichiers ; l'index a été installé en dernier. Sauvegarde serveur : `/opt/avosoma-backups/helion-planet-20261022`.
