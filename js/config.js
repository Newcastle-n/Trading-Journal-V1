export const config = {
  apiBase: "",
  defaultView: "dashboard",
};

/** Locale with Latin digits (1–9) while keeping Persian calendar/weekday names. */
export const FA_LATN = "fa-IR-u-nu-latn";

export const TRADE_OUTCOMES = [
  { value: "profit", label: "سود", badge: "badge--success" },
  { value: "loss", label: "ضرر", badge: "badge--loss" },
  { value: "riskFree", label: "ریسک‌فری", badge: "badge--orange" },
];

/** Strategy families for grouped selects / overviews. */
export const STRATEGY_GROUPS = [
  { id: "TR", label: "TR — Trading Range", test: (name) => /^TR[\W_]/i.test(name) },
  { id: "CH", label: "CH — Channel", test: (name) => /^CH[\W_]/i.test(name) },
  { id: "BE", label: "BE — Break Even", test: (name) => /^BE[\W_]/i.test(name) },
  { id: "RV", label: "RV — Reverse", test: (name) => /^RV[\W_]/i.test(name) },
  { id: "DRS", label: "D-R/S — Daily Support/Resistance", test: (name) => /^D-?R\/?S/i.test(name) },
  { id: "OTHER", label: "سایر", test: () => true },
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
  return TRADE_OUTCOMES.find((item) => item.value === value) || null;
}

export function normalizeOutcome(value) {
  return TRADE_OUTCOMES.some((item) => item.value === value) ? value : "";
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
    return entry.trades.map((trade) => ({
      ...trade,
      outcome: normalizeOutcome(trade.outcome),
    }));
  }
  if (entry.strategy || entry.emotion || entry.rr != null) {
    return [{
      strategy: entry.strategy || "",
      entryQuality: entry.entryQuality,
      exitQuality: entry.exitQuality,
      rr: entry.rr ?? 2,
      emotion: entry.emotion || "",
      notes: "",
      outcome: normalizeOutcome(entry.outcome),
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

/** Win rate from decided trades only (profit/loss). Risk-free is tracked separately. */
export function calcTradeWinrate(trades) {
  const list = trades || [];
  const wins = list.filter((t) => t.outcome === "profit").length;
  const losses = list.filter((t) => t.outcome === "loss").length;
  const riskFree = list.filter((t) => t.outcome === "riskFree").length;
  const decided = wins + losses;
  return {
    total: list.length,
    wins,
    losses,
    riskFree,
    decided,
    winrate: decided ? wins / decided : 0,
  };
}

export function calcStrategyStats(entries, strategies = []) {
  const byName = {};
  flattenTrades(entries).forEach((trade) => {
    const name = trade.strategy || "بدون استراتژی";
    (byName[name] ||= []).push(trade);
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

export function calcWindowStats(entries, predicate) {
  const list = enrichEntries(entries).filter((e) => predicate(parseISODate(e.date)));
  const pnl = list.reduce((s, e) => s + e.pnl, 0);
  const startBal = list.length ? Number(list[0].balanceStart) : 0;
  const pct = startBal ? pnl / startBal : 0;
  // RR همیشه ثابت است (2)؛ میانگین هم باید 2 بماند.
  const avgRr = list.length ? 2 : 0;
  const tradeStats = calcTradeWinrate(flattenTrades(list));
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
