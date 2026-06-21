export const DEADLY_ENEMY_DISPLAY = Object.freeze({
  deadly_eclaireur:Object.freeze({
    kind:"deadly_eclaireur",
    name:"Éclaireur",
    img:"assets/enemies/deadly/deadly_01_emerald.webp",
    levelRange:Object.freeze([20, 20])
  }),
  deadly_intercepteur:Object.freeze({
    kind:"deadly_intercepteur",
    name:"Intercepteur",
    img:"assets/enemies/deadly/deadly_02_amber.webp",
    levelRange:Object.freeze([20, 20])
  }),
  deadly_gardien:Object.freeze({
    kind:"deadly_gardien",
    name:"Gardien",
    img:"assets/enemies/deadly/deadly_03_cyan.webp",
    levelRange:Object.freeze([20, 20])
  }),
  deadly_traqueur:Object.freeze({
    kind:"deadly_traqueur",
    name:"Traqueur",
    img:"assets/enemies/deadly/deadly_04_magenta.webp",
    levelRange:Object.freeze([20, 20])
  }),
  deadly_ravageur:Object.freeze({
    kind:"deadly_ravageur",
    name:"Ravageur",
    img:"assets/enemies/deadly/deadly_05_blue.webp",
    levelRange:Object.freeze([20, 20])
  }),
  deadly_amiral_k137:Object.freeze({
    kind:"deadly_amiral_k137",
    name:"Amiral K-137",
    img:"assets/enemies/deadly/deadly_06_boss.webp",
    levelRange:Object.freeze([20, 20])
  })
});

export function getDeadlyEnemyDisplay(kind){
  return DEADLY_ENEMY_DISPLAY[String(kind || "")] || null;
}
