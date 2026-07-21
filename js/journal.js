import {
  calcStreak,
  calcWindowStats,
  enrichEntries,
  escapeHtml,
  formatMoney,
  formatPct,
  sameMonth,
  sameWeek,
  todayISO,
  uid,
} from "./config.js";
import { journalCardHtml } from "./components/journalCard.js";
import { openModal, closeModal } from "./components/modal.js";
import { showToast } from "./components/toast.js";
import {
  deleteJournalEntry,
  getState,
  openMediaFolder,
  saveJournal,
  saveStrategies,
  upsertJournalEntry,
} from "./storage.js";

const MONTHS = [
  "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر",
];
const MAX_TRADES = 4;

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let onJournalChanged = null;
let strategyBeingEdited = "";

function allStrategies(state = getState()) {
  return [...(state.strategies?.primary || []), ...(state.strategies?.secondary || [])];
}

function strategyMap(state) {
  return Object.fromEntries(allStrategies(state).flatMap((strategy) => [
    [strategy.id, strategy],
    [strategy.name, strategy],
  ]));
}

function normalizeTrades(entry = {}) {
  if (Array.isArray(entry.trades) && entry.trades.length) {
    return entry.trades.slice(0, MAX_TRADES).map((trade) => ({
      id: trade.id || uid("trade"),
      strategy: trade.strategy || "",
      entryQuality: Number(trade.entryQuality) || 3,
      exitQuality: Number(trade.exitQuality) || 3,
      rr: 2,
      emotion: trade.emotion || "",
      notes: trade.notes || "",
    }));
  }
  if (entry.strategy || entry.rr != null || entry.emotion) {
    return [{
      id: uid("trade"),
      strategy: entry.strategy || "",
      entryQuality: Number(entry.entryQuality) || 3,
      exitQuality: Number(entry.exitQuality) || 3,
      rr: 2,
      emotion: entry.emotion || "",
      notes: "",
    }];
  }
  return [{
    id: uid("trade"),
    strategy: "",
    entryQuality: 3,
    exitQuality: 3,
    rr: 2,
    emotion: "",
    notes: "",
  }];
}

function strategyOptions(selected = "") {
  return [
    `<option value="">انتخاب استراتژی</option>`,
    ...allStrategies().map((strategy) => (
      `<option value="${escapeHtml(strategy.name)}" ${strategy.name === selected ? "selected" : ""}>${escapeHtml(strategy.name)}</option>`
    )),
  ].join("");
}

function tradeEditorHtml(trade, index) {
  return `
    <article class="trade-editor" data-trade-index="${index}" data-trade-id="${escapeHtml(trade.id)}">
      <div class="trade-editor__head">
        <strong>معامله ${index + 1}</strong>
        ${index > 0 ? `<button class="btn btn-danger btn-remove-trade" type="button">حذف معامله</button>` : ""}
      </div>
      <div class="form-grid">
        <div class="field">
          <label>استراتژی</label>
          <select data-trade-field="strategy">${strategyOptions(trade.strategy)}</select>
        </div>
        <div class="field range-field">
          <div class="field-label-row">
            <label>کیفیت ورود</label>
            <output>${trade.entryQuality}</output>
          </div>
          <input data-trade-field="entryQuality" type="range" min="1" max="5" value="${trade.entryQuality}" />
          <div class="range-scale"><span>۱</span><span>۵</span></div>
        </div>
        <div class="field range-field">
          <div class="field-label-row">
            <label>کیفیت خروج</label>
            <output>${trade.exitQuality}</output>
          </div>
          <input data-trade-field="exitQuality" type="range" min="1" max="5" value="${trade.exitQuality}" />
          <div class="range-scale"><span>۱</span><span>۵</span></div>
        </div>
        <div class="field">
          <label>احساس حین معامله</label>
          <input data-trade-field="emotion" value="${escapeHtml(trade.emotion)}" />
        </div>
        <div class="field">
          <label>یادداشت معامله</label>
          <input data-trade-field="notes" value="${escapeHtml(trade.notes)}" />
        </div>
      </div>
    </article>
  `;
}

function renderTradeEditors(trades) {
  const list = document.getElementById("trades-editor-list");
  if (!list) return;
  list.innerHTML = trades.map(tradeEditorHtml).join("");
  const addButton = document.getElementById("btn-add-trade");
  if (addButton) addButton.disabled = trades.length >= MAX_TRADES;
}

