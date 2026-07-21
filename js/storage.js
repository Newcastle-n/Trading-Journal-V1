const cache = {
  journal: null,
  strategies: null,
  notes: null,
  plan: null,
  settings: null,
  backtests: null,
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
  const [journal, strategies, notes, plan, settings, backtests] = await Promise.all([
    getJson("/api/journal"),
    getJson("/api/strategies"),
    getJson("/api/notes"),
    getJson("/data/plan.json"),
    getJson("/api/settings"),
    getJson("/data/backtests.json"),
  ]);
  cache.journal = journal;
  cache.strategies = strategies;
  cache.notes = notes;
  cache.plan = plan;
  cache.settings = settings;
  cache.backtests = backtests;
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

export async function openMediaFolder({ mediaPath, path, date } = {}) {
  const folder = (mediaPath || path || "").trim();
  const res = await fetch("/api/open-media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaPath: folder, path: folder, date: date || "" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "باز کردن پوشه ممکن نشد");
  return data;
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
