# Raffinerie entière dans la fenêtre — 25 octobre 2026

Cette première correction est historique. Elle a été remplacée à 14 h 49 par `20261025-orbital-fluid1`, après le signalement des bandes latérales : la scène utilise maintenant toute la largeur et les machines sont disposées séparément. Voir `docs/RAFFINERIE_LARGEUR_2026-10-25.md` pour la correction finale et ses preuves.

Après la publication de la station orbitale, l’utilisateur a signalé que le panneau complet ne pouvait pas être vu d’un seul bloc en bas de page. La navigation Avosoma peut sortir de la fenêtre pendant le défilement ; la priorité est de garder ensemble le titre de raffinerie, les stocks, la station, sa recette et ses commandes.

## Diagnostic vérifié

Une fixture neutre chargeant les fichiers publics a reproduit le problème : à une fenêtre de 1 920 × 948 px, le panneau mesurait environ 1 138 à 1 141 px. Tout en bas, son sommet se retrouvait environ 206 à 209 px au-dessus de l’écran. Le défilement atteignait bien sa limite ; le panneau lui-même était trop haut.

La hauteur de l’illustration dépendait uniquement de sa largeur. Les sources publiques du module et du style ont été comparées aux sources locales avant modification ; leurs empreintes figurent dans `output/refinery-viewport-fit-20261025/public-baseline.json`. Les sources antérieures sont conservées dans `before/` du même dossier.

## Correction

- Au-dessus de 900 px de largeur, le panneau utilise la hauteur disponible de la fenêtre, avec une marge de 12 px en haut et en bas, et un plafond de 1 120 px pour les grands écrans.
- Le titre, les stocks et les commandes conservent leurs tailles de police. La grille réserve leur hauteur réelle, y compris les recettes et les chantiers, puis donne l’espace restant à la scène.
- Un conteneur de scène dédié centre l’illustration et la réduit proportionnellement. L’image, les zones cliquables, les quatre coins et les flèches gardent le même repère ; aucune partie de la station n’est rognée.
- Les étiquettes s’adaptent à la largeur réelle de la scène pour éviter les chevauchements lorsque la fenêtre est moins haute.
- Les petits écrans conservent la présentation mobile et son défilement naturel. Les onglets Expédition et Bilan conservent leur présentation existante.

Sources : `src/ui/refineryOrbitalStation.js`, `src/styles/refineryOrbital.css`, références de cache dans `styles.css` et `index.html`. Cache du correctif : `20261025-orbital-fit1`. L’illustration, les stocks, les recettes et les validations serveur ne sont pas modifiés.

## Validation

42 tests ciblés réussis localement et sur le candidat construit à partir du runtime en ligne. Les contrôles navigateur comprennent 30 rendus sur six formats et cinq profils, puis 20 contrôles de défilement sur dix formats de 390 × 844 à 1 920 × 1 440, avec sélection du Cuivre et du Noyau Astra.

Sur les huit formats de bureau testés, le panneau complet et les commandes restent dans la fenêtre au bas de la page. Les proportions de l’image, la concordance de la scène et de l’image, l’absence de débordement horizontal et de chevauchement d’étiquettes sont contrôlées. Les deux formats mobiles sont vérifiés en conservant leur défilement naturel. La sélection, les commandes, les expéditions et les rafraîchissements sont testés avec un profil synthétique et des commandes neutralisées ; cela ne constitue pas une session MMO authentifiée.

Les mêmes contrôles ont été appliqués au candidat gelé puis aux fichiers publics après publication. Preuves : `output/refinery-viewport-fit-20261025/`, notamment `local-scroll-verification.json`, `candidate-scroll-verification.json`, `public-scroll-verification.json`, `release/candidate-browser/` et `release/public-browser/`. Les captures `public-1920x948.png` et `public-1366x768.png` montrent la fenêtre au bas de la page.

## Publication

Publié le 25 octobre 2026 à 14 h 05 (Paris) sur https://avosoma.absyrion.com/, cache `20261025-orbital-fit1`. Quatre fichiers publiés avec index en dernier ; quatre empreintes HTTPS conformes et 554 fichiers sources contrôlés hors livraison préservés. Sauvegarde : `/opt/avosoma-backups/20261025-orbital-fit1-130202`. Service actif avec le même PID `2362785`, aucun redémarrage, PostgreSQL prêt, aucune écriture en attente ni nouveau journal d’erreur au contrôle final.

Résultats détaillés : `output/refinery-viewport-fit-20261025/release/publish-result.json`, `verify-result.json` et `public-verification.json`.
