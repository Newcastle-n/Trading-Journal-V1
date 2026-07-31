import { formatPct, enrichEntries, enrichBacktestEntries } from "./config.js";

/** Map old wiki page ids → booklet chapter ids */
export function wikiSectionToChapter(section) {
  if (!section) return null;
  const map = {
    "quick-notes": "quick",
    quick: "quick",
    "plan-overview": "trading-plan",
    "trading-plan": "trading-plan",
    "legacy-mistakes": "mistakes",
    mistakes: "mistakes",
    "legacy-checklist": "checklist",
    checklist: "checklist",
    "check-presession": "checklist",
    "check-during": "checklist",
    "check-eod": "checklist",
    "legacy-strategies": "strategies",
    "strategies-index": "strategies",
    strategies: "strategies",
    lessons: "lessons",
    "important-notes": "important-notes",
  };
  if (map[section]) return map[section];
  if (String(section).startsWith("strat-")) return "strategies";
  return null;
}

export function buildSearchIndex(state) {
  const items = [];

  (state.journal?.entries || []).forEach((e) => {
    const en = enrichEntries([e])[0];
    items.push({
      type: "journal",
      id: e.id,
      title: `ژورنال ${e.date}`,
      subtitle: `${e.strategy || ""} · ${formatPct(en.pct)}`,
      action: { type: "view", view: "journal" },
    });
  });

  (state.backtests?.entries || []).forEach((e) => {
    const en = enrichBacktestEntries([e])[0];
    const wr = en.tradeStats?.decided ? formatPct(en.winrate, 0) : "—";
    items.push({
      type: "backtest",
      id: e.id,
      title: `بک‌تست ${e.date}`,
      subtitle: `${e.strategy || ""} · ${wr}`,
      action: { type: "view", view: "backtests" },
    });
  });

  [...(state.strategies?.primary || []), ...(state.strategies?.secondary || [])].forEach((s) => {
    items.push({
      type: "strategy",
      id: s.id,
      title: s.name,
      subtitle: s.description,
      action: { type: "view", view: "knowledge2", chapter: "strategies" },
    });
  });

  (state.booklet?.chapters || []).forEach((ch) => {
    items.push({
      type: "note",
      id: ch.id,
      title: ch.title,
      subtitle: ch.intro || "دانش",
      action: { type: "view", view: "knowledge2", chapter: ch.id },
    });
  });

  items.push(
    { type: "command", id: "c-new-j", title: "ثبت ژورنال جدید", subtitle: "ژورنال", action: { type: "new-journal" } },
    { type: "command", id: "c-new-bt", title: "ثبت بک‌تست جدید", subtitle: "بک‌تست", action: { type: "new-backtest" } },
    { type: "command", id: "c-dash", title: "رفتن به خانه", subtitle: "ناوبری", action: { type: "view", view: "dashboard" } },
    { type: "command", id: "c-plan", title: "پلن معاملاتی", subtitle: "دانش", action: { type: "view", view: "knowledge2", chapter: "trading-plan" } },
    { type: "command", id: "c-knowledge", title: "رفتن به دانش", subtitle: "ناوبری", action: { type: "view", view: "knowledge2" } },
    { type: "command", id: "c-morning", title: "چک لیست", subtitle: "روال", action: { type: "morning" } },
    { type: "command", id: "c-eod", title: "مرور پایان روز", subtitle: "روال", action: { type: "eod" } },
    { type: "command", id: "c-settings", title: "تنظیمات", subtitle: "فضای کاری", action: { type: "settings" } },
    { type: "command", id: "c-capture", title: "ثبت سریع نکته", subtitle: "نکته", action: { type: "capture" } },
  );

  return items;
}

export function filterSearch(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice(0, 12);
  return items
    .filter((i) => `${i.title} ${i.subtitle} ${i.type}`.toLowerCase().includes(q))
    .slice(0, 20);
}
