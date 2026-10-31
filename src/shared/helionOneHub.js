import { getFirmHomeMapTheme, getFirmHomeAssetPath } from "./firmHomeMapThemes.js";

// Applied after the four firms have been built, to their home sectors only.
// The same positions and protection rectangle are consumed by client and server.
export function installHelionOneHub(map){
  const theme = getFirmHomeMapTheme(map);
  if(!theme || !map.spawn) return map;
  const {x, y} = map.spawn;
  const {mirrorX:sx, mirrorY:sy} = theme;
  const asset = name=>getFirmHomeAssetPath(`assets/spawn/helion01-crown-v1/${name}.webp`, theme);
  map.spawn = {
    ...map.spawn,
    safeRect:{
      minX:x + Math.min(-700 * sx, 1300 * sx), maxX:x + Math.max(-700 * sx, 1300 * sx),
      minY:y + Math.min(-1000 * sy, 650 * sy), maxY:y + Math.max(-1000 * sy, 650 * sy)
    },
    visual:{
      asset:asset("headquarters"),
      x, y:y - 180 * sy, width:1100, height:1100,
      title:"QG · COURONNE", color:theme.hubColor
    }
  };
  map.spawnStations = [
    {
      id:"quests", x:x + 640 * sx, y:y - 690 * sy, radius:175, interactionRadius:320,
      asset:asset("quest-relay"),
      assetWidth:350, assetHeight:350, presentation:"industrial",
      marker:null,
      color:theme.palette === "astra" ? "153,213,222" : theme.hubColor, title:"RELAIS DE QUÊTES",
      subtitle:"Recevoir et rendre des missions", promptLabel:"MISSIONS"
    },
    {
      id:"commerce", x:x - 620 * sx, y:y - 690 * sy, radius:230,
      asset:asset("refinery"),
      assetWidth:460, assetHeight:460, presentation:"industrial",
      marker:null,
      color:theme.palette === "astra" ? "237,190,114" : theme.hubColor, title:"RAFFINERIE · COMMERCE",
      subtitle:"Vendre des matériaux", promptLabel:"COMMERCE"
    }
  ];
  map.questStations = map.spawnStations.filter(station=>station.id === "quests");
  return map;
}
