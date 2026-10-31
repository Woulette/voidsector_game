# Avosoma — Sessions solo et accès Deadly, lot A06

## Règle validée par l’utilisateur

Tous les portails de progression de l’onglet PORTAILS sont solo. La seule exception actuelle est Deadly/Ricky, jouable seul ou en groupe. Le chef entre d’abord ; chaque membre rejoint avec J depuis sa porte et paie sa propre clé. Trois vies par personne : la troisième mort provoque la sortie de ce joueur. Une future exception coopérative nécessite une décision explicite du créateur.

## Correctif

- Les sessions solo sont indexées par compte dans un registre serveur distinct des groupes. Un non-chef peut lancer son portail ; plusieurs membres d’un groupe peuvent avoir chacun leur épreuve. Quitter un groupe, être exclu ou en créer un autre conserve la session solo.
- Les résolveurs de mouvement, collisions, combat, effets de compétence, vies et canaux réseau utilisent cette session. Deux propriétaires dans le même type de portail n’ont pas le même canal et ne partagent ni leur position de combat ni leurs participants/récompenses.
- Les rencontres Azuron, Vesper, Kharon, Ionis, Éclanite, Nox, Prismatique et Précurseurs continuent d’être mises à jour hors des groupes sociaux.
- Une reconnexion remplace l’identifiant de socket dans les participants et les vies. La fermeture d’un onglet launcher ne supprime pas le portail de son onglet de jeu. Les sessions restent en mémoire ; ce correctif n’ajoute pas de restauration d’une épreuve après redémarrage du service.
- Deadly vérifie la proximité de la porte de map 2 de la firme et les conditions d’accès existantes. La clé est enregistrée avant l’admission ; les requêtes répétées pendant la sauvegarde ne débitent pas deux fois. Un groupe/chef/position modifié pendant le paiement entraîne une restitution de la clé et un refus d’entrée.
- Reprendre après une mort ne coûte aucune nouvelle clé. Un joueur qui abandonne ou épuise ses vies est sorti sur sa map 1 ; il ne peut plus rejoindre cette même tentative. Les autres continuent. L’instance est libérée quand plus personne n’y participe. Une sortie de groupe ou exclusion d’un participant Deadly passe par ce même cycle de vie.
- Les cartes de progression affichent SOLO. Le message d’entrée ne présente plus systématiquement le portail comme une épreuve de groupe.

## Vérifications

- 61 tests serveur ciblés et 40 tests client réussis, également exécutés sur Linux avec une copie du runtime public et les dépendances de production, plus le seul correctif A06 : **101/101**. Les deux derniers cas vérifient la relance de Deadly après une victoire et le changement de chef pendant une entrée qui remplace une instance de test.
- Couverture : huit portails solo comme membre non-chef ; deux instances du même type dans un groupe ; départ, exclusion, création de groupe et reprise de socket ; combat après départ du groupe ; isolation des snapshots ; sauvegarde de clé, répétition, annulation et panne ; accès de Deadly et épuisement des vies dans les quatre firmes.
- Navigateur local, compte jetable : préparation d’Azuron, entrée avec J, navigation et progression des vagues. Aucun achat ni clé d’un vrai compte n’a été utilisé. Deux erreurs internes Electron sont présentes au chargement du navigateur intégré ; aucune erreur JavaScript de l’application n’a été relevée.
- Le contrôle global final du dossier partagé passe **1 361/1 361 tests serveur et 40/40 tests client**. Les trois échecs de poursuite d’ennemis observés lors d’un passage intermédiaire ne sont plus présents dans ce résultat final. Les fichiers d’IA correspondants ne sont pas inclus dans le correctif A06.
- Preuves : `output/portal-sessions-2026-10-23/targeted-tests.log`, captures `cartes-portails-solo.png` et `azuron-session-solo.png` ; contrôle global final dans `output/portal-sessions-followup-2026-10-23/server-tests-final.log`, validation Linux 101/101 dans `remote-candidate-tests.log`, empreintes finales 22/22 dans `final-installed-verification.json` du même dossier.

## Publication

`20261023-portals1` a été publié le 23 octobre à 12:22 Paris, puis le complément serveur `20261023-portals2` à 12:26 pour autoriser la relance de Deadly après une victoire. Le premier lot installe 22 fichiers runtime ; le complément modifie deux modules serveur et conserve l’index public identique. Les empreintes installées et publiques correspondent aux paquets.

Sauvegardes : `/opt/avosoma-backups/20261023-portals1` et `/opt/avosoma-backups/20261023-portals2`. Inventaires privés en permissions 0600 dans `/opt/avosoma-account-backups/` : aucun compte ne se trouvait dans un portail en production avant ces deux publications. Le service est actif, PostgreSQL prêt et aucun redémarrage inattendu n’a été relevé. Un contrôle préalable refuse le redémarrage si un compte a récemment sauvegardé une position dans un portail.
