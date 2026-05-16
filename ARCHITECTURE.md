# VoidSector - Architecture

## Entree
- `index.html` : structure HTML de l'interface.
- `game.js` : point d'entree JavaScript, importe `src/app.js`.
- `styles.css` : point d'entree CSS qui importe les sections ci-dessous.
- `src/styles/base.css` : structure globale, topbar, cartes et panneaux de base.
- `src/styles/game.css` : HUD et ecran de combat.
- `src/styles/hangar.css` : pages, inventaire, slots et hangar.
- `src/styles/shop.css` : magasin.
- `src/styles/drones.css` : onglets hangar et section drones.
- `src/styles/settings.css` : overrides hangar detail et parametres de touches.
- `src/styles/refinery.css` : raffinerie, expedition, stats et upgrades.
- `src/styles/spawnRefinery.css` : ancien panneau raffinerie accessible depuis les stations de spawn en combat.
- `src/styles/leaderboard.css` : classement et table des grades.
- `src/styles/quests.css` : panneaux de spawn et quetes.
- `src/styles/systems.css` : reserve pour futurs styles systemes partages.

## Donnees
- `src/data/catalog.js` : facade de reexport + etat local par defaut.
- `src/data/ships.js` : vaisseaux et stats de slots.
- `src/data/equipment.js` : lasers, generateurs, extras, drones et munitions.
- `src/data/progression.js` : portails, competences, materiaux, raffinage, quetes et textes de pages.
- `src/data/ranks.js` : table des grades, regles de score, calculs de progression et pilotes fictifs du classement local.

## Etat et sauvegarde
- `src/core/store.js` : facade centrale, etat joueur, inventaire, loadouts, economie, quetes, stats et sauvegarde localStorage.
- `src/core/cargoStore.js` : materiaux, stockage global, soute vaisseau et capacites cargo.
- `src/core/equipmentStore.js` : inventaire, munitions, action slots, loadouts vaisseau/drone et upgrades equipement.
- `src/core/refineryStore.js` : raffinerie, production, modules, upgrades temporises, expedition et rush NOVA.
- `src/core/refineryJobStore.js` : ancien job de raffinage simple des recettes de spawn.
- `src/core/questStore.js` : quetes actives, progression, validation et recompenses.
- `src/core/skillStore.js` : branches de competences, upgrades et bonus.
- `src/core/rankStore.js` : score de rang, progression et leaderboard local.
- `src/core/keybinds.js` : touches personnalisables des slots 1 a 9.
- `src/core/utils.js` : helpers generiques.

## Interface
- `src/ui/render.js` : orchestration UI et rendu hangar.
- `src/ui/renderShop.js` : rendu du magasin.
- `src/ui/renderProgression.js` : facade de reexport progression.
- `src/ui/renderPortals.js` : rendu des portails.
- `src/ui/renderSkills.js` : rendu des competences.
- `src/ui/renderLeaderboard.js` : rendu du classement.
- `src/ui/renderRefinery.js` : rendu de la raffinerie.
- `src/ui/renderShared.js` : petits helpers de rendu partages.
- `src/ui/toast.js` : notifications.

## Combat
- `src/game/combat.js` : orchestration combat, etat de partie, collisions, tirs laser, roquettes, safe zones, portails et panneaux in-game.
- `src/game/combatAssets.js` : prechargement des images de combat.
- `src/game/combatData.js` : maps, types d'ennemis, constantes de combat et profils visuels de reacteurs.
- `src/game/systems/` : logique combat reutilisable, beams laser, boucle de frame, mouvement joueur/camera, cycle de vie joueur, IA ennemie, armes, robot reparateur, recompenses/loot, cargo, generation de map, portails, projectiles et materiaux au sol.
- `src/game/ui/` : rendu DOM du combat, HUD, action bar, actions rapides, panneau rapide, panneaux de spawn, panneaux utilitaires combat et branchement des controles.
- `src/game/render/` : rendu canvas specialise, monde, joueur, ennemis, projectiles, minimap et textes de degats.

## Notes de decoupage
- Les fichiers de donnees statiques doivent rester hors des gros modules de logique.
- Les nouveaux catalogues ou tables doivent aller dans `src/data/`.
- Les nouvelles mecaniques de combat doivent eviter d'ajouter de grosses tables dans `combat.js`; preferer `combatData.js` ou un module dedie.
- Les fonctions exportees depuis `store.js` restent l'API centrale utilisee par l'UI et le combat.

## Passation refactor prochain chat

