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
