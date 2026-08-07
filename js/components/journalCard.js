import {
  DEFAULT_TRADE_FILTERS,
  escapeHtml,
  filterOutcomeMeta,
  filtersOfTrade,
  formatMoney,
  formatPct,
  outcomeMeta,
  parseISODate,
  resolveTradeFilters,
  tradeFilterMeta,
} from "../config.js";
import { getState } from "../storage.js";

function filterCatalog() {
  const state = getState();
  return resolveTradeFilters(state?.tradeFilters?.length ? state.tradeFilters : DEFAULT_TRADE_FILTERS);
}

const dayNames = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

function tradesOf(entry) {
  if (Array.isArray(entry.trades) && entry.trades.length) return entry.trades;
  return [{
    strategy: entry.strategy || "",
    tradeFilter: entry.tradeFilter || "",
    filters: entry.filters,
    entryQuality: entry.entryQuality,
    exitQuality: entry.exitQuality,
    rr: entry.rr,
    emotion: entry.emotion || "",
    notes: "",
    outcome: entry.outcome || "",
  }];
}

function filterRowsHtml(trade) {
  const rows = filtersOfTrade(trade);
  if (!rows.length) {
    const legacy = String(trade.tradeFilter || "").trim();
    if (!legacy || legacy === "None") {
      return `<span class="muted">بدون فیلتر</span>`;
    }
    const meta = tradeFilterMeta(legacy, filterCatalog());
    return `
      <span class="trade-filter-chip">
        <span class="strategy-chip__swatch" style="background:${escapeHtml(meta?.color || "#546E7A")}"></span>
        <b>${escapeHtml(meta?.label || legacy)}</b>
      </span>
    `;
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

export function journalCardHtml(entry, { strategyMap = {}, highlightStrategy = "" } = {}) {
  const date = parseISODate(entry.date);
  const pnlClass = entry.pnl > 0 ? "profit" : entry.pnl < 0 ? "loss" : "";
  const trades = tradesOf(entry);

  return `
    <article class="card journal-card" data-journal-id="${escapeHtml(entry.id)}">
      <div class="journal-card__top">
        <div>
          <h3 class="card__title u-mb-2">${escapeHtml(entry.date)} · ${dayNames[date.getDay()]}</h3>
          <div class="u-flex u-gap-2 u-items-center">
            <span class="badge ${entry.pnl >= 0 ? "badge--success" : "badge--loss"}">${formatPct(entry.pct)}</span>
            <span class="muted u-text-xs num">${trades.length} معامله</span>
          </div>
        </div>
        <div class="u-flex u-gap-2">
          <button class="btn btn-ghost" data-edit-journal="${escapeHtml(entry.id)}">ویرایش</button>
          <button class="btn btn-soft" data-open-media="${escapeHtml(entry.id)}">اسکرین / ویدیو</button>
          <button class="btn btn-danger" data-delete-journal="${escapeHtml(entry.id)}">حذف</button>
        </div>
      </div>
      <div class="journal-card__grid">
        <div class="metric"><span class="metric__label">بالانس شروع</span><span class="metric__value num">${formatMoney(entry.balanceStart)}</span></div>
        <div class="metric"><span class="metric__label">بالانس نهایی</span><span class="metric__value num">${formatMoney(entry.balanceEnd)}</span></div>
        <div class="metric"><span class="metric__label">سود / زیان</span><span class="metric__value num ${pnlClass}">${formatMoney(entry.pnl)}</span></div>
        <div class="metric"><span class="metric__label">پیروی از قوانین</span><span class="metric__value num">${entry.ruleFollow || "—"} / 5</span></div>
      </div>
      <div class="journal-trades">
        ${trades.map((trade, index) => {
          const strategy = strategyMap[trade.strategy] || {};
          const outcome = outcomeMeta(trade.outcome);
          const matchClass = highlightStrategy
            ? (trade.strategy === highlightStrategy ? " is-strategy-match" : " is-strategy-muted")
            : "";
          return `
            <div class="journal-trade${matchClass}">
              <div class="journal-trade__title">
                <span class="strategy-chip__swatch" style="background:${escapeHtml(strategy.color || "#34c5b1")}"></span>
                <strong>معامله ${index + 1} · ${escapeHtml(trade.strategy || "بدون استراتژی")}</strong>
                ${outcome ? `<span class="badge ${outcome.badge}">${outcome.label}</span>` : `<span class="badge badge--warn">بدون نتیجه</span>`}
              </div>
              <div class="journal-trade__filters">
                ${filterRowsHtml(trade)}
              </div>
              <div class="journal-trade__metrics">
                <span>ورود <b class="num">${trade.entryQuality || "—"}/5</b></span>
                <span>خروج <b class="num">${trade.exitQuality || "—"}/5</b></span>
                <span>R:R <b class="num">${(2).toFixed(1)}</b></span>
              </div>
              ${trade.emotion ? `<p>${escapeHtml(trade.emotion)}</p>` : ""}
              ${trade.notes ? `<p>${escapeHtml(trade.notes)}</p>` : ""}
            </div>
          `;
        }).join("")}
      </div>
      ${entry.tradingBias ? `<p class="journal-card__notes"><strong class="muted">دیدگاه معاملاتی:</strong> ${escapeHtml(entry.tradingBias)}</p>` : ""}
      ${entry.lesson ? `<p class="journal-card__notes"><strong class="muted">درس امروز:</strong> ${escapeHtml(entry.lesson)}</p>` : ""}
      ${entry.notes ? `<p class="journal-card__notes"><strong class="muted">یادداشت:</strong> ${escapeHtml(entry.notes)}</p>` : ""}
    </article>
  `;
}
