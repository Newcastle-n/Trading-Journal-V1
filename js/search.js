import { escapeHtml, formatPct, enrichEntries } from "./config.js";

export function renderBacktests(state) {
  const root = document.getElementById("view-backtests");
  if (!root) return;

  const trades = state.backtests?.trades || [];
  const strategies = [...(state.strategies?.primary || []), ...(state.strategies?.secondary || [])];

  root.innerHTML = `
    <header class="page-header">
      <div class="page-header__eyebrow">بک‌تست</div>
      <h1>بک‌تست‌ها</h1>
      <p class="page-header__desc">اسکلت آماده است. داده واقعی را بعداً از اکسل وارد می‌کنیم.</p>
    </header>

    <div class="filters">
      <div class="field">
        <label>استراتژی</label>
        <select disabled>
          <option>همه</option>
          ${strategies.map((s) => `<option>${escapeHtml(s.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>نتیجه</label>
        <select disabled>
          <option>همه</option>
          <option>برد</option>
          <option>باخت</option>
        </select>
      </div>
      <div class="field">
        <label>بازار</label>
        <select disabled>
          <option>US30</option>
        </select>
      </div>
    </div>

    <div class="journal-stats">
      <div class="stat-tile">
        <div class="stat-tile__label">نرخ برد</div>
        <div class="stat-tile__value num">—</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile__label">میانگین ریسک‌به‌ریوارد</div>
        <div class="stat-tile__value num">—</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile__label">تعداد معاملات</div>
        <div class="stat-tile__value num">${trades.length}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile__label">انتظار ریاضی</div>
        <div class="stat-tile__value num">—</div>
      </div>
    </div>

    <div class="empty-state">
      هنوز بک‌تستی وارد نشده. وقتی فایل اکسل را بدهی، فیلترها، آمار و چارت‌ها اینجا پر می‌شوند.
    </div>
  `;
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

  [...(state.strategies?.primary || []), ...(state.strategies?.secondary || [])].forEach((s) => {
    items.push({
      type: "strategy",
      id: s.id,
      title: s.name,
      subtitle: s.description,
      action: { type: "view", view: "knowledge", section: `strat-${String(s.id).replace(/\//g, "-")}` },
    });
  });

  if (state.notes?.version === 2) {
    Object.values(state.notes.pages || {}).forEach((page) => {
      const body = (page.blocks || [])
        .map((b) => b.text || b.title || "")
        .join(" ")
        .slice(0, 80);
      items.push({
        type: "note",
        id: page.id,
        title: page.title,
        subtitle: body || (page.tags || []).join(" · "),
        action: { type: "view", view: "knowledge", section: page.id },
      });
    });
  } else {
    (state.notes?.sections || []).forEach((section) => {
      section.items.forEach((item) => {
        items.push({
          type: "note",
          id: item.id,
          title: item.text.slice(0, 60),
          subtitle: section.title,
          action: { type: "view", view: "knowledge", section: section.id },
        });
      });
    });
  }

  items.push(
    { type: "command", id: "c-new-j", title: "ثبت ژورنال جدید", subtitle: "ژورنال", action: { type: "new-journal" } },
    { type: "command", id: "c-dash", title: "رفتن به خانه", subtitle: "ناوبری", action: { type: "view", view: "dashboard" } },
    { type: "command", id: "c-plan", title: "پلن معاملاتی", subtitle: "دانش", action: { type: "view", view: "knowledge", section: "plan-overview" } },
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
