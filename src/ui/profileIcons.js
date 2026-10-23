const paths = {
  hull:'<path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>',
  shield:'<path d="m12 3 8 3v6c0 4.5-4.8 7.8-8 9-3.2-1.2-8-4.5-8-9V6l8-3ZM12 3v18"/>',
  regen:'<path d="m12 2 8 5v10l-8 5-8-5V7Z"/><path d="M12 2v20M4 7l16 10M20 7 4 17m8-9v8m-4-4h8"/>',
  absorb:'<path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10 9-5m-9 5L3 7m9 5v10M7 4l10 16M17 4 7 20"/>',
  speed:'<path d="m13 4 8 8-8 8M8 5l7 7-7 7M3 8l4 4-4 4"/>',
  cargo:'<path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10M7 4l10 6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 5v7l4 3"/>',
  kills:'<path d="M6 16c-2-1-3-4-3-6a9 9 0 0 1 18 0c0 2-1 5-3 6v5H6Z"/><circle cx="8" cy="10" r="2"/><circle cx="16" cy="10" r="2"/><path d="m10 16 2-3 2 3M10 19v2m4-2v2"/>',
  flag:'<path d="M4 22V2m0 2c6-5 10 5 16 0v11c-6 5-10-5-16 0"/>',
  star:'<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v7m0-12v1"/>',
  lock:'<rect x="6" y="10" width="12" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  check:'<circle cx="12" cy="12" r="10"/><path d="m7 12 3 3 7-7"/>',
  system:'<circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(-35 12 12)"/><circle cx="20" cy="5" r="1.5"/><path d="m5 2 .5 1.5L7 4l-1.5.5L5 6l-.5-1.5L3 4l1.5-.5Z"/>',
  ascension:'<circle cx="12" cy="12" r="10"/><path d="m12 3 9 16H3ZM8 15l4-7 4 7M7 19h10"/>'
};

export function profileIcon(name){
  return `<svg class="pilot-profile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.info}</svg>`;
}
