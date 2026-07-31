import {
  FILTER_OUTCOMES,
  DEFAULT_TRADE_FILTERS,
  TRADE_OUTCOMES,
  calcStreak,
  calcStrategyStats,
  calcTradeFilterStats,
  calcTradeWinrate,
  calcWindowStats,
  dayResultFromStats,
  enrichBacktestEntries,
  escapeHtml,
  filtersOfTrade,
  flattenOutcomeUnits,
  formatPct,
  groupStrategies,
  normalizeFilterOutcome,
  normalizeOutcome,
  normalizeTradeFilter,
  paginateItems,
  paginationControlsHtml,
  resolveTradeFilters,
  sameMonth,
  sameWeek,
  todayISO,
  tpScoreOf,
  uid,
  DEFAULT_MEDIA_BASE_PATH,
  defaultMediaPathForDate,
  calendarYearOptionsHtml,
  tradesOfEntry,
} from "./config.js";
import { backtestCardHtml } from "./components/backtestCard.js";
import { icon } from "./components/icons.js";
import { openModal, closeModal } from "./components/modal.js";
import { strategySelectHtml } from "./components/strategySelect.js";
import { showToast } from "./components/toast.js";
import { openStrategyManager, openTradeFilterManager, openStrategyRelated } from "./journal.js";
import {
  deleteBacktestEntry,
  getState,
  openMediaFolder,
  saveBacktests,
  setMediaSeen,
  setCalendarStarred,
  setCalendarBankHoliday,
  upsertBacktestEntry,
} from "./storage.js";

const MONTHS = [
  "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر",
];
const MAX_TRADES = 4;

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let listPage = 1;
/** Strategy name filter for the backtest list (empty = all). */
let strategyFilter = "";
let scrollListAfterRender = false;
let onBacktestChanged = null;

function allStrategies(state = getState()) {
  return [...(state.strategies?.primary || []), ...(state.strategies?.secondary || [])];
}

function allTradeFilters(state = getState()) {
  return resolveTradeFilters(state.tradeFilters?.length ? state.tradeFilters : DEFAULT_TRADE_FILTERS);
}

function strategyMap(state) {
  return Object.fromEntries(allStrategies(state).flatMap((strategy) => [
    [strategy.id, strategy],
    [strategy.name, strategy],
  ]));
}

function emptyFilterRow() {
  return { filter: "", outcome: "" };
}

function emptyTrade() {
  return {
    id: uid("trade"),
    strategy: "",
    filters: [emptyFilterRow()],
    outcome: "",
    rr: 2,
    notes: "",
  };
}

function normalizeTrades(entry = {}) {
  if (Array.isArray(entry.trades) && entry.trades.length) {
    return entry.trades.slice(0, MAX_TRADES).map((trade) => {
      const filters = filtersOfTrade(trade);
      return {
        id: trade.id || uid("trade"),
        strategy: trade.strategy || "",
        filters: filters.length ? filters : [emptyFilterRow()],
        outcome: normalizeOutcome(trade.outcome),
        rr: 2,
        notes: trade.notes || "",
      };
    });
  }
  if (entry.strategy || entry.tradeFilter || entry.rr != null || entry.filters) {
    const filters = filtersOfTrade(entry);
    return [{
      id: uid("trade"),
      strategy: entry.strategy || "",
      filters: filters.length ? filters : [emptyFilterRow()],
      outcome: normalizeOutcome(entry.outcome),
      rr: 2,
      notes: "",
    }];
  }
  return [emptyTrade()];
}

function tradeFilterOptions(selected = "", usedFilters = []) {
  const filters = allTradeFilters();
  return [
    `<option value="">انتخاب فیلتر</option>`,
    ...filters.map((item) => {
      const taken = usedFilters.includes(item.value) && item.value !== selected;
      return `<option value="${escapeHtml(item.value)}" ${item.value === selected ? "selected" : ""} ${taken ? "disabled" : ""}>${escapeHtml(item.label)}</option>`;
    }),
  ].join("");
}

function filterOutcomeOptionsHtml(selected = "", tradeId = "", filterIndex = 0) {
  const group = `bt-filter-outcome-${tradeId || "new"}-${filterIndex}`;
  return FILTER_OUTCOMES.map((item) => `
    <label class="outcome-option outcome-option--${item.value} ${selected === item.value ? "is-active" : ""}">
      <input type="radio" data-filter-field="outcome" name="${escapeHtml(group)}" value="${item.value}" ${selected === item.value ? "checked" : ""} />
      <span>${item.label}</span>
    </label>
  `).join("");
}

function tradeOutcomeOptionsHtml(selected = "", tradeId = "") {
  const group = `bt-trade-outcome-${tradeId || "new"}`;
  return TRADE_OUTCOMES.map((item) => `
    <label class="outcome-option outcome-option--${item.value} ${selected === item.value ? "is-active" : ""}">
      <input type="radio" data-trade-field="outcome" name="${escapeHtml(group)}" value="${item.value}" ${selected === item.value ? "checked" : ""} />
      <span>${item.label}</span>
    </label>
  `).join("");
}

function filterRowHtml(row, tradeId, filterIndex, filters) {
  const used = filters.map((item) => item.filter).filter(Boolean);
  return `
    <div class="trade-filter-row" data-filter-index="${filterIndex}">
      <div class="field trade-filter-row__filter">
        <label>فیلتر معاملاتی</label>
        <select data-filter-field="filter">${tradeFilterOptions(row.filter, used)}</select>
      </div>
      <div class="field trade-filter-row__outcome">
        <label>نتیجه فیلتر</label>
        <div class="outcome-toggle outcome-toggle--filters" role="group" aria-label="نتیجه فیلتر">
          ${filterOutcomeOptionsHtml(row.outcome, tradeId, filterIndex)}
        </div>
      </div>
      ${filters.length > 1 ? `
        <button class="btn btn-ghost btn-remove-filter" type="button" title="حذف فیلتر">حذف</button>
      ` : `<span class="trade-filter-row__spacer"></span>`}
    </div>
  `;
}

