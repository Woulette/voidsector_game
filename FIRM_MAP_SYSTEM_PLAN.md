# Firm Map System Plan

## Goal

Build the galaxy map around 4 firms plus one central special map. Each firm owns a 5-map sector that reuses the ASTRA gameplay layout, portals, mobs, and progression logic, but with its own visual theme.

The current ASTRA sector is the reference source. Other firms are rotated copies of the same 5-map layout.

## Firm Themes

- ASTRA: dark red / hostile sector.
- CYAN: dark blue / cold sector.
- Yellow firm: yellow / industrial or radiant sector.
- Green firm: green / bio-tech or toxic sector.
- Central map: special neutral/core map, bigger and unique.

Names for the yellow and green firms are still to define.

## Sector Layout Rule

Each firm has 5 maps arranged like ASTRA, then rotated by 90 degrees depending on the firm's position around the central map.

ASTRA reference layout:

```text
3   5
2   4
1
```

CYAN is the same structure rotated 90 degrees compared to ASTRA.

The yellow and green firms continue the same 90 degree rotation rule so all four firms wrap around the central special map.

## Global Sketch

The intended global structure from the user sketch:

```text
CYAN sector             Yellow sector

1                      4   2       1

2   4                  5   3
3   5      [ CENTRAL ]

ASTRA sector           Green sector

3   5                  5   3
2   4                  4   2
1                                      1
```

This sketch is conceptual. Exact coordinates and minimap positions must keep the same portal offset rules currently used in ASTRA.

## Portal Coordinate Rule

The current standard portal offsets are:

- Left: `x:-4300`
- Right: `x:4300`
- Top: `y:-3300`
- Bottom: `y:3300`

Portals must keep the same distance from the map borders. Do not place portal dots closer or farther from the minimap edge unless the whole coordinate system changes.

## Current ASTRA Portal Logic

Known and accepted logic:

- ASTRA-01 top-right -> ASTRA-02 bottom-left.
- ASTRA-02 bottom-left -> ASTRA-01 top-right.
- ASTRA-02 top-left -> ASTRA-03 bottom-left.
- ASTRA-02 bottom-right -> ASTRA-04 bottom-left.
- ASTRA-03 bottom-right -> ASTRA-04 top-left.
- ASTRA-04 top-left -> ASTRA-03 bottom-right.
- ASTRA-03 top-right -> ASTRA-05 top-left.
- ASTRA-05 top-left -> ASTRA-03 top-right.
- ASTRA-04 top-right -> ASTRA-05 bottom-left.
- ASTRA-05 bottom-left -> ASTRA-04 top-right.

This ASTRA logic is the source pattern. Other firms should copy it after applying the firm rotation.

## Inter-Firm Portal Rule

Firm sectors connect through touching edges.

Example confirmed by the user:

- CYAN-03 bottom-left portal goes to ASTRA-03 top-left.
- The reverse portal should return from ASTRA-03 top-left to CYAN-03 bottom-left.

The same rule applies to every adjacent firm pair:

- If a sector is above another sector, its lower portals connect to the upper portals of the sector below.
- If a sector is right of another sector, its left portals connect to the right portals of the sector on the left.
- If a sector is below another sector, its upper portals connect to the lower portals of the sector above.
- If a sector is left of another sector, its right portals connect to the left portals of the sector on the right.

## Central Map Rule

There is one large special central map.

It has 4 entry sides:

- One side for ASTRA.
- One side for CYAN.
- One side for the yellow firm.
- One side for the green firm.

Each firm should have at least one portal that leads into the central map from its side. The central map returns players to the corresponding firm side.

Central map gameplay, theme, enemies, rewards, and exact portal positions are still to define.

## Reskin Rule For New Firm Maps

For each non-ASTRA firm map:

- Keep the same base map structure as the ASTRA equivalent.
- Keep the same mob composition unless explicitly changed later.
- Keep the same progression difficulty unless explicitly changed later.
- Keep the same portal logic after rotation.
- Change visuals only:
  - background colors,
  - nebula colors,
  - planet color,
  - glow/light colors,
  - map decor assets,
  - possibly station/portal tint.

Example:

- CYAN-01 is ASTRA-01 with a blue/dark theme.
- The red ASTRA planet becomes a blue CYAN planet.
- Red/orange nebula clouds become blue/cyan clouds.
- The map layout and enemy logic stay the same.

## Implementation Notes

The sector map UI is implemented and now displays the 4 firm sectors plus the central Core map.

Implemented base:

- ASTRA remains the hand-authored reference sector.
- CYAN, JAUNE, and VERTE are generated from ASTRA-01 to ASTRA-05.
- Each generated map keeps the ASTRA equivalent gameplay data: enemies, levels, drops, asteroids, and base structure.
- Generated maps receive firm-specific IDs:
  - CYAN: `20` to `24`.
  - JAUNE: `30` to `34`.
  - VERTE: `40` to `44`.
  - CORE: `50`.
- Existing firm planet assets are used:
  - CYAN: `assets/maps/decor/planet_cyan_blue.png`.
  - JAUNE: `assets/maps/decor/planet_solaris_yellow.png`.
  - VERTE: `assets/maps/decor/planet_virdis_green.png`.
- The generated portal graph currently has no missing target maps.

Current inter-sector/Core links:

- CYAN-04 top-right <-> JAUNE-04 top-left.
- ASTRA-03 top-left <-> CYAN-03 bottom-left.
- ASTRA-05 top-right <-> CYAN-05 bottom-right.
- ASTRA-04 bottom-right <-> VERTE-04 bottom-left.
- ASTRA-05 right <-> CORE left.
- CYAN-05 right <-> CORE top.
- JAUNE-05 left <-> CORE right.
- JAUNE-05 bottom-left <-> VERTE-05 top-left.
- JAUNE-03 bottom-right <-> VERTE-03 top-right.
- VERTE-05 left <-> CORE bottom.

## Open Decisions

- Official names for yellow and green firms.
- Exact name and theme of the central map.
- Whether central map is neutral, PvE boss, PvP danger zone, or story hub.
- Whether firm mobs are pure reskins or receive minor behavior/stat variants later.
- Final exact inter-firm portal list once all sectors are implemented.