function collectTrades() {
  return [...document.querySelectorAll("#trades-editor-list .trade-editor")].map((card) => {
    const get = (name) => card.querySelector(`[data-trade-field="${name}"]`)?.value ?? "";
    return {
      id: card.dataset.tradeId || uid("trade"),
      strategy: get("strategy"),
      entryQuality: Number(get("entryQuality")),
      exitQuality: Number(get("exitQuality")),
      // RR همیشه ثابت است.
      rr: 2,
      emotion: get("emotion").trim(),
      notes: get("notes").trim(),
    };
  });
}

function latestPreviousEntry(date, entries, excludedId = "") {
  return [...entries]
    .filter((entry) => entry.id !== excludedId && entry.date < date && Number.isFinite(Number(entry.balanceEnd)))
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

function applyInheritedBalance(date, excludedId = "") {
  const form = document.getElementById("journal-form");
  const hint = document.getElementById("balance-source-hint");
  if (!form) return;
  const previous = latestPreviousEntry(date, getState().journal?.entries || [], excludedId);
  form.elements.balanceStart.value = previous?.balanceEnd ?? "";
  form.elements.balanceStart.readOnly = true;
  document.getElementById("btn-edit-start-balance").textContent = "ویرایش";
  if (hint) {
    hint.textContent = previous
      ? `از بالانس نهایی آخرین ژورنال قبل از این تاریخ (${previous.date})`
      : "ژورنال قبلی پیدا نشد؛ برای ورود دستی روی «ویرایش» بزن.";
  }
  updateLivePnl();
}

function weekStartKey(iso) {
  const date = new Date(`${iso}T12:00:00`);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function weeklySummaries(entries) {
  const groups = {};
  enrichEntries(entries).forEach((entry) => {
    const date = new Date(`${entry.date}T12:00:00`);
    if (date.getDay() === 0 || date.getDay() === 6) return;
    const key = weekStartKey(entry.date);
    (groups[key] ||= []).push(entry);
  });
  return Object.fromEntries(Object.entries(groups).map(([key, items]) => {
    items.sort((a, b) => a.date.localeCompare(b.date));
    const pnl = items.reduce((sum, entry) => sum + entry.pnl, 0);
    const balanceStart = Number(items[0]?.balanceStart) || 0;
    return [key, {
      pnl,
      pct: balanceStart ? pnl / balanceStart : 0,
      count: items.length,
    }];
  }));
}

function calendarCell(entry, iso, day, weekSummary) {
  const pnlClass = entry ? (entry.pnl >= 0 ? "is-profit" : "is-loss") : "";
  const todayClass = iso === todayISO() ? "is-today" : "";
  const dayOfWeek = new Date(`${iso}T12:00:00`).getDay();
  if (dayOfWeek === 6) {
    // Saturday: merge Saturday+Sunday into one spanning card.
    const next = new Date(`${iso}T12:00:00`);
    next.setDate(next.getDate() + 1);
    const nextDayNum = next.getDate();
    const [, curMonth] = iso.split("-").map((x) => Number(x));
    const sameMonthAsNext = next.getMonth() + 1 === curMonth;
    const summaryClass = weekSummary
      ? (weekSummary.pnl >= 0 ? "is-profit" : "is-loss")
      : "";
    return `
      <div class="cal-cell cal-cell--weekend-merged is-weekend ${summaryClass} ${todayClass}">
        <span class="cal-cell__day">${sameMonthAsNext ? `ش${day} · ی${nextDayNum}` : "آخر هفته"}</span>
        <span class="cal-cell__week-label">جمع هفته</span>
        ${weekSummary ? `
          <strong class="cal-cell__pnl">${formatMoney(weekSummary.pnl)}</strong>
          <span class="cal-cell__pct">${formatPct(weekSummary.pct)}</span>
          <span class="cal-cell__strategy">${weekSummary.count} روز معاملاتی</span>
        ` : `<span class="cal-cell__closed">بازار تعطیل</span>`}
      </div>
    `;
  }
  if (dayOfWeek === 0) {
    // Sunday at month start (no Saturday to merge with).
    const summaryClass = weekSummary
      ? (weekSummary.pnl >= 0 ? "is-profit" : "is-loss")
      : "";
    return `
      <div class="cal-cell is-weekend ${summaryClass} ${todayClass}">
        <span class="cal-cell__day">${day}</span>
        <span class="cal-cell__week-label">جمع هفته</span>
        ${weekSummary ? `
          <strong class="cal-cell__pnl">${formatMoney(weekSummary.pnl)}</strong>
          <span class="cal-cell__pct">${formatPct(weekSummary.pct)}</span>
          <span class="cal-cell__strategy">${weekSummary.count} روز معاملاتی</span>
        ` : `<span class="cal-cell__closed">بازار تعطیل</span>`}
      </div>
    `;
  }
  if (!entry) {
    return `<button type="button" class="cal-cell ${todayClass}" data-cal-date="${iso}"><span class="cal-cell__day">${day}</span></button>`;
  }
  const strategies = [...new Set(normalizeTrades(entry).map((trade) => trade.strategy).filter(Boolean))];
  const strategyText = strategies.length > 2
    ? `${strategies.slice(0, 2).join(" · ")} +${strategies.length - 2}`
    : strategies.join(" · ");
  return `
    <button type="button" class="cal-cell ${pnlClass} ${todayClass}" data-cal-date="${iso}">
      <span class="cal-cell__day">${day}</span>
      <strong class="cal-cell__pnl">${formatMoney(entry.pnl)}</strong>
      <span class="cal-cell__pct">${formatPct(entry.pct)}</span>
      <span class="cal-cell__strategy">${escapeHtml(strategyText || "بدون استراتژی")}</span>
    </button>
  `;
}

function buildCalendar(entries, year, month) {
  const byDate = Object.fromEntries(enrichEntries(entries).map((entry) => [entry.date, entry]));
  const byWeek = weeklySummaries(entries);
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: startPad }, () => `<div class="cal-cell is-empty"></div>`);
  const days = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= days; day += 1) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    // When Sunday is directly after Saturday, Sunday is merged into Saturday's spanning card.
    // We skip rendering Sunday (except when it's the 1st day of the month).
    const dow = new Date(`${iso}T12:00:00`).getDay();
    if (dow === 0 && day > 1) continue;
    cells.push(calendarCell(byDate[iso], iso, day, byWeek[weekStartKey(iso)]));
  }
  return cells.join("");
}

