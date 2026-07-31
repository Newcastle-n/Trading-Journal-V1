export const config = {
  apiBase: "",
  defaultView: "dashboard",
};

/** Default Live Trades folder when mediaBasePath / entry.mediaPath is empty. */
export const DEFAULT_MEDIA_BASE_PATH =
  "E:\\Desktop\\LevelsReaction\\SobhanSamadi System\\SSNT Live Trades";

/** Last year available in journal/backtest calendar year selects. */
export const CALENDAR_END_YEAR = 2030;

/**
 * Disk folder name under Live Trades: YYYY-M-D (unpadded month/day).
 * Example: 2026-07-30 → "2026-7-30"
 */
export function mediaFolderNameForDate(isoDate) {
  const parts = String(isoDate || "").trim().split("-");
  if (parts.length !== 3) return "";
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (![year, month, day].every((n) => Number.isFinite(n) && n > 0)) return "";
  return `${year}-${month}-${day}`;
}

/** Full default media path for a journal/backtest day: base\YYYY-M-D */
export function defaultMediaPathForDate(isoDate, basePath = DEFAULT_MEDIA_BASE_PATH) {
  const base = String(basePath || DEFAULT_MEDIA_BASE_PATH)
    .trim()
    .replace(/[\\/]+$/, "");
  const name = mediaFolderNameForDate(isoDate);
  if (!name) return base;
  return `${base}\\${name}`;
}

/** Year `<option>` list for calendars (through CALENDAR_END_YEAR). */
export function calendarYearOptionsHtml(selected, endYear = CALENDAR_END_YEAR) {
  const current = new Date().getFullYear();
  const selectedYear = Number(selected) || current;
  const start = Math.min(current - 5, selectedYear, endYear);
  const years = new Set();
  for (let year = start; year <= endYear; year += 1) years.add(year);
  years.add(selectedYear);
  return [...years]
    .sort((a, b) => b - a)
    .map((year) => `<option value="${year}" ${year === selectedYear ? "selected" : ""}>${year}</option>`)
    .join("");
}

/** Locale with Latin digits (1–9) while keeping Persian calendar/weekday names. */
export const FA_LATN = "fa-IR-u-nu-latn";

export const TRADE_OUTCOMES = [
  { value: "profit", label: "سود", badge: "badge--success" },
  { value: "loss", label: "ضرر", badge: "badge--loss" },
  { value: "riskFree", label: "ریسک‌فری", badge: "badge--orange" },
];

/** Per-filter outcomes on backtest trades. */
export const FILTER_OUTCOMES = [
  { value: "profit", label: "سود", badge: "badge--success" },
  { value: "loss", label: "ضرر", badge: "badge--loss" },
  { value: "noPositionPlus", label: "بدون موقعیت+", badge: "badge--teal" },
  { value: "noPositionMinus", label: "بدون موقعیت −", badge: "badge--orange" },
];

const NO_POSITION_OUTCOMES = new Set(["noPositionPlus", "noPositionMinus", "noPosition", "riskFree"]);

/** Default trade filters (seed / fallback when storage is empty). */
export const DEFAULT_TRADE_FILTERS = [
  {
    id: "filter-none",
    value: "None",
    label: "بدون فیلتر",
    color: "#607D8B",
    description: "معامله بدون اعمال فیلتر معاملاتی.",
  },
  {
    id: "filter-double-bo",
    value: "Double BO",
    label: "Double BO",
    color: "#2E7D32",
    description: "وقتی قیمت سطحی را می‌شکند، اندکی اصلاح می‌کند و دوباره HL کندل خودش را می‌شکند.",
  },
  {
    id: "filter-double-fbo",
    value: "Double FBO",
    label: "Double FBO",
    color: "#BF360C",
    description: "دقیقاً همان Double BO است، ولی روی FBOها.",
  },
  {
    id: "filter-3s",
    value: "3s",
    label: "3s",
    color: "#1565C0",
    description: "وقتی قیمت خودش را ۳ ثانیه بالا/پایین سطح نگه می‌دارد.",
  },
  {
    id: "filter-double-3s",
    value: "Double 3s",
    label: "Double 3s",
    color: "#6A1B9A",
    description: "همان 3s با این تفاوت که قیمت یک اصلاح می‌کند و سپس ۳ ثانیه خودش را نگه می‌دارد (در حال برگشت نباشد).",
  },
  {
    id: "filter-50-pullback-bo",
    value: "50% Pullback BO",
    label: "50% Pullback BO",
    color: "#C9A227",
    description: "وقتی قیمت سطحی را می‌شکند، 3s را رعایت می‌کند و به ۵۰٪ شکست خودش برمی‌گردد.",
  },
  {
    id: "filter-50-pullback-fbo",
    value: "50% Pullback FBO",
    label: "50% Pullback FBO",
    color: "#EF6C00",
    description: "وقتی FBO می‌شود، 3s را رعایت می‌کند و به ۵۰٪ شکست خودش برمی‌گردد.",
  },
];

