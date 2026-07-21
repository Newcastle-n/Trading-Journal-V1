const cache = {
  journal: null,
  strategies: null,
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
  const [journal, strategies, notes, booklet, plan, settings, backtests, mediaDates] = await Promise.all([
    getJson("/api/journal"),
    getJson("/api/strategies"),
    getJson("/api/notes"),
    getJson("/api/booklet").catch(() => getJson("/data/notes-booklet.json")),
    getJson("/data/plan.json"),
    getJson("/api/settings"),
    getJson("/data/backtests.json"),
    getJson("/api/media-dates").catch(() => ({ dates: [], folders: {}, ok: false })),
  ]);
  cache.journal = journal;
  cache.strategies = strategies;
  cache.notes = notes;
  cache.booklet = booklet;
  cache.plan = plan;
  cache.settings = settings;
  cache.backtests = backtests;
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

export async function refreshMediaDates() {
  const mediaDates = await getJson("/api/media-dates");
  cache.mediaDates = mediaDates;
  return mediaDates;
}

export async function openMediaFolder({ mediaPath, path, date, createIfMissing = false } = {}) {
  const folder = (mediaPath || path || "").trim();
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
