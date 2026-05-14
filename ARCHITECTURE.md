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