function yearOptions(selected) {
  const current = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => current + 1 - i);
  if (!years.includes(selected)) years.push(selected);
  return years.sort((a, b) => b - a)
    .map((year) => `<option value="${year}" ${year === selected ? "selected" : ""}>${year}</option>`)
    .join("");
}

function monthOptions(selected) {
  return MONTHS.map((name, index) => (
    `<option value="${index}" ${index === selected ? "selected" : ""}>${name}</option>`
  )).join("");
}

async function confirmDelete(entry, after) {
  if (!entry?.id || !window.confirm(`ژورنال تاریخ ${entry.date} حذف شود؟ این کار قابل برگشت نیست.`)) return;
  try {
    await saveJournal(deleteJournalEntry(entry.id));
    closeModal("modal-day-card");
    showToast("ژورنال حذف شد");
    after?.();
  } catch (error) {
    showToast(error.message || "خطا در حذف ژورنال");
  }
}

function openDayCard(date, entries, map) {
  const body = document.getElementById("day-card-body");
  const title = document.getElementById("day-card-title");
  if (!body || !title) return;
  const entry = enrichEntries(entries).find((item) => item.date === date);
  title.textContent = `جزئیات ${date}`;

  if (!entry) {
    body.innerHTML = `
      <div class="empty-state" style="padding:var(--space-5)">
        برای این روز ژورنالی ثبت نشده.
        <div class="u-mt-4"><button class="btn btn-primary" type="button" id="day-card-new">ثبت ژورنال این روز</button></div>
      </div>`;
    openModal("modal-day-card");
    document.getElementById("day-card-new")?.addEventListener("click", () => {
      closeModal("modal-day-card");
      openJournalForm({ date });
    });
    return;
  }

  body.innerHTML = journalCardHtml(entry, { strategyMap: map });
  openModal("modal-day-card");
  body.querySelector("[data-edit-journal]")?.addEventListener("click", () => {
    closeModal("modal-day-card");
    openJournalForm(entry);
  });
  body.querySelector("[data-delete-journal]")?.addEventListener("click", () => confirmDelete(entry, onJournalChanged));
  body.querySelector("[data-open-media]")?.addEventListener("click", () => handleOpenMedia(entry));
}

