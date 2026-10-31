import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { defaultState } from "../../src/data/catalog.js";
import { portals, PRESTIGE_PORTAL_META } from "../../src/data/progression.js";
import { PREPARED_PORTAL_ASSETS } from "../../src/game/render/mapPortals.js";

const expectedPortals = [
  {
    id:"blue",
    name:"Le Seuil d’Azuron",
    level:10,
    pieces:15,
    zones:["Maps 1 à 4"],
    image:"seuil_azuron.png",
    fragment:"fragment_azuron.png",
    reward:"1 000 000 crédits · 500 000 XP · 50 000 réputation · 10 000 munitions x4 · 10 000 NOVA · Laser MK-IV garanti au premier nettoyage, puis 25%"
  },
  {
    id:"violet",
    name:"La Faille de Vesper",
    level:15,
    pieces:20,
    zones:["Maps 1 à 4"],
    image:"azuron-family-v1/vesper.svg",
    fragment:"azuron-family-v1/vesper.svg",
    reward:"2 000 000 crédits · 1 000 000 XP · 100 000 réputation · 20 000 munitions x4 · 20 000 NOVA · Noyau Overdrive Drone garanti au premier nettoyage, puis 50%"
  },
  {
    id:"red",
    name:"La Forge de Kharon",
    level:20,
    pieces:35,
    zones:["Maps 1 à 5"],
    image:"azuron-family-v1/kharon.svg",
    fragment:"azuron-family-v1/kharon.svg",
    reward:"3 000 000 crédits · 1 500 000 XP · 150 000 réputation · 30 000 munitions x4 · 30 000 NOVA · Tirage exclusif : Laser MK-IV 33% · skin drone 33% · rien 34% · Déverrouille les vaisseaux élite et à compétence"
  },
  {
    id:"ionis",
    name:"La Tempête d’Ionis",
    level:25,
    pieces:50,
    zones:["Maps 2 à 5","CORE"],
    image:"tempete_ionis.png",
    fragment:"fragment_ionis.png",
    reward:"40 000 munitions x4 · 40 000 NOVA · Déverrouille les futures améliorations d’équipement"
  },
  {
    id:"emerald",
    name:"La Ruche d’Éclanite",
    level:30,
    pieces:60,
    zones:["Maps 2 à 5","CORE"],
    image:"ruche_eclanite.png",
    fragment:"fragment_eclanite.png",
    reward:"5 000 munitions x6 · 50 000 NOVA · Débloque les recettes, dont les lasers bleu, vert et rouge"
  },
  {
    id:"void",
    name:"L’Abîme de Nox",
    level:35,
    pieces:75,
    zones:["Maps 3 à 5","CORE","Zones niv. 35 à 50"],
    image:"abime_nox.png",
    fragment:"fragment_nox.png",
    reward:"10 000 munitions x6 · 50 000 NOVA · Tirage : laser bleu 15% · laser rouge 15% · laser vert 15% · rien 55%"
  },
  {
    id:"prismatic",
    name:"Le Nexus Prismatique",
    level:40,
    pieces:80,
    zones:["Maps 4 à 5","CORE","Zones niv. 35 à 50"],
    image:"nexus_prismatique.png",
    fragment:"fragment_nexus_prismatique.png",
    reward:"50 000 munitions x4 · 50 000 NOVA · Tirage : drone ancestral 33% · Laser MK-IV 33% · rien 34%"
  },
  {
    id:"ancient",
    name:"Le Sanctuaire des Précurseurs",
    level:45,
    pieces:90,
    zones:["Map 5","CORE","Zones niv. 35 à 50"],
    image:"sanctuaire_precurseurs.png",
    fragment:"fragment_sanctuaire_precurseurs.png",
    reward:"15 000 munitions x6 · 75 000 NOVA · Tirage : skin ancestral inférieur (+20% attaque ou bouclier selon le module) 50% · laser coloré aléatoire 50%"
  },
  {
    id:"eternal",
    name:"Le Cœur de l’Éternel",
    level:50,
    pieces:100,
    zones:["À définir"],
    image:"coeur_eternel.png",
    fragment:"fragment_coeur_eternel.png",
    reward:"25 000 munitions x6 · 100 000 NOVA · Ornement animé · Titre « Système stellaire colonisé » (+5% tous dégâts) · Prestige après les 8 portails précédents"
  }
];

test("the client portal catalogue exposes the nine agreed tiers without changing legacy ids", ()=>{
  assert.deepEqual(
    portals.map(portal=>portal.id),
    expectedPortals.map(portal=>portal.id)
  );
  assert.deepEqual(
    Object.keys(defaultState.portalPieces),
    expectedPortals.map(portal=>portal.id)
  );

  expectedPortals.forEach((expected, index)=>{
    const portal = portals[index];
    assert.equal(portal.name, expected.name);
    assert.equal(portal.requirement.level, expected.level);
    assert.equal(portal.level, `NIV. ${expected.level}+`);
    assert.equal(portal.piecesRequired, expected.pieces);
    assert.deepEqual(portal.dropZones, expected.zones);
    assert.equal(portal.img, `assets/portals/${expected.image}${expected.image.endsWith(".svg") ? "" : "?v=20260726-kharon1"}`);
    assert.equal(portal.pieceImg, `assets/portal_pieces/${expected.fragment}${expected.fragment.endsWith(".svg") ? "" : "?v=20260726-kharon1"}`);
    assert.equal(portal.reward, expected.reward);
  });
});

