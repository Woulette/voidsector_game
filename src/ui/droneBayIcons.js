const paths = {
  drone:'<circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/><path d="m6 5-2 3-1 4 2 5m13-12 2 3 1 4-2 5M8 3h8M8 21h8M8 5l-2-3m10 3 2-3M7 18l-2 3m12-3 2 3"/>',
  chip:'<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M8 1v4m4-4v4m4-4v4M8 19v4m4-4v4m4-4v4M1 8h4m-4 4h4m-4 4h4m14-8h4m-4 4h4m-4 4h4"/>',
  laser:'<path d="m4 16 10-10 4 4L8 20Zm8-8 4 4M3 21l3-3M17 3l4 4m-2-6v4m0 0h4"/>',
  shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Zm0 1v18"/>',
  lock:'<rect x="6" y="10" width="12" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  plus:'<path d="M12 3v18M3 12h18"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v7m0-12v1"/>',
  cart:'<path d="M2 3h3l3 12h11l3-9H6m3 13h.01M18 19h.01"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
  remove:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  chevron:'<path d="m7 10 5 5 5-5"/>',
  arrow:'<path d="M3 12h18m-7-7 7 7-7 7"/>'
};

export function droneBayIcon(name){
  return `<svg class="db-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.drone}</svg>`;
}
