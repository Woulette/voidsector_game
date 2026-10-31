import { getEnemyBaseKind } from "../../data/enemyVisuals.js";
import { alpha, glow, line, shard } from "./vfxPrimitives.js";

const THEMES = {
  orb:{color:"rgba(55,156,255,1)", core:"rgba(211,237,255,1)", form:"orb"},
  pulse:{color:"rgba(239,61,76,1)", core:"rgba(255,217,209,1)", form:"pulse"},
  toxin:{color:"rgba(143,222,35,1)", core:"rgba(229,255,136,1)", form:"toxin"},
  electric:{color:"rgba(91,179,255,1)", core:"rgba(221,245,255,1)", form:"electric"},
  heavy:{color:"rgba(255,171,47,1)", core:"rgba(255,246,192,1)", form:"heavy"},
  crystal:{color:"rgba(190,128,255,1)", core:"rgba(249,227,255,1)", form:"crystal"},
  energy:{color:"rgba(99,193,235,1)", core:"rgba(227,249,255,1)", form:"energy"}
};

export function getEnemyLifeTheme(kind){
  const base = getEnemyBaseKind(kind);
  if(/clanite|stanite|stranite|crystal|prism/.test(base)) return THEMES.crystal;
  if(/chasseur_spectral|pondeuse|parasite|larva|brood/.test(base)) return THEMES.toxin;
  if(/cuirasse_nebulaire|spider|ionis/.test(base)) return THEMES.electric;
  if(/cuirasse_ambre|ravageur|amiral|ember/.test(base)) return THEMES.heavy;
  if(/raider_astral|rusher|intercepteur/.test(base)) return THEMES.pulse;
  if(/drone_pirate|orb|sentinel/.test(base)) return THEMES.orb;
  return THEMES.energy;
}

export function getEnemyLifeScale(enemy, time, phase = 0){
  const form = getEnemyLifeTheme(enemy.kind).form;
  const amount = form === "toxin" ? .027 : form === "orb" ? .016 : .006;
  const breath = Math.sin(time * (form === "toxin" ? 4.4 : 2.5) + phase);
  return {x:1 + breath * amount, y:1 - breath * amount * .75};
}

// These effects decorate the authoritative position. They never change enemy
// coordinates, heading, targeting, pursuit samples, or server attack cadence.
export function drawEnemyLife({ctx, camera, enemy, x, y, width, height, time, phase = 0, front = false}){
  const {color, core, form} = getEnemyLifeTheme(enemy.kind);
  const sx = x - camera.x, sy = y - camera.y;
  const t = time + phase * .13;
  const attack = Math.min(1, Math.max(0, Number(enemy.attackT || 0) / .32));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  if(!front){
    glow(ctx, sx, sy, width * .43, color, .055 + attack * .08);
    if(form === "crystal"){
      for(let i = 0; i < 4; i++){
        const a = t * .62 + i * Math.PI / 2;
        const r = width * (.47 + .03 * Math.sin(t * 3 + i));
        shard(ctx, sx + Math.cos(a) * r, sy + Math.sin(a) * r * .7,
          Math.min(5, width * .04) + i % 2, a + t, alpha(color, .57));
      }
    }else if(form === "toxin"){
      for(const side of [-1, 1]){
        const points = Array.from({length:9}, (_, n)=>[
          sx + side * (width * .24 + Math.sin(t * 5 - n * .65) * n * .5),
          sy + n * height * .045
        ]);
        line(ctx, points, alpha(color, .24), 1.2);
      }
    }else{
      const count = form === "heavy" ? 5 : 3;
      for(let i = 0; i < count; i++){
        const a = t * (form === "pulse" ? -.52 : .46) + i * Math.PI * 2 / count;
        const r = width * ((form === "heavy" ? .55 : .51) + Math.sin(t * 2.7 + i) * .035);
        const px = sx + Math.cos(a) * r, py = sy + Math.sin(a) * r * height / width;
        if(form === "heavy" || form === "pulse"){
          const fade = .24 + (Math.sin(t * 3 + i * 2) + 1) * .13;
          line(ctx, [[px, py], [px - Math.cos(a) * 5, py - Math.sin(a) * 5]], color, 1.3, fade);
        }else{
          glow(ctx, px, py, 3.1 + Math.sin(t * 3 + i) * .6, color, .38);
        }
      }
    }
  }else{
    if(form === "electric"){
      for(let i = 0; i < 3; i++){
        const a = t * .4 + i * 2.09;
        const points = Array.from({length:6}, (_, n)=>{
          const r = width * (.12 + n * .035);
          const wobble = n === 0 || n === 5 ? 0 : Math.sin(Math.floor(t * 16) + n * 17 + i) * 3;
          return [sx + Math.cos(a) * r + wobble, sy + Math.sin(a) * r];
        });
        line(ctx, points, alpha(color, .22 + attack * .35), .9);
      }
    }
    glow(ctx, sx, sy, width * (form === "orb" ? .15 : .075), core, .11 + attack * .18);
  }
  ctx.restore();
}