test("the level 50 prestige identity and prerequisite chain stay centralized", ()=>{
  assert.deepEqual(PRESTIGE_PORTAL_META, {
    id:"eternal",
    name:"Le Cœur de l’Éternel",
    shortName:"Cœur de l’Éternel",
    slug:"coeur_eternel"
  });
  assert.deepEqual(
    portals.at(-1).prerequisitePortalIds,
    expectedPortals.slice(0, -1).map(portal=>portal.id)
  );
});

test("only designed portal content is launchable while every card keeps its collection metadata", ()=>{
  assert.equal(portals[0].contentStatus, "ready");
  assert.equal(portals[0].waves, 30);
  assert.equal(portals[1].contentStatus, "ready");
  assert.match(portals[1].contentLabel, /6 séries de 5/i);
  assert.match(portals[1].desc, /gains ×2/i);
  assert.equal(portals[1].waves, 30);
  assert.equal(portals[2].contentStatus, "ready");
  assert.equal(portals[2].waves, 30);
  assert.match(portals[2].contentLabel, /6 séries de 5/i);
  assert.match(portals[2].desc, /gains ×3/i);
  assert.equal(portals[3].contentStatus, "ready");
  assert.equal(portals[3].waves, 40);
  assert.match(portals[3].contentLabel, /10 groupes/i);
  assert.match(portals[3].desc, /élite final/i);
  assert.equal(portals[4].contentStatus, "ready");
  assert.match(portals[4].contentLabel, /3 zones/i);
  assert.match(portals[4].contentLabel, /3 boss/i);
  assert.match(portals[4].desc, /3 compartiments/i);
  assert.match(portals[4].desc, /3 minutes/i);
  assert.equal("waves" in portals[4], false);
  assert.equal(portals[5].contentStatus, "ready");
  assert.equal(portals[5].waves, 30);
  assert.equal(portals[5].waveBatchSize, 5);
  assert.match(portals[5].contentLabel, /station/i);
  assert.match(portals[5].desc, /bouclier/i);
  assert.match(portals[5].desc, /noyau/i);
  assert.equal(portals[6].contentStatus, "ready");
  assert.match(portals[6].contentLabel, /3 plan/i);
  assert.match(portals[6].contentLabel, /3 boss/i);
  assert.match(portals[6].desc, /trou noir/i);
  assert.equal(portals[7].contentStatus, "ready");
  assert.match(portals[7].contentLabel, /5 salles/i);
  assert.match(portals[7].contentLabel, /2 anges/i);
  assert.match(portals[7].desc, /talisman/i);
  assert.match(portals[7].desc, /Roi des démons/i);
  portals.slice(8).forEach(portal=>{
    assert.equal(portal.contentStatus, "to_define");
    assert.equal(portal.contentLabel, "Contenu à définir");
    assert.equal(portal.desc, "Contenu à définir.");
    assert.equal("waves" in portal, false);
  });
  portals.forEach(portal=>{
    assert.equal(portal.dropChance, 0.0033);
    assert.equal(portal.casterDropChance, 0.04);
    assert.ok(portal.pieceLabel);
    assert.ok(portal.pieceName);
  });
});

test("prepared world portal art is mapped for every catalogue id", ()=>{
  assert.deepEqual(Object.keys(PREPARED_PORTAL_ASSETS), expectedPortals.map(portal=>portal.id));
  expectedPortals.forEach(expected=>{
    assert.equal(
      PREPARED_PORTAL_ASSETS[expected.id].src,
      `assets/portals/${expected.image}${expected.image.endsWith(".svg") ? "" : "?v=20260726-kharon1"}`
    );
  });
});

test("portal cards gate only preparation and leave Space Caster selectable", async ()=>{
  const renderSource = await readFile(
    new URL("../../src/ui/renderPortals.js", import.meta.url),
    "utf8"
  );
  const styleSource = await readFile(
    new URL("../../src/styles/hangar.css", import.meta.url),
    "utf8"
  );

  assert.match(renderSource, /const contentReady = p\.contentStatus !== "to_define"/);
  assert.match(renderSource, /const canEnter = access\.canPrepare;/);
  assert.equal((renderSource.match(/\$\{casterAction\}/g) || []).length, 2);
  assert.match(renderSource, /data-portal-caster-select=/);
  assert.match(renderSource, /Contenu à définir/);
  assert.match(styleSource, /\.portal-content-status\.pending/);
});