function tradeEditorHtml(trade, index) {
  const filters = trade.filters?.length ? trade.filters : [emptyFilterRow()];
  return `
    <article class="trade-editor" data-trade-index="${index}" data-trade-id="${escapeHtml(trade.id)}">
      <div class="trade-editor__head">
        <strong>معامله ${index + 1}</strong>
        ${index > 0 ? `<button class="btn btn-danger btn-remove-trade" type="button">حذف معامله</button>` : ""}
      </div>
      <div class="form-grid">
        <div class="field field--full">
          <label>استراتژی</label>
          ${strategySelectHtml(trade.strategy, allStrategies())}
        </div>
        <div class="field field--full">
          <label>نتیجه معامله</label>
          <div class="outcome-toggle" role="group" aria-label="نتیجه معامله">
            ${tradeOutcomeOptionsHtml(trade.outcome, trade.id)}
          </div>
          <p class="u-text-xs muted u-mb-0 u-mt-2">فقط همین ۳ گزینه ملاک سود / ضرر / ریسک‌فری معامله است (یک نتیجه برای کل معامله).</p>
        </div>
        <div class="field field--full">
          <div class="trade-filters-editor__head">
            <label class="u-mb-0">فیلترهای معاملاتی</label>
            <button class="btn btn-soft btn-add-filter" type="button" ${filters.length >= allTradeFilters().length ? "disabled" : ""}>افزودن فیلتر</button>
          </div>
          <p class="u-text-xs muted u-mb-3">نتیجه هر فیلتر فقط برای وین‌ریت همان فیلتر است و روی نتیجه معامله اثر ندارد.</p>
          <div class="trade-filters-editor" data-filters-list>
            ${filters.map((row, filterIndex) => filterRowHtml(row, trade.id, filterIndex, filters)).join("")}
          </div>
        </div>
        <div class="field field--full">
          <label>یادداشت معامله</label>
          <textarea data-trade-field="notes" rows="3">${escapeHtml(trade.notes)}</textarea>
        </div>
      </div>
    </article>
  `;
}

function renderTradeEditors(trades) {
  const list = document.getElementById("backtest-trades-editor-list");
  if (!list) return;
  list.innerHTML = trades.map(tradeEditorHtml).join("");
  const addButton = document.getElementById("btn-add-backtest-trade");
  if (addButton) addButton.disabled = trades.length >= MAX_TRADES;
}

function collectFilterRows(card) {
  return [...card.querySelectorAll(".trade-filter-row")].map((row) => {
    const filter = normalizeTradeFilter(row.querySelector('[data-filter-field="filter"]')?.value ?? "");
    const outcome = normalizeFilterOutcome(
      row.querySelector('[data-filter-field="outcome"]:checked')?.value ?? "",
    );
    return { filter, outcome };
  });
}

function collectFilters(card) {
  const seen = new Set();
  return collectFilterRows(card).filter((row) => {
    if (!row.filter || seen.has(row.filter)) return false;
    seen.add(row.filter);
    return true;
  });
}

function collectTradesForEditor() {
  return [...document.querySelectorAll("#backtest-trades-editor-list .trade-editor")].map((card) => {
    const get = (name) => card.querySelector(`[data-trade-field="${name}"]`)?.value ?? "";
    const filters = collectFilterRows(card);
    return {
      id: card.dataset.tradeId || uid("trade"),
      strategy: get("strategy"),
      filters: filters.length ? filters : [emptyFilterRow()],
      outcome: normalizeOutcome(
        card.querySelector('[data-trade-field="outcome"]:checked')?.value ?? "",
      ),
      rr: 2,
      notes: get("notes").trim(),
    };
  });
}

function collectTrades() {
  return [...document.querySelectorAll("#backtest-trades-editor-list .trade-editor")].map((card) => {
    const get = (name) => card.querySelector(`[data-trade-field="${name}"]`)?.value ?? "";
    const filters = collectFilters(card);
    return {
      id: card.dataset.tradeId || uid("trade"),
      strategy: get("strategy"),
      filters,
      tradeFilter: filters[0]?.filter || "",
      outcome: normalizeOutcome(
        card.querySelector('[data-trade-field="outcome"]:checked')?.value ?? "",
      ),
      rr: 2,
      notes: get("notes").trim(),
    };
  });
}

