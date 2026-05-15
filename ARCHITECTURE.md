# VoidSector - Architecture

## Entree
- `index.html` : structure HTML de l'interface.
- `game.js` : point d'entree JavaScript, importe `src/app.js`.
- `styles.css` : point d'entree CSS qui importe les sections ci-dessous.
- `src/styles/base.css` : structure globale, topbar, cartes et panneaux de base.
- `src/styles/game.css` : HUD et ecran de combat.
- `src/styles/hangar.css` : pages, inventaire, slots et hangar.
- `src/styles/shop.css` : magasin.
- `src/styles/systems.css` : drones, parametres, classement, quetes et raffinage.

## Donnees
- `src/data/catalog.js` : facade de reexport + etat local par defaut.
- `src/data/ships.js` : vaisseaux et stats de slots.
- `src/data/equipment.js` : lasers, generateurs, extras, drones et munitions.
- `src/data/progression.js` : portails, competences, materiaux, raffinage, quetes et textes de pages.
- `src/data/ranks.js` : table des grades, regles de score, calculs de progression et pilotes fictifs du classement local.

## Etat et sauvegarde
- `src/core/store.js` : etat joueur, inventaire, loadouts, economie, quetes, raffinage, stats et sauvegarde localStorage.
- `src/core/keybinds.js` : touches personnalisables des slots 1 a 9.
- `src/core/utils.js` : helpers generiques.

## Interface
- `src/ui/render.js` : orchestration UI et rendu hangar.
- `src/ui/renderShop.js` : rendu du magasin.
- `src/ui/renderProgression.js` : rendu des portails, competences et classement.
- `src/ui/renderShared.js` : petits helpers de rendu partages.
- `src/ui/toast.js` : notifications.

## Combat
- `src/game/combat.js` : orchestration combat, etat de partie, collisions, tirs laser, roquettes, safe zones, portails et panneaux in-game.
- `src/game/combatAssets.js` : prechargement des images de combat.
- `src/game/combatData.js` : maps, types d'ennemis, constantes de combat et profils visuels de reacteurs.
- `src/game/systems/` : logique combat reutilisable, boucle de frame, mouvement joueur/camera, cycle de vie joueur, IA ennemie, armes, robot reparateur, recompenses/loot, generation de map, portails et projectiles.
- `src/game/ui/` : rendu DOM du combat, HUD, action bar, panneau rapide, panneaux de spawn et branchement des controles.
- `src/game/render/` : rendu canvas specialise, monde, joueur, ennemis, projectiles, minimap et textes de degats.

## Notes de decoupage
- Les fichiers de donnees statiques doivent rester hors des gros modules de logique.
- Les nouveaux catalogues ou tables doivent aller dans `src/data/`.
- Les nouvelles mecaniques de combat doivent eviter d'ajouter de grosses tables dans `combat.js`; preferer `combatData.js` ou un module dedie.
- Les fonctions exportees depuis `store.js` restent l'API centrale utilisee par l'UI et le combat.

## Passation refactor prochain chat

### Etat actuel important
- La branche `main` est propre et poussee sur GitHub apres le commit `e96d1b8 Remove temporary generated files from repo`.
- `tmp/` est ignore dans `.gitignore`. Ne pas le re-ajouter : il contient des captures, profils Edge et assets generes temporaires.
- La raffinerie est fonctionnelle avec production toutes les 30 secondes, upgrades temporises, expedition vers la soute du vaisseau, paiement NOVA pour terminer, stats de production/consommation et boutons ON/OFF par materiau.
- Les materiaux de base recoltables sont les 5 premiers : cuivre, zinc, nickel, titane, silice. Les autres sont fabriques par la raffinerie et ne doivent pas etre recoltes directement sur la map.
- Les nouveaux SVG materiaux sont dans `assets/materials/`. Les anciens placeholders `alliage.svg`, `cristal.svg`, `noyau.svg`, `cargo_box.svg` existent encore mais ne doivent plus etre utilises par le catalogue principal.
- Les assets actuellement references par les vaisseaux, ennemis et cartes ont ete verifies comme existants apres le nettoyage.

