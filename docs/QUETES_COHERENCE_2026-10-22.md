# Quêtes — correction A02 du 22 octobre 2026

Périmètre : 36 contrats impossibles sur les quatre firmes, récupération ciblée des journaux anciens et abandon serveur. Ce lot ne renouvelle pas les quêtes journalières/hebdomadaires (A08 reste ouvert) et ne réinitialise aucun compte.

## Catalogue

Neuf familles sur les cartes 05 conservent leurs identifiants, niveaux requis, catégories, quantités et récompenses. Leurs cibles et récits utilisent maintenant les ennemis effectivement présents : Éclanites, Cristanites et Astranites. Les cartes restent Helion-05, Nereid-05, Aureon-05 et Sylva-05 selon la firme. Le contrat Astranites historique, déjà réalisable, est conservé.

Les générateurs réels contiennent 30 Éclanites, 16 Cristanites et 4 Astranites par carte 05. Les 180 objectifs mondiaux de destruction/récupération du catalogue ont maintenant une cible atteignable. Ce contrôle de faisabilité ne mesure pas le temps nécessaire en combat ni l'équilibrage des gains : les deux contrats normaux de niveau 18 restent proches.

## Journaux et abandon

`questCatalogRevision=1` ferme une seule fois les anciennes tentatives concernées sans récompense, supprime leurs compteurs devenus obsolètes et libère les places. Les autres quêtes, l'inventaire, les monnaies, le tutoriel et les récompenses déjà réclamées sont conservés. Un message « Contrats corrigés » est inscrit dans l'activité si des contrats actifs ont été retirés. Les contrats corrigés peuvent être repris au relais ; la révision empêche de les retirer à nouveau au prochain chargement.

La réparation est dans `server/src/quests/questCatalogMigration.js`, appliquée par le sanitize serveur et persistée au chargement des profils anciens concernés, même hors ligne. `src/shared/quests/catalogRevision.js` contient la version et les neuf identifiants source.

L'abandon est une action `quest:abandon {id}` dans le domaine `questAbandon.js`. Le serveur vérifie firme, quête active, récompense non reçue, authentification et limites de requêtes. Une sauvegarde réussie précède le profil canonique et la confirmation `quest:abandoned`. Une erreur de sauvegarde restaure l'état. Aucune récompense ni remboursement d'objet permanent n'est créé.

Les quatre missions nécessaires au tutoriel sont protégées tant que celui-ci est actif ou en pause. La quête de Ricky ne peut pas être abandonnée à l'intérieur de son portail. Les objets temporaires sont des compteurs de quête ; clés et fluides permanents restent acquis. Un identifiant de tentative serveur empêche un butin déjà au sol de faire progresser une nouvelle acceptation après abandon.

L'interface expose « Abandonner la quête » dans le détail du relais et l'onglet Info du journal, avec confirmation explicite. Le contrôleur n'efface aucun état local par anticipation : il attend le profil du serveur. Ce bouton est distinct de l'abandon définitif du tutoriel.

## Vérification

- 1 248 tests serveur et 40 tests client réussis ; contrôle indépendant de migration, abandon et butin.
- Les neuf familles sont acceptées, avancées avec les cibles réelles, terminées et récompensées une seule fois pour chacune des quatre firmes. Mauvaises cibles/cartes refusées.
- Migration de cinq contrats bloqués, conservation des données non concernées, idempotence et persistance hors ligne testées.
- Navigateur local isolé : annuler la confirmation conserve 5 quêtes et 2/5 ; confirmer libère une place, supprime la progression côté serveur ; réaccepter repart à zéro. Crédits/NOVA/récompenses inchangés. Captures et preuves dans `output/quest-a02-2026-10-22/`.
- Aucun combat manuel complet de chacun des 160 contrats n'est revendiqué.

## Publication

Publié le **22 octobre 2026 à 21:15:13 (Paris)** sous `20261022-quests1` : 23 fichiers installés et contrôlés, 13/13 contenus frontend vérifiés depuis l'URL publique. Serveur actif, PostgreSQL prêt, capacité 50, PID 2828173 et NRestarts=0 après redémarrage contrôlé. Page publique chargée dans un nouvel onglet sans erreur console ; cache et URL unique du client confirmés.

Les correspondances du tutoriel et du survol des bâtiments `20261022-helion-hover1`, publiées entre-temps dans l'autre chat, sont préservées. Sauvegarde de code : `/opt/avosoma-backups/20261022-quests1`. Inventaire privé de migration : `/opt/avosoma-account-backups/20261022-quests1.json` (0600). **Zéro profil et zéro acceptation bloqués concernés au moment de la publication** : aucune suppression de contrat n'a donc été nécessaire en production ; le mécanisme est installé pour les profils anciens restaurés ultérieurement.

Archive SHA-256 : `a9288c1aa1dcadc52454dbcfe03b114f3a92e54bcd6852bb4fdf38809697c61d`. Preuves de déploiement, comparaison publique et chargement navigateur dans `output/quest-coherence-2026-10-22/`. Les parcours interactifs d'abandon ont été testés en environnement local isolé, pas en modifiant le compte du joueur en production. Le dernier verrouillage de Garder/Échap pendant une requête a été vérifié par tests automatisés après le passage navigateur.