function weekStartKey(iso) {
  const date = new Date(`${iso}T12:00:00`);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function weeklySummaries(entries) {
  const groups = {};
  enrichBacktestEntries(entries).forEach((entry) => {
    const date = new Date(`${entry.date}T12:00:00`);
    if (date.getDay() === 0 || date.getDay() === 6) return;
    const key = weekStartKey(entry.date);
    (groups[key] ||= []).push(entry);
  });
  return Object.fromEntries(Object.entries(groups).map(([key, items]) => {
    const stats = calcTradeWinrate(flattenOutcomeUnits(items));
    return [key, {
      stats: { ...stats, tpScore: tpScoreOf(stats) },
      count: items.length,
      dayResult: dayResultFromStats(stats),
    }];
  }));
}

function calendarMeta() {
  const state = getState();
  const mediaDates = new Set(state.mediaDates?.dates || []);
  const mediaSeen = state.settings?.mediaSeen || {};
  const calendarStarred = state.settings?.calendarStarred || {};
  const calendarBankHolidays = state.settings?.calendarBankHolidays || {};
  return { mediaDates, mediaSeen, calendarStarred, calendarBankHolidays };
}

function seenStatusHtml(seen, iso) {
  if (seen) {
    return `<button type="button" class="cal-cell__seen-icon is-seen" data-toggle-seen="${escapeHtml(iso)}" title="برداشتن Seen">${icon("check", 14)}</button>`;
  }
  return `<button type="button" class="cal-cell__seen-icon is-unseen" data-toggle-seen="${escapeHtml(iso)}" title="علامت Seen">${icon("eye", 14)}</button>`;
}

function starStatusHtml(starred, iso) {
  if (starred) {
    return `<button type="button" class="cal-cell__star-icon is-starred" data-toggle-star="${escapeHtml(iso)}" title="برداشتن ستاره">${icon("star", 14, { fill: "currentColor" })}</button>`;
  }
  return `<button type="button" class="cal-cell__star-icon is-unstarred" data-toggle-star="${escapeHtml(iso)}" title="ستاره‌دار کردن">${icon("star", 14)}</button>`;
}

function calendarActionsHtml(seen, starred, iso) {
  return `
    <div class="cal-cell__actions">
      <button type="button" class="cal-cell__folder-icon" data-open-folder="${escapeHtml(iso)}" title="باز کردن پوشه">${icon("folder", 14)}</button>
      ${seenStatusHtml(seen, iso)}
      ${starStatusHtml(starred, iso)}
    </div>
  `;
}

function resultClassOf(dayResult) {
  if (dayResult === "profit") return "is-profit";
  if (dayResult === "loss") return "is-loss";
  if (dayResult === "flat") return "is-flat";
  return "";
}

function calendarCell(entry, iso, day, weekSummary, {
  mediaDates,
  mediaSeen,
  calendarStarred,
  calendarBankHolidays,
} = calendarMeta()) {
  const todayClass = iso === todayISO() ? "is-today" : "";
  const hasMedia = mediaDates.has(iso);
  const seen = Boolean(mediaSeen[iso]);
  const starred = Boolean(calendarStarred[iso]);
  const holiday = Boolean(calendarBankHolidays[iso]);
  const mediaClass = hasMedia ? "has-media" : "";
  const seenClass = seen ? "is-seen" : "is-unseen";
  const starredClass = starred ? "is-starred" : "";
  const holidayClass = holiday ? "is-bank-holiday" : "";
  const resultClass = holiday ? "" : (entry ? resultClassOf(entry.dayResult) : "");
  const dayOfWeek = new Date(`${iso}T12:00:00`).getDay();

  if (dayOfWeek === 6) {
    const next = new Date(`${iso}T12:00:00`);
    next.setDate(next.getDate() + 1);
    const nextDayNum = next.getDate();
    const [, curMonth] = iso.split("-").map((x) => Number(x));
    const sameMonthAsNext = next.getMonth() + 1 === curMonth;
    const summaryClass = resultClassOf(weekSummary?.dayResult);
    return `
      <div class="cal-cell cal-cell--weekend-merged is-weekend ${summaryClass} ${todayClass}">
        <span class="cal-cell__day">${sameMonthAsNext ? `ش ${day} · ی ${nextDayNum}` : "آخر هفته"}</span>
        <span class="cal-cell__week-label">جمع هفته</span>
        ${weekSummary ? `
          <strong class="cal-cell__pnl">${weekSummary.stats.decided ? formatPct(weekSummary.stats.winrate, 0) : "—"}</strong>
          <span class="cal-cell__pct">${weekSummary.stats.wins}W / ${weekSummary.stats.losses}L</span>
          <span class="cal-cell__strategy">${weekSummary.count} روز بک‌تست</span>
        ` : `<span class="cal-cell__closed">بازار تعطیل</span>`}
      </div>
    `;
  }
  if (dayOfWeek === 0) {
    const summaryClass = resultClassOf(weekSummary?.dayResult);
    return `
      <div class="cal-cell is-weekend ${summaryClass} ${todayClass}">
        <span class="cal-cell__day">${day}</span>
        <span class="cal-cell__week-label">جمع هفته</span>
        ${weekSummary ? `
          <strong class="cal-cell__pnl">${weekSummary.stats.decided ? formatPct(weekSummary.stats.winrate, 0) : "—"}</strong>
          <span class="cal-cell__pct">${weekSummary.stats.wins}W / ${weekSummary.stats.losses}L</span>
          <span class="cal-cell__strategy">${weekSummary.count} روز بک‌تست</span>
        ` : `<span class="cal-cell__closed">بازار تعطیل</span>`}
      </div>
    `;
  }

  const strategies = entry
    ? [...new Set(normalizeTrades(entry).map((trade) => trade.strategy).filter(Boolean))]
    : [];
  const strategyText = strategies.length > 2
    ? `${strategies.slice(0, 2).join(" · ")} +${strategies.length - 2}`
    : strategies.join(" · ");
  const stats = entry?.tradeStats;
  const mainText = stats?.decided
    ? `${stats.wins}W / ${stats.losses}L`
    : (stats?.total ? `${stats.total} معامله` : "—");

  return `
    <div class="cal-cell ${resultClass} ${todayClass} ${mediaClass} ${seenClass} ${starredClass} ${holidayClass}" data-cal-date="${iso}" role="button" tabindex="0">
      <div class="cal-cell__top">
        <span class="cal-cell__day num">${day}</span>
        ${holiday ? "" : calendarActionsHtml(seen, starred, iso)}
      </div>
      ${holiday ? `
        <span class="cal-cell__closed">Bank Holiday</span>
      ` : entry ? `
        <strong class="cal-cell__pnl">${escapeHtml(mainText)}</strong>
        <span class="cal-cell__pct">${stats?.decided ? formatPct(stats.winrate, 0) : "—"}</span>
        <span class="cal-cell__strategy">${escapeHtml(strategyText || "بدون استراتژی")}</span>
      ` : `
        ${hasMedia ? `<span class="cal-cell__media-hint">${icon("folder", 14)} رسانه</span>` : ""}
      `}
    </div>
  `;
}

function buildCalendar(entries, year, month) {
  const meta = calendarMeta();
  const byDate = Object.fromEntries(enrichBacktestEntries(entries).map((entry) => [entry.date, entry]));
  const byWeek = weeklySummaries(entries);
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const startsOnSunday = first.getDay() === 0;
  const cells = Array.from(
    { length: startsOnSunday ? 5 : startPad },
    () => `<div class="cal-cell is-empty"></div>`,
  );
  if (startsOnSunday) {
    const saturday = new Date(year, month, 1);
    saturday.setDate(0);
    const satIso = `${saturday.getFullYear()}-${String(saturday.getMonth() + 1).padStart(2, "0")}-${String(saturday.getDate()).padStart(2, "0")}`;
    const sunIso = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    cells.push(calendarCell(null, satIso, saturday.getDate(), byWeek[weekStartKey(sunIso)], meta));
  }
  const days = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= days; day += 1) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dow = new Date(`${iso}T12:00:00`).getDay();
    if (dow === 0) continue;
    cells.push(calendarCell(byDate[iso], iso, day, byWeek[weekStartKey(iso)], meta));
  }

  const lastIso = `${year}-${String(month + 1).padStart(2, "0")}-${String(days).padStart(2, "0")}`;
  const lastDow = new Date(`${lastIso}T12:00:00`).getDay();
  if (lastDow >= 1 && lastDow <= 5) {
    const daysSinceMonday = (lastDow + 6) % 7;
    for (let i = daysSinceMonday + 1; i <= 4; i += 1) {
      cells.push(`<div class="cal-cell is-empty"></div>`);
    }
    const saturday = new Date(`${lastIso}T12:00:00`);
    saturday.setDate(saturday.getDate() + (6 - lastDow));
    const satIso = `${saturday.getFullYear()}-${String(saturday.getMonth() + 1).padStart(2, "0")}-${String(saturday.getDate()).padStart(2, "0")}`;
    cells.push(calendarCell(null, satIso, saturday.getDate(), byWeek[weekStartKey(lastIso)], meta));
  }

  return cells.join("");
}

