# Raffinerie dans le cadre centré — 24 octobre 2026

Après le passage du tableau de bord à 1 440 px, la raffinerie gardait un arbre de 680 px de haut, des modules avec de grandes illustrations et deux rangées de stocks. Avec les améliorations en cours de la capture utilisateur, la page atteignait 1 279 px de haut à 1 920 × 946.

La correction reste dans les règles `#dashboard .refinery-panel` de `dashboardComfort.css` :

- Bandeau en grille ; Stockage et Transport redimensionnés, y compris leurs minuteries.
- Onze stocks sur une ligne à partir de 1 200 px ; six, quatre ou trois colonnes sur les fenêtres plus étroites.
- Arbre de 540 px, cartes de 100 px, commandes d’au moins 24 px et proportions cohérentes des textes et illustrations.
- Largeur minimale de l’arbre ramenée à 1 120 px ; son défilement reste interne sur petit écran.
- Les positions en pourcentage et la géométrie des liaisons continuent d’utiliser les modules de rendu publiés.

La page de référence atteint désormais 954 px de haut. Les onze matériaux et les quatorze liaisons restent dans l’arbre ; la légende est visible à 1 920 × 946. Les règles de fabrication et les profils ne sont pas modifiés.

## Validation

- 36 tests existants réussis localement, puis 36 sur le candidat construit depuis la production : présentation, production, synchronisation, périmètre des matériaux et règles d’équilibrage.
- 72 contrôles de rendu : trois profils synthétiques (améliorations en cours, nouvelle station, niveaux avancés), trois onglets, huit formats (1 920 × 946, 1 745 × 861, 1 366 × 768, 1 200 × 800, 1 199 × 800, 1 024 × 768, 768 × 1 024, 390 × 844).
- Aucun débordement de page, texte coupé, chevauchement de cartes ou nœud sorti du diagramme ; les quatorze liaisons rejoignent leurs cartes à moins de deux pixels.
- Quinze fenêtres d’amélioration ouvertes puis fermées : les cinq chantiers de référence sur trois formats, sans fenêtre sortie de l’écran ni débordement horizontal.
- Trois onglets revérifiés avec les styles servis par HTTPS après publication ; console du navigateur sans erreur ni avertissement.
- Le profil de test reprend les quantités et les chantiers visibles sur la capture, sans accès ni écriture dans le compte du joueur.

## Publication

`20261024-comfort2` : trois fichiers frontend, `src/styles/dashboardComfort.css`, sa référence dans `styles.css` et le lien CSS de `index.html`. Les autres imports et modifications des chats sont conservés. Les trois empreintes publiques correspondent au candidat.

Service actif, PID 928637 conservé, `NRestarts=0`, PostgreSQL prêt, aucune nouvelle erreur depuis la publication. Sauvegarde : `/opt/avosoma-backups/20261024-comfort2`.

Preuves : `output/refinery-confort-2026-10-24/` (`before.json`, `avant.jpg`, `browser-verification.json`, `raffinerie-publiee.jpg`, `manifest.json`, `validate.log`, `final-verification.json`).
