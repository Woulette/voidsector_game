export function preloadCombatAssets({cache, ships, equipment, ammoTypes = [], enemyTypes, maps, ranks, getRankAssetPath}){
  const enemySprites = Object.values(enemyTypes).map(type=>type.img);
  const mapImages = maps.map(map=>map.bg).filter(Boolean);
  const mapDecor = maps.flatMap(map=>[
    ...(map.parallaxScene?.backdrops?.map(layer=>layer.src) || []),
    ...(map.parallaxScene?.images?.map(layer=>layer.src) || []),
    ...(map.parallaxScene?.tiles?.map(layer=>layer.src) || []),
    ...(map.questNpcs?.map(npc=>npc.npcImg).filter(Boolean) || [])
  ]);
  const mapTiles = maps.flatMap(map=>{
    const tileMap = map.tileMap;
    if(!tileMap) return [];
    const prefix = tileMap.prefix || "tile";
    const ext = tileMap.ext || "webp";
    const paths = [];
    for(let row = 0; row < tileMap.rows; row++){
      for(let col = 0; col < tileMap.cols; col++){
        paths.push(`${tileMap.path}/${prefix}_${col}_${row}.${ext}`);
      }
    }
    return paths;
  });
  const rankImages = ranks.map(rank=>getRankAssetPath(rank));
  const misc = ["assets/drones/drone_test_sprite.webp", "assets/equipment/rocket_projectile.png", ...rankImages];
  [
    ...ships.flatMap(ship=>[ship.img, ship.combatImg]).filter(Boolean),
    ...equipment.flatMap(item=>[item.img, item.projectileImg, item.pieceImg]).filter(Boolean),
    ...ammoTypes.flatMap(ammo=>[ammo.img, ammo.projectileImg]).filter(Boolean),
    ...enemySprites,
    ...mapImages,
    ...mapDecor,
    ...mapTiles,
    ...misc
  ].forEach(src=>{
    if(cache[src]) return;
    const img = new Image();
    img.src = src;
    cache[src] = img;
  });
}