function yearOptions(selected) {
  return calendarYearOptionsHtml(selected);
}

function monthOptions(selected) {
  return MONTHS.map((name, index) => (
    `<option value="${index}" ${index === selected ? "selected" : ""}>${name}</option>`
  )).join("");
}

async function confirmDelete(entry, after) {
  if (!entry?.id || !window.confirm(`بک‌تست تاریخ ${entry.date} حذف شود؟ این کار قابل برگشت نیست.`)) return;
  try {
    await saveBacktests(deleteBacktestEntry(entry.id));
    closeModal("modal-backtest-day");
    showToast("بک‌تست حذف شد");
    after?.();
  } catch (error) {
    showToast(error.message || "خطا در حذف بک‌تست");
  }
}

function openDayCard(date, entries, map) {
  const body = document.getElementById("backtest-day-card-body");
  const title = document.getElementById("backtest-day-card-title");
  if (!body || !title) return;
  const entry = enrichBacktestEntries(entries).find((item) => item.date === date);
  const { mediaDates, mediaSeen, calendarStarred, calendarBankHolidays } = calendarMeta();
  const hasMedia = mediaDates.has(date);
  const seen = Boolean(mediaSeen[date]);
  const starred = Boolean(calendarStarred[date]);
  const holiday = Boolean(calendarBankHolidays[date]);
  title.textContent = `جزئیات بک‌تست ${date}`;

  const holidayBtn = `
    <button class="btn ${holiday ? "btn-soft" : "btn-ghost"}" type="button" data-toggle-holiday="${escapeHtml(date)}">
      ${holiday ? "Bank Holiday ✓" : "Bank Holiday"}
    </button>
  `;
  const starBtn = `
    <button class="btn ${starred ? "btn-soft" : "btn-ghost"}" type="button" data-toggle-star="${escapeHtml(date)}">
      ${starred ? "ستاره‌دار ✓" : "ستاره‌دار کردن"}
    </button>
  `;

  if (holiday) {
    body.innerHTML = `
      <div class="day-media-bar">${starBtn}${holidayBtn}</div>
      <div class="empty-state" style="padding:var(--space-5)">
        <strong>Bank Holiday</strong>
        <p class="muted u-mb-0 u-mt-2">این روز به‌عنوان تعطیلی بانکی علامت خورده است.</p>
      </div>`;
    openModal("modal-backtest-day");
    bindDayMediaActions(body, date, entries, map);
    return;
  }

  const mediaBar = `
    <div class="day-media-bar">
      <button class="btn btn-primary" type="button" data-open-folder="${escapeHtml(date)}">باز کردن پوشه ویدیو / اسکرین</button>
      <button class="btn ${seen ? "btn-soft" : "btn-ghost"}" type="button" data-toggle-seen="${escapeHtml(date)}">
        ${seen ? "Seen ✓" : "علامت Seen"}
      </button>
      ${starBtn}
      ${holidayBtn}
      ${hasMedia ? `<span class="badge badge--teal">پوشه موجود است</span>` : `<span class="badge badge--warn">پوشه پیدا نشد</span>`}
    </div>
  `;

  if (!entry) {
    body.innerHTML = `
      ${mediaBar}
      <div class="empty-state" style="padding:var(--space-5)">
        برای این روز بک‌تستی ثبت نشده.
        <div class="u-mt-4"><button class="btn btn-primary" type="button" id="backtest-day-card-new">ثبت بک‌تست این روز</button></div>
      </div>`;
    openModal("modal-backtest-day");
    bindDayMediaActions(body, date, entries, map);
    document.getElementById("backtest-day-card-new")?.addEventListener("click", () => {
      closeModal("modal-backtest-day");
      openBacktestForm({ date });
    });
    return;
  }

  body.innerHTML = `${mediaBar}${backtestCardHtml(entry, { strategyMap: map })}`;
  openModal("modal-backtest-day");
  bindDayMediaActions(body, date, entries, map);
  body.querySelector("[data-edit-backtest]")?.addEventListener("click", () => {
    closeModal("modal-backtest-day");
    openBacktestForm(entry);
  });
  body.querySelector("[data-delete-backtest]")?.addEventListener("click", () => confirmDelete(entry, onBacktestChanged));
  body.querySelector("[data-open-media]")?.addEventListener("click", () => handleOpenMedia(entry));
}

function bindDayMediaActions(body, date, entries, map) {
  body.querySelector("[data-open-folder]")?.addEventListener("click", () => openMediaForDate(date));
  body.querySelector("[data-toggle-seen]")?.addEventListener("click", async () => {
    await toggleSeen(date);
    openDayCard(date, entries, map);
    onBacktestChanged?.();
  });
  body.querySelector("[data-toggle-star]")?.addEventListener("click", async () => {
    await toggleStar(date);
    openDayCard(date, entries, map);
    onBacktestChanged?.();
  });
  body.querySelector("[data-toggle-holiday]")?.addEventListener("click", async () => {
    await toggleBankHoliday(date);
    openDayCard(date, entries, map);
    onBacktestChanged?.();
  });
}

function mediaBasePath() {
  return (getState().settings?.mediaBasePath || "").trim() || DEFAULT_MEDIA_BASE_PATH;
}

