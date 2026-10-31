# Raffinerie orbitale et matériaux stylisés

La présentation validée conserve l'arbre complet de fabrication, depuis les cinq minerais jusqu'au Noyau Astra : onze matériaux, six recettes et quatorze connexions permanentes avec leurs quantités. Sélectionner un matériau souligne ses ingrédients et ouvre le détail sous l'arbre. Stockage et Transport restent séparés de la chaîne.

Les onze illustrations utilisent un rendu de jeu vidéo stylisé approuvé après rejet d'une première exploration trop réaliste. Chaque fichier PNG indépendant dans `assets/materials/refinery-v2/` comporte un fond transparent et une marge autour de sa silhouette. Les fenêtres utilisent `object-fit: contain`, sans découpe de planche ni masque appliqué aux images. Le contrôle des pixels visibles (alpha supérieur à 16/255) confirme au moins 6,6 % de marge sur chaque bord des fichiers livrés.

Le hangar expose les vrais stocks, niveaux, chantiers et activations de production. Les quantités et connexions viennent des recettes existantes. Le bilan affiche explicitement des débits théoriques calculés à partir des niveaux et des consommations, sans historique inventé. L'expédition reste un transfert station vers soute : neuf matériaux admissibles, un seul trajet, capacités, coût, durée Premium et accélération existants.

En jeu, le raffinage utilise uniquement la soute du vaisseau. La recette choisie montre ses ingrédients, le maximum, la quantité obtenue et la place après fusion. Le perfectionnement conserve les quatre systèmes, leurs matériaux compatibles, leurs bonus temporaires en tirs ou en minutes et la confirmation de dépôt existante. Le glisser-déposer reste disponible. Catalyseur et Noyau Astra portent les mêmes noms dans les deux interfaces.

## Architecture

- `src/ui/renderRefinery.js` compose les vues du hangar.
- `src/ui/refineryPresentation.js` porte l'arbre et les fonctions de présentation.
- `src/ui/refineryHangarPanels.js` compose expédition et bilan.
- `src/ui/refineryDom.js` réconcilie le DOM pour conserver la saisie, le focus et le défilement pendant les actualisations.
- `src/game/ui/spawnRefineryPanel.js` porte le rendu et l'état temporaire des vues embarquées ; la façade `spawnPanel.js` conserve ses autres panneaux.
- `combatPanels.js`, `inputBindings.js` et `refineryActions.js` branchent les interactions sur les commandes existantes. Les choix visuels ne dépensent aucune ressource.

Les recettes, niveaux, prix, débits, réserves et règles serveur ne sont pas modifiés. Le catalogue client remplace seulement les chemins des onze illustrations. Version de cache : `20261023-refinery1`.

## Validation

Sur le runtime de production capturé puis complété par les seuls fichiers de cette version : 98 tests ciblés raffinerie, fabrication, commerce et perfectionnement ainsi que 38 tests client réussis. Les dix modules modifiés passent la vérification de syntaxe ; la fermeture des 110 modules nécessaires ne comporte aucun import manquant. Les 25 empreintes du candidat restent conformes après les tests.

La validation navigateur utilise des données locales isolées, sans compte de production : arbre onze nœuds/quatorze connexions, neuf matériaux expédiables, calculs de quantité/coût/durée/stock, recette indisponible désactivée et dépôt prérempli à la quantité choisie. Les onze images chargent, en `contain`, avec une silhouette entière.

Preuves locales : `output/refinery-redesign-20261023/validation/staged-tests.json`, `asset-verification.json`, `asset-generation.json` (prompts et provenance imagegen) et `release/manifest.json`. La maquette validée reste dans `tmp/refinery-concepts-20261023/`.

Publication effectuée le 23 octobre 2026 à 16 h 59 (Europe/Paris), version `20261023-refinery1`. Les 25 empreintes publiques et les 105 cibles de l'importmap sont conformes. `avosoma-beta.service` conserve le PID 3943270, sans redémarrage ; PostgreSQL est opérationnel. Sauvegarde : `/opt/avosoma-backups/20261023-refinery1`. Les dernières modifications concurrentes de `index.html` et `styles.css` ont été conservées en réappliquant uniquement les versions de cache de cette refonte avant installation. Preuves : `release/deployment-result.json` et `release/public-verification.json`.
