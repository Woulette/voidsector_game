# Inventaire des drones en cases individuelles

La correction remplace la liste groupée de la baie de drones par une grille d'inventaire similaire à celle des vaisseaux, conformément à la nouvelle demande du créateur.

- Chaque exemplaire disponible possède sa propre case, avec le vrai visuel du catalogue, son repère court et la couleur de rareté. Les doublons restent visibles séparément et conservent leur UID réel.
- Les objets déjà équipés sur un vaisseau ou un drone ne sont pas proposés comme disponibles. Un retrait remet l'objet dans la grille ; un équipement le retire de la grille après la réponse du serveur.
- Les filtres Tous, Lasers, Boucliers et Overdrive portent sur les objets libres compatibles. Les cases vides sont décoratives et ne constituent pas une limite de stockage.
- Le clic sélectionne directement une case et affiche une fiche unique sous la grille. Aucun groupe ni sous-liste d'exemplaires ne doit être ouvert. Le double clic et le bouton d'équipement ciblent le drone sélectionné ; Ctrl, glisser-déposer et vente conservent leurs contrôleurs existants.

Le correctif reste limité au rendu, à la projection et aux styles de cette page. Les règles d'achat, les statistiques, la progression, l'Overdrive et les commandes serveur ne changent pas. L'inventaire des vaisseaux sert de référence et reste inchangé.

Version frontend : `20261023-dronegrid1`. Preuves et contrôles : `output/drone-grid-correction-2026-10-23/`.

Validation : 48 tests ciblés passent sur les fichiers exacts du correctif et le dernier serveur canonique, dont 18 contrôles de présentation/intégration. Dans le navigateur privé, achat du troisième drone puis équipement d'un UID libre : 21 → 20 cases occupées ; retrait : 20 → 21, avec un seul exemplaire de l'UID revenu. Sélection Ctrl de deux cases et filtre Boucliers vérifiés. Un compte Premium avec 100 milliards de crédits et 93 modules libres conserve une grille avec défilement interne.

Tailles vérifiées avec la fiche ouverte : 1366 × 768, 1280 × 720, 1101 × 720, 1024 × 768 et 390 × 844. Sur les tailles desktop vérifiées, la hauteur du document reste celle du viewport, les panneaux ne débordent pas et les images sont chargées. La grille et sa fiche défilent dans leurs espaces ; sur tablette et mobile, la page retrouve son défilement normal.

Publié sur Netcup : sept fichiers frontend vérifiés par empreinte publique et seize aliases des modules modifiés contrôlés. PostgreSQL sain ; processus serveur 3849702 conservé, zéro redémarrage pendant cette publication. La sauvegarde est `/opt/avosoma-backups/20261023-dronegrid1`. Les changements concurrents HUD1 et M6craft sont préservés.

Contrôle public sur le compte existant : le laser MK-III installé apparaît sur le drone et le générateur A II libre dans une case de l'inventaire. Aucun équipement installé n'est affiché comme disponible. À 1912 × 897, la page tient dans le viewport et toutes les images sont chargées ; mesures conservées dans `public-grid-check.json`. Capture de référence sur compte privé de test : `grid-reference-selection.png`. Aucun achat ni changement d'équipement effectué en production pour ces contrôles.