function resolveEntryMediaPath(entry) {
  return String(entry?.mediaPath || "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

function resolvedMediaPathForEntry(entry, date = entry?.date) {
  return resolveEntryMediaPath(entry) || defaultMediaPathForDate(date, mediaBasePath());
}

function syncFormMediaPath(form, { force = false } = {}) {
  if (!form?.elements?.mediaPath || !form.elements.date) return;
  const date = form.elements.date.value;
  const next = defaultMediaPathForDate(date, mediaBasePath());
  const current = String(form.elements.mediaPath.value || "").trim();
  const prevAuto = form.dataset.autoMediaPath || "";
  if (force || !current || current === prevAuto) {
    form.elements.mediaPath.value = next;
    form.dataset.autoMediaPath = next;
  }
}

async function openMediaForDate(date) {
  try {
    const entry = (getState().backtests?.entries || []).find((item) => item.date === date);
    const mediaPath = resolvedMediaPathForEntry(entry, date);
    try {
      await openMediaFolder({ mediaPath });
    } catch {
      await openMediaFolder({ date });
    }
    showToast("پوشه باز شد");
  } catch (error) {
    showToast(error.message || "باز کردن پوشه ممکن نشد");
  }
}

async function toggleSeen(date) {
  const seen = Boolean(getState().settings?.mediaSeen?.[date]);
  try {
    await setMediaSeen(date, !seen);
    showToast(!seen ? "Seen شد" : "Seen برداشته شد");
  } catch (error) {
    showToast(error.message || "ذخیره Seen ممکن نشد");
  }
}

async function toggleStar(date) {
  const starred = Boolean(getState().settings?.calendarStarred?.[date]);
  try {
    await setCalendarStarred(date, !starred);
    showToast(!starred ? "ستاره‌دار شد" : "ستاره برداشته شد");
  } catch (error) {
    showToast(error.message || "ذخیره ستاره ممکن نشد");
  }
}

async function toggleBankHoliday(date) {
  const holiday = Boolean(getState().settings?.calendarBankHolidays?.[date]);
  try {
    await setCalendarBankHoliday(date, !holiday);
    showToast(!holiday ? "Bank Holiday شد" : "Bank Holiday برداشته شد");
  } catch (error) {
    showToast(error.message || "ذخیره Bank Holiday ممکن نشد");
  }
}

async function handleOpenMedia(entry) {
  if (!entry?.date && !resolveEntryMediaPath(entry)) {
    showToast("تاریخ یا مسیر پوشه مشخص نیست");
    return;
  }
  try {
    const mediaPath = resolvedMediaPathForEntry(entry);
    try {
      await openMediaFolder({ mediaPath });
    } catch {
      await openMediaFolder({ date: entry.date });
    }
    showToast("پوشه باز شد");
  } catch (error) {
    showToast(error.message || "باز کردن پوشه ممکن نشد");
  }
}

function strategyWinrateLabel(stats) {
  if (!stats?.decided) return "بدون نتیجه قطعی";
  return `نرخ برد ${formatPct(stats.winrate, 0)} · ${stats.wins}W / ${stats.losses}L`;
}

function entryMatchesStrategy(entry, name) {
  if (!name) return true;
  return tradesOfEntry(entry).some((trade) => trade.strategy === name);
}

function filterEntriesByStrategy(entries, name = strategyFilter) {
  if (!name) return entries;
  return entries.filter((entry) => entryMatchesStrategy(entry, name));
}

function strategyFilterBarHtml(label) {
  if (!strategyFilter) return "";
  return `
    <div class="strategy-filter-bar" id="strategy-filter-bar">
      <div class="strategy-filter-bar__text">
        <strong>فیلتر استراتژی:</strong>
        <span class="badge badge--teal">${escapeHtml(strategyFilter)}</span>
        <span class="muted u-text-xs">فقط ${escapeHtml(label)}های شامل این استراتژی</span>
      </div>
      <button type="button" class="btn btn-ghost" data-clear-strategy-filter>پاک کردن فیلتر</button>
    </div>
  `;
}

function strategyCardHtml(strategy, stats) {
  const skipped = (stats.noPosition || 0) + (stats.riskFree || 0);
  const skipLabel = skipped ? ` · ${skipped} بدون موقعیت` : "";
  const name = strategy.name || "";
  return `
    <article class="strategy-overview-card">
      <button type="button" class="strategy-overview-card__main" data-open-strategy="${escapeHtml(strategy.id)}">
        <span class="strategy-overview-card__swatch" style="background:${escapeHtml(strategy.color || "#34c5b1")}"></span>
        <span>
          <strong>${escapeHtml(name)}</strong>
          <small class="num">${escapeHtml(strategyWinrateLabel(stats))}${skipLabel}</small>
          <small>${escapeHtml(strategy.description || "هنوز توضیحی ثبت نشده")}</small>
        </span>
        <span class="strategy-overview-card__more">توضیحات کامل</span>
      </button>
      <div class="strategy-overview-card__links">
        <button type="button" class="btn btn-soft" data-strategy-journals="${escapeHtml(name)}">ژورنال‌ها</button>
        <button type="button" class="btn btn-soft" data-strategy-backtests="${escapeHtml(name)}">بک‌تست‌ها</button>
      </div>
    </article>
  `;
}

function strategyShowcase(state, strategyStats) {
  const byName = Object.fromEntries(strategyStats.map((item) => [item.name, item]));
  return groupStrategies(allStrategies(state)).map((group) => `
    <section class="strategy-overview-group">
      <h4 class="strategy-overview-group__title">${escapeHtml(group.label)}</h4>
      <div class="strategy-overview-group__grid">
        ${group.strategies.map((strategy) => {
          const stats = byName[strategy.name] || { decided: 0, winrate: 0, wins: 0, losses: 0, riskFree: 0, total: 0 };
          return strategyCardHtml(strategy, stats);
        }).join("")}
      </div>
    </section>
  `).join("");
}

function filterCardHtml(filter, stats) {
  const skipped = (stats.noPosition || 0) + (stats.riskFree || 0);
  const skipLabel = skipped ? ` · ${skipped} بدون موقعیت` : "";
  return `
    <button type="button" class="strategy-overview-card" data-open-filter="${escapeHtml(filter.id)}">
      <span class="strategy-overview-card__swatch" style="background:${escapeHtml(filter.color || "#546E7A")}"></span>
      <span>
        <strong>${escapeHtml(filter.label || filter.name)}</strong>
        <small class="num">${escapeHtml(strategyWinrateLabel(stats))}${skipLabel}</small>
        <small>${escapeHtml(filter.description || "")}</small>
      </span>
      <span class="strategy-overview-card__more">ویرایش فیلتر</span>
    </button>
  `;
}

function filterShowcase(filterStats) {
  const byName = Object.fromEntries(filterStats.map((item) => [item.name, item]));
  return `
    <section class="strategy-overview-group">
      <div class="strategy-overview-group__grid">
        ${allTradeFilters().map((filter) => {
          const stats = byName[filter.value] || { decided: 0, winrate: 0, wins: 0, losses: 0, riskFree: 0, total: 0 };
          return filterCardHtml(filter, stats);
        }).join("")}
      </div>
    </section>
  `;
}

function backtestListHtml(enriched, map) {
  const filtered = filterEntriesByStrategy(enriched);
  const pager = paginateItems(filtered, listPage);
  listPage = pager.page;
  const empty = strategyFilter
    ? `<div class="empty-state">بک‌تستی با استراتژی «${escapeHtml(strategyFilter)}» پیدا نشد.</div>`
    : `<div class="empty-state">هنوز بک‌تستی ثبت نشده.</div>`;
  const cards = pager.items.map((entry) => backtestCardHtml(entry, {
    strategyMap: map,
    highlightStrategy: strategyFilter,
  })).join("") || empty;
  return `
    ${strategyFilterBarHtml("بک‌تست")}
    <div id="backtest-list">${cards}</div>
    <div id="backtest-pagination">${paginationControlsHtml(pager)}</div>
  `;
}

function bindBacktestListActions(container, entries) {
  container.querySelectorAll("[data-edit-backtest]").forEach((button) => {
    button.addEventListener("click", () => openBacktestForm(entries.find((entry) => entry.id === button.dataset.editBacktest)));
  });
  container.querySelectorAll("[data-delete-backtest]").forEach((button) => {
    const entry = entries.find((item) => item.id === button.dataset.deleteBacktest);
    button.addEventListener("click", () => confirmDelete(entry, onBacktestChanged));
  });
  container.querySelectorAll("[data-open-media]").forEach((button) => {
    button.addEventListener("click", () => handleOpenMedia(entries.find((entry) => entry.id === button.dataset.openMedia)));
  });
}

function bindBacktestPagination(enriched, entries, map) {
  const nav = document.getElementById("backtest-pagination");
  const clearBtn = document.querySelector("#backtest-list-wrap [data-clear-strategy-filter]");
  clearBtn?.addEventListener("click", () => {
    strategyFilter = "";
    listPage = 1;
    renderBacktests(getState());
  });
  if (!nav) return;
  const goTo = (page) => {
    listPage = page;
    const wrap = document.getElementById("backtest-list-wrap");
    if (!wrap) return;
    wrap.innerHTML = backtestListHtml(enriched, map);
    bindBacktestListActions(wrap, entries);
    bindBacktestPagination(enriched, entries, map);
    wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  nav.querySelectorAll("[data-page-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      const action = button.dataset.pageAction;
      goTo(action === "prev" ? listPage - 1 : listPage + 1);
    });
  });
  nav.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => goTo(Number(button.dataset.page)));
  });
}

