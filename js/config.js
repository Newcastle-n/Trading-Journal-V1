export const config = {
  apiBase: "",
  defaultView: "dashboard",
};

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

export function calcWindowStats(entries, predicate) {
  const list = enrichEntries(entries).filter((e) => predicate(parseISODate(e.date)));
  const pnl = list.reduce((s, e) => s + e.pnl, 0);
  const wins = list.filter((e) => e.pnl > 0).length;
  const startBal = list.length ? Number(list[0].balanceStart) : 0;
  const pct = startBal ? pnl / startBal : 0;
  const tradeRrs = list.flatMap((entry) => {
    if (Array.isArray(entry.trades)) {
      return entry.trades.map((trade) => Number(trade.rr)).filter(Number.isFinite);
    }
    const rr = Number(entry.rr);
    return Number.isFinite(rr) ? [rr] : [];
  });
  const avgRr =
    tradeRrs.length > 0 ? tradeRrs.reduce((sum, rr) => sum + rr, 0) / tradeRrs.length : 0;
  return {
    count: list.length,
    pnl,
    pct,
    winrate: list.length ? wins / list.length : 0,
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
  const time = now.toLocaleTimeString("fa-IR", {
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
