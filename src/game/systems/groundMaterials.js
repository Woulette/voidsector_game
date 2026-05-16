export function makeGroundMaterialPreview(map, rawMaterials){
  if(!map || map.id !== 0) return [];
  const raw = rawMaterials.slice(0, 5);
  const offsets = [
    {x:1040, y:-620, glowCore:"rgba(249,115,22,.34)", glow:"rgba(249,115,22,.18)", fallback:"rgba(249,115,22,.74)"},
    {x:1340, y:-820, glowCore:"rgba(186,230,253,.34)", glow:"rgba(125,211,252,.18)", fallback:"rgba(186,230,253,.74)"},
    {x:1570, y:-430, glowCore:"rgba(203,213,225,.30)", glow:"rgba(203,213,225,.16)", fallback:"rgba(203,213,225,.74)"},
    {x:1230, y:-170, glowCore:"rgba(251,146,60,.30)", glow:"rgba(251,146,60,.16)", fallback:"rgba(251,146,60,.74)"},
    {x:1760, y:-40, glowCore:"rgba(103,232,249,.34)", glow:"rgba(103,232,249,.18)", fallback:"rgba(103,232,249,.74)"}
  ];

  return raw.map((material, index)=>({
    uid:`ground_${map.id}_${material.id}_${index}`,
    id:material.id,
    name:material.name,
    label:material.short || material.name,
    img:material.img,
    x:map.spawn.x + offsets[index].x,
    y:map.spawn.y + offsets[index].y,
    size:42,
    radius:30,
    phase:index * 1.7,
    ...offsets[index]
  }));
}