function windowTradeLabel(stats) {
  if (!stats?.decided) return "—";
  return `${formatPct(stats.winrate, 0)} · ${stats.wins}W/${stats.losses}L`;
}

export function renderBacktests(state) {
  const root = document.getElementById("view-backtests");
  if (!root) return;
  const entries = state.backtests?.entries || [];
  const enriched = enrichBacktestEntries(entries).sort((a, b) => b.date.localeCompare(a.date));
  const now = new Date();
  const week = calcWindowStats(entries, (date) => sameWeek(date, now));
  const month = calcWindowStats(entries, (date) => sameMonth(date, now));
  const all = calcWindowStats(entries, () => true);
  const map = strategyMap(state);
  const strategyStats = calcStrategyStats(entries, allStrategies(state));
  const filterCatalog = allTradeFilters(state);
  const filterStats = calcTradeFilterStats(entries, filterCatalog);
  const tradeStats = all.tradeStats || { decided: 0, wins: 0, losses: 0, riskFree: 0, winrate: 0 };
  const winrateBadge = tradeStats.decided
    ? `نرخ برد: ${formatPct(tradeStats.winrate, 0)} (${tradeStats.wins}W/${tradeStats.losses}L)`
    : "نرخ برد: —";

  root.innerHTML = `
    <header class="page-header">
      <div class="page-header__eyebrow">بک‌تست</div>
      <h1>بک‌تست معاملاتی</h1>
      <p class="page-header__desc">هر معامله یک نتیجه سود / ضرر / ریسک‌فری دارد. فیلترهای معاملاتی جداگانه فقط برای وین‌ریت خود فیلتر ثبت می‌شوند.</p>
    </header>
    <div class="journal-toolbar">
      <div class="u-flex u-gap-3 u-items-center">
        <span class="badge badge--teal">${calcStreak(entries)} روز متوالی</span>
        <span class="badge badge--success num">${winrateBadge}</span>
      </div>
      <div class="u-flex u-gap-2">
        <button class="btn btn-soft" id="btn-manage-strategies-bt">استراتژی‌ها</button>
        <button class="btn btn-soft" id="btn-manage-filters-bt">فیلترها</button>
        <button class="btn btn-primary" id="btn-new-backtest">ثبت بک‌تست جدید</button>
      </div>
    </div>
    <div class="journal-stats">
      <div class="stat-tile"><div class="stat-tile__label">هفته</div><div class="stat-tile__value num">${windowTradeLabel(week.tradeStats)}</div><div class="u-text-xs muted num">${week.tradeStats?.total || 0} معامله</div></div>
      <div class="stat-tile"><div class="stat-tile__label">ماه</div><div class="stat-tile__value num">${windowTradeLabel(month.tradeStats)}</div><div class="u-text-xs muted num">${month.tradeStats?.total || 0} معامله</div></div>
      <div class="stat-tile"><div class="stat-tile__label">میانگین ریسک‌به‌ریوارد</div><div class="stat-tile__value num">${all.avgRr ? all.avgRr.toFixed(2) : "—"}</div></div>
      <div class="stat-tile"><div class="stat-tile__label">تعداد روزها</div><div class="stat-tile__value num">${all.count}</div></div>
    </div>
    <section class="card u-mb-5">
      <div class="u-flex u-justify-between u-items-center u-mb-3" style="flex-wrap:wrap;gap:12px">
        <div><h3 class="card__title u-mb-0">تقویم</h3><p class="u-text-xs muted u-mb-0 u-mt-2">نتیجه، نرخ برد و استراتژی هر روز روی همان خانه دیده می‌شود.</p></div>
        <div class="cal-nav">
          <button type="button" class="btn btn-ghost" id="bt-cal-prev">‹</button>
          <div class="field" style="min-width:110px;margin:0"><select id="bt-cal-month">${monthOptions(calMonth)}</select></div>
          <div class="field" style="min-width:90px;margin:0"><select id="bt-cal-year">${yearOptions(calYear)}</select></div>
          <button type="button" class="btn btn-ghost" id="bt-cal-next">›</button>
          <button type="button" class="btn btn-soft" id="bt-cal-today">امروز</button>
        </div>
      </div>
      <div class="calendar-grid calendar-weekdays">${["د", "س", "چ", "پ", "ج", "ش", "ی"].map((day) => `<div>${day}</div>`).join("")}</div>
      <div class="calendar-grid" id="backtest-calendar">${buildCalendar(entries, calYear, calMonth)}</div>
    </section>
    <section class="card u-mb-5">
      <div class="u-flex u-justify-between u-items-center u-mb-4">
        <div><h3 class="card__title u-mb-1">نرخ برد سیستم‌ها</h3><p class="u-text-xs muted u-mb-0">بر اساس نتیجه خود معامله (سود / ضرر / ریسک‌فری). نتیجه فیلترها اینجا حساب نمی‌شود.</p></div>
        <button class="btn btn-soft" id="btn-add-strategy-inline-bt">افزودن استراتژی</button>
      </div>
      <div class="strategy-overview">${strategyShowcase(state, strategyStats)}</div>
    </section>
    <section class="card u-mb-5">
      <div class="u-flex u-justify-between u-items-center u-mb-4">
        <div>
          <h3 class="card__title u-mb-1">نرخ برد فیلترهای معاملاتی</h3>
          <p class="u-text-xs muted u-mb-0">فقط از نتیجه ثبت‌شده برای هر فیلتر. مستقل از نتیجه معامله و استراتژی است.</p>
        </div>
        <button class="btn btn-soft" id="btn-add-filter-inline-bt">افزودن فیلتر معاملاتی</button>
      </div>
      <div class="strategy-overview">${filterShowcase(filterStats)}</div>
    </section>
    <div id="backtest-list-wrap">${backtestListHtml(enriched, map)}</div>
  `;

  const rerenderCalendar = () => {
    const grid = document.getElementById("backtest-calendar");
    if (!grid) return;
    grid.innerHTML = buildCalendar(entries, calYear, calMonth);
    bindCalendarCells(grid, entries, map);
  };

  bindCalendarCells(root, entries, map);
  bindBacktestListActions(root, entries);
  bindBacktestPagination(enriched, entries, map);
  document.getElementById("btn-new-backtest")?.addEventListener("click", () => {
    const today = entries.find((entry) => entry.date === todayISO());
    openBacktestForm(today || null);
  });
  document.getElementById("btn-manage-strategies-bt")?.addEventListener("click", () => openStrategyManager());
  document.getElementById("btn-manage-filters-bt")?.addEventListener("click", () => openTradeFilterManager());
  document.getElementById("btn-add-strategy-inline-bt")?.addEventListener("click", () => openStrategyManager(""));
  document.getElementById("btn-add-filter-inline-bt")?.addEventListener("click", () => openTradeFilterManager(""));
  root.querySelectorAll("[data-open-strategy]").forEach((button) => {
    button.addEventListener("click", () => openStrategyManager(button.dataset.openStrategy));
  });
  root.querySelectorAll("[data-strategy-journals]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openStrategyRelated("journal", button.dataset.strategyJournals);
    });
  });
  root.querySelectorAll("[data-strategy-backtests]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openStrategyRelated("backtests", button.dataset.strategyBacktests);
    });
  });
  root.querySelectorAll("[data-open-filter]").forEach((button) => {
    button.addEventListener("click", () => openTradeFilterManager(button.dataset.openFilter));
  });
  if (scrollListAfterRender) {
    scrollListAfterRender = false;
    requestAnimationFrame(() => {
      document.getElementById("backtest-list-wrap")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  document.getElementById("bt-cal-month")?.addEventListener("change", (event) => {
    calMonth = Number(event.target.value);
    rerenderCalendar();
  });
  document.getElementById("bt-cal-year")?.addEventListener("change", (event) => {
    calYear = Number(event.target.value);
    rerenderCalendar();
  });
  document.getElementById("bt-cal-prev")?.addEventListener("click", () => changeMonth(-1, rerenderCalendar));
  document.getElementById("bt-cal-next")?.addEventListener("click", () => changeMonth(1, rerenderCalendar));
  document.getElementById("bt-cal-today")?.addEventListener("click", () => {
    const today = new Date();
    calYear = today.getFullYear();
    calMonth = today.getMonth();
    syncCalendarSelects();
    rerenderCalendar();
  });
}

function bindCalendarCells(container, entries, map) {
  container.querySelectorAll("[data-cal-date]").forEach((cell) => {
    const openDay = () => openDayCard(cell.dataset.calDate, entries, map);
    cell.addEventListener("click", (event) => {
      if (event.target.closest("[data-toggle-seen], [data-toggle-star], [data-open-folder]")) return;
      openDay();
    });
    cell.addEventListener("keydown", (event) => {
      if (event.target.closest("[data-toggle-seen], [data-toggle-star], [data-open-folder]")) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDay();
      }
    });
  });
  container.querySelectorAll("[data-toggle-seen]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await toggleSeen(button.dataset.toggleSeen);
      onBacktestChanged?.();
    });
  });
  container.querySelectorAll("[data-toggle-star]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await toggleStar(button.dataset.toggleStar);
      onBacktestChanged?.();
    });
  });
  container.querySelectorAll("[data-open-folder]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await openMediaForDate(button.dataset.openFolder);
    });
  });
}