### Etat actuel important
- Le refactor raffinerie/cargo/UI/CSS est en cours en local et pas encore commit.
- La branche etait propre avant ce refactor, apres le commit `26e9e51 Document refactor handoff`.
- `tmp/` est ignore dans `.gitignore`. Ne pas le re-ajouter : il contient des captures, profils Edge et assets generes temporaires.
- La raffinerie est fonctionnelle avec production toutes les 30 secondes, upgrades temporises, expedition vers la soute du vaisseau, paiement NOVA pour terminer, stats de production/consommation et boutons ON/OFF par materiau.
- Les materiaux de base recoltables sont les 5 premiers : cuivre, zinc, nickel, titane, silice. Les autres sont fabriques par la raffinerie et ne doivent pas etre recoltes directement sur la map.
- Les anciens `unlockLevel` du shop ont ete supprimes des catalogues : le magasin n'a plus de verrou de niveau.
- Les nouveaux SVG materiaux sont dans `assets/materials/`. Les anciens placeholders `alliage.svg`, `cristal.svg`, `noyau.svg`, `cargo_box.svg` existent encore mais ne doivent plus etre utilises par le catalogue principal.
- Les assets actuellement references par les vaisseaux, ennemis et cartes ont ete verifies comme existants apres le nettoyage.

### Gros fichiers constates
- `src/core/store.js` environ 25 Ko : reste la facade centrale + normalisation/sauvegarde + stats vaisseau.
- `src/core/refineryStore.js` environ 24 Ko : logique raffinerie dediee, production, upgrades et expedition.
- `src/core/refineryJobStore.js` environ 1 Ko : ancien job de raffinage simple.
- `src/core/equipmentStore.js` environ 9 Ko : inventaire/loadouts/action slots.
- `src/game/combat.js` environ 35 Ko : orchestration combat + etat + interactions, encore a decouper.
- `src/game/systems/combatBeams.js` environ 1 Ko : effets visuels des faisceaux laser instantanes.
- `src/game/systems/combatCargo.js` environ 5 Ko : collecte cargo, materiaux au sol et destinations de collecte.
- `src/game/ui/combatActions.js` environ 9 Ko : action bar, slots, munitions, extras, cooldowns et panneau rapide combat.
- `src/game/ui/combatPanels.js` environ 11 Ko : panneaux utilitaires combat, relais de quetes, groupe et panneau de spawn.
- `src/styles/systems.css` est maintenant quasi vide : drones, settings, raffinerie, leaderboard et quetes sont sortis.
- `src/styles/refinery.css` environ 21 Ko : raffinerie principale.
- `src/styles/spawnRefinery.css` environ 13 Ko : panneau raffinerie de spawn.
- `src/ui/renderProgression.js` est maintenant une facade legere.
- Les plus gros fichiers du depot sont surtout des images PNG/JPG/WebP de vaisseaux, planetes et equipements. Ce n'est pas du code inutile, mais il faudra plus tard optimiser les images si le poids Vercel devient un probleme.

### Priorite de rearchitecture recommandee
1. Continuer `src/core/store.js` seulement si une responsabilite nette reste a sortir.
   - Cibles possibles : normalisation/sauvegarde dans `stateStore.js`, stats vaisseau dans `shipStatsStore.js`.
   - Garder `store.js` comme facade et reexporter tant que les imports UI/combat ne sont pas migres.

2. Continuer `src/game/combat.js` progressivement.
   - `groundMaterials.js` existe deja pour la preview des materiaux au sol.
   - `combatCargo.js` gere maintenant le cargo drop, les materiaux au sol et les destinations de collecte.
   - `combatPanels.js` gere maintenant les panneaux utilitaires combat, les quetes en combat, le groupe et le panneau de spawn.
   - `combatActions.js` gere maintenant action bar, slots, munitions, extras, cooldowns et panneau rapide combat.
   - Prochaines cibles conseillees : safe zones/radiation, puis session/portails.
   - Garder `createCombatGame()` comme facade publique.

3. Continuer le CSS seulement si un domaine grossit a nouveau.
   - `systems.css` ne doit plus recevoir de gros blocs metier.
   - Ne pas renommer les classes pendant les extractions mecaniques.

4. Tester dans le navigateur.
   - Verifier hangar, shop, raffinerie forge/expedition/stats, quetes spawn, combat ASTRA-01, collecte cargo et lancement portail.

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
node --check src/core/refineryStore.js
node --check src/core/cargoStore.js
node --check src/ui/renderRefinery.js
node --check src/app.js
git ls-files tmp
Get-ChildItem -Recurse -File src | Sort-Object Length -Descending | Select-Object -First 25 @{Name='KB';Expression={[math]::Round($_.Length/1KB,1)}}, FullName
```

### Suggestion de commits
- `Refactor progression and refinery modules`
- `Split refinery and progression styles`
- `Extract cargo and ground material systems`
