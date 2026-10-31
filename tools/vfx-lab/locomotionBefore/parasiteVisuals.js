export const PARASITE_SOURCE="assets/enemies/parasite-scout-v1/parasite-source.png";
export const PARASITE_SCALE=.94;
export const PARASITE_CENTER={x:.5,y:.52};
export const PARASITE_ROOT=.192;

export const PARASITE_PROFILES=Object.freeze({
  chasseur_spectral:Object.freeze({sprite:PARASITE_SOURCE,scale:PARASITE_SCALE,root:PARASITE_ROOT,core:.207,flex:1,light:1}),
  boss_chasseur_spectral:Object.freeze({sprite:"assets/enemies/parasite-boss-v3/parasite-source.png",scale:.94,
    light:1.08,motion:"brood",
    rootShape:Object.freeze({x:.222,y:.222}),coreShape:Object.freeze({x:.236,y:.236}),
    meshStart:.10,meshEnd:.62,strips:12,crown:true})
});
export const isParasiteKind=kind=>Object.hasOwn(PARASITE_PROFILES,kind);
export const parasiteProfile=kind=>PARASITE_PROFILES[kind] || PARASITE_PROFILES.chasseur_spectral;
export const parasiteSize=enemy=>Math.min(enemy.width,enemy.height)*parasiteProfile(enemy.kind).scale;