async function handleOpenMedia(entry) {
  if (!entry?.mediaPath) {
    showToast("اول مسیر پوشه را در ویرایش ژورنال وارد کن");
    closeModal("modal-day-card");
    openJournalForm(entry || null);
    return;
  }
  try {
    await openMediaFolder({ mediaPath: entry.mediaPath });
    showToast("پوشه باز شد");
  } catch (error) {
    showToast(error.message || "باز کردن پوشه ممکن نشد");
  }
}

function strategyShowcase(state) {
  return allStrategies(state).map((strategy) => `
    <button type="button" class="strategy-overview-card" data-open-strategy="${escapeHtml(strategy.id)}">
      <span class="strategy-overview-card__swatch" style="background:${escapeHtml(strategy.color || "#34c5b1")}"></span>
      <span>
        <strong>${escapeHtml(strategy.name)}</strong>
        <small>${escapeHtml(strategy.description || "هنوز توضیحی ثبت نشده")}</small>
      </span>
      <span class="strategy-overview-card__more">توضیحات کامل</span>
    </button>
  `).join("");
}

export function renderJournal(state) {
  const root = document.getElementById("view-journal");
  if (!root) return;
  const entries = state.journal?.entries || [];
  const enriched = enrichEntries(entries).sort((a, b) => b.date.localeCompare(a.date));
  const now = new Date();
  const week = calcWindowStats(entries, (date) => sameWeek(date, now));
  const month = calcWindowStats(entries, (date) => sameMonth(date, now));
  const all = calcWindowStats(entries, () => true);
  const map = strategyMap(state);
  const goals = state.settings?.goals || state.plan?.goals || {};

  root.innerHTML = `
    <header class="page-header">
      <div class="page-header__eyebrow">ژورنال</div>
      <h1>ژورنال معاملاتی</h1>
      <p class="page-header__desc">ثبت حداکثر چهار معامله در هر روز و مرور دقیق عملکرد.</p>
    </header>
    <div class="journal-toolbar">
      <div class="u-flex u-gap-3 u-items-center">
        <span class="badge badge--teal">${calcStreak(entries)} روز متوالی</span>
        <span class="badge badge--success">نرخ برد: ${formatPct(all.winrate, 0)}</span>
      </div>
      <div class="u-flex u-gap-2">
        <button class="btn btn-soft" id="btn-manage-strategies">استراتژی‌ها</button>
        <button class="btn btn-primary" id="btn-new-journal">ثبت ژورنال جدید</button>
      </div>
    </div>
    <div class="journal-stats">
      <div class="stat-tile"><div class="stat-tile__label">هفته</div><div class="stat-tile__value num ${week.pnl >= 0 ? "profit" : "loss"}">${formatMoney(week.pnl)}</div><div class="u-text-xs muted num">${formatPct(week.pct)} / هدف ${formatPct(goals.weeklyPct || 0.04, 0)}</div></div>
      <div class="stat-tile"><div class="stat-tile__label">ماه</div><div class="stat-tile__value num ${month.pnl >= 0 ? "profit" : "loss"}">${formatMoney(month.pnl)}</div><div class="u-text-xs muted num">${formatPct(month.pct)} / هدف ${formatPct(goals.monthlyPct || 0.17, 0)}</div></div>
      <div class="stat-tile"><div class="stat-tile__label">میانگین ریسک‌به‌ریوارد</div><div class="stat-tile__value num">${all.avgRr ? all.avgRr.toFixed(2) : "—"}</div></div>
      <div class="stat-tile"><div class="stat-tile__label">تعداد روزها</div><div class="stat-tile__value num">${all.count}</div></div>
    </div>
    <section class="card u-mb-5">
      <div class="u-flex u-justify-between u-items-center u-mb-3" style="flex-wrap:wrap;gap:12px">
        <div><h3 class="card__title u-mb-0">تقویم</h3><p class="u-text-xs muted u-mb-0 u-mt-2">مبلغ، درصد و استراتژی هر روز روی همان خانه دیده می‌شود.</p></div>
        <div class="cal-nav">
          <button type="button" class="btn btn-ghost" id="cal-prev">‹</button>
          <div class="field" style="min-width:110px;margin:0"><select id="cal-month">${monthOptions(calMonth)}</select></div>
          <div class="field" style="min-width:90px;margin:0"><select id="cal-year">${yearOptions(calYear)}</select></div>
          <button type="button" class="btn btn-ghost" id="cal-next">›</button>
          <button type="button" class="btn btn-soft" id="cal-today">امروز</button>
        </div>
      </div>
      <div class="calendar-grid calendar-weekdays">${["د", "س", "چ", "پ", "ج", "ش", "ی"].map((day) => `<div>${day}</div>`).join("")}</div>
      <div class="calendar-grid" id="journal-calendar">${buildCalendar(entries, calYear, calMonth)}</div>
    </section>
    <section class="card u-mb-5">
      <div class="u-flex u-justify-between u-items-center u-mb-4">
        <div><h3 class="card__title u-mb-1">راهنمای استراتژی‌ها</h3><p class="u-text-xs muted u-mb-0">خلاصه استراتژی‌ها؛ برای شرایط ورود و قوانین، کارت را باز کن.</p></div>
        <button class="btn btn-soft" id="btn-add-strategy-inline">افزودن استراتژی</button>
      </div>
      <div class="strategy-overview">${strategyShowcase(state)}</div>
    </section>
    <div id="journal-list">${enriched.map((entry) => journalCardHtml(entry, { strategyMap: map })).join("") || `<div class="empty-state">هنوز ژورنالی ثبت نشده.</div>`}</div>
  `;

  const rerenderCalendar = () => {
    const grid = document.getElementById("journal-calendar");
    if (!grid) return;
    grid.innerHTML = buildCalendar(entries, calYear, calMonth);
    bindCalendarCells(grid, entries, map);
  };

  bindCalendarCells(root, entries, map);
  document.getElementById("btn-new-journal")?.addEventListener("click", () => {
    const today = entries.find((entry) => entry.date === todayISO());
    openJournalForm(today || null);
  });
  document.getElementById("btn-manage-strategies")?.addEventListener("click", () => openStrategyManager());
  document.getElementById("btn-add-strategy-inline")?.addEventListener("click", () => openStrategyManager(""));
  root.querySelectorAll("[data-open-strategy]").forEach((button) => {
    button.addEventListener("click", () => openStrategyManager(button.dataset.openStrategy));
  });
  root.querySelectorAll("[data-edit-journal]").forEach((button) => {
    button.addEventListener("click", () => openJournalForm(entries.find((entry) => entry.id === button.dataset.editJournal)));
  });
  root.querySelectorAll("[data-delete-journal]").forEach((button) => {
    const entry = entries.find((item) => item.id === button.dataset.deleteJournal);
    button.addEventListener("click", () => confirmDelete(entry, onJournalChanged));
  });
  root.querySelectorAll("[data-open-media]").forEach((button) => {
    button.addEventListener("click", () => handleOpenMedia(entries.find((entry) => entry.id === button.dataset.openMedia)));
  });
  document.getElementById("cal-month")?.addEventListener("change", (event) => {
    calMonth = Number(event.target.value);
    rerenderCalendar();
  });
  document.getElementById("cal-year")?.addEventListener("change", (event) => {
    calYear = Number(event.target.value);
    rerenderCalendar();
  });
  document.getElementById("cal-prev")?.addEventListener("click", () => changeMonth(-1, rerenderCalendar));
  document.getElementById("cal-next")?.addEventListener("click", () => changeMonth(1, rerenderCalendar));
  document.getElementById("cal-today")?.addEventListener("click", () => {
    const today = new Date();
    calYear = today.getFullYear();
    calMonth = today.getMonth();
    syncCalendarSelects();
    rerenderCalendar();
  });
}

