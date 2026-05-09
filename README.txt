VoidSector - Prototype jouable

Lancement local :
1. Ouvre un terminal dans ce dossier.
2. Lance : python -m http.server 8765 --bind 127.0.0.1
3. Va sur : http://127.0.0.1:8765/index.html

Architecture :
- game.js : point d'entrée module.
- src/app.js : branchement des evenements et initialisation.
- src/data/catalog.js : vaisseaux, equipements, portails, competences, et etat initial.
- src/core/store.js : sauvegarde, inventaire, loadouts, achats, stats et helpers metier.
- src/core/utils.js : utilitaires communs.
- src/ui/render.js : rendu du dashboard, hangar, boutique, portails et competences.
- src/ui/toast.js : notifications.
- src/game/combat.js : canvas, boucle de jeu, ennemis, deplacement, tirs, HUD combat.

Objectif directionnel :
Le projet est maintenant pret pour evoluer vers un jeu spatial type DarkOrbit : hangar persistant, vaisseaux possedes, equipements par vaisseau, boutique, portails/zones, progression et combat temps reel.
