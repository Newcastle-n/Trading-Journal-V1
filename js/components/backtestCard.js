import {
  DEFAULT_TRADE_FILTERS,
  escapeHtml,
  filterOutcomeMeta,
  filtersOfTrade,
  outcomeMeta,
  parseISODate,
  resolveTradeFilters,
  tradeFilterMeta,
} from "../config.js";
import { getState } from "../storage.js";

const dayNames = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

function filterCatalog() {
  const state = getState();
  return resolveTradeFilters(state?.tradeFilters?.length ? state.tradeFilters : DEFAULT_TRADE_FILTERS);
}

function tradesOf(entry) {
  if (Array.isArray(entry.trades) && entry.trades.length) return entry.trades;
  return [{
    strategy: entry.strategy || "",
    tradeFilter: entry.tradeFilter || "",
    filters: entry.filters,
    rr: entry.rr,
    notes: "",
    outcome: entry.outcome || "",
  }];
}

function filterRowsHtml(trade) {
  const rows = filtersOfTrade(trade).filter((row) => row.filter);
  if (!rows.length) {
    return `<span class="muted">بدون فیلتر</span>`;
  }
  return rows.map((row) => {
    const meta = tradeFilterMeta(row.filter, filterCatalog());
    const outcome = filterOutcomeMeta(row.outcome);
    return `
      <span class="trade-filter-chip">
        <span class="strategy-chip__swatch" style="background:${escapeHtml(meta?.color || "#546E7A")}"></span>
        <b>${escapeHtml(meta?.label || row.filter)}</b>
        ${outcome
          ? `<span class="badge ${outcome.badge}">${outcome.label}</span>`
          : `<span class="badge badge--warn">بدون نتیجه</span>`}
      </span>
    `;
  }).join("");
}

export function backtestCardHtml(entry, { strategyMap = {}, highlightStrategy = "" } = {}) {
  const date = parseISODate(entry.date);
  const trades = tradesOf(entry);
  const stats = entry.tradeStats || {};
  const resultClass = entry.dayResult === "profit" ? "profit" : entry.dayResult === "loss" ? "loss" : entry.dayResult === "flat" ? "flat" : "";
  const winrateText = stats.decided
    ? `${(stats.winrate * 100).toFixed(0)}% (${stats.wins}W/${stats.losses}L)`
    : "—";
  const badgeClass = entry.dayResult === "profit"
    ? "badge--success"
    : entry.dayResult === "loss"
      ? "badge--loss"
      : "badge--orange";

  return `
    <article class="card journal-card" data-backtest-id="${escapeHtml(entry.id)}">
      <div class="journal-card__top">
        <div>
          <h3 class="card__title u-mb-2">${escapeHtml(entry.date)} · ${dayNames[date.getDay()]}</h3>
          <div class="u-flex u-gap-2 u-items-center">
            <span class="badge ${badgeClass}">${escapeHtml(winrateText)}</span>
            <span class="muted u-text-xs num">${trades.length} معامله</span>
          </div>
        </div>
        <div class="u-flex u-gap-2">
          <button class="btn btn-orange btn-edit-wide" data-edit-backtest="${escapeHtml(entry.id)}">ویرایش</button>
          <button class="btn btn-danger" data-delete-backtest="${escapeHtml(entry.id)}">حذف</button>
        </div>
      </div>
      <div class="journal-card__grid">
        <div class="metric"><span class="metric__label">نرخ برد روز</span><span class="metric__value num ${resultClass}">${escapeHtml(winrateText)}</span></div>
        <div class="metric"><span class="metric__label">سود</span><span class="metric__value num">${stats.wins ?? 0}</span></div>
        <div class="metric"><span class="metric__label">ضرر</span><span class="metric__value num">${stats.losses ?? 0}</span></div>
        <div class="metric"><span class="metric__label">ریسک‌فری</span><span class="metric__value num">${stats.riskFree ?? 0}</span></div>
      </div>
      <div class="journal-trades">
        ${trades.map((trade, index) => {
          const strategy = strategyMap[trade.strategy] || {};
          const tradeOutcome = outcomeMeta(trade.outcome);
          const matchClass = highlightStrategy
            ? (trade.strategy === highlightStrategy ? " is-strategy-match" : " is-strategy-muted")
            : "";
          return `
            <div class="journal-trade${matchClass}">
              <div class="journal-trade__title">
                <span class="strategy-chip__swatch" style="background:${escapeHtml(strategy.color || "#34c5b1")}"></span>
                <strong>معامله ${index + 1} · ${escapeHtml(trade.strategy || "بدون استراتژی")}</strong>
                ${tradeOutcome
                  ? `<span class="badge ${tradeOutcome.badge}">${tradeOutcome.label}</span>`
                  : `<span class="badge badge--warn">بدون نتیجه</span>`}
              </div>
              <div class="journal-trade__filters">
                ${filterRowsHtml(trade)}
              </div>
              ${trade.notes ? `<p>${escapeHtml(trade.notes)}</p>` : ""}
            </div>
          `;
        }).join("")}
      </div>
      ${entry.notes ? `<p class="journal-card__notes"><strong class="muted">یادداشت:</strong> ${escapeHtml(entry.notes)}</p>` : ""}
    </article>
  `;
}
