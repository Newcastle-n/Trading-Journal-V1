// Minimal lucide-style icon set. Usage: icon("dashboard", 18)
const PATHS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  journal: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 19.5z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H21"/><path d="M9 7h7M9 11h5"/>',
  knowledge: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/>',
  backtests: '<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="7" rx="1"/><rect x="12" y="7" width="3" height="11" rx="1"/><rect x="17" y="13" width="3" height="5" rx="1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  capture: '<path d="M12 5v14M5 12h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  flame: '<path d="M12 2c1 3 4 5 4 9a4 4 0 0 1-8 0c0-1 .3-2 .8-2.7C9 9 9 7 12 2z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M16.8 16.8A9.8 9.8 0 0 1 12 19c-6.5 0-10-7-10-7a17.3 17.3 0 0 1 5.1-5.1"/><path d="M9.9 4.2A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.2 3.2"/><path d="m2 2 20 20"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.5l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  star: '<path d="M12 2l3 6.5 7 .9-5 4.8 1.3 7L12 17.8 5.7 21l1.3-7-5-4.8 7-.9z"/>',
  starOff: '<path d="M12 2l3 6.5 7 .9-5 4.8 1.3 7L12 17.8 5.7 21l1.3-7-5-4.8 7-.9z" fill="none"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  zap: '<path d="M13 2 3 14h7l-1 8 10-12h-7z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1z"/>',
  refresh: '<path d="M21 12a9 9 0 0 0-15.5-6.4"/><path d="M3 4v5h5"/><path d="M3 12a9 9 0 0 0 15.5 6.4"/><path d="M21 20v-5h-5"/>',
};

export function icon(name, size = 18, opts = {}) {
  const stroke = opts.stroke || "currentColor";
  const sw = opts.strokeWidth || 1.75;
  const fill = opts.fill || "none";
  const body = PATHS[name] || "";
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export function iconButton(name, { id, title, size = 18, cls = "" } = {}) {
  const idAttr = id ? `id="${id}"` : "";
  const titleAttr = title ? `title="${title}" aria-label="${title}"` : "";
  return `<button class="btn-icon ${cls}" type="button" ${idAttr} ${titleAttr}>${icon(name, size)}</button>`;
}
