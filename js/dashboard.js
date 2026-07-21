import {
  calcStreak,
  calcWindowStats,
  enrichEntries,
  escapeHtml,
  formatPct,
  sameMonth,
  sameWeek,
  todayISO,
} from "./config.js";
import { navigate } from "./router.js";
import { openModal } from "./components/modal.js";

function progressPct(actual, goal) {
  if (!goal) return 0;
  return Math.max(0, Math.min(120, (actual / goal) * 100));
}

export function renderDashboard(state) {
  const root = document.getElementById("view-dashboard");
  if (!root) return;

  const settings = state.settings || {};
  const plan = state.plan || {};
  const name = settings.userName || plan.userName || "سپهر";
  const goals = settings.goals || plan.goals || {};
  const entries = state.journal?.entries || [];
  const enriched = enrichEntries(entries).sort((a, b) => b.date.localeCompare(a.date));
  const hasToday = entries.some((e) => e.date === todayISO());
  const streak = calcStreak(entries);
  const now = new Date();
  const dayStats = calcWindowStats(entries, (d) => d.toDateString() === now.toDateString());
  const weekStats = calcWindowStats(entries, (d) => sameWeek(d, now));
  const monthStats = calcWindowStats(entries, (d) => sameMonth(d, now));

  const strategies = [
    ...(state.strategies?.primary || []),
    ...(state.strategies?.secondary || []),
  ];

  const recentNotes = (state.notes?.sections || [])
    .flatMap((s) => s.items.map((i) => ({ ...i, section: s.title })))
    .filter((i) => i.favorite)
    .slice(0, 4);

  const habitClass = hasToday ? "habit-banner is-done" : "habit-banner";
  const habitTitle = hasToday ? "عالی — ژورنال امروز ثبت شد." : "امروز هنوز ژورنال ثبت نشده";
  const habitDesc = hasToday
    ? `${streak} روز متوالی ثبت ژورنال. همین نظم را نگه دار.`
    : "ثبت ژورنال روزانه، پایه نظم معاملاتی توست.";

  root.innerHTML = `
    <header class="page-header hero-greeting">
      <div class="page-header__eyebrow">خانه</div>
      <h1>سلام ${escapeHtml(name)}</h1>
      <p>امروز آماده‌ای؟ فضای آرام خودت برای تمرکز قبل و بعد از ترید.</p>
    </header>

    <div class="${habitClass} u-mb-5">
      <div>
        <h3 class="u-mb-2">${habitTitle}</h3>
        <p class="u-mb-0">${habitDesc}</p>
      </div>
      <button class="btn ${hasToday ? "btn-ghost" : "btn-primary"} btn-lg" data-action="new-journal">
        ${hasToday ? "ویرایش ژورنال امروز" : "ثبت ژورنال"}
      </button>
    </div>

    <div class="grid-2 u-mb-5">
      <section class="card">
        <h3 class="card__title">تمرکز امروز</h3>
        <p class="u-mb-0">${escapeHtml(plan.focusToday || "تمرکز روی اجرای پلن.")}</p>
      </section>
      <section class="card">
        <h3 class="card__title">میانبرها</h3>
        <div class="quick-actions">
          <button class="quick-action" data-action="new-journal">
            <span class="quick-action__label">ثبت ژورنال امروز</span>
            <span class="quick-action__hint">فرم روزانه</span>
          </button>
          <button class="quick-action" data-action="goto-journal">
            <span class="quick-action__label">آخرین تریدها</span>
            <span class="quick-action__hint">مرور ژورنال</span>
          </button>
          <button class="quick-action" data-action="morning">
            <span class="quick-action__label">چک لیست</span>
            <span class="quick-action__hint">قبل از ترید</span>
          </button>
          <button class="quick-action" data-action="open-plan">
            <span class="quick-action__label">پلن معاملاتی</span>
            <span class="quick-action__hint">قوانین اصلی</span>
          </button>
        </div>
      </section>
    </div>

    <div class="grid-2 u-mb-5">
      <section class="card">
        <h3 class="card__title">پیشرفت امروز</h3>
        ${goalRow("هدف روز", dayStats.pct, goals.dailyPct || 0.02)}
        ${goalRow("هدف هفته", weekStats.pct, goals.weeklyPct || 0.04)}
        ${goalRow("هدف ماه", monthStats.pct, goals.monthlyPct || 0.17)}
      </section>
      <section class="card">
        <div class="u-flex u-justify-between u-items-center u-mb-3">
          <h3 class="card__title u-mb-0">قوانین معاملاتی</h3>
          <button class="btn btn-ghost" data-action="open-plan">همه</button>
        </div>
        ${(plan.rules || []).slice(0, 4).map((r) => `
          <div class="list-row">
            <span class="u-text-sm">${escapeHtml(r)}</span>
          </div>
        `).join("")}
      </section>
    </div>

    <div class="grid-2">
      <section class="card">
        <h3 class="card__title">استراتژی‌های فعال</h3>
        <div class="strategy-chips">
          ${strategies.slice(0, 11).map((s) => `
            <span class="strategy-chip">
              <span class="strategy-chip__swatch" style="background:${s.color}"></span>
              ${escapeHtml(s.name)}
            </span>
          `).join("")}
        </div>
      </section>
      <section class="card">
        <h3 class="card__title">اخیر</h3>
        <div class="u-mb-4">
          <div class="u-text-xs muted u-mb-2">ژورنال‌ها</div>
          ${enriched.slice(0, 3).map((e) => `
            <div class="list-row">
              <span class="u-text-sm">${escapeHtml(e.date)} · ${escapeHtml(e.strategy || "")}</span>
              <span class="num u-text-sm ${e.pnl >= 0 ? "profit" : "loss"}">${formatPct(e.pct)}</span>
            </div>
          `).join("") || `<p class="muted u-text-sm">هنوز ژورنالی نیست.</p>`}
        </div>
        <div>
          <div class="u-text-xs muted u-mb-2">نکات سنجاق‌شده</div>
          ${recentNotes.map((n) => `
            <div class="list-row">
              <span class="u-text-sm u-truncate">${escapeHtml(n.text)}</span>
            </div>
          `).join("") || `<p class="muted u-text-sm">نکته‌ای سنجاق نشده.</p>`}
        </div>
      </section>
    </div>
  `;

  root.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      if (action === "new-journal") {
        navigate("journal");
        window.dispatchEvent(new CustomEvent("workspace:new-journal"));
      } else if (action === "goto-journal") {
        navigate("journal");
      } else if (action === "morning") {
        openModal("modal-morning");
      } else if (action === "open-plan") {
        navigate("knowledge");
        window.dispatchEvent(new CustomEvent("workspace:open-section", { detail: "trading-plan" }));
      }
    });
  });
}

function goalRow(label, actual, goal) {
  const width = progressPct(actual, goal);
  return `
    <div class="goal-row">
      <div class="goal-row__top">
        <span>${label} <span class="muted">(${formatPct(goal, 0)})</span></span>
        <span class="num ${actual >= 0 ? "profit" : "loss"}">${formatPct(actual)}</span>
      </div>
      <div class="progress"><div class="progress__bar ${width >= 100 ? "is-over" : ""}" style="width:${Math.min(width, 100)}%"></div></div>
    </div>
  `;
}
