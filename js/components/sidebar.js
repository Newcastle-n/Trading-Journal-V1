import {
  formatMoney,
  formatPct,
  todayISO,
  getMarketSession,
  calcStreak,
  calcWindowStats,
  enrichEntries,
  sameWeek,
} from "../config.js";
import { navigate } from "../router.js";
import { icon } from "./icons.js";

const NAV_ICONS = {
  dashboard: "dashboard",
  journal: "journal",
  knowledge: "knowledge",
  backtests: "backtests",
};

export function decorateNavIcons() {
  document.querySelectorAll("[data-nav] .nav-item__icon").forEach((el) => {
    const nav = el.closest("[data-nav]")?.getAttribute("data-nav");
    const name = NAV_ICONS[nav];
    if (name) el.outerHTML = icon(name, 18);
  });
}

export function renderSidebar(state) {
  const entries = state.journal?.entries || [];
  const enriched = enrichEntries(entries).sort((a, b) => a.date.localeCompare(b.date));
  const last = enriched[enriched.length - 1];
  const balance = last ? Number(last.balanceEnd) : 0;
  const now = new Date();
  const week = calcWindowStats(entries, (d) => sameWeek(d, now));
  const hasToday = entries.some((e) => e.date === todayISO());
  const streak = calcStreak(entries);

  const dateEl = document.getElementById("sidebar-date");
  const balEl = document.getElementById("sidebar-balance");
  const weekEl = document.getElementById("sidebar-week-pnl");
  const statusEl = document.getElementById("sidebar-day-status");

  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("fa-IR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }
  if (balEl) balEl.textContent = formatMoney(balance);
  if (weekEl) {
    weekEl.textContent = formatPct(week.pct);
    weekEl.className = `sidebar-stat__value num ${week.pnl >= 0 ? "profit" : "loss"}`;
  }
  if (statusEl) {
    statusEl.innerHTML = hasToday
      ? `<span class="badge badge--success">ژورنال امروز ثبت شد</span>`
      : `<span class="badge badge--warn">ژورنال امروز ثبت نشده</span>`;
  }

  const streakEl = document.getElementById("sidebar-streak");
  if (streakEl) streakEl.textContent = `${streak} روز متوالی`;

  decorateNavIcons();
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-nav") === location.hash.replace(/^#\/?/, "") || ( !location.hash && btn.getAttribute("data-nav") === "dashboard"));
  });
}

export function bindSidebar() {
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigate(btn.getAttribute("data-nav"));
      document.getElementById("sidebar")?.classList.remove("is-open");
    });
  });

  document.getElementById("btn-menu")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.toggle("is-open");
  });
}

export function renderSessionPill() {
  const el = document.getElementById("session-pill");
  if (!el) return;
  const s = getMarketSession();
  el.innerHTML = `
    <span class="session-pill__dot" style="${s.active ? "" : "background:var(--text-muted);box-shadow:none"}"></span>
    <span>${s.name}</span>
    <span class="num">${s.time}</span>
  `;
}

export function syncNavActive(view) {
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-nav") === view);
  });
}
