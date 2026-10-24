// Fixed by sector, never by the visiting player's firm. Coordinates are mirrored
// from the approved Helion-01 composition (lower left).
const THEMES = [
  {id:0, name:"Helion-01", palette:"astra", mirrorX:1, mirrorY:1, hue:0,
    background:["#08070c","#1b0d15","#09070d"], hubColor:"237,157,137"},
  {id:20, name:"Nereid-01", palette:"cyan", mirrorX:1, mirrorY:-1, hue:180, hueRange:[180,215],
    background:["#070a10","#0d1928","#070b11"], hubColor:"137,211,237",
    lights:{core:"224,242,254",hot:"153,221,255",mid:"86,171,224",haze:"55,104,147"}},
  {id:30, name:"Aureon-01", palette:"jaune", mirrorX:-1, mirrorY:-1, hue:33, hueRange:[34,58],
    background:["#0c0a07","#211b0e","#0d0b07"], hubColor:"237,209,137",
    lights:{core:"255,249,221",hot:"255,227,156",mid:"221,182,92",haze:"145,109,50"}},
  {id:40, name:"Sylva-01", palette:"verte", mirrorX:-1, mirrorY:1, hue:125, hueRange:[132,158],
    background:["#070c09","#0d2116","#070d09"], hubColor:"145,230,166",
    lights:{core:"232,255,236",hot:"163,241,177",mid:"91,203,121",haze:"47,126,81"}}
].map(theme=>Object.freeze(theme));

export function getFirmHomeMapTheme(map){
  return THEMES.find(theme=>String(map?.id) === String(theme.id) && map?.name === theme.name) || null;
}

export function getFirmHomeAssetPath(src, theme){
  return !src || !theme || theme.palette === "astra" ? src
    : `${src}${src.includes("?") ? "&" : "?"}mapPalette=${theme.palette}`;
}

export function getMapAssetPalette(src){
  if(!/^assets\/(?:maps\/decor\/|spawn\/helion01-crown-v1\/)/.test(String(src))) return null;
  const palette = /[?&]mapPalette=(cyan|jaune|verte)(?:&|$)/.exec(src)?.[1];
  return THEMES.find(theme=>theme.palette === palette) || null;
}

export function getMapPaletteSource(src){
  if(!getMapAssetPalette(src)) return src;
  const [path, query] = src.split("?");
  const parameters = new URLSearchParams(query);
  parameters.delete("mapPalette");
  return path + (parameters.size ? `?${parameters}` : "");
}