/** @deprecated Prefer resolveTradeFilters(state) — kept for callers that still import TRADE_FILTERS. */
export const TRADE_FILTERS = DEFAULT_TRADE_FILTERS;

/** Older saved values mapped to the current filter names. */
const LEGACY_TRADE_FILTERS = {
  "3 Second": "3s",
  "50% FBO Pullback": "50% Pullback FBO",
  "بدون فیلتر": "None",
};

/** Normalize a stored trade-filters payload into the catalog shape. */
export function resolveTradeFilters(filters) {
  const list = Array.isArray(filters) && filters.length ? filters : DEFAULT_TRADE_FILTERS;
  return list.map((item, index) => {
    const value = String(item.value || item.name || item.label || "").trim();
    const label = String(item.label || item.name || value).trim() || value;
    return {
      id: item.id || `filter-${index}-${value}`,
      value,
      label,
      color: item.color || "#546E7A",
      description: item.description || "",
    };
  }).filter((item) => item.value);
}

/** Strategy families for grouped selects / overviews. */
export const STRATEGY_GROUPS = [
  { id: "TR", label: "TR — Trading Range", color: "#f0883e", textColor: "#f0883e", test: (name) => /^TR[\W_]/i.test(name) },
  { id: "CH", label: "CH — Channel", color: "#4fd487", textColor: "#4fd487", test: (name) => /^CH[\W_]/i.test(name) },
  { id: "BE", label: "BE — Break Even", color: "#5b9bd5", textColor: "#5b9bd5", test: (name) => /^BE[\W_]/i.test(name) },
  { id: "RV", label: "RV — Reverse", color: "#a78bfa", textColor: "#a78bfa", test: (name) => /^RV[\W_]/i.test(name) },
  { id: "DRS", label: "D-R/S — Daily Support/Resistance", color: "#3d5a80", textColor: "#7a9cc5", test: (name) => /^D-?R\/?S/i.test(name) },
  { id: "PB", label: "Pullback", color: "#a67c52", textColor: "#c4a07a", test: (name) => /pullback/i.test(name) },
  { id: "OTHER", label: "سایر", color: "#b0c3bc", textColor: "#b0c3bc", test: () => true },
];

export function strategyGroupId(name = "") {
  return STRATEGY_GROUPS.find((group) => group.test(String(name)))?.id || "OTHER";
}

export function groupStrategies(strategies = []) {
  const buckets = Object.fromEntries(STRATEGY_GROUPS.map((group) => [group.id, []]));
  strategies.forEach((strategy) => {
    buckets[strategyGroupId(strategy.name)].push(strategy);
  });
  return STRATEGY_GROUPS
    .map((group) => ({
      ...group,
      strategies: buckets[group.id].sort((a, b) => a.name.localeCompare(b.name, "en")),
    }))
    .filter((group) => group.strategies.length);
}

export function outcomeMeta(value) {
  return TRADE_OUTCOMES.find((item) => item.value === value)
    || FILTER_OUTCOMES.find((item) => item.value === value)
    || null;
}

export function normalizeOutcome(value) {
  return TRADE_OUTCOMES.some((item) => item.value === value) ? value : "";
}

export function normalizeFilterOutcome(value) {
  // Legacy single "noPosition" / risk-free → بدون موقعیت+
  if (value === "riskFree" || value === "noPosition") return "noPositionPlus";
  return FILTER_OUTCOMES.some((item) => item.value === value) ? value : "";
}

export function isNoPositionOutcome(value) {
  return NO_POSITION_OUTCOMES.has(String(value || ""));
}

