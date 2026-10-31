import { getEnemyDamageRange } from "../../shared/enemyDamage.js";
import { getBaseEnemyKind, scaleMonsterReward, scaleMonsterStat } from "../../shared/enemyProgression.js";

const BOSS_STAT_MULTIPLIER = 2;
const BOSS_LOOT_MULTIPLIER = 2;
function multiplyMaterials(materials = {}, multiplier = BOSS_STAT_MULTIPLIER){
  return Object.fromEntries(Object.entries(materials).map(([id, amount])=>[id, Math.max(0, Math.round(Number(amount || 0) * multiplier))]));
}
function multiplyLoot(loot, multiplier = BOSS_LOOT_MULTIPLIER){
  return {
    credits:Math.max(0, Math.round(Number(loot?.credits || 0) * multiplier)),
    xp:Math.max(0, Math.round(Number(loot?.xp || 0) * multiplier)),
    premium:Math.max(0, Math.round(Number(loot?.premium || 0) * multiplier)),
    materials:multiplyMaterials(loot?.materials, multiplier)
  };
}

export const ENEMY_TYPES = {
  drone_pirate:{
    maxShield:()=>200,
    baseLevel:1,
    name:"Orbe sentinelle",
    img:"assets/enemies/orb-scout-v1/orb-source.png",
    levelRange:[1,5],
    maxHp:()=>400,
    speed:()=>190,
    radius:26,
    width:92,
    height:92,
    attackRange:220,
    shieldAbsorbRatio:.8,
    attackDamage:()=>38,
    ...getEnemyDamageRange(38),
    attackCooldown:1.25,
    projectileSpeed:680,
    color:"rgba(248,113,113,.95)",
    particle:"rgba(252,165,165,.72)",
    loot:{
      credits:800,
      xp:400,
      premium:1,
      materials:{nickel_brut:10, titane_fissure:10, silice_conductrice:10}
    }
  },
  raider_astral:{
    maxShield:()=>400,
    baseLevel:4,
    name:"Vorak rusher",
    img:"assets/enemies/vorak-rusher-v1/vorak-source.png",
    levelRange:[4,10],
    maxHp:()=>800,
    speed:()=>220,
    radius:36,
    width:120,
    height:120,
    attackRange:200,
    shieldAbsorbRatio:.8,
    attackDamage:()=>115,
    ...getEnemyDamageRange(115),
    attackCooldown:1.35,
    projectileSpeed:640,
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
    loot:{
      credits:1600,
      xp:800,
      premium:2,
      materials:{cuivre_orbital:10, zinc_spatial:10, nickel_brut:10}
    }
  },
  chasseur_spectral:{
    baseLevel:9,
    name:"Parasite astral",
    img:"assets/enemies/parasite-scout-v1/parasite-source.png",
    levelRange:[9,15],
    maxHp:()=>3000,
    maxShield:()=>1000,
    speed:()=>200,
    radius:34,
    width:86,
    height:86,
    attackRange:260,
    shieldAbsorbRatio:.8,
    attackDamage:()=>140,
    ...getEnemyDamageRange(140),
    attackCooldown:1.55,
    projectileSpeed:620,
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
    onHitEffect:{type:"poison", damage:50, interval:2, duration:10},
    loot:{
      credits:4000,
      xp:2000,
      premium:4,
      materials:{
        cuivre_orbital:20,
        zinc_spatial:20,
        nickel_brut:20,
        titane_fissure:20,
        silice_conductrice:20
      }
    }
  },
  pondeuse_astrale:{
    baseLevel:15,
    name:"Pondeuse astrale",
    img:"assets/enemies/generated/astra4_astral_brood.png",
    levelRange:[15,15],
    maxHp:()=>40000,
    maxShield:()=>40000,
    speed:()=>230,
    radius:54,
    width:132,
    height:132,
    attackRange:290,
    shieldAbsorbRatio:.8,
    attackDamage:()=>500,
    ...getEnemyDamageRange(500),
    attackCooldown:1,
    projectileSpeed:620,
    color:"rgba(132,204,22,.96)",
    particle:"rgba(192,132,252,.78)",
    onHitEffect:{type:"poison", damage:250, interval:2, duration:10},
    loot:{
      credits:50000,
      xp:25000,
      premium:32,
      materials:{
        cuivre_orbital:80,
        zinc_spatial:80,
        nickel_brut:80,
        titane_fissure:80,
        silice_conductrice:80,
        alliage_cuivre_zinc:5,
        plaque_nickel_titane:5
      }
    }
  },
  cuirasse_nebulaire:{
    baseLevel:10,
    name:"Traqueur abyssal",
    img:"assets/enemies/abyssal-tracker-v4/tracker-source.png",
    levelRange:[10,15],
    maxHp:()=>5000,
    maxShield:()=>3000,
    speed:()=>150,
    radius:46,
    width:106,
    height:106,
    attackRange:270,
    shieldAbsorbRatio:.8,
    attackDamage:()=>250,
    ...getEnemyDamageRange(250),
    attackCooldown:1.70,
    projectileSpeed:590,
    color:"rgba(96,165,250,.95)",
    particle:"rgba(191,219,254,.72)",
    deathEffect:{type:"slow", ratio:.5, duration:5, radius:100},
    loot:{
      credits:6000,
      xp:3000,
      premium:6,
      materials:{
        cuivre_orbital:30,
        zinc_spatial:30,
        nickel_brut:30,
        titane_fissure:30,
        silice_conductrice:30
      }
    }
  },
  cuirasse_ambre:{
    baseLevel:19,
    name:"Cuirasse ambre",
    img:"assets/enemies/generated/astra4_ember_cuirass.png",
    levelRange:[19,19],
    maxHp:()=>50000,
    maxShield:()=>50000,
    speed:()=>165,
    radius:62,
    width:148,
    height:148,
    attackRange:250,
    shieldAbsorbRatio:.8,
    attackDamage:()=>700,
    ...getEnemyDamageRange(700),
    attackCooldown:1.65,
    projectileSpeed:610,
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
    loot:{
      credits:80000,
      xp:32000,
      premium:40,
      materials:{
        cuivre_orbital:120,
        zinc_spatial:120,
        nickel_brut:120,
        titane_fissure:120,
        silice_conductrice:120,
        alliage_cuivre_zinc:8,
        plaque_nickel_titane:8
      }
    }
  },
  eclanite:{
    baseLevel:14,
    name:"Eclanite",
    img:"assets/enemies/eclanite-rig-v1/eclanite-source.png",
    levelRange:[14,20],
    maxHp:()=>20000,
    maxShield:()=>20000,
    speed:()=>240,
    radius:35,
    width:82,
    height:82,
    attackRange:250,
    shieldAbsorbRatio:.8,
    attackDamage:()=>350,
    ...getEnemyDamageRange(350),
    attackCooldown:1,
    projectileSpeed:560,
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
    loot:{
      credits:24000,
      xp:12000,
      premium:16,
      materials:{
        cuivre_orbital:80,
        zinc_spatial:80,
        nickel_brut:80,
        titane_fissure:80,
        silice_conductrice:80,
        alliage_cuivre_zinc:5,
        plaque_nickel_titane:5
      }
    }
  },
  cristanite:{
    baseLevel:20,
    name:"Cristanite",
    img:"assets/enemies/generated/void-crystals/cristanite.png",
    levelRange:[20,20],
    maxHp:()=>60000,
    maxShield:()=>60000,
    speed:()=>220,
    radius:47,
    width:112,
    height:112,
    attackRange:270,
    shieldAbsorbRatio:.8,
    attackDamage:()=>900,
    ...getEnemyDamageRange(900),
    attackCooldown:1,
    projectileSpeed:560,
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
    requiresPlayerAttack:true,
    followBeforeAttacked:true,
    targetMemoryMs:15000,
    loot:{
      credits:72000,
      xp:36000,
      premium:48,
      materials:{
        cuivre_orbital:120,
        zinc_spatial:120,
        nickel_brut:120,
        titane_fissure:120,
        silice_conductrice:120,
        alliage_cuivre_zinc:8,
        plaque_nickel_titane:8
      }
    }
  },
  astranite:{
    baseLevel:24,
    name:"Astranite",
    img:"assets/enemies/generated/void-crystals/astranite.png",
    levelRange:[24,24],
    maxHp:()=>200000,
    maxShield:()=>200000,
    speed:()=>210,
    radius:72,
    width:168,
    height:168,
    attackRange:280,
    shieldAbsorbRatio:.8,
    attackDamage:()=>2700,
    ...getEnemyDamageRange(2700),
    attackCooldown:1,
    projectileSpeed:590,
    color:"rgba(192,38,211,.98)",
    particle:"rgba(232,121,249,.78)",
    requiresPlayerAttack:true,
    followBeforeAttacked:true,
    targetMemoryMs:15000,
    deathEffect:{type:"slow", amount:200, duration:5, radius:150},
    deathSpawn:{kind:"cristanite", count:1},
    loot:{
      credits:400000,
      xp:108000,
      premium:144,
      materials:{
        cuivre_orbital:200,
        zinc_spatial:200,
        nickel_brut:200,
        titane_fissure:200,
        silice_conductrice:200,
        alliage_cuivre_zinc:15,
        plaque_nickel_titane:15
      }
    }
  },
  boss_drone_pirate:{
    baseLevel:1,
    name:"Boss Orbe sentinelle",
    img:"assets/enemies/orb-rig-v1/orb-source.png",
    levelRange:[5,5],
    maxHp:()=>800,
    maxShield:()=>400,
    speed:()=>190,
    radius:32,
    width:120,
    height:120,
    attackRange:220,
    shieldAbsorbRatio:.8,
    attackDamage:()=>76,
    ...getEnemyDamageRange(76),
    attackCooldown:1.25,
    projectileSpeed:680,
    color:"rgba(248,113,113,.95)",
    particle:"rgba(252,165,165,.72)",
    loot:multiplyLoot({
      credits:800,
      xp:400,
      premium:1,
      materials:{nickel_brut:10, titane_fissure:10, silice_conductrice:10}
    }, 2)
  },
  boss_raider_astral:{
    baseLevel:4,
    name:"Boss Vorak rusher",
    img:"assets/enemies/vorak-boss-v1/vorak-source.png",
    levelRange:[5,10],
    maxHp:()=>1600,
    maxShield:()=>800,
    speed:()=>220,
    radius:42,
    width:104,
    height:104,
    attackRange:200,
    shieldAbsorbRatio:.8,
    attackDamage:()=>230,
    ...getEnemyDamageRange(230),
    attackCooldown:1.35,
    projectileSpeed:640,
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
    loot:multiplyLoot({
      credits:1600,
      xp:800,
      premium:2,
      materials:{cuivre_orbital:10, zinc_spatial:10, nickel_brut:10}
    }, 2)
  },
  boss_chasseur_spectral:{
    baseLevel:9,
    name:"Boss Parasite astral",
    img:"assets/enemies/parasite-boss-v3/parasite-source.png",
    levelRange:[25,25],
    maxHp:()=>6000,
    maxShield:()=>2000,
    speed:()=>200,
    radius:42,
    width:104,
    height:104,
    attackRange:260,
    shieldAbsorbRatio:.8,
    attackDamage:()=>280,
    ...getEnemyDamageRange(280),
    attackCooldown:1.55,
    projectileSpeed:620,
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
    onHitEffect:{type:"poison", damage:50 * BOSS_STAT_MULTIPLIER, interval:2, duration:10},
    loot:multiplyLoot({
      credits:4000,
      xp:2000,
      premium:4,
      materials:{
        cuivre_orbital:20,
        zinc_spatial:20,
        nickel_brut:20,
        titane_fissure:20,
        silice_conductrice:20
      }
    })
  },
  boss_cuirasse_nebulaire:{
    baseLevel:10,
    name:"Boss Traqueur abyssal",
    img:"assets/enemies/abyssal-tracker-boss-v1/tracker-source.png",
    levelRange:[34,34],
    maxHp:()=>10000,
    maxShield:()=>6000,
    speed:()=>150,
    radius:54,
    width:126,
    height:126,
    attackRange:270,
    shieldAbsorbRatio:.8,
    attackDamage:()=>500,
    ...getEnemyDamageRange(500),
    attackCooldown:1.70,
    projectileSpeed:590,
    color:"rgba(96,165,250,.95)",
    particle:"rgba(191,219,254,.72)",
    deathEffect:{type:"slow", ratio:.5, duration:5, radius:100},
    loot:multiplyLoot({
      credits:6000,
      xp:3000,
      premium:6,
      materials:{
        cuivre_orbital:30,
        zinc_spatial:30,
        nickel_brut:30,
        titane_fissure:30,
        silice_conductrice:30
      }
    })
  },
  boss_cuirasse_ambre:{
    baseLevel:19,
    name:"Boss Cuirasse ambre",
    img:"assets/enemies/generated/astra4_ember_cuirass.png",
    levelRange:[19,19],
    maxHp:()=>100000,
    maxShield:()=>100000,
    speed:()=>165,
    radius:70,
    width:164,
    height:164,
    attackRange:250,
    shieldAbsorbRatio:.8,
    attackDamage:()=>1400,
    ...getEnemyDamageRange(1400),
    attackCooldown:1.65,
    projectileSpeed:610,
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
    loot:multiplyLoot({
      credits:80000,
      xp:32000,
      premium:40,
      materials:{
        cuivre_orbital:120,
        zinc_spatial:120,
        nickel_brut:120,
        titane_fissure:120,
        silice_conductrice:120,
        alliage_cuivre_zinc:8,
        plaque_nickel_titane:8
      }
    })
  },
};

export function getEnemyStatsForLevel(kind, level){
  const type = ENEMY_TYPES[kind] || ENEMY_TYPES.drone_pirate;
  const source = ENEMY_TYPES[getBaseEnemyKind(kind)] || type;
  const multiplier = String(kind).startsWith("boss_") ? BOSS_STAT_MULTIPLIER : 1;
  const reference = source.baseLevel || 1;
  const stat = value=>scaleMonsterStat(value, reference, level) * multiplier;
  const attackDamage = stat(source.attackDamage(reference));
  const reward = scaleMonsterReward({
    credits:source.loot.credits,
    premium:source.loot.premium,
    xp:source.loot.xp
  }, reference, level);
  return {
    maxHp:stat(source.maxHp(reference)),
    maxShield:stat(source.maxShield?.(reference) || 0),
    attackDamage,
    ...getEnemyDamageRange(attackDamage),
    onHitEffect:source.onHitEffect ? {...source.onHitEffect, damage:stat(source.onHitEffect.damage)} : null,
    loot:{...type.loot, ...Object.fromEntries(Object.entries(reward).map(([key,value])=>[key,value*multiplier]))}
  };
}
