# Passation prochain chat - déplacement des monstres

## Contexte

Projet : `voidsector_game`.

Le joueur veut que les monstres puissent vraiment se balader sur toute la map accessible, pas seulement faire un petit aller-retour autour de leur point d'origine. Il faut garder un comportement léger côté calcul pour éviter de charger inutilement le jeu.

Fichiers principaux :

- `src/game/combatData.js` : définition des maps et des types de monstres.
- `src/game/systems/enemyAi.js` : logique de déplacement/aggro des ennemis.
- `src/game/systems/mapState.js` : génération initiale des ennemis et respawn.
- `src/game/combat.js` : boucle de jeu, mort/respawn, update ennemis.
- `src/game/render/entities.js` : rendu des ennemis, jauges PV/bouclier.

## État actuel

Les monstres ont maintenant une petite logique de patrouille quand ils ne sont pas aggro dans `enemyAi.js`, mais elle reste trop locale :

```js
enemy.wanderX = enemy.homeX + Math.cos(angle) * radius;
enemy.wanderY = enemy.homeY + Math.sin(angle) * radius;
```

Donc ils bougent autour de leur `homeX/homeY`, ce que le joueur trouve trop limité.

Les destinations sont déjà clampées dans les limites de la map :

```js
targetX = Math.max(-map.width / 2 + 80, Math.min(map.width / 2 - 80, targetX));
targetY = Math.max(-map.height / 2 + 80, Math.min(map.height / 2 - 80, targetY));
```

Le joueur veut plutôt :

- les monstres peuvent se déplacer dans une grande zone de la map,
- éviter hors map,
- éviter de rentrer dans les zones safe/spawn/portail si possible,
- éviter que tous les monstres recalculent une destination à chaque frame,
- garder les comportements d'aggro existants.

## Comportements à préserver

- L'orbe (`drone_pirate`) est passive : elle n'aggro pas juste parce que le joueur passe près d'elle.
- Si le joueur attaque un monstre, il devient aggro (`enemy.aggro = true` est déjà posé dans les hits).
- L'orbe garde sa logique de recul/orbite quand elle est aggro.
- Les jauges PV/bouclier au-dessus des monstres ne doivent apparaître que si :
  - le monstre est lock,
  - ou il a récemment subi une attaque du joueur.
- Les respawns de map ouverte sont déjà faits dans `combat.js` via `updateMapRespawns`.
- ASTRA-01 a `enemyCount:20`, donc jamais plus de 20 ennemis actifs sur cette map.

## Approche recommandée

Créer une vraie fonction de destination de patrouille dans `enemyAi.js` ou réutiliser/exporter une fonction depuis `mapState.js`.

Idée simple et légère :

1. Chaque ennemi a une destination de patrouille (`wanderX`, `wanderY`) et un timer.
2. Quand il arrive proche de sa destination, ou quand le timer expire, choisir une nouvelle destination.
3. La destination est choisie sur toute la carte, pas autour de `homeX/homeY`.
4. Valider la destination :
   - dans les limites de la map,
   - hors zone spawn/safe,
   - hors zone portail,
   - éventuellement pas trop proche du joueur.
5. Ne pas recalculer plus souvent que toutes les quelques secondes par monstre.

Pseudo :

```js
function pickPatrolDestination(enemy, map, player){
  for(let tries = 0; tries < 20; tries++){
    const x = Math.random() * map.width - map.width / 2;
    const y = Math.random() * map.height - map.height / 2;
    if(isValidPatrolPoint(map, x, y, player)) return {x, y};
  }
  return {x:enemy.x, y:enemy.y};
}
```

Puis dans `updateEnemyAi` :

```js
if(!enemy.aggro && !returningHome){
  enemy.wanderT -= dt;
  const distanceToGoal = Math.hypot(enemy.wanderX - enemy.x, enemy.wanderY - enemy.y);
  if(!enemy.wanderX || enemy.wanderT <= 0 || distanceToGoal < 30){
    const point = pickPatrolDestination(enemy, map, player);
    enemy.wanderX = point.x;
    enemy.wanderY = point.y;
    enemy.wanderT = 8 + Math.random() * 12;
  }
  targetX = enemy.wanderX;
  targetY = enemy.wanderY;
  speed = enemy.speed * 0.22;
}
```

## Points d'attention

- Ne pas casser la logique d'aggro existante.
- Ne pas faire de pathfinding complexe pour l'instant.
- Ne pas recalculer une destination chaque frame.
- Ne pas créer de calcul global coûteux.
- Le déplacement peut être direct en ligne droite, c'est acceptable pour l'instant.
- Si les monstres traversent trop souvent la zone safe, ajouter un rejet plus strict des points dans `spawn.safeRadius` / `portal.safeRadius`.
- Après changement, vérifier :
  - `node --check src/game/systems/enemyAi.js`
  - `node --check src/game/combat.js`
  - tester en jeu ASTRA-01 quelques minutes.

## Demande future probable

Après ça, le joueur veut reprendre les générateurs :

- 2 générateurs de bouclier.
- 2 générateurs de vitesse.
- Les mécaniques existent déjà, il faut surtout remplacer/améliorer les assets.
- Style souhaité : bitmap transparent, lisible dans les slots, pas SVG.
