const paths = {
  gift:'<path d="M3 8h18v4H3Zm2 4v9h14v-9M12 8v13M12 8H7a3 3 0 1 1 3-3l2 3Zm0 0h5a3 3 0 1 0-3-3l-2 3Z"/>',
  ship:'<path d="m12 2 4 8 2 10-6-3-6 3 2-10 4-8Zm0 3v12M7 15l-4 5 4-1m10-4 4 5-4-1"/>',
  weapon:'<path d="m3 9 14-5 4 4-4 4-8 1-3 7-4-2 4-7m3-3 2 5m5-8 3 5"/>',
  ammo:'<path d="M5 3 3 7v14h5V7L5 3Zm10 0-3 4v14h6V7l-3-4ZM3 16h5m4 0h6"/>',
  generator:'<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 0v20M3 7l18 10M21 7 3 17"/>',
  drone:'<path d="m12 5 6 3v7l-6 4-6-4V8l6-3ZM9 11h6M12 8v7M3 6 1 3m20 3 2-3M3 18l-2 3m20-3 2 3"/>',
  extra:'<path d="m8 3 3 3-5 5-3-3 5-5Zm8 10 5 5-3 3-5-5m-6-1L17 5l3 3L10 18l-5 1 2-5Z"/>',
  booster:'<path d="m14 2-9 12h6l-1 8 9-12h-6l1-8Z"/>',
  premium:'<path d="m12 2 9 5v7c0 4-5 7-9 8-4-1-9-4-9-8V7l9-5Zm0 4-5 3v5l5 4 5-4V9l-5-3Z"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  hull:'<path d="m12 6-2-2a5 5 0 0 0-7 7l9 10 9-10a5 5 0 0 0-7-7l-2 2Z"/>',
  speed:'<path d="m13 4 8 8-8 8M8 5l7 7-7 7M3 8l4 4-4 4"/>',
  cargo:'<path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10"/>',
  shield:'<path d="m12 2 9 4v6c0 5-5 8-9 10-4-2-9-5-9-10V6l9-4Z"/>',
  regen:'<path d="M20 8a9 9 0 1 0 1 8M20 3v6h-6M12 7v10m-5-5h10"/>',
  rocket:'<path d="M21 3c-9-1-15 5-13 11l3 3c6 2 12-4 10-14ZM9 11l-5 1-2 6 6-1m6-1-1 6 6-2 1-5M6 18l-3 3"/><circle cx="16" cy="8" r="2"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v7m0-12v1"/>',
  star:'<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z"/>',
  arrow:'<path d="m9 5 7 7-7 7m-5-7h12"/>'
};
export function shopIcon(name){
  return `<svg class="shop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.info}</svg>`;
}