function bindCalendarCells(container, entries, map) {
  container.querySelectorAll("[data-cal-date]").forEach((button) => {
    button.addEventListener("click", () => openDayCard(button.dataset.calDate, entries, map));
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
  const month = document.getElementById("cal-month");
  const year = document.getElementById("cal-year");
  if (month) month.value = String(calMonth);
  if (year) {
    if (![...year.options].some((option) => Number(option.value) === calYear)) year.innerHTML = yearOptions(calYear);
    year.value = String(calYear);
  }
}

export function openJournalForm(entry = null) {
  const form = document.getElementById("journal-form");
  if (!form) return;
  const existing = entry?.id ? entry : null;
  const date = entry?.date || todayISO();
  document.getElementById("journal-modal-title").textContent = existing ? "ویرایش ژورنال" : "ثبت ژورنال جدید";
  form.elements.id.value = existing?.id || "";
  form.elements.date.value = date;
  form.elements.balanceEnd.value = existing?.balanceEnd ?? "";
  form.elements.ruleFollow.value = existing?.ruleFollow ?? 3;
  form.elements.lesson.value = existing?.lesson || "";
  form.elements.notes.value = existing?.notes || "";
  form.elements.mediaPath.value = existing?.mediaPath || "";
  renderTradeEditors(normalizeTrades(existing || {}));

  if (existing) {
    form.elements.balanceStart.value = existing.balanceStart ?? "";
    form.elements.balanceStart.readOnly = true;
    document.getElementById("balance-source-hint").textContent = "بالانس ثبت‌شده این روز؛ در صورت نیاز قابل ویرایش است.";
  } else {
    applyInheritedBalance(date);
  }
  document.getElementById("btn-edit-start-balance").textContent = "ویرایش";
  updateLivePnl();
  openModal("modal-journal");
}

function updateLivePnl() {
  const form = document.getElementById("journal-form");
  const output = document.getElementById("live-pnl");
  if (!form || !output) return;
  const start = Number(form.elements.balanceStart.value);
  const end = Number(form.elements.balanceEnd.value);
  if (!Number.isFinite(start) || !start || !Number.isFinite(end)) {
    output.textContent = "—";
    output.className = "num";
    return;
  }
  const pnl = end - start;
  output.textContent = `${formatMoney(pnl)} (${formatPct(pnl / start)})`;
  output.className = `num ${pnl >= 0 ? "profit" : "loss"}`;
}

function renderStrategyList(selectedId = "") {
  const list = document.getElementById("strategy-manager-list");
  if (!list) return;
  list.innerHTML = allStrategies().map((strategy) => `
    <button type="button" class="strategy-list-item ${strategy.id === selectedId ? "is-active" : ""}" data-strategy-id="${escapeHtml(strategy.id)}">
      <span style="background:${escapeHtml(strategy.color || "#34c5b1")}"></span>
      <span><strong>${escapeHtml(strategy.name)}</strong><small>${escapeHtml(strategy.description || "بدون توضیح")}</small></span>
    </button>
  `).join("");
  list.querySelectorAll("[data-strategy-id]").forEach((button) => {
    button.addEventListener("click", () => selectStrategy(button.dataset.strategyId));
  });
}

function selectStrategy(id = "") {
  const form = document.getElementById("strategy-form");
  if (!form) return;
  const strategy = allStrategies().find((item) => item.id === id);
  strategyBeingEdited = strategy?.id || "";
  form.reset();
  form.elements.originalId.value = strategy?.id || "";
  form.elements.name.value = strategy?.name || "";
  form.elements.color.value = strategy?.color || "#34c5b1";
  form.elements.description.value = strategy?.description || "";
  form.elements.conditions.value = strategy?.conditions || "";
  form.elements.rules.value = strategy?.rules || "";
  form.elements.commonMistakes.value = strategy?.commonMistakes || "";
  form.elements.examples.value = strategy?.examples || "";
  document.getElementById("btn-delete-strategy").hidden = !strategy;
  renderStrategyList(strategy?.id || "");
}

function openStrategyManager(id = null) {
  const first = allStrategies()[0]?.id || "";
  selectStrategy(id === null ? first : id);
  openModal("modal-strategies");
}

export function bindJournalForm(onSaved) {
  onJournalChanged = onSaved;
  const form = document.getElementById("journal-form");
  if (!form) return;
  ["balanceStart", "balanceEnd"].forEach((name) => form.elements[name]?.addEventListener("input", updateLivePnl));
  form.elements.date?.addEventListener("change", () => {
    if (!form.elements.id.value) applyInheritedBalance(form.elements.date.value);
  });
  document.getElementById("btn-edit-start-balance")?.addEventListener("click", () => {
    const input = form.elements.balanceStart;
    input.readOnly = !input.readOnly;
    document.getElementById("btn-edit-start-balance").textContent = input.readOnly ? "ویرایش" : "قفل";
    if (!input.readOnly) input.focus();
  });
  document.getElementById("btn-add-trade")?.addEventListener("click", () => {
    const trades = collectTrades();
    if (trades.length >= MAX_TRADES) return;
    trades.push(normalizeTrades({})[0]);
    renderTradeEditors(trades);
  });
  document.getElementById("trades-editor-list")?.addEventListener("click", (event) => {
    const remove = event.target.closest(".btn-remove-trade");
    if (!remove) return;
    const card = remove.closest(".trade-editor");
    const trades = collectTrades().filter((_, index) => index !== Number(card.dataset.tradeIndex));
    renderTradeEditors(trades);
  });
  document.getElementById("trades-editor-list")?.addEventListener("input", (event) => {
    if (event.target.type === "range") {
      const output = event.target.closest(".range-field")?.querySelector("output");
      if (output) output.value = event.target.value;
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
    const firstTrade = trades[0];
    const entry = {
      id: fd.get("id") || uid("j"),
      date: String(fd.get("date")),
      balanceStart: Number(fd.get("balanceStart")),
      balanceEnd: Number(fd.get("balanceEnd")),
      trades,
      strategy: firstTrade.strategy,
      entryQuality: firstTrade.entryQuality,
      exitQuality: firstTrade.exitQuality,
      rr: firstTrade.rr,
      emotion: firstTrade.emotion,
      ruleFollow: Number(fd.get("ruleFollow")),
      lesson: String(fd.get("lesson") || ""),
      notes: String(fd.get("notes") || ""),
      mediaPath: String(fd.get("mediaPath") || "").trim(),
    };
    try {
      await saveJournal(upsertJournalEntry(entry));
      closeModal("modal-journal");
      showToast(`${trades.length} معامله برای این روز ذخیره شد`);
      onSaved?.();
    } catch (error) {
      showToast(error.message || "خطا در ذخیره ژورنال");
    }
  });

  document.getElementById("btn-new-strategy")?.addEventListener("click", () => selectStrategy(""));
  document.getElementById("strategy-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const strategyForm = event.currentTarget;
    const name = strategyForm.elements.name.value.trim();
    const state = getState();
    const strategies = structuredClone(state.strategies || { primary: [], secondary: [] });
    const existingPrimary = strategies.primary.findIndex((item) => item.id === strategyBeingEdited);
    const existingSecondary = strategies.secondary.findIndex((item) => item.id === strategyBeingEdited);
    const strategy = {
      id: strategyBeingEdited || uid("strategy"),
      name,
      color: strategyForm.elements.color.value,
      description: strategyForm.elements.description.value.trim(),
      conditions: strategyForm.elements.conditions.value.trim(),
      rules: strategyForm.elements.rules.value.trim(),
      commonMistakes: strategyForm.elements.commonMistakes.value.trim(),
      examples: strategyForm.elements.examples.value.trim(),
      tested: existingPrimary >= 0 ? strategies.primary[existingPrimary].tested : false,
    };
    if (existingPrimary >= 0) strategies.primary[existingPrimary] = strategy;
    else if (existingSecondary >= 0) strategies.secondary[existingSecondary] = strategy;
    else strategies.primary.push(strategy);
    try {
      await saveStrategies(strategies);
      strategyBeingEdited = strategy.id;
      renderStrategyList(strategy.id);
      showToast("استراتژی ذخیره شد");
      onSaved?.();
    } catch (error) {
      showToast(error.message || "خطا در ذخیره استراتژی");
    }
  });
  document.getElementById("btn-delete-strategy")?.addEventListener("click", async () => {
    if (!strategyBeingEdited || !window.confirm("این استراتژی حذف شود؟")) return;
    const strategies = structuredClone(getState().strategies);
    strategies.primary = strategies.primary.filter((item) => item.id !== strategyBeingEdited);
    strategies.secondary = strategies.secondary.filter((item) => item.id !== strategyBeingEdited);
    try {
      await saveStrategies(strategies);
      selectStrategy("");
      showToast("استراتژی حذف شد");
      onSaved?.();
    } catch (error) {
      showToast(error.message || "خطا در حذف استراتژی");
    }
  });
  window.addEventListener("workspace:new-journal", () => {
    const today = (getState().journal?.entries || []).find((entry) => entry.date === todayISO());
    openJournalForm(today || null);
  });
}
