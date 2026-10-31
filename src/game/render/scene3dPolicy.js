export function isWorld3dEnabled(map, effects = {}){
  return Number(map?.id) === 0 && map?.name?.startsWith("Helion") && effects.world3d !== false;
}

export function getReplacedMapImages(map){
  return [map?.spawn?.visual?.asset,
    ...(map?.spawnStations || []).filter(station=>["quests", "commerce"].includes(station.id)).map(station=>station.asset),
    ...(map?.questStations || []).filter(station=>["quests", "commerce"].includes(station.id)).map(station=>station.asset)
  ].filter(Boolean);
}
