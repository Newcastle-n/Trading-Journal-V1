const cache = {
  journal: null,
  strategies: null,
  tradeFilters: null,
  notes: null,
  booklet: null,
  plan: null,
  settings: null,
  backtests: null,
  mediaDates: null,
};

async function getJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

async function postJson(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to save ${path}`);
  }
  return res.json();
}

export async function loadAll() {
  const [journal, strategies, tradeFilters, notes, booklet, plan, settings, backtests, mediaDates] = await Promise.all([
    getJson("/api/journal"),
    getJson("/api/strategies"),
    getJson("/api/trade-filters").catch(() => []),
    getJson("/api/notes"),
    getJson("/api/booklet").catch(() => getJson("/data/notes-booklet.json")),
    getJson("/data/plan.json"),
    getJson("/api/settings"),
    getJson("/api/backtests"),
    getJson("/api/media-dates").catch(() => ({ dates: [], folders: {}, ok: false })),
  ]);
  cache.journal = journal;
  cache.strategies = strategies;
  cache.tradeFilters = Array.isArray(tradeFilters) ? tradeFilters : [];
  cache.notes = notes;
  cache.booklet = booklet;
  cache.plan = plan;
  cache.settings = settings;
  cache.backtests = {
    entries: Array.isArray(backtests?.entries) ? backtests.entries : [],
  };
  cache.mediaDates = mediaDates;
  return cache;
}

export function getState() {
  return cache;
}

export async function saveJournal(journal) {
  const saved = await postJson("/api/journal", journal);
  cache.journal = saved;
  return saved;
}

export async function saveNotes(notes) {
  const saved = await postJson("/api/notes", notes);
  cache.notes = saved;
  return saved;
}

export async function saveBooklet(booklet) {
  const saved = await postJson("/api/booklet", booklet);
  cache.booklet = saved;
  return saved;
}

export async function saveSettings(settings) {
  const saved = await postJson("/api/settings", settings);
  cache.settings = settings;
  return saved;
}

export async function saveStrategies(strategies) {
  const saved = await postJson("/api/strategies", strategies);
  cache.strategies = saved;
  return saved;
}

export async function saveTradeFilters(tradeFilters) {
  const saved = await postJson("/api/trade-filters", tradeFilters);
  cache.tradeFilters = Array.isArray(saved) ? saved : tradeFilters;
  return cache.tradeFilters;
}

export async function saveBacktests(backtests) {
  const saved = await postJson("/api/backtests", backtests);
  cache.backtests = saved;
  return saved;
}

export function upsertBacktestEntry(entry) {
  const backtests = cache.backtests || { entries: [] };
  if (!Array.isArray(backtests.entries)) backtests.entries = [];
  const idx = backtests.entries.findIndex((e) => e.id === entry.id || e.date === entry.date);
  if (idx >= 0) backtests.entries[idx] = { ...backtests.entries[idx], ...entry };
  else backtests.entries.push(entry);
  backtests.entries.sort((a, b) => b.date.localeCompare(a.date));
  return backtests;
}

export function deleteBacktestEntry(id) {
  const backtests = cache.backtests || { entries: [] };
  backtests.entries = (backtests.entries || []).filter((e) => e.id !== id);
  return backtests;
}

export async function refreshMediaDates() {
  const mediaDates = await getJson("/api/media-dates");
  cache.mediaDates = mediaDates;
  return mediaDates;
}

function sanitizeMediaPath(value = "") {
  return String(value || "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

export async function openMediaFolder({ mediaPath, path, date, createIfMissing = false } = {}) {
  const folder = sanitizeMediaPath(mediaPath || path || "");
  const res = await fetch("/api/open-media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mediaPath: folder,
      path: folder,
      date: date || "",
      createIfMissing: Boolean(createIfMissing),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "باز کردن پوشه ممکن نشد");
  return data;
}

export async function setMediaSeen(date, seen = true) {
  const settings = { ...(cache.settings || {}) };
  const mediaSeen = { ...(settings.mediaSeen || {}) };
  if (seen) mediaSeen[date] = true;
  else delete mediaSeen[date];
  settings.mediaSeen = mediaSeen;
  return saveSettings(settings);
}

export async function setCalendarStarred(date, starred = true) {
  const settings = { ...(cache.settings || {}) };
  const calendarStarred = { ...(settings.calendarStarred || {}) };
  if (starred) calendarStarred[date] = true;
  else delete calendarStarred[date];
  settings.calendarStarred = calendarStarred;
  return saveSettings(settings);
}

export async function setCalendarBankHoliday(date, holiday = true) {
  const settings = { ...(cache.settings || {}) };
  const calendarBankHolidays = { ...(settings.calendarBankHolidays || {}) };
  if (holiday) calendarBankHolidays[date] = true;
  else delete calendarBankHolidays[date];
  settings.calendarBankHolidays = calendarBankHolidays;
  return saveSettings(settings);
}

export function upsertJournalEntry(entry) {
  const journal = cache.journal || { entries: [] };
  const idx = journal.entries.findIndex((e) => e.id === entry.id || e.date === entry.date);
  if (idx >= 0) journal.entries[idx] = { ...journal.entries[idx], ...entry };
  else journal.entries.push(entry);
  journal.entries.sort((a, b) => b.date.localeCompare(a.date));
  return journal;
}

export function deleteJournalEntry(id) {
  const journal = cache.journal || { entries: [] };
  journal.entries = journal.entries.filter((e) => e.id !== id);
  return journal;
}