### Gros fichiers constates
- `src/core/store.js` environ 64 Ko : trop de responsabilites dans un seul fichier.
- `src/game/combat.js` environ 52 Ko : orchestration combat + etat + interactions.
- `src/styles/systems.css` environ 52 Ko : beaucoup de CSS systemes, surtout raffinerie.
- `src/ui/renderProgression.js` environ 28 Ko : portails, skills, raffinerie, expedition, stats, leaderboard dans un seul module.
- Les plus gros fichiers du depot sont surtout des images PNG/JPG/WebP de vaisseaux, planetes et equipements. Ce n'est pas du code inutile, mais il faudra plus tard optimiser les images si le poids Vercel devient un probleme.

### Priorite de rearchitecture recommandee
1. Extraire la logique raffinerie de `src/core/store.js`.
   - Nouveau module conseille : `src/core/refineryStore.js`.
   - Y deplacer les constantes `REFINERY_*`, les fonctions de niveaux, production, stockage, modules, upgrades, expedition, rush NOVA et tick de production.
   - Garder `store` dans `store.js` comme source d'etat centrale.
   - Re-exporter depuis `store.js` au debut pour eviter de modifier toute l'UI d'un coup.

2. Extraire le rendu raffinerie de `src/ui/renderProgression.js`.
   - Nouveau module conseille : `src/ui/renderRefinery.js`.
   - Y deplacer `renderRefinery()` et ses helpers internes : positions des nodes, `durationText`, stats table, expedition page, popover upgrade, cartes modules.
   - `renderProgression.js` doit garder portails, skills, leaderboard seulement, ou etre lui aussi separe ensuite.
   - Mettre a jour `src/ui/render.js` si necessaire pour importer `renderRefinery` depuis le nouveau fichier.

3. Extraire le CSS raffinerie de `src/styles/systems.css`.
   - Nouveau fichier conseille : `src/styles/refinery.css`.
   - Y deplacer toutes les classes `sky-refinery`, `sky-stock`, `sky-shipment`, `sky-stats`, `sky-map`, `sky-flow`, `sky-node`, `sky-utility-node`, `sky-upgrade`.
   - Ajouter l'import dans `styles.css`.
   - Ne pas changer les noms de classes pendant ce premier decoupage : objectif zero changement visuel.

4. Decouper `src/game/combat.js` seulement apres la raffinerie.
   - Cible conseillee : isoler la collecte cargo/materiaux au sol dans `src/game/systems/groundMaterials.js`.
   - Garder `createCombatGame()` comme facade publique.
   - Attention : `inputBindings.js`, `entities.js`, `hud.js` et `rewards.js` touchent deja au cargo, donc decouper petit a petit.

### Regles pour ne pas casser le jeu
- Faire un refactor mecanique par etape, puis tester avec `node --check` sur les fichiers touches.
- Ne pas melanger refactor et changement gameplay dans le meme commit.
- Ne pas renommer les IDs de materiaux : ils sont sauvegardes dans `localStorage`, dans la soute vaisseau et dans les recettes.
- Ne pas changer les noms de fonctions exportees depuis `store.js` tant que les imports UI/combat n'ont pas ete migres.
- Ne pas supprimer des assets parce qu'ils semblent vieux sans verifier les references dans `src/data/`, `src/game/`, `index.html` et CSS.
- Ne pas commit `tmp/`, `.vercel/`, `node_modules/` ou des profils navigateur.

### Commandes utiles
```powershell
git status --short --branch
node --check src/core/store.js
node --check src/ui/renderProgression.js
node --check src/app.js
git ls-files tmp
Get-ChildItem -Recurse -File src | Sort-Object Length -Descending | Select-Object -First 25 @{Name='KB';Expression={[math]::Round($_.Length/1KB,1)}}, FullName
```

### Suggestion de commits
- `Refactor refinery store module`
- `Move refinery rendering to dedicated UI module`
- `Move refinery styles to dedicated stylesheet`
- `Extract ground material collection system`
