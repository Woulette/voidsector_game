const paths = {
  damage:'<path d="m12 2 2.2 6 4.8-3-1.8 7 4.3-1.5-6 10-1.5-7-3 5-1-6L3 15l3-6 2 2Z"/>',
  target:'<circle cx="12" cy="12" r="8"/><path d="M12 1v6m0 10v6M1 12h6m10 0h6"/>',
  shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="M12 3v18"/>',
  utility:'<path d="M14 5a5 5 0 0 0-6 6L2 17a3.5 3.5 0 0 0 5 5l6-6a5 5 0 0 0 6-6l-4 3-4-4 3-4Z"/>',
  rocket:'<path d="M9 15h6l1-5-4-8-4 8Zm0 0-4 3v-5l3-3m7 5 4 3v-5l-3-3M10 18l-1 4m5-4 1 4M12 8v3"/>',
  lock:'<rect x="6" y="10" width="12" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  check:'<circle cx="12" cy="12" r="10"/><path d="m7 12 3 3 7-7"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v7m0-12v1"/>',
  arrow:'<path d="m8 4 8 8-8 8"/>',
  point:'<path d="m12 2 9 5v10l-9 5-9-5V7Z"/><path d="m12 7 4 3v5l-4 3-4-3v-5Z"/>',
  gear:'<path d="m10 2 4 0 1 3 3 2 3 0 2 4-2 2-1 3 1 3-4 2-2-2-3-1-3 1-2-4 2-2 1-3-1-3 4-2Z"/><circle cx="12" cy="12" r="4"/>',
  circle:'<circle cx="12" cy="12" r="9"/>',
  material:'<path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10 9-5m-9 5L3 7m9 5v10"/>'
};

export function skillTreeIcon(name){
  return `<svg class="skill-tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.target}</svg>`;
}

// Branch emblems have their own silhouettes; the small node icons keep their 24 px geometry.
const branchEmblems = {
  damage:`<defs><linearGradient id="skill-branch-damage-flare" x1="18" y1="7" x2="45" y2="59" gradientUnits="userSpaceOnUse"><stop stop-color="#ffad7e"/><stop offset=".46" stop-color="#ff7952"/><stop offset="1" stop-color="#ef543b"/></linearGradient></defs>
    <path fill="url(#skill-branch-damage-flare)" stroke="none" d="M32 3 38 27 52 15 44 35 59 30 45 45 50 44 38 56 41 42 49 37 37 40 32 28 26 40 15 37 23 43 26 56 14 46 19 46 5 30 20 35 12 15 26 27Z"/>
    <path fill="url(#skill-branch-damage-flare)" stroke="none" d="m33 36-9 14h7l-3 12 14-20h-8l4-6Z"/>
    <path fill="#ffd4ad" fill-opacity=".32" stroke="none" d="m32 3-6 24 6-12 6 12Z"/>`,
  shield:`<defs><linearGradient id="skill-branch-shield-edge" x1="14" y1="9" x2="49" y2="54" gradientUnits="userSpaceOnUse"><stop stop-color="#8bdbff"/><stop offset=".5" stop-color="#53bdff"/><stop offset="1" stop-color="#2d9de6"/></linearGradient></defs>
    <path fill="#2595dc" fill-opacity=".17" stroke="none" d="M32 8c-7 5-14 8-22 10v13c0 12 8 21 22 28Z"/>
    <path fill="#163d61" fill-opacity=".2" stroke="none" d="M32 8c7 5 14 8 22 10v13c0 12-8 21-22 28Z"/>
    <path fill="none" stroke="url(#skill-branch-shield-edge)" stroke-width="3.8" stroke-linejoin="miter" d="M32 7c-7 5-14 8-22 10v14c0 12 8 21 22 28 14-7 22-16 22-28V17c-8-2-15-5-22-10Z"/>
    <path fill="none" stroke="url(#skill-branch-shield-edge)" stroke-width="3.1" d="M32 8v49"/>
    <path fill="none" stroke="#a5e7ff" stroke-opacity=".3" stroke-width="1" d="M15 20v11c0 9 5 16 13 22"/>`,
  utility:`<defs><linearGradient id="skill-branch-utility-edge" x1="17" y1="53" x2="44" y2="9" gradientUnits="userSpaceOnUse"><stop stop-color="#24c9b9"/><stop offset=".48" stop-color="#35f0d5"/><stop offset="1" stop-color="#7dffe6"/></linearGradient></defs>
    <path fill="#25d7c4" fill-opacity=".07" stroke="url(#skill-branch-utility-edge)" stroke-width="3.8" stroke-linejoin="round" d="M42 7c-7-2-14 0-19 5-4 5-5 12-2 18L8 43a8.5 8.5 0 0 0 12 12l13-13c6 3 14 1 19-4s7-13 5-20L46 29 33 16Z"/>
    <circle cx="14" cy="49" r="2.7" fill="none" stroke="url(#skill-branch-utility-edge)" stroke-width="2.4"/>
    <path fill="none" stroke="#adffed" stroke-opacity=".34" stroke-width="1" d="m20 43 9-9m-4-18c-2 3-3 6-2 9"/>`
};

export function skillTreeBranchIcon(name){
  return `<svg class="skill-tree-icon skill-tree-branch-emblem" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">${branchEmblems[name] || branchEmblems.damage}</svg>`;
}
