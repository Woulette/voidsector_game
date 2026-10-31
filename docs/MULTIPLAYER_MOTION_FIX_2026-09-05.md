# Synchronisation des monstres et des joueurs — 5 septembre 2026

Correctifs déployés sur Netcup le 5 septembre 2026 à 14 h 15, heure de Paris, après autorisation de l'utilisateur. Version navigateur : `20260905-motion3`.

Publication limitée à 29 fichiers dont les versions précédentes correspondaient à la référence locale. Sauvegarde de retour arrière : `/opt/avosoma-backups/motion3-20260905`. Les empreintes SHA-256 de l'archive, des fichiers installés et des 21 fichiers publics modifiés ont été vérifiées. Les 233 modules JavaScript parcourus publiquement répondent sans erreur HTTP et utilisent une seule instance du client multijoueur. Service `avosoma-beta.service` actif, PostgreSQL prêt, aucun redémarrage automatique après publication.

Deux comptes de démonstration sans privilèges, `BotAlpha` et `BotBeta`, effectuent une patrouille avec arrêts près du spawn d'Helion-01. Session demandée de dix minutes : de 14 h 18 min 41 s à 14 h 28 min 41 s, heure de Paris. Le processus dispose d'un arrêt automatique ; le mode de provisionnement de charge reste désactivé en production. Service temporaire : `avosoma-motion-demo-20260905.service`.

## Défauts reproduits et corrections

- Monstres : les positions étaient datées à leur réception. Les retards et rafales réseau déformaient donc leur vitesse. Les messages monde et instances portent maintenant une date serveur ; le client utilise la chronologie source, un tampon adaptatif et un lissage proportionnel au temps écoulé. Les anciennes positions sont ignorées et les réapparitions réinitialisent l'historique.
- Joueurs : la vitesse était dérivée du délai d'arrivée entre deux messages. Un déplacement à 300 unités/s pouvait être annoncé à 75 unités/s. Le serveur conserve maintenant la vitesse instantanée, bornée par ses statistiques de vitesse autorisées. La validation des positions reste indépendante et autoritaire.
- Arrêts : le premier message d'arrêt pouvait conserver une vitesse calculée à partir du trajet précédent. Il transmet maintenant immédiatement une vitesse nulle.
- Corrections de vie/bouclier : elles réappliquaient aussi une ancienne position locale. Les corrections purement vitales ne modifient plus le déplacement ou la visée ; une correction d'une autre carte ou d'un autre vaisseau est ignorée. Une position réellement invalide reste corrigée, même si les PV sont également invalides.
- Combat entre joueurs : les diffusions de PV ne fabriquent plus de nouvel instant de mouvement à partir d'une ancienne position.
- Reprise après interruption réseau : un écart normal entre messages n'est plus marqué automatiquement comme téléportation au-delà de 240 pixels. Le rattrapage visuel est limité en vitesse ; les vraies discontinuités restent traitées séparément.
- Limitation réseau : le débit soutenu reste limité à 30 messages de position par seconde et par socket. Un tampon de 60 messages autorise les rafales provoquées par un blocage temporaire du transport.
- Cache navigateur : les dépendances concernées utilisent `20260905-motion3`, avec une seule instance du module multijoueur.

## Mesures reproductibles

Ce sont des simulations locales et des connexions locales, pas une mesure de la connexion Internet des joueurs.

| Scénario | Avant correction | Après correction |
| --- | --- | --- |
| Monstre à 300 unités/s, paquets toutes les 100 ms, retards variables de 40 à 200 ms | vitesse affichée de 123 à 517 unités/s | 294,1 à 303,8 unités/s |
| Deux joueurs, arrêts, virages, pertes et blocage montant d'environ 900 ms, rendu à 60 FPS | rattrapage maximal de 75,48 pixels en une image | 7,50 pixels en une image |

Le scénario à deux joueurs passe également à 30 et 144 FPS : convergence finale à moins d'une unité, aucun faux reset de téléportation et aucune correction serveur imprévue. Les tests utilisent les vrais gestionnaires serveur, la validation de position, la limitation de débit et le rendu distant. Un autre test ouvre réellement deux connexions Socket.IO/WebSocket sur une adresse de boucle locale et traverse aussi l'émetteur client ; les déplacements et les arrêts parviennent aux deux clients.

## Vérifications

- `node --test server/test/motion-regressions.test.js server/test/two-player-motion.test.js` : 12/12.
- Suite serveur complète : 1 026/1 027. L'échec restant est `refinery storage tutorial locks improve then launch as separate clicks`, une attente de version de cache du tutoriel déjà en échec avant cette intervention, reproduite dans une copie de référence.
- Tests client sous `src` : 40/40.
- Syntaxe des fichiers modifiés et contrôle des espaces du diff : OK.

Les fichiers antérieurs ont été conservés sous `tmp/motion3-before`. La copie de comparaison est sous `tmp/motion3-baseline`. Les journaux de tests sont sous `tmp/motion3-*-tests.log`. Ces dossiers temporaires sont ignorés par Git.

Un trou de connexion produit nécessairement du retard : ces correctifs évitent les accélérations artificielles et les téléportations reproduites, sans promettre une synchronisation instantanée pendant une coupure. Les bots permettent maintenant à l'utilisateur de vérifier visuellement les déplacements dans une vraie session sur le site public.
