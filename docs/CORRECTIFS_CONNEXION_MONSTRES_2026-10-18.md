# Correctifs connexion et monstres — 18 octobre 2026

Publié sur Netcup le 18 octobre 2026 à 18 h 23, heure de Paris.
Version navigateur : `20261018-connection-enemies1`.

## Changements

- Une indisponibilité temporaire du service de comptes ne supprime plus la connexion mémorisée. Le joueur peut réessayer depuis l'interface existante. Le jeu reste bloqué tant que le serveur n'a pas validé le compte.
- Les sessions réellement expirées ou révoquées restent refusées et leur connexion mémorisée est supprimée. Le serveur distingue les erreurs de session dans `server/src/auth/sessionErrors.js` ; le client ne se base plus sur la simple présence du mot « session » dans un message.
- Les codes HTTP du service de comptes sont conservés pour distinguer une erreur temporaire d'un refus d'authentification. Le délai maximal de réponse couvre aussi la lecture du corps de la réponse.
- Socket.IO conserve WebSocket en priorité et peut essayer HTTP polling en cas d'échec grâce à `tryAllTransports: true`.
- La Pondeuse astrale créée par le serveur porte `requiresPlayerAttack: true`. Elle n'acquiert plus de cible par proximité et riposte lorsqu'un joueur tire sur elle.
- Un monstre sélectionné affiche son nom au-dessus du niveau et des barres de combat. Le rendu utilise aussi le champ `type` transmis par le serveur MMO.
- L'anti-AFK conserve ses seuils existants : statut AFK après cinq minutes et déconnexion de jeu après dix minutes. Cette déconnexion conserve le jeton du compte.

## Vérifications

- Suite serveur : **1 038 / 1 038**.
- Tests client sous `src` : **40 / 40**.
- Tests de régression ajoutés : connexion avec WebSocket indisponible, panne et délai du service de comptes, erreur HTTP 503, réponse malformée, session expirée ou révoquée, conservation du jeton après déconnexion AFK, Pondeuse passive puis riposte, affichage du nom sélectionné.
- Les tests de session traversent le client HTTP de comptes, le gestionnaire Socket.IO serveur et le vrai gestionnaire d'erreur du client multijoueur. Une erreur temporaire ne permet pas d'envoyer des actions de jeu authentifiées.
- Syntaxe des modules publiés : OK.
- Contrôles de cache actualisés. Les deux anciennes assertions de version placées dans le test du tutoriel raffinerie ont été retirées ; les vérifications du tutoriel restent présentes et la cohérence du cache est contrôlée dans les tests dédiés.
- Sur le serveur public : santé HTTP 200, PostgreSQL prêt, session de contrôle volontairement invalide refusée avec `AUTH_SESSION_INVALID`.
- Les 21 fichiers installés correspondent aux empreintes attendues ; les 17 fichiers publics modifiés ont également été comparés via HTTPS.
- L'onglet multijoueur existant a été rechargé et le profil a été repris depuis le serveur, sans erreur console observée après rechargement.
- Affichage vérifié visuellement dans un aperçu isolé utilisant la vraie fonction `drawEnemies` et l'image du jeu. La non-agression de la Pondeuse a été vérifiée avec le vrai générateur et l'IA serveur en test, sans manipuler un combat du joueur en production.

## Publication et retour arrière

- Service : `avosoma-beta.service`, actif, aucun redémarrage automatique constaté après publication.
- Publication limitée à 21 fichiers dont les versions précédentes ont été comparées à la production avant remplacement. Aucun déploiement global des autres modifications locales.
- Sauvegarde serveur : `/opt/avosoma-backups/connection-enemies-20261018`.
- Sauvegarde locale : `C:\Users\Ntmav\.codex\backups\voidsector_game\20261018-connection-enemies-before`.
- Archive, manifeste, différences de cette intervention et outils de retour arrière : `tmp/connection-enemies-release/` en local et `/tmp/avosoma-connection-enemies-20261018` sur le serveur.
- Aucun changement de configuration, de schéma de base ou d'équilibrage des récompenses.