function changeMonth(delta, rerender) {
  calMonth += delta;
  if (calMonth < 0) {
    calMonth = 11;
    calYear -= 1;
  } else if (calMonth > 11) {
    calMonth = 0;
    calYear += 1;
  }
  syncCalendarSelects();
  rerender();
}

function syncCalendarSelects() {
  const month = document.getElementById("bt-cal-month");
  const year = document.getElementById("bt-cal-year");
  if (month) month.value = String(calMonth);
  if (year) {
    if (![...year.options].some((option) => Number(option.value) === calYear)) year.innerHTML = yearOptions(calYear);
    year.value = String(calYear);
  }
}

export function openBacktestForm(entry = null) {
  const form = document.getElementById("backtest-form");
  if (!form) return;
  const existing = entry?.id ? entry : null;
  const date = entry?.date || todayISO();
  document.getElementById("backtest-modal-title").textContent = existing ? "ویرایش بک‌تست" : "ثبت بک‌تست جدید";
  form.elements.id.value = existing?.id || "";
  form.elements.date.value = date;
  form.elements.notes.value = existing?.notes || "";
  const savedPath = resolveEntryMediaPath(existing);
  const autoPath = defaultMediaPathForDate(date, mediaBasePath());
  form.elements.mediaPath.value = savedPath || autoPath;
  form.dataset.autoMediaPath = !savedPath || savedPath === autoPath ? (savedPath || autoPath) : "";
  renderTradeEditors(normalizeTrades(existing || {}));
  openModal("modal-backtest");
}

