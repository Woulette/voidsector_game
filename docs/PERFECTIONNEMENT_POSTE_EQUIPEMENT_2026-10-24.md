# Perfectionnement — poste d’équipement

Le 24 octobre 2026, la proposition « Poste d’équipement » a été retenue pour remplacer le perfectionnement en pyramide.

## Présentation en jeu

- Quatre systèmes à gauche : lasers, roquettes, générateurs et drones, avec leurs réserves de bonus réelles.
- Système sélectionné au centre avec son illustration, son effet et son bonus actif.
- Trois matériaux compatibles sur une ligne : illustration, stock de soute et pourcentage du bonus.
- Commande fixe en bas : matériau et cible, quantité/Max, nombre de tirs ou durée, puis préparation du dépôt.
- Confirmation du dépôt existante et glisser-déposer conservés. La sélection et les quantités survivent au rafraîchissement habituel.

Les valeurs proviennent des données réelles ; les recettes, compatibilités, coûts, durées et validations serveur ne changent pas. Le raffinage en pyramide et les fonctions communes de sélection/quantité restent identiques au snapshot précédent. Le CSS ajouté cible uniquement les classes du perfectionnement.

## Validation

- 48 tests ciblés réussis : présentation, production, ressources autorisées, équilibre, synchronisation, boosts et dialogue de dépôt. Ils passent aussi sur la nouvelle capture de production après le changement externe de processus serveur.
- Contrôle de syntaxe JavaScript et des différences de fichiers.
- Rendu réel et gestionnaires d’entrée dans une fixture isolée : quatre systèmes, trois choix compatibles, réserves actives, Max, Noyau sur générateurs, confirmation du dépôt et soute vide.
- La commande interceptée après confirmation contient bien `Generateurs / noyau_astra / 20`. Aucun compte MMO ni matériau réel utilisé par cette fixture.
- À 1280 × 720 et 860 × 680, les commandes et tous les choix tiennent sans défilement. Repli à 600 × 680 contrôlé : quantité et dépôt visibles. Retour au raffinage vérifié en 5 / 3 / 2 / 1.
- Aucune image manquante ni erreur console dans le rendu testé.

Captures et mesures : `output/perfectionnement-poste-20261024/validation/`. Sources précédentes : `output/perfectionnement-poste-20261024/before/`.

## Livraison

Token de cache : `20261024-perfection-poste1`. Overlay limité à `src/game/ui/spawnRefineryPanel.js`, `src/styles/spawnRefinery.css`, `styles.css` et `index.html`. Les manifestes et preuves sont dans `output/perfectionnement-poste-20261024/release/`.

Publication vérifiée le 24 octobre 2026 à 16:00:18 CEST : quatre fichiers conformes par SHA-256 sur HTTPS, 130 cibles d’importmap accessibles et 278 aliases hors scope conservés. Sauvegarde : `/opt/avosoma-backups/20261024-perfection-poste1`. Le service déjà actif reste sur le PID 1074811, sans redémarrage par cette livraison ; PostgreSQL prêt et aucun nouvel avertissement ni erreur depuis la publication.