export function filterOutcomeMeta(value) {
  const normalized = normalizeFilterOutcome(value);
  return FILTER_OUTCOMES.find((item) => item.value === normalized) || null;
}

export function normalizeTradeFilter(value, catalog = null) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const mapped = LEGACY_TRADE_FILTERS[raw] || raw;
  if (!catalog) return mapped;
  const list = resolveTradeFilters(catalog);
  return list.some((item) => item.value === mapped) ? mapped : "";
}

export function tradeFilterMeta(value, catalog = null) {
  const list = resolveTradeFilters(catalog);
  const normalized = normalizeTradeFilter(value);
  if (!normalized) return null;
  return list.find((item) => item.value === normalized)
    || DEFAULT_TRADE_FILTERS.find((item) => item.value === normalized)
    || { value: normalized, label: normalized, color: "#546E7A", description: "" };
}

/** Normalize filter rows on a trade; empty when no explicit filters[] array. */
export function filtersOfTrade(trade = {}) {
  if (!Array.isArray(trade.filters) || !trade.filters.length) return [];
  const seen = new Set();
  return trade.filters
    .map((row) => ({
      filter: normalizeTradeFilter(row.filter ?? row.tradeFilter),
      outcome: normalizeFilterOutcome(row.outcome),
    }))
    .filter((row) => {
      if (!row.filter || seen.has(row.filter)) return false;
      seen.add(row.filter);
      return true;
    });
}

/**
 * Outcome units for trade / strategy winrate: one unit per trade.
 * Filter rows never count toward trade W/L/RF.
 */
export function outcomeUnitsOfTrade(trade = {}) {
  const outcome = normalizeOutcome(trade.outcome);
  if (!outcome) return [];
  const filters = filtersOfTrade(trade);
  return [{
    strategy: trade.strategy || "",
    tradeFilter: normalizeTradeFilter(trade.tradeFilter) || filters[0]?.filter || "",
    outcome,
  }];
}

/**
 * Outcome units for per-filter winrate only.
 * Backtest trades with a filters[] array use those row outcomes;
 * journal-style trades attribute the trade outcome to their single tradeFilter.
 */
export function filterOutcomeUnitsOfTrade(trade = {}) {
  if (Array.isArray(trade.filters) && trade.filters.length) {
    return filtersOfTrade(trade)
      .filter((row) => row.filter && row.outcome)
      .map((row) => ({
        strategy: trade.strategy || "",
        tradeFilter: row.filter,
        outcome: row.outcome,
      }));
  }
  const filter = normalizeTradeFilter(trade.tradeFilter);
  const outcome = normalizeOutcome(trade.outcome);
  if (!filter || !outcome) return [];
  return [{
    strategy: trade.strategy || "",
    tradeFilter: filter,
    outcome,
  }];
}

export function flattenOutcomeUnits(entries) {
  return (entries || []).flatMap((entry) => (
    tradesOfEntry(entry).flatMap((trade) => (
      outcomeUnitsOfTrade(trade).map((unit) => ({
        ...unit,
        date: entry.date,
        entryId: entry.id,
        tradeId: trade.id,
      }))
    ))
  ));
}

export function flattenFilterOutcomeUnits(entries) {
  return (entries || []).flatMap((entry) => (
    tradesOfEntry(entry).flatMap((trade) => (
      filterOutcomeUnitsOfTrade(trade).map((unit) => ({
        ...unit,
        date: entry.date,
        entryId: entry.id,
        tradeId: trade.id,
      }))
    ))
  ));
}

/** Win = +2 TP, loss = −1. Net TP drives day/week card color. */
export function tpScoreOf(stats = {}) {
  return (Number(stats.wins) || 0) * 2 - (Number(stats.losses) || 0);
}

export function dayResultFromStats(stats = {}) {
  const tp = tpScoreOf(stats);
  if (tp > 0) return "profit";
  if (tp < 0) return "loss";
  return "flat";
}

/** Enrich backtest day entries with trade-outcome winrate (filters excluded). */
export function enrichBacktestEntries(entries) {
  return (entries || []).map((entry) => {
    const tradeStats = calcTradeWinrate(flattenOutcomeUnits([entry]));
    const tpScore = tpScoreOf(tradeStats);
    return {
      ...entry,
      tradeStats: { ...tradeStats, tpScore },
      dayResult: dayResultFromStats(tradeStats),
      tpScore,
      winrate: tradeStats.winrate,
    };
  });
}


