// Applied after the four firms have been built: only Helion-01 uses this hub.
// The same positions and protection rectangle are consumed by client and server.
export function installHelionOneHub(map){
  if(String(map?.id) !== "0" || map?.name !== "Helion-01" || !map.spawn) return map;
  const {x, y} = map.spawn;
  map.spawn = {
    ...map.spawn,
    safeRect:{minX:x - 700, minY:y - 1000, maxX:x + 1300, maxY:y + 650},
    visual:{
      asset:"assets/spawn/helion01-crown-v1/headquarters.webp",
      x, y:y - 180, width:1100, height:1100,
      title:"QG · COURONNE", color:"237,157,137"
    }
  };
  map.spawnStations = [
    {
      id:"quests", x:x + 640, y:y - 690, radius:175, interactionRadius:320,
      asset:"assets/spawn/helion01-crown-v1/quest-relay.webp",
      assetWidth:350, assetHeight:350, presentation:"industrial",
      marker:null,
      color:"153,213,222", title:"RELAIS DE QUÊTES",
      subtitle:"Recevoir et rendre des missions", promptLabel:"MISSIONS"
    },
    {
      id:"commerce", x:x - 620, y:y - 690, radius:230,
      asset:"assets/spawn/helion01-crown-v1/refinery.webp",
      assetWidth:460, assetHeight:460, presentation:"industrial",
      marker:null,
      color:"237,190,114", title:"RAFFINERIE · COMMERCE",
      subtitle:"Vendre des matériaux", promptLabel:"COMMERCE"
    }
  ];
  map.questStations = map.spawnStations.filter(station=>station.id === "quests");
  return map;
}
