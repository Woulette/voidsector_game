import { getFirmIdFromMapName } from "../../data/firms.js";
import { CORE_MAP_ID, FIRM_PORTAL_POINT } from "./mapConstants.js";
import { buildCoreMap, buildFirmMaps } from "./firmMapBuilders.js";
import { firmMapId, getAstraTemplate, getInternalFirmMapName, portalFromDir } from "./mapUtils.js";

export function installSectorGraph(MAPS){  function upsertMaps(generatedMaps){
    generatedMaps.forEach(map=>{
      const existing = MAPS.findIndex(entry=>entry.id === map.id || entry.name === map.name);
      if(existing >= 0) MAPS[existing] = map;
      else MAPS.push(map);
    });
  }

  function addPortalIfMissing(map, portal){
    map.portals = Array.isArray(map.portals) ? map.portals : map.portal ? [map.portal] : [];
    delete map.portal;
    const exists = map.portals.some(existing=>
      existing.targetMap === portal.targetMap
      && existing.x === portal.x
      && existing.y === portal.y
    );
    if(!exists) map.portals.push(portal);
  }

  function addSectorBridge(fromMapName, fromDir, toMapName, toDir){
    const fromMap = MAPS.find(map=>map.name === fromMapName);
    const toMap = MAPS.find(map=>map.name === toMapName);
    if(!fromMap || !toMap) return;
    addPortalIfMissing(fromMap, portalFromDir({from:fromDir, toMap:toMap.id, to:toDir, label:`VERS ${toMap.name}`}));
    addPortalIfMissing(toMap, portalFromDir({from:toDir, toMap:fromMap.id, to:fromDir, label:`VERS ${fromMap.name}`}));
  }

  function getMapByName(name){
    return MAPS.find(map=>map.name === name);
  }

  function removePortalsTo(map, targetMapId){
    if(!map || targetMapId == null) return;
    map.portals = (Array.isArray(map.portals) ? map.portals : map.portal ? [map.portal] : [])
      .filter(portal=>portal.targetMap !== targetMapId);
    delete map.portal;
  }

  function removePortalAtDir(map, dir){
    if(!map) return;
    const point = FIRM_PORTAL_POINT[dir];
    if(!point) return;
    map.portals = (Array.isArray(map.portals) ? map.portals : map.portal ? [map.portal] : [])
      .filter(portal=>portal.x !== point.x || portal.y !== point.y);
    delete map.portal;
  }

  function resetZoneFourPortals(firm, crossFirm){
    const map4 = getMapByName(getInternalFirmMapName(firm, 4));
    const map2 = getMapByName(getInternalFirmMapName(firm, 2));
    const map3 = getMapByName(getInternalFirmMapName(firm, 3));
    const map5 = getMapByName(getInternalFirmMapName(firm, 5));
    const cross4 = getMapByName(getInternalFirmMapName(crossFirm, 4));
    if(!map4 || !map2 || !map3 || !map5 || !cross4) return;

    [map2, map3, map5, cross4].forEach(map=>removePortalsTo(map, map4.id));
    removePortalAtDir(map2, "bottomRight");
    removePortalAtDir(map3, "bottomRight");
    removePortalAtDir(map5, "bottomLeft");
    removePortalAtDir(cross4, "bottomRight");
    map4.portals = [
      portalFromDir({from:"bottomLeft", toMap:map2.id, to:"bottomRight", label:`VERS ${map2.name}`}),
      portalFromDir({from:"topLeft", toMap:map3.id, to:"bottomRight", label:`VERS ${map3.name}`}),
      portalFromDir({from:"topRight", toMap:map5.id, to:"bottomLeft", label:`VERS ${map5.name}`}),
      portalFromDir({from:"bottomRight", toMap:cross4.id, to:"bottomRight", label:`VERS ${cross4.name}`})
    ];
    addPortalIfMissing(map2, portalFromDir({from:"bottomRight", toMap:map4.id, to:"bottomLeft", label:`VERS ${map4.name}`}));
    addPortalIfMissing(map3, portalFromDir({from:"bottomRight", toMap:map4.id, to:"topLeft", label:`VERS ${map4.name}`}));
    addPortalIfMissing(map5, portalFromDir({from:"bottomLeft", toMap:map4.id, to:"topRight", label:`VERS ${map4.name}`}));
    addPortalIfMissing(cross4, portalFromDir({from:"bottomRight", toMap:map4.id, to:"bottomRight", label:`VERS ${map4.name}`}));
  }

  const ZONE_TWO_PORTAL_LAYOUT = {
    ASTRA:{to1:"bottomLeft", from1:"topRight", to3:"topLeft", from3:"bottomLeft", to4:"bottomRight", from4:"bottomLeft"},
    CYAN:{to1:"topLeft", from1:"bottomRight", to3:"bottomLeft", from3:"topLeft", to4:"topRight", from4:"topLeft"},
    JAUNE:{to1:"topRight", from1:"bottomLeft", to3:"bottomRight", from3:"topRight", to4:"topLeft", from4:"bottomLeft"},
    VERTE:{to1:"bottomRight", from1:"topLeft", to3:"topRight", from3:"bottomRight", to4:"bottomLeft", from4:"bottomRight"}
  };

  function resetZoneTwoPortals(firm){
    const layout = ZONE_TWO_PORTAL_LAYOUT[firm];
    const map1 = getMapByName(getInternalFirmMapName(firm, 1));
    const map2 = getMapByName(getInternalFirmMapName(firm, 2));
    const map3 = getMapByName(getInternalFirmMapName(firm, 3));
    const map4 = getMapByName(getInternalFirmMapName(firm, 4));
    if(!layout || !map1 || !map2 || !map3 || !map4) return;

    [map1, map3, map4].forEach(map=>removePortalsTo(map, map2.id));
    removePortalAtDir(map1, layout.from1);
    removePortalAtDir(map3, layout.from3);
    removePortalAtDir(map4, layout.from4);
    map2.portals = [
      portalFromDir({from:layout.to1, toMap:map1.id, to:layout.from1, label:`VERS ${map1.name}`}),
      portalFromDir({from:layout.to3, toMap:map3.id, to:layout.from3, label:`VERS ${map3.name}`}),
      portalFromDir({from:layout.to4, toMap:map4.id, to:layout.from4, label:`VERS ${map4.name}`})
    ];
    addPortalIfMissing(map1, portalFromDir({from:layout.from1, toMap:map2.id, to:layout.to1, label:`VERS ${map2.name}`}));
    addPortalIfMissing(map3, portalFromDir({from:layout.from3, toMap:map2.id, to:layout.to3, label:`VERS ${map2.name}`}));
    addPortalIfMissing(map4, portalFromDir({from:layout.from4, toMap:map2.id, to:layout.to4, label:`VERS ${map2.name}`}));
  }

  const ZONE_THREE_PORTAL_LAYOUT = {
    ASTRA:{to2:"bottomLeft", from2:"topLeft", to4:"bottomRight", from4:"topLeft", to5:"topRight", from5:"topLeft", crossFirm:"CYAN", crossFrom:"topLeft", crossTo:"bottomLeft"},
    CYAN:{to2:"topLeft", from2:"bottomLeft", to4:"topRight", from4:"bottomLeft", to5:"bottomRight", from5:"bottomLeft", crossFirm:"ASTRA", crossFrom:"bottomLeft", crossTo:"topLeft"},
    JAUNE:{to2:"topRight", from2:"bottomRight", to4:"topLeft", from4:"bottomRight", to5:"bottomLeft", from5:"bottomRight", crossFirm:"VERTE", crossFrom:"bottomRight", crossTo:"topRight"},
    VERTE:{to2:"bottomRight", from2:"topRight", to4:"bottomLeft", from4:"topLeft", to5:"topLeft", from5:"topRight", crossFirm:"JAUNE", crossFrom:"topRight", crossTo:"bottomRight"}
  };

  function resetZoneThreePortals(firm){
    const layout = ZONE_THREE_PORTAL_LAYOUT[firm];
    const map2 = getMapByName(getInternalFirmMapName(firm, 2));
    const map3 = getMapByName(getInternalFirmMapName(firm, 3));
    const map4 = getMapByName(getInternalFirmMapName(firm, 4));
    const map5 = getMapByName(getInternalFirmMapName(firm, 5));
    const cross3 = getMapByName(getInternalFirmMapName(layout?.crossFirm || "", 3));
    if(!layout || !map2 || !map3 || !map4 || !map5 || !cross3) return;

    [map2, map4, map5, cross3].forEach(map=>removePortalsTo(map, map3.id));
    removePortalAtDir(map2, layout.from2);
    removePortalAtDir(map4, layout.from4);
    removePortalAtDir(map5, layout.from5);
    removePortalAtDir(cross3, layout.crossTo);

    map3.portals = [
      portalFromDir({from:layout.to2, toMap:map2.id, to:layout.from2, label:`VERS ${map2.name}`}),
      portalFromDir({from:layout.to4, toMap:map4.id, to:layout.from4, label:`VERS ${map4.name}`}),
      portalFromDir({from:layout.to5, toMap:map5.id, to:layout.from5, label:`VERS ${map5.name}`}),
      portalFromDir({from:layout.crossFrom, toMap:cross3.id, to:layout.crossTo, label:`VERS ${cross3.name}`})
    ];
    addPortalIfMissing(map2, portalFromDir({from:layout.from2, toMap:map3.id, to:layout.to2, label:`VERS ${map3.name}`}));
    addPortalIfMissing(map4, portalFromDir({from:layout.from4, toMap:map3.id, to:layout.to4, label:`VERS ${map3.name}`}));
    addPortalIfMissing(map5, portalFromDir({from:layout.from5, toMap:map3.id, to:layout.to5, label:`VERS ${map3.name}`}));
    addPortalIfMissing(cross3, portalFromDir({from:layout.crossTo, toMap:map3.id, to:layout.crossFrom, label:`VERS ${map3.name}`}));
  }

  const ZONE_FIVE_PORTAL_LAYOUT = {
    ASTRA:{
      to3:"topLeft", from3:"topRight",
      to4:"bottomLeft", from4:"topRight",
      toUpper:"topRight", upper:"CYAN", upperFrom:"bottomRight",
      toCore:"top", coreFrom:"left",
      toLower:"bottomRight", lower:"VERTE", lowerFrom:"bottomLeft"
    },
    CYAN:{
      to3:"bottomLeft", from3:"bottomRight",
      to4:"topLeft", from4:"topRight",
      toUpper:"topRight", upper:"JAUNE", upperFrom:"topLeft",
      toCore:"right", coreFrom:"top",
      toLower:"bottomRight", lower:"ASTRA", lowerFrom:"topRight"
    },
    JAUNE:{
      to3:"bottomRight", from3:"bottomLeft",
      to4:"topRight", from4:"topRight",
      toUpper:"topLeft", upper:"CYAN", upperFrom:"topRight",
      toCore:"bottom", coreFrom:"right",
      toLower:"bottomLeft", lower:"VERTE", lowerFrom:"topLeft"
    },
    VERTE:{
      to3:"topRight", from3:"topLeft",
      to4:"bottomRight", from4:"topRight",
      toUpper:"topLeft", upper:"JAUNE", upperFrom:"bottomLeft",
      toCore:"left", coreFrom:"bottom",
      toLower:"bottomLeft", lower:"ASTRA", lowerFrom:"bottomRight"
    }
  };

  function resetZoneFivePortals(firm){
    const layout = ZONE_FIVE_PORTAL_LAYOUT[firm];
    const map3 = getMapByName(getInternalFirmMapName(firm, 3));
    const map4 = getMapByName(getInternalFirmMapName(firm, 4));
    const map5 = getMapByName(getInternalFirmMapName(firm, 5));
    const upper5 = getMapByName(getInternalFirmMapName(layout?.upper || "", 5));
    const lower5 = getMapByName(getInternalFirmMapName(layout?.lower || "", 5));
    const core = getMapByName("CORE");
    if(!layout || !map3 || !map4 || !map5 || !upper5 || !lower5 || !core) return;

    [map3, map4, upper5, lower5, core].forEach(map=>removePortalsTo(map, map5.id));
    removePortalAtDir(map3, layout.from3);
    removePortalAtDir(map4, layout.from4);
    removePortalAtDir(upper5, layout.upperFrom);
    removePortalAtDir(lower5, layout.lowerFrom);
    removePortalAtDir(core, layout.coreFrom);

    map5.portals = [
      portalFromDir({from:layout.to3, toMap:map3.id, to:layout.from3, label:`VERS ${map3.name}`}),
      portalFromDir({from:layout.to4, toMap:map4.id, to:layout.from4, label:`VERS ${map4.name}`}),
      portalFromDir({from:layout.toUpper, toMap:upper5.id, to:layout.upperFrom, label:`VERS ${upper5.name}`}),
      portalFromDir({from:layout.toCore, toMap:core.id, to:layout.coreFrom, label:"VERS CORE"}),
      portalFromDir({from:layout.toLower, toMap:lower5.id, to:layout.lowerFrom, label:`VERS ${lower5.name}`})
    ];
    addPortalIfMissing(map3, portalFromDir({from:layout.from3, toMap:map5.id, to:layout.to3, label:`VERS ${map5.name}`}));
    addPortalIfMissing(map4, portalFromDir({from:layout.from4, toMap:map5.id, to:layout.to4, label:`VERS ${map5.name}`}));
    addPortalIfMissing(upper5, portalFromDir({from:layout.upperFrom, toMap:map5.id, to:layout.toUpper, label:`VERS ${map5.name}`}));
    addPortalIfMissing(core, portalFromDir({from:layout.coreFrom, toMap:map5.id, to:layout.toCore, label:`VERS ${map5.name}`}));
    addPortalIfMissing(lower5, portalFromDir({from:layout.lowerFrom, toMap:map5.id, to:layout.toLower, label:`VERS ${map5.name}`}));
  }

  function resetCyanFourPortals(){
    const map2 = getMapByName("Nereid-02");
    const map3 = getMapByName("Nereid-03");
    const map4 = getMapByName("Nereid-04");
    const map5 = getMapByName("Nereid-05");
    const jaune4 = getMapByName("Aureon-04");
    if(!map2 || !map3 || !map4 || !map5 || !jaune4) return;

    [map2, map3, map5, jaune4].forEach(map=>removePortalsTo(map, map4.id));
    removePortalAtDir(map2, "topRight");
    removePortalAtDir(map3, "topRight");
    removePortalAtDir(map5, "topLeft");
    removePortalAtDir(jaune4, "topLeft");

    map4.portals = [
      portalFromDir({from:"topLeft", toMap:map2.id, to:"topRight", label:"VERS Nereid-02"}),
      portalFromDir({from:"bottomLeft", toMap:map3.id, to:"topRight", label:"VERS Nereid-03"}),
      portalFromDir({from:"topRight", toMap:jaune4.id, to:"topLeft", label:"VERS Aureon-04"}),
      portalFromDir({from:"bottomRight", toMap:map5.id, to:"topLeft", label:"VERS Nereid-05"})
    ];
    addPortalIfMissing(map2, portalFromDir({from:"topRight", toMap:map4.id, to:"topLeft", label:"VERS Nereid-04"}));
    addPortalIfMissing(map3, portalFromDir({from:"topRight", toMap:map4.id, to:"bottomLeft", label:"VERS Nereid-04"}));
    addPortalIfMissing(jaune4, portalFromDir({from:"topLeft", toMap:map4.id, to:"topRight", label:"VERS Nereid-04"}));
    addPortalIfMissing(map5, portalFromDir({from:"topLeft", toMap:map4.id, to:"bottomRight", label:"VERS Nereid-04"}));
  }

  function resetVerteFourAstraPortal(){
    const astra4 = getMapByName("Helion-04");
    const verte3 = getMapByName("Sylva-03");
    const verte4 = getMapByName("Sylva-04");
    const verte5 = getMapByName("Sylva-05");
    if(!astra4 || !verte3 || !verte4 || !verte5) return;

    removePortalsTo(verte4, astra4.id);
    removePortalsTo(astra4, verte4.id);
    removePortalsTo(verte4, verte3.id);
    removePortalsTo(verte3, verte4.id);
    removePortalsTo(verte4, verte5.id);
    removePortalsTo(verte5, verte4.id);
    removePortalAtDir(verte4, "topLeft");
    removePortalAtDir(verte4, "topRight");
    removePortalAtDir(verte3, "bottomLeft");
    removePortalAtDir(verte5, "bottomLeft");
    removePortalAtDir(verte5, "bottomRight");
    removePortalAtDir(verte4, "bottomLeft");
    removePortalAtDir(astra4, "bottomRight");

    addPortalIfMissing(verte4, portalFromDir({from:"topLeft", toMap:verte5.id, to:"bottomLeft", label:"VERS Sylva-05"}));
    addPortalIfMissing(verte5, portalFromDir({from:"bottomLeft", toMap:verte4.id, to:"topLeft", label:"VERS Sylva-04"}));
    addPortalIfMissing(verte4, portalFromDir({from:"topRight", toMap:verte3.id, to:"bottomLeft", label:"VERS Sylva-03"}));
    addPortalIfMissing(verte3, portalFromDir({from:"bottomLeft", toMap:verte4.id, to:"topRight", label:"VERS Sylva-04"}));
    addPortalIfMissing(verte4, portalFromDir({from:"bottomLeft", toMap:astra4.id, to:"bottomRight", label:"VERS Helion-04"}));
    addPortalIfMissing(astra4, portalFromDir({from:"bottomRight", toMap:verte4.id, to:"bottomLeft", label:"VERS Sylva-04"}));
  }

  function resetJauneFiveFourPortal(){
    const jaune2 = getMapByName("Aureon-02");
    const jaune4 = getMapByName("Aureon-04");
    const jaune5 = getMapByName("Aureon-05");
    const cyan5 = getMapByName("Nereid-05");
    if(!jaune2 || !jaune4 || !jaune5 || !cyan5) return;

    removePortalsTo(jaune5, cyan5.id);
    removePortalsTo(cyan5, jaune5.id);
    removePortalsTo(jaune5, jaune4.id);
    removePortalsTo(jaune4, jaune5.id);
    removePortalAtDir(jaune5, "topLeft");
    removePortalAtDir(jaune5, "topRight");
    removePortalAtDir(jaune4, "topRight");
    removePortalAtDir(jaune4, "bottomLeft");
    removePortalAtDir(cyan5, "topRight");

    addPortalIfMissing(jaune5, portalFromDir({from:"topLeft", toMap:jaune4.id, to:"bottomLeft", label:"VERS Aureon-04"}));
    addPortalIfMissing(jaune4, portalFromDir({from:"bottomLeft", toMap:jaune5.id, to:"topLeft", label:"VERS Aureon-05"}));
    addPortalIfMissing(jaune4, portalFromDir({from:"topRight", toMap:jaune2.id, to:"topLeft", label:"VERS Aureon-02"}));
    addPortalIfMissing(jaune2, portalFromDir({from:"topLeft", toMap:jaune4.id, to:"topRight", label:"VERS Aureon-04"}));
  }

  function removeExtraMapFivePortals(){
    const cyan4 = getMapByName("Nereid-04");
    const cyan5 = getMapByName("Nereid-05");
    const astra4 = getMapByName("Helion-04");
    const astra5 = getMapByName("Helion-05");
    if(cyan4 && cyan5){
      removePortalsTo(cyan5, cyan4.id);
      removePortalsTo(cyan4, cyan5.id);
      removePortalAtDir(cyan5, "topLeft");
      removePortalAtDir(cyan5, "topRight");
      removePortalAtDir(cyan4, "bottomRight");
      addPortalIfMissing(cyan5, portalFromDir({from:"topRight", toMap:cyan4.id, to:"bottomRight", label:"VERS Nereid-04"}));
      addPortalIfMissing(cyan4, portalFromDir({from:"bottomRight", toMap:cyan5.id, to:"topRight", label:"VERS Nereid-05"}));
    }
    if(astra4 && astra5){
      removePortalsTo(astra5, astra4.id);
      removePortalsTo(astra4, astra5.id);
      removePortalAtDir(astra5, "bottomLeft");
      removePortalAtDir(astra4, "topRight");
      addPortalIfMissing(astra4, portalFromDir({from:"topRight", toMap:astra5.id, to:"bottomRight", label:"VERS Helion-05"}));
      addPortalIfMissing(astra5, portalFromDir({from:"bottomRight", toMap:astra4.id, to:"topRight", label:"VERS Helion-04"}));
    }
  }

  function applySectorGraphPortals(){
    const graphMaps = MAPS.filter(map=>Boolean(map.firm || getFirmIdFromMapName(map.name)));
    graphMaps.forEach(map=>{ map.portals = []; delete map.portal; });

    const links = [
      ["Nereid-01", "bottomRight", "Nereid-02", "topLeft"],
      ["Nereid-02", "bottomLeft", "Nereid-03", "topLeft"],
      ["Nereid-02", "topRight", "Nereid-04", "topLeft"],
      ["Nereid-03", "topRight", "Nereid-04", "bottomLeft"],
      ["Nereid-03", "bottomRight", "Nereid-05", "bottomLeft"],
      ["Nereid-04", "topRight", "Aureon-04", "topLeft"],
      ["Nereid-04", "bottomRight", "Nereid-05", "topRight"],
      ["Nereid-05", "bottomRight", "Helion-05", "topRight"],

      ["Helion-01", "topRight", "Helion-02", "bottomLeft"],
      ["Helion-02", "topLeft", "Helion-03", "bottomLeft"],
      ["Helion-02", "bottomRight", "Helion-04", "bottomLeft"],
      ["Helion-03", "topLeft", "Nereid-03", "bottomLeft"],
      ["Helion-03", "topRight", "Helion-05", "topLeft"],
      ["Helion-03", "bottomRight", "Helion-04", "topLeft"],
      ["Helion-04", "topRight", "Helion-05", "bottomRight"],
      ["Helion-04", "bottomRight", "Sylva-04", "bottomLeft"],

      ["Aureon-01", "bottomLeft", "Aureon-02", "topRight"],
      ["Aureon-02", "topLeft", "Aureon-04", "topRight"],
      ["Aureon-02", "bottomRight", "Aureon-03", "topRight"],
      ["Aureon-03", "topLeft", "Aureon-04", "bottomRight"],
      ["Aureon-03", "bottomLeft", "Aureon-05", "bottomRight"],
      ["Aureon-03", "bottomRight", "Sylva-03", "topRight"],
      ["Aureon-04", "bottomLeft", "Aureon-05", "topLeft"],
      ["Aureon-05", "bottomLeft", "Sylva-05", "topLeft"],

      ["Sylva-01", "topLeft", "Sylva-02", "bottomRight"],
      ["Sylva-02", "topRight", "Sylva-03", "bottomRight"],
      ["Sylva-02", "bottomLeft", "Sylva-04", "bottomRight"],
      ["Sylva-03", "topLeft", "Sylva-05", "topRight"],
      ["Sylva-03", "bottomLeft", "Sylva-04", "topRight"],
      ["Sylva-04", "topLeft", "Sylva-05", "bottomLeft"],
      ["Sylva-05", "topLeft", "Aureon-05", "bottomLeft"]
    ];

    links.forEach(([fromName, fromDir, toName, toDir])=>{
      const fromMap = getMapByName(fromName);
      const toMap = getMapByName(toName);
      if(!fromMap || !toMap) return;
      addPortalIfMissing(fromMap, portalFromDir({from:fromDir, toMap:toMap.id, to:toDir, label:`VERS ${toMap.name}`}));
      addPortalIfMissing(toMap, portalFromDir({from:toDir, toMap:fromMap.id, to:fromDir, label:`VERS ${fromMap.name}`}));
    });

    const core = getMapByName("CORE");
    const coreLinks = [
      ["Helion-05", "top", "left"],
      ["Nereid-05", "right", "top"],
      ["Aureon-05", "bottom", "right"],
      ["Sylva-05", "left", "bottom"]
    ];
    coreLinks.forEach(([mapName, fromDir, coreDir])=>{
      const map = getMapByName(mapName);
      if(!map || !core) return;
      addPortalIfMissing(map, portalFromDir({from:fromDir, toMap:core.id, to:coreDir, label:"VERS CORE"}));
      addPortalIfMissing(core, portalFromDir({from:coreDir, toMap:map.id, to:fromDir, label:`VERS ${map.name}`}));
    });
  }

  upsertMaps([
    ...buildFirmMaps(MAPS, "CYAN"),
    ...buildFirmMaps(MAPS, "JAUNE"),
    ...buildFirmMaps(MAPS, "VERTE"),
    buildCoreMap(MAPS)
  ]);

  addPortalIfMissing(getAstraTemplate(MAPS, 3), portalFromDir({from:"topLeft", toMap:firmMapId("CYAN", 3), to:"bottomLeft", label:"VERS Nereid-03"}));
  addPortalIfMissing(getAstraTemplate(MAPS, 5), portalFromDir({from:"right", toMap:CORE_MAP_ID, to:"left", label:"VERS CORE"}));
  addPortalIfMissing(MAPS.find(map=>map.name === "Nereid-03"), portalFromDir({from:"bottomLeft", toMap:2, to:"topLeft", label:"VERS Helion-03"}));
  addPortalIfMissing(MAPS.find(map=>map.name === "Nereid-05"), portalFromDir({from:"right", toMap:CORE_MAP_ID, to:"top", label:"VERS CORE"}));
  addPortalIfMissing(MAPS.find(map=>map.name === "Aureon-05"), portalFromDir({from:"left", toMap:CORE_MAP_ID, to:"right", label:"VERS CORE"}));
  addPortalIfMissing(MAPS.find(map=>map.name === "Sylva-05"), portalFromDir({from:"left", toMap:CORE_MAP_ID, to:"bottom", label:"VERS CORE"}));

  addSectorBridge("Nereid-04", "topRight", "Aureon-04", "topLeft");
  addSectorBridge("Nereid-05", "bottomRight", "Helion-05", "topRight");
  addSectorBridge("Aureon-05", "bottomLeft", "Sylva-05", "topLeft");
  addSectorBridge("Aureon-03", "bottomRight", "Sylva-03", "topRight");
  addSectorBridge("Helion-04", "bottomRight", "Sylva-04", "bottomLeft");

  resetZoneFourPortals("ASTRA", "VERTE");
  resetZoneFourPortals("VERTE", "ASTRA");
  resetZoneFourPortals("CYAN", "JAUNE");
  resetZoneFourPortals("JAUNE", "CYAN");
  resetZoneTwoPortals("ASTRA");
  resetZoneTwoPortals("CYAN");
  resetZoneTwoPortals("JAUNE");
  resetZoneTwoPortals("VERTE");
  resetZoneThreePortals("ASTRA");
  resetZoneThreePortals("CYAN");
  resetZoneThreePortals("JAUNE");
  resetZoneThreePortals("VERTE");
  resetZoneFivePortals("ASTRA");
  resetZoneFivePortals("CYAN");
  resetZoneFivePortals("JAUNE");
  resetZoneFivePortals("VERTE");
  resetCyanFourPortals();
  resetVerteFourAstraPortal();
  resetJauneFiveFourPortal();
  removeExtraMapFivePortals();
  applySectorGraphPortals();
}