export function formatMoney(n, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPct(n, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(digits)}%`;
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function sameWeek(a, b) {
  return startOfWeek(a).getTime() === startOfWeek(b).getTime();
}

export function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function pnlOf(entry) {
  const start = Number(entry.balanceStart);
  const end = Number(entry.balanceEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === 0) {
    return { pnl: 0, pct: 0 };
  }
  const pnl = end - start;
  return { pnl, pct: pnl / start };
}

export function enrichEntries(entries) {
  return (entries || []).map((e) => {
    const { pnl, pct } = pnlOf(e);
    return { ...e, pnl, pct };
  });
}

export function tradesOfEntry(entry = {}) {
  if (Array.isArray(entry.trades) && entry.trades.length) {
    return entry.trades.map((trade) => {
      const filters = filtersOfTrade(trade);
      return {
        ...trade,
        filters,
        tradeFilter: filters[0]?.filter || normalizeTradeFilter(trade.tradeFilter),
        outcome: normalizeOutcome(trade.outcome),
      };
    });
  }
  if (entry.strategy || entry.tradeFilter || entry.emotion || entry.rr != null) {
    const trade = {
      strategy: entry.strategy || "",
      tradeFilter: normalizeTradeFilter(entry.tradeFilter),
      entryQuality: entry.entryQuality,
      exitQuality: entry.exitQuality,
      rr: entry.rr ?? 2,
      emotion: entry.emotion || "",
      notes: "",
      outcome: normalizeOutcome(entry.outcome),
      filters: entry.filters,
    };
    const filters = filtersOfTrade(trade);
    return [{
      ...trade,
      filters,
      tradeFilter: filters[0]?.filter || trade.tradeFilter,
      outcome: trade.outcome,
    }];
  }
  return [];
}

export function flattenTrades(entries) {
  return (entries || []).flatMap((entry) => (
    tradesOfEntry(entry).map((trade) => ({
      ...trade,
      date: entry.date,
      entryId: entry.id,
    }))
  ));
}

/** Win rate from decided outcomes only (profit/loss). No-position variants are excluded. */
export function calcTradeWinrate(trades) {
  const list = trades || [];
  const wins = list.filter((t) => t.outcome === "profit").length;
  const losses = list.filter((t) => t.outcome === "loss").length;
  const riskFree = list.filter((t) => t.outcome === "riskFree").length;
  const noPositionPlus = list.filter((t) => t.outcome === "noPositionPlus").length;
  const noPositionMinus = list.filter((t) => t.outcome === "noPositionMinus").length;
  const noPositionLegacy = list.filter((t) => t.outcome === "noPosition").length;
  const noPosition = noPositionPlus + noPositionMinus + noPositionLegacy;
  const decided = wins + losses;
  return {
    total: list.length,
    wins,
    losses,
    riskFree,
    noPositionPlus,
    noPositionMinus,
    noPosition,
    skipped: riskFree + noPosition,
    decided,
    winrate: decided ? wins / decided : 0,
  };
}

export function calcStrategyStats(entries, strategies = []) {
  const byName = {};
  flattenOutcomeUnits(entries).forEach((unit) => {
    const name = unit.strategy || "بدون استراتژی";
    (byName[name] ||= []).push(unit);
  });
  const names = new Set([
    ...strategies.map((s) => s.name).filter(Boolean),
    ...Object.keys(byName),
  ]);
  return [...names]
    .map((name) => {
      const strategy = strategies.find((s) => s.name === name) || {};
      return {
        name,
        color: strategy.color || "#34c5b1",
        description: strategy.description || "",
        id: strategy.id || "",
        ...calcTradeWinrate(byName[name] || []),
      };
    })
    .sort((a, b) => b.decided - a.decided || a.name.localeCompare(b.name, "fa"));
}

/** Win rates per trade filter, scoped to the given journal or backtest entries. */
export function calcTradeFilterStats(entries, filters = DEFAULT_TRADE_FILTERS) {
  const catalog = resolveTradeFilters(filters);
  const byName = {};
  flattenFilterOutcomeUnits(entries).forEach((unit) => {
    const name = normalizeTradeFilter(unit.tradeFilter);
    if (!name) return;
    (byName[name] ||= []).push(unit);
  });
  const names = new Set([
    ...catalog.map((item) => item.value).filter(Boolean),
    ...Object.keys(byName),
  ]);
  return [...names]
    .map((name) => {
      const filter = tradeFilterMeta(name, catalog) || {};
      return {
        name,
        color: filter.color || "#546E7A",
        description: filter.description || "",
        label: filter.label || name,
        id: filter.id || "",
        ...calcTradeWinrate(byName[name] || []),
      };
    })
    .sort((a, b) => b.decided - a.decided || a.name.localeCompare(b.name, "en"));
}

export function calcWindowStats(entries, predicate) {
  const list = enrichEntries(entries).filter((e) => predicate(parseISODate(e.date)));
  const pnl = list.reduce((s, e) => s + e.pnl, 0);
  const startBal = list.length ? Number(list[0].balanceStart) : 0;
  const pct = startBal ? pnl / startBal : 0;
  // RR همیشه ثابت است (2)؛ میانگین هم باید 2 بماند.
  const avgRr = list.length ? 2 : 0;
  const tradeStats = calcTradeWinrate(flattenOutcomeUnits(list));
  return {
    count: list.length,
    pnl,
    pct,
    winrate: tradeStats.winrate,
    tradeStats,
    avgRr,
    list,
  };
}

export function calcStreak(entries) {
  const days = new Set((entries || []).map((e) => e.date));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const todayKey = todayISO();
  if (!days.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (true) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${d}`;
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getMarketSession(now = new Date()) {
  const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
  // Approximate: London 07–16 UTC, New York 13–22 UTC
  const london = utcH >= 7 && utcH < 16;
  const ny = utcH >= 13 && utcH < 22;
  let name = "خارج از سشن";
  if (london && ny) name = "لندن + نیویورک";
  else if (london) name = "لندن";
  else if (ny) name = "نیویورک";
  const time = now.toLocaleTimeString(FA_LATN, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { name, time, active: london || ny };
}

export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Entries shown per page on journal / backtest lists. */
export const LIST_PAGE_SIZE = 10;

export function paginateItems(items = [], page = 1, pageSize = LIST_PAGE_SIZE) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = total ? (safePage - 1) * pageSize : 0;
  const slice = list.slice(start, start + pageSize);
  return {
    page: safePage,
    totalPages,
    total,
    pageSize,
    start,
    end: start + slice.length,
    items: slice,
  };
}

export function paginationControlsHtml(pager, { emptyLabel = "" } = {}) {
  if (!pager.total) {
    return emptyLabel
      ? `<div class="list-pagination list-pagination--empty muted u-text-sm">${escapeHtml(emptyLabel)}</div>`
      : "";
  }
  if (pager.totalPages <= 1) return "";
  const range = pager.start + 1 === pager.end
    ? `${pager.end}`
    : `${pager.start + 1}–${pager.end}`;
  const prevDisabled = pager.page <= 1 ? "disabled" : "";
  const nextDisabled = pager.page >= pager.totalPages ? "disabled" : "";
  const pages = [];
  const windowSize = 2;
  let last = 0;
  for (let i = 1; i <= pager.totalPages; i += 1) {
    const show = i === 1 || i === pager.totalPages || Math.abs(i - pager.page) <= windowSize;
    if (!show) continue;
    if (last && i - last > 1) {
      pages.push(`<span class="list-pagination__ellipsis muted">…</span>`);
    }
    pages.push(`
      <button type="button" class="btn btn-ghost list-pagination__page ${i === pager.page ? "is-active" : ""}" data-page="${i}" ${i === pager.page ? 'aria-current="page"' : ""}>${i}</button>
    `);
    last = i;
  }
  return `
    <nav class="list-pagination" aria-label="صفحه‌بندی">
      <button type="button" class="btn btn-soft" data-page-action="prev" ${prevDisabled}>قبلی</button>
      <div class="list-pagination__meta">
        <span class="num">صفحه ${pager.page} از ${pager.totalPages}</span>
        <span class="muted u-text-xs num">${range} از ${pager.total}</span>
      </div>
      <div class="list-pagination__pages">${pages.join("")}</div>
      <button type="button" class="btn btn-soft" data-page-action="next" ${nextDisabled}>بعدی</button>
    </nav>
  `;
}
