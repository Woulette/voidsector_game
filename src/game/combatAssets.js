export function preloadCombatAssets({cache, ships, equipment, enemyTypes, maps, ranks, getRankAssetPath}){
  const enemySprites = Object.values(enemyTypes).map(type=>type.img);
  const mapImages = maps.map(map=>map.bg).filter(Boolean);
  const mapDecor = maps.flatMap(map=>map.parallaxScene?.images?.map(layer=>layer.src) || []);
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
  const misc = ["assets/equipment/drone_orbital.svg", ...rankImages];
  [
    ...ships.flatMap(ship=>[ship.img, ship.combatImg]).filter(Boolean),
    ...equipment.map(item=>item.img),
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
