# VoidSector - architecture actuelle

## Entrée
- `index.html` : structure HTML de l'interface.
- `game.js` : point d'entrée JavaScript, importe `src/app.js`.
- `styles.css` : thème visuel global.

## Données
- `src/data/catalog.js` : catalogue des vaisseaux, équipements, drones, munitions, portails et compétences.

## État et sauvegarde
- `src/core/store.js` : état joueur, inventaire, loadouts vaisseaux/drones/extras, calculs de stats, sauvegarde localStorage.
- `src/core/keybinds.js` : touches personnalisables des slots 1 à 9.
- `src/core/utils.js` : helpers génériques.

## Interface
- `src/ui/render.js` : rendu du hangar, magasin, portails, compétences et paramètres.
- `src/ui/toast.js` : notifications.

## Combat
- `src/game/combat.js` : canvas, maps, ennemis, tirs laser, roquettes, cooldowns par munition, drones orbitaux, extras de roquettes.

## Structure gameplay actuelle
- Les vaisseaux ont : lasers, générateurs, extras.
- Les drones ont : 1 slot compatible laser/générateur.
- Les générateurs peuvent donner bouclier, régénération ou vitesse.
- Les extras de vaisseau servent aux modules spéciaux comme auto-roquettes ou réduction de cooldown.
- Les touches des slots sont modifiables dans l'onglet Paramètres.


## Classement / MMO

Le projet contient maintenant une page `CLASSEMENT` préparée pour un futur mode en ligne.

Fichiers concernés :
- `src/core/store.js`
  - `RANK_TABLE` : liste des grades militaires et seuils.
  - `RANK_POINT_RULES` : règles expliquant comment gagner des points.
  - `getRankScore()` : calcul centralisé du score de classement.
  - `getRankBreakdown()` : détail XP / kills / niveaux / portails.
  - `getLeaderboardRows()` : classement local de prévisualisation avec le joueur + pilotes fictifs.
- `src/ui/render.js`
  - `renderLeaderboard()` : rendu du tableau de classement, détails de score et table des grades.
- `index.html`
  - onglet `CLASSEMENT` et section `leaderboardPanel`.

Le classement est local pour l’instant. Pour le MMO, il suffira de remplacer `LOCAL_LEADERBOARD_PREVIEW` / `getLeaderboardRows()` par des données serveur.
