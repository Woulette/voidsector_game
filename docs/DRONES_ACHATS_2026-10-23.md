# Avosoma — Achats de drones, lot A04

Décision utilisateur : 8 drones standards maximum. Capacité totale conservée à 10 ; les deux places restantes sont réservées aux futurs drones spéciaux à fabriquer. Leurs noms, effets et recettes seront définis plus tard. Aucun drone spécial n'est attribué dans ce lot.

## Règles appliquées

- Le serveur relit son profil pour calculer le nombre détenu, le prix du prochain drone et l'attribution de exactement un drone. Les anciens champs client de quantité et de prix ne déterminent aucun de ces montants.
- Le client transmet l'identifiant et le prix affiché comme condition de fraîcheur. Si ce prix a changé, l'achat est refusé sans débit et le profil canonique est renvoyé. L'ancien `ownedCount` est seulement une condition de fraîcheur pour les clients encore ouverts.
- Le débit, le drone et le journal d'activité font partie de la même mutation persistée. La confirmation n'est envoyée qu'après sauvegarde. En cas d'échec, le mécanisme de restauration du profil s'applique.
- L'achat, la fabrication standard et l'attribution administrative respectent la limite de 8. Un ancien craft devenu redondant peut être clôturé et remboursé par le mécanisme A03.
- Le catalogue, le magasin et le hangar affichent la limite standard et la capacité totale séparément. Les propriétaires historiques de 9 ou 10 drones conservent leurs drones, modules et améliorations. Leur conversion éventuelle n'est pas décidée ici.

## Vérifications

- 1 293 tests serveur et 40 tests client réussis.
- Régressions : prix progressifs des huit achats, charge utile falsifiée, identifiant inconnu, prix périmé, deux sockets sur un compte, fonds insuffisants, échec de stockage, blocage du neuvième achat/craft, récupération du craft et conservation des équipements historiques.
- Navigateur sur serveur et compte locaux isolés : passage de 7 à 8 drones, débit de 25 600 000 crédits, achat désactivé, capacité 8/10 au hangar et conservation après rechargement/reconnexion.
- Preuves locales : `output/drone-purchases-2026-10-23/browser-purchase-proof.json`, `magasin-limite-8.png`, journaux de tests et manifeste du correctif.
- Publication `20261023-drones1` réussie le 23 octobre 2026 à 11:31 (Paris). Les 15 fichiers runtime installés correspondent au manifeste, les 9 fichiers publics correspondent à leurs empreintes et les caches du relais de quêtes sont conservés. Service actif, aucun redémarrage inattendu, PostgreSQL prêt, console publique sans erreur.
- Sauvegarde du code : `/opt/avosoma-backups/20261023-drones1`. Inventaire privé des chantiers et propriétaires historiques : `/opt/avosoma-account-backups/20261023-drones1.json`, permissions 0600. Aucun chantier actif/bloqué ni propriétaire de plus de 8 drones n'existait en production lors de la publication : la récupération et la conservation des anciens propriétaires ont donc été exercées sur des profils de test.
