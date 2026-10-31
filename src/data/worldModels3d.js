const model = (folder,name,version="v1")=>new URL(`../../assets/${folder}/models/${name}-meshy-${version}/${name}.glb?v=20261031-sector3d8`,import.meta.url).href;

export const WORLD_MODELS_3D = Object.freeze({
  headquarters:Object.freeze({url:model("spawn","headquarters")}),
  quests:Object.freeze({url:model("spawn","quest-relay")}),
  commerce:Object.freeze({url:model("spawn","refinery")}),
  // Keep the approved animated Orb until its volumetric replacement is validated.
  drone_pirate:Object.freeze({url:model("enemies","drone_pirate","v2"),displayScale:.74,enabled:false}),
  raider_astral:Object.freeze({url:model("enemies","raider_astral","v2"),displayScale:.7})
});