export function bindBacktestForm(onSaved) {
  onBacktestChanged = onSaved;
  const form = document.getElementById("backtest-form");
  if (!form) return;

  form.elements.date?.addEventListener("change", () => syncFormMediaPath(form));

  document.getElementById("btn-add-backtest-trade")?.addEventListener("click", () => {
    const trades = collectTradesForEditor();
    if (trades.length >= MAX_TRADES) return;
    trades.push(emptyTrade());
    renderTradeEditors(trades);
  });

  const tradesList = document.getElementById("backtest-trades-editor-list");
  tradesList?.addEventListener("click", (event) => {
    const removeTrade = event.target.closest(".btn-remove-trade");
    if (removeTrade) {
      const card = removeTrade.closest(".trade-editor");
      const trades = collectTradesForEditor()
        .filter((_, index) => index !== Number(card.dataset.tradeIndex));
      renderTradeEditors(trades.length ? trades : [emptyTrade()]);
      return;
    }

    const addFilter = event.target.closest(".btn-add-filter");
    if (addFilter) {
      const card = addFilter.closest(".trade-editor");
      const trades = collectTradesForEditor().map((trade, index) => {
        const filters = [...trade.filters];
        if (Number(card.dataset.tradeIndex) === index && filters.length < allTradeFilters().length) {
          filters.push(emptyFilterRow());
        }
        return { ...trade, filters };
      });
      renderTradeEditors(trades);
      return;
    }

    const removeFilter = event.target.closest(".btn-remove-filter");
    if (removeFilter) {
      const card = removeFilter.closest(".trade-editor");
      const row = removeFilter.closest(".trade-filter-row");
      const filterIndex = Number(row?.dataset.filterIndex);
      const trades = collectTradesForEditor().map((trade, index) => {
        if (Number(card.dataset.tradeIndex) !== index) return trade;
        const filters = trade.filters.filter((_, i) => i !== filterIndex);
        return { ...trade, filters: filters.length ? filters : [emptyFilterRow()] };
      });
      renderTradeEditors(trades);
    }
  });

  tradesList?.addEventListener("change", (event) => {
    const tradeOutcome = event.target.closest('[data-trade-field="outcome"]');
    if (tradeOutcome) {
      const group = tradeOutcome.closest(".outcome-toggle");
      group?.querySelectorAll(".outcome-option").forEach((option) => {
        option.classList.toggle("is-active", option.querySelector("input") === tradeOutcome);
      });
      return;
    }
    const radio = event.target.closest('[data-filter-field="outcome"]');
    if (radio) {
      const group = radio.closest(".outcome-toggle");
      group?.querySelectorAll(".outcome-option").forEach((option) => {
        option.classList.toggle("is-active", option.querySelector("input") === radio);
      });
      return;
    }
    const filterSelect = event.target.closest('[data-filter-field="filter"]');
    if (filterSelect) {
      renderTradeEditors(collectTradesForEditor());
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(form);
    const trades = collectTrades();
    if (!trades.length || trades.some((trade) => !trade.strategy)) {
      showToast("برای هر معامله یک استراتژی انتخاب کن");
      return;
    }
    if (trades.some((trade) => !trade.outcome)) {
      showToast("برای هر معامله نتیجه را مشخص کن: سود، ضرر یا ریسک‌فری");
      return;
    }
    if (trades.some((trade) => !trade.filters.length)) {
      showToast("برای هر معامله حداقل یک فیلتر معاملاتی اضافه کن");
      return;
    }
    if (trades.some((trade) => trade.filters.some((row) => !row.outcome))) {
      showToast("برای هر فیلتر نتیجه را مشخص کن: سود، ضرر، بدون موقعیت+ یا بدون موقعیت −");
      return;
    }
    const firstTrade = trades[0];
    const date = String(fd.get("date"));
    const entry = {
      id: fd.get("id") || uid("bt"),
      date,
      trades,
      strategy: firstTrade.strategy,
      tradeFilter: firstTrade.tradeFilter,
      rr: firstTrade.rr,
      notes: String(fd.get("notes") || ""),
      mediaPath: String(fd.get("mediaPath") || "").trim() || defaultMediaPathForDate(date, mediaBasePath()),
    };
    try {
      await saveBacktests(upsertBacktestEntry(entry));
      closeModal("modal-backtest");
      showToast(`${trades.length} معامله بک‌تست ذخیره شد`);
      onSaved?.();
    } catch (error) {
      showToast(error.message || "خطا در ذخیره بک‌تست");
    }
  });

  window.addEventListener("workspace:new-backtest", () => {
    const today = (getState().backtests?.entries || []).find((entry) => entry.date === todayISO());
    openBacktestForm(today || null);
  });
  window.addEventListener("workspace:filter-strategy", (event) => {
    const { name, view } = event.detail || {};
    if (view !== "backtests") return;
    strategyFilter = String(name || "").trim();
    listPage = 1;
    scrollListAfterRender = true;
    renderBacktests(getState());
  });
}
