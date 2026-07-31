import { escapeHtml, uid } from "./config.js";
import { icon } from "./components/icons.js";
import { getState, saveBooklet, saveNotes } from "./storage.js";
import { showToast } from "./components/toast.js";

const ui = {
  query: "",
  chapterId: "",
  sidebarOpen: false,
  hitAnchor: "",
};

let tocObserver = null;
let searchTimer = 0;

/** Chapters that pull live content from wiki / strategies / journal */
const LIVE = {
  quick: "quick",
  strategies: "strategies",
  checklist: "checklist",
  mistakes: "mistakes",
  lessons: "lessons",
};

function chapters(book) {
  return book?.chapters || [];
}

function findChapter(book, id) {
  return chapters(book).find((c) => c.id === id) || null;
}

function blockText(b) {
  const parts = [];
  if (b.text) parts.push(b.text);
  if (b.title) parts.push(b.title);
  if (Array.isArray(b.items)) {
    for (const x of b.items) {
      if (typeof x === "string") parts.push(x);
      else if (x?.text) parts.push(x.text);
    }
  }
  return parts.join(" ");
}

function highlight(text, query) {
  const safe = escapeHtml(text || "");
  const q = (query || "").trim();
  if (!q) return safe;
  try {
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return safe.replace(re, '<mark class="kb2-mark">$1</mark>');
  } catch {
    return safe;
  }
}

function getQuickNoteItems(notes) {
  const page = notes?.pages?.["quick-notes"];
  if (!page) return [];
  const list = (page.blocks || []).find((b) => b.type === "notes-list");
  return list?.items || [];
}

function ensureQuickNotesList(notes) {
  let page = notes.pages?.["quick-notes"];
  if (!page) {
    page = {
      id: "quick-notes",
      title: "یادداشت‌های سریع",
      tags: ["quick"],
      blocks: [{ type: "notes-list", items: [] }],
    };
    notes.pages = notes.pages || {};
    notes.pages["quick-notes"] = page;
  }
  let list = (page.blocks || []).find((b) => b.type === "notes-list");
  if (!list) {
    list = { type: "notes-list", items: [] };
    page.blocks = page.blocks || [];
    page.blocks.push(list);
  }
  list.items = list.items || [];
  return list;
}

function getWikiChecklist(notes, pageId) {
  const page = notes?.pages?.[pageId];
  if (!page) return { title: pageId, items: [] };
  const block = (page.blocks || []).find((b) => b.type === "checklist");
  return {
    title: page.title || pageId,
    items: block?.items || [],
  };
}

function journalLessons(journal) {
  const entries = journal?.entries || [];
  return entries
    .filter((e) => String(e.lesson || "").trim())
    .map((e) => ({
      id: `jl-${e.id}`,
      text: String(e.lesson).trim(),
      date: e.date || "",
      source: "journal",
    }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function chapterBadgeCount(ch, state) {
  switch (ch.id) {
    case "quick":
      return getQuickNoteItems(state.notes).length;
    case "strategies": {
      const s = state.strategies || {};
      return (s.primary || []).length + (s.secondary || []).length;
    }
    case "checklist": {
      const notes = state.notes;
      const a = getWikiChecklist(notes, "check-presession").items.length;
      const b = getWikiChecklist(notes, "check-during").items.length;
      const c = getWikiChecklist(notes, "check-eod").items.length;
      return a + b + c + (ch.items || []).length;
    }
    case "lessons":
      return (ch.items || []).length + journalLessons(state.journal).length;
    default:
      return (ch.items || []).length;
  }
}

function liveHeadings(ch) {
  switch (ch.id) {
    case "strategies":
      return [
        { id: "strat-primary", text: "استراتژی‌های اصلی", level: 2 },
        { id: "strat-secondary", text: "استراتژی‌های فرعی", level: 2 },
      ];
    case "checklist":
      return [
        { id: "check-pre", text: "پیش از سشن", level: 2 },
        { id: "check-during", text: "حین معامله", level: 2 },
        { id: "check-eod", text: "پایان روز", level: 2 },
        { id: "check-personal", text: "آیتم‌های شخصی", level: 2 },
      ];
    case "lessons":
      return [
        { id: "lessons-personal", text: "درس‌های ثبت‌شده", level: 2 },
        { id: "lessons-journal", text: "درس‌های ژورنال", level: 2 },
      ];
    case "quick":
      return [{ id: "journal-items", text: "Inbox", level: 2 }];
    case "mistakes":
      return [{ id: "journal-items", text: "اشتباهات", level: 2 }];
    default:
      return [];
  }
}

function extractHeadings(ch) {
  const fromBlocks = (ch.blocks || [])
    .filter((b) => b.type === "heading" && (b.level === 2 || b.level === 3))
    .map((b) => ({ id: b.id, text: b.text, level: b.level }));
  if (LIVE[ch.id]) {
    const live = liveHeadings(ch);
    const ids = new Set(fromBlocks.map((h) => h.id));
    return [...fromBlocks, ...live.filter((h) => !ids.has(h.id))];
  }
  return fromBlocks;
}

function renderBlock(b, query) {
  switch (b.type) {
    case "heading": {
      const lvl = Math.min(Math.max(b.level || 2, 2), 3);
      return `<h${lvl} class="kb2-h kb2-h--${lvl}" id="${escapeHtml(b.id || "")}">${highlight(b.text, query)}</h${lvl}>`;
    }
    case "paragraph":
      return `<p class="kb2-p">${highlight(b.text, query)}</p>`;
    case "list":
      return `<ul class="kb2-list">${(b.items || []).map((it) => `<li>${highlight(it, query)}</li>`).join("")}</ul>`;
    case "callout": {
      const v = b.variant === "rule" || b.variant === "definition" || b.variant === "key" ? b.variant : "key";
      return `
        <aside class="kb2-callout kb2-callout--${v}">
          <div class="kb2-callout__title">${escapeHtml(b.title || "")}</div>
          <div class="kb2-callout__body">${highlight(b.text, query)}</div>
        </aside>`;
    }
    default:
      return "";
  }
}

function renderJournalList(items, { editable = true, emptyText = "هنوز موردی نیست." } = {}) {
  if (!items.length) {
    return `<div class="kb2-empty"><p>${escapeHtml(emptyText)}</p></div>`;
  }
  return `
    <ul class="kb2-journal__list">
      ${items
        .map(
          (it) => `
        <li class="kb2-journal__item" data-note-id="${escapeHtml(it.id)}">
          <div class="kb2-journal__body">
            <p>${escapeHtml(it.text)}</p>
            ${it.date ? `<div class="kb2-journal__meta muted u-text-xs num">${escapeHtml(it.date)}</div>` : ""}
            ${
              (it.tags || []).length
                ? `<div class="kb2-journal__tags">${(it.tags || [])
                    .map((t) => `<span class="kb2-tag">#${escapeHtml(t)}</span>`)
                    .join("")}</div>`
                : ""
            }
          </div>
          ${
            editable
              ? `<div class="kb2-journal__actions">
                  <button type="button" class="btn-icon" data-edit-item="${escapeHtml(it.id)}" title="ویرایش" aria-label="ویرایش">${icon("edit", 14)}</button>
                  <button type="button" class="btn-icon kb2-journal__del" data-del-item="${escapeHtml(it.id)}" title="حذف" aria-label="حذف">${icon("trash", 14)}</button>
                </div>`
              : ""
          }
        </li>`,
        )
        .join("")}
    </ul>`;
}

function renderAddForm(label) {
  return `
    <form class="kb2-add" id="kb2-add-form">
      <label class="sr-only" for="kb2-add-input">${escapeHtml(label || "افزودن")}</label>
      <textarea id="kb2-add-input" rows="3" placeholder="متن جدید…" required></textarea>
      <button class="btn btn-primary" type="submit">${escapeHtml(label || "افزودن مورد جدید")}</button>
    </form>`;
}

function renderStrategies(state, query) {
  const primary = state.strategies?.primary || [];
  const secondary = state.strategies?.secondary || [];

  const card = (s, kind) => `
    <article class="kb2-strat-card">
      <div class="kb2-strat-card__head">
        <span class="kb2-strat-card__dot" style="background:${escapeHtml(s.color || "#888")}"></span>
        <strong>${highlight(s.name || s.id, query)}</strong>
        <span class="kb2-strat-card__badge">${kind === "primary" ? "اصلی" : "فرعی"}</span>
        ${s.tested ? `<span class="kb2-strat-card__badge kb2-strat-card__badge--ok">تست‌شده</span>` : ""}
      </div>
      ${s.description ? `<p>${highlight(s.description, query)}</p>` : ""}
    </article>`;

  return `
    <div class="kb2-live" id="journal-items">
      <h2 class="kb2-h kb2-h--2" id="strat-primary">استراتژی‌های اصلی</h2>
      <p class="kb2-p muted">ستاپ‌های Primary از مدیر استراتژی — همان‌هایی که در ژورنال و بک‌تست استفاده می‌کنی.</p>
      <div class="kb2-strat-grid">
        ${primary.length ? primary.map((s) => card(s, "primary")).join("") : `<div class="kb2-empty"><p>استراتژی اصلی ثبت نشده.</p></div>`}
      </div>
      <h2 class="kb2-h kb2-h--2" id="strat-secondary">استراتژی‌های فرعی</h2>
      <div class="kb2-strat-grid">
        ${secondary.length ? secondary.map((s) => card(s, "secondary")).join("") : `<div class="kb2-empty"><p>استراتژی فرعی ثبت نشده.</p></div>`}
      </div>
    </div>`;
}

function renderChecklistGroup(id, title, items, query) {
  return `
    <h2 class="kb2-h kb2-h--2" id="${escapeHtml(id)}">${escapeHtml(title)}</h2>
    <div class="kb2-checklist">
      ${(items || [])
        .map(
          (it) => `
        <label class="kb2-check">
          <input type="checkbox" ${it.checked ? "checked" : ""} disabled />
          <span>${highlight(typeof it === "string" ? it : it.text || "", query)}</span>
        </label>`,
        )
        .join("") || `<div class="kb2-empty"><p>آیتمی نیست.</p></div>`}
    </div>`;
}

function renderChecklists(ch, state, query) {
  const notes = state.notes;
  const pre = getWikiChecklist(notes, "check-presession");
  const during = getWikiChecklist(notes, "check-during");
  const eod = getWikiChecklist(notes, "check-eod");
  const morning = (state.settings?.morningChecklist || []).map((t) => ({ text: t, checked: false }));

  return `
    <div class="kb2-live" id="journal-items">
      ${renderChecklistGroup("check-pre", pre.title || "پیش از سشن", pre.items.length ? pre.items : morning, query)}
      ${renderChecklistGroup("check-during", during.title || "حین معامله", during.items, query)}
      ${renderChecklistGroup("check-eod", eod.title || "پایان روز", eod.items, query)}
      <h2 class="kb2-h kb2-h--2" id="check-personal">آیتم‌های شخصی</h2>
      <p class="kb2-p muted">سه چک‌لیست عملیاتی اصلی؛ آیتم شخصی را پایین صفحه اضافه کن.</p>
      <div class="kb2-journal">
        ${renderJournalList(ch.items || [], { emptyText: "هنوز آیتم شخصی اضافه نکرده‌ای." })}
        ${renderAddForm(ch.addLabel || "افزودن آیتم چک‌لیست")}
      </div>
    </div>`;
}

function renderQuickNotes(state, query) {
  const items = getQuickNoteItems(state.notes);
  return `
    <div class="kb2-journal" id="journal-items">
      <p class="kb2-p muted">همگام با دکمه «ثبت نکته» — ویرایش اینجا همان Inbox را به‌روز می‌کند.</p>
      ${renderJournalList(
        items,
        { emptyText: "هنوز یادداشت سریعی نیست. از فرم زیر یا ثبت نکته اضافه کن." },
      )}
      ${renderAddForm("افزودن یادداشت سریع")}
    </div>`;
}

function renderMistakes(ch) {
  return `
    <div class="kb2-journal" id="journal-items">
      ${renderJournalList(ch.items || [], { emptyText: "هنوز اشتباهی ثبت نشده." })}
      ${renderAddForm(ch.addLabel || "افزودن اشتباه")}
    </div>`;
}

function renderLessons(ch, state) {
  const personal = ch.items || [];
  const fromJournal = journalLessons(state.journal);
  return `
    <div class="kb2-live" id="journal-items">
      <h2 class="kb2-h kb2-h--2" id="lessons-personal">درس‌های ثبت‌شده</h2>
      <div class="kb2-journal">
        ${renderJournalList(personal, { emptyText: "هنوز درسی اینجا ثبت نکرده‌ای." })}
        ${renderAddForm(ch.addLabel || "افزودن درس")}
      </div>
      <h2 class="kb2-h kb2-h--2" id="lessons-journal">درس‌های ژورنال</h2>
      <p class="kb2-p muted">از فیلد «درس امروز» در ژورنال‌های ثبت‌شده جمع شده‌اند.</p>
      ${renderJournalList(fromJournal, { editable: false, emptyText: "هنوز درسی در ژورنال نیست." })}
    </div>`;
}

function renderLiveSection(ch, state) {
  const q = ui.query;
  switch (ch.id) {
    case "strategies":
      return renderStrategies(state, q);
    case "checklist":
      return renderChecklists(ch, state, q);
    case "quick":
      return renderQuickNotes(state, q);
    case "mistakes":
      return renderMistakes(ch);
    case "lessons":
      return renderLessons(ch, state);
    default:
      return renderJournalFallback(ch);
  }
}

function renderJournalFallback(ch) {
  return `
    <div class="kb2-journal" id="journal-items">
      ${renderJournalList(ch.items || [], { emptyText: ch.placeholder || "هنوز موردی نیست." })}
      ${renderAddForm(ch.addLabel || "افزودن مورد جدید")}
    </div>`;
}

function collectLiveSearchBlobs(ch, state) {
  const parts = [];
  switch (ch.id) {
    case "quick":
      for (const it of getQuickNoteItems(state.notes)) parts.push(it.text || "");
      break;
    case "strategies": {
      const s = state.strategies || {};
      for (const it of [...(s.primary || []), ...(s.secondary || [])]) {
        parts.push(it.name || "", it.description || "");
      }
      break;
    }
    case "checklist": {
      for (const id of ["check-presession", "check-during", "check-eod"]) {
        const g = getWikiChecklist(state.notes, id);
        parts.push(g.title);
        for (const it of g.items) parts.push(it.text || "");
      }
      for (const it of ch.items || []) parts.push(it.text || "");
      break;
    }
    case "lessons":
      for (const it of ch.items || []) parts.push(it.text || "");
      for (const it of journalLessons(state.journal)) parts.push(it.text || "");
      break;
    default:
      for (const it of ch.items || []) parts.push(it.text || "");
  }
  return parts;
}

function renderSearchHits(book, state) {
  const q = ui.query.trim().toLowerCase();
  if (!q) return "";
  const hits = [];
  for (const ch of chapters(book)) {
    if (ch.title.toLowerCase().includes(q) || (ch.intro || "").toLowerCase().includes(q)) {
      hits.push({ chapterId: ch.id, title: ch.title, snippet: ch.intro || ch.title, anchor: "" });
    }
    for (const b of ch.blocks || []) {
      const blob = blockText(b);
      if (!blob.toLowerCase().includes(q)) continue;
      const anchor = b.type === "heading" ? b.id || "" : "";
      const snip = blob.replace(/\s+/g, " ").slice(0, 140);
      hits.push({
        chapterId: ch.id,
        title: ch.title,
        snippet: snip,
        anchor: anchor || extractHeadings(ch)[0]?.id || "",
      });
    }
    for (const text of collectLiveSearchBlobs(ch, state)) {
      if (!text.toLowerCase().includes(q)) continue;
      hits.push({ chapterId: ch.id, title: ch.title, snippet: text, anchor: "journal-items" });
    }
  }

  const seen = new Set();
  const unique = [];
  for (const h of hits) {
    const key = `${h.chapterId}|${String(h.snippet).slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(h);
  }

  if (!unique.length) {
    return `<div class="kb2-search-hits"><p class="muted">نتیجه‌ای در جزوه پیدا نشد.</p></div>`;
  }

  return `
    <div class="kb2-search-hits">
      <div class="kb2-search-hits__head">${unique.length} نتیجه در جزوه</div>
      ${unique
        .slice(0, 50)
        .map(
          (h) => `
        <button type="button" class="kb2-hit" data-open-ch="${escapeHtml(h.chapterId)}" data-anchor="${escapeHtml(h.anchor || "")}">
          <div class="kb2-hit__ch">${escapeHtml(h.title)}</div>
          <div class="kb2-hit__snip">${highlight(h.snippet, ui.query)}…</div>
        </button>`,
        )
        .join("")}
    </div>`;
}

export function renderKnowledge2(state) {
  const root = document.getElementById("view-knowledge2");
  if (!root) return;
  const book = state.booklet;
  if (!book?.chapters?.length) {
    root.innerHTML = `<div class="empty-state">جزوه بارگذاری نشد. <code>data/notes-booklet.json</code> را چک کن.</div>`;
    return;
  }

  if (!ui.chapterId || !findChapter(book, ui.chapterId)) {
    ui.chapterId = book.activeChapterId || book.chapters[0].id;
  }

  const ch = findChapter(book, ui.chapterId);
  const headings = ch ? extractHeadings(ch) : [];
  const showHits = Boolean(ui.query.trim());
  const isLive = ch && Boolean(LIVE[ch.id]);
  const isJournal = ch && (ch.mode === "journal" || isLive);

  root.innerHTML = `
    <div class="kb2-shell ${ui.sidebarOpen ? "is-sidebar-open" : ""}">
      <div class="kb2-top">
        <button type="button" class="btn-icon kb2-menu" id="kb2-menu" title="فهرست فصل‌ها" aria-label="فهرست">${icon("menu", 18)}</button>
        <div class="kb2-search field">
          <label class="sr-only" for="kb2-search">جستجو در جزوه</label>
          <span class="kb2-search__ico">${icon("search", 16)}</span>
          <input id="kb2-search" type="search" placeholder="جستجو در کل متن جزوه…" value="${escapeHtml(ui.query)}" autocomplete="off" />
        </div>
        <div class="kb2-top__label muted u-text-sm">دانش · جزوه معاملاتی</div>
      </div>

      <aside class="kb2-sidebar" id="kb2-sidebar">
        <div class="kb2-sidebar__title">فهرست فصل‌ها</div>
        <nav class="kb2-nav" aria-label="فصل‌های جزوه">
          ${chapters(book)
            .map((c) => {
              const count = c.mode === "journal" || LIVE[c.id] ? chapterBadgeCount(c, state) : null;
              return `
            <button type="button" class="kb2-nav__item ${c.id === ui.chapterId ? "is-active" : ""}" data-ch="${escapeHtml(c.id)}">
              <span class="kb2-nav__num">${String(c.number).padStart(2, "0")}</span>
              <span class="kb2-nav__label">${escapeHtml(c.title)}</span>
              ${count != null ? `<span class="kb2-nav__badge">${count}</span>` : ""}
            </button>`;
            })
            .join("")}
        </nav>
      </aside>

      <div class="kb2-backdrop" id="kb2-backdrop" hidden></div>

      <main class="kb2-main" id="kb2-main">
        <div class="kb2-progress" aria-hidden="true"><div class="kb2-progress__bar" id="kb2-progress-bar"></div></div>
        ${
          showHits
            ? renderSearchHits(book, state)
            : ch
              ? `
          <article class="kb2-article">
            <nav class="kb2-crumb" aria-label="مسیر">
              <span>دانش</span><span class="kb2-crumb__sep">›</span>
              <span class="kb2-crumb__cur">${escapeHtml(ch.title)}</span>
            </nav>
            <header class="kb2-article__head">
              <div class="kb2-article__num">فصل ${String(ch.number).padStart(2, "0")}</div>
              <h1>${highlight(ch.title, ui.query)}</h1>
              ${ch.intro ? `<p class="kb2-article__intro">${highlight(ch.intro, ui.query)}</p>` : ""}
            </header>
            <div class="kb2-article__body">
              ${(ch.blocks || []).map((b) => renderBlock(b, ui.query)).join("")}
              ${isJournal ? (isLive ? renderLiveSection(ch, state) : renderJournalFallback(ch)) : ""}
            </div>
          </article>`
              : `<div class="empty-state">فصلی انتخاب نشده.</div>`
        }
      </main>

      <aside class="kb2-outline" ${showHits || !ch ? "hidden" : ""}>
        <div class="kb2-outline__title">در این صفحه</div>
        <nav class="kb2-toc" id="kb2-toc">
          ${
            headings.length
              ? headings
                  .map(
                    (h) => `
            <a class="kb2-toc__link kb2-toc__link--${h.level}" href="#${escapeHtml(h.id)}" data-toc="${escapeHtml(h.id)}">${escapeHtml(h.text)}</a>`,
                  )
                  .join("")
              : `<div class="muted u-text-sm">زیربخشی نیست</div>`
          }
        </nav>
      </aside>
    </div>
  `;

  bindDom(root, book);
  if (!showHits && ch) {
    setupToc(root);
    setupProgress(root);
    if (ui.hitAnchor) {
      const el = document.getElementById(ui.hitAnchor);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      ui.hitAnchor = "";
    }
  }
}

function beginItemEdit(li, id, source) {
  const p = li.querySelector("p");
  const current = p?.textContent || "";
  li.classList.add("is-editing");
  const body = li.querySelector(".kb2-journal__body") || li;
  const actions = li.querySelector(".kb2-journal__actions");
  if (actions) actions.hidden = true;
  const editor = document.createElement("div");
  editor.className = "kb2-journal__editor";
  editor.innerHTML = `
    <textarea class="kb2-note-edit" rows="3">${escapeHtml(current)}</textarea>
    <div class="kb2-journal__edit-actions">
      <button type="button" class="btn btn-primary" data-save-edit>ذخیره</button>
      <button type="button" class="btn btn-ghost" data-cancel-edit>انصراف</button>
    </div>
  `;
  p?.replaceWith(editor);
  const ta = editor.querySelector("textarea");
  ta?.focus();

  editor.querySelector("[data-cancel-edit]")?.addEventListener("click", () => {
    renderKnowledge2(getState());
  });

  editor.querySelector("[data-save-edit]")?.addEventListener("click", async () => {
    const text = ta?.value.trim() || "";
    if (!text) {
      showToast("متن خالی نباشد");
      return;
    }
    try {
      if (source === "quick") {
        const next = structuredClone(getState().notes);
        const list = ensureQuickNotesList(next);
        const item = list.items.find((it) => it.id === id);
        if (!item) throw new Error("یادداشت پیدا نشد");
        item.text = text;
        await saveNotes(next);
      } else {
        const next = structuredClone(getState().booklet);
        const ch = findChapter(next, ui.chapterId);
        const item = (ch?.items || []).find((it) => it.id === id);
        if (!item) throw new Error("مورد پیدا نشد");
        item.text = text;
        await saveBooklet(next);
      }
      showToast("ذخیره شد");
      renderKnowledge2(getState());
    } catch (err) {
      showToast(err.message || "خطا در ذخیره");
    }
  });
}

function bindDom(root, book) {
  root.querySelector("#kb2-search")?.addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      ui.query = e.target.value;
      renderKnowledge2(getState());
      queueMicrotask(() => document.getElementById("kb2-search")?.focus());
    }, 150);
  });

  root.querySelector("#kb2-menu")?.addEventListener("click", () => {
    ui.sidebarOpen = !ui.sidebarOpen;
    root.querySelector(".kb2-shell")?.classList.toggle("is-sidebar-open", ui.sidebarOpen);
    const bd = root.querySelector("#kb2-backdrop");
    if (bd) bd.hidden = !ui.sidebarOpen;
  });

  root.querySelector("#kb2-backdrop")?.addEventListener("click", () => {
    ui.sidebarOpen = false;
    root.querySelector(".kb2-shell")?.classList.remove("is-sidebar-open");
    const bd = root.querySelector("#kb2-backdrop");
    if (bd) bd.hidden = true;
  });

  root.querySelectorAll("[data-ch]").forEach((btn) => {
    btn.addEventListener("click", () => openChapter(btn.getAttribute("data-ch")));
  });

  root.querySelectorAll("[data-open-ch]").forEach((btn) => {
    btn.addEventListener("click", () => {
      ui.query = "";
      ui.hitAnchor = btn.getAttribute("data-anchor") || "";
      openChapter(btn.getAttribute("data-open-ch"));
    });
  });

  root.querySelectorAll("[data-toc]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById(a.getAttribute("data-toc"))?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const chapterId = ui.chapterId;

  root.querySelector("#kb2-add-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = root.querySelector("#kb2-add-input")?.value.trim();
    if (!text) return;
    try {
      if (chapterId === "quick") {
        const next = structuredClone(getState().notes);
        const list = ensureQuickNotesList(next);
        list.items.unshift({
          id: uid("qc"),
          text,
          tags: [],
          favorite: false,
          createdAt: new Date().toISOString(),
        });
        await saveNotes(next);
      } else {
        const next = structuredClone(getState().booklet);
        const ch = findChapter(next, chapterId);
        if (!ch || (ch.mode !== "journal" && !LIVE[ch.id])) return;
        ch.items = ch.items || [];
        ch.items.unshift({ id: uid("bk"), text, createdAt: new Date().toISOString() });
        await saveBooklet(next);
      }
      showToast("اضافه شد");
      renderKnowledge2(getState());
    } catch (err) {
      showToast(err.message);
    }
  });

  root.querySelectorAll("[data-del-item]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del-item");
      if (!id || !window.confirm("این مورد حذف شود؟")) return;
      try {
        if (chapterId === "quick") {
          const next = structuredClone(getState().notes);
          const list = ensureQuickNotesList(next);
          list.items = list.items.filter((it) => it.id !== id);
          await saveNotes(next);
        } else {
          const next = structuredClone(getState().booklet);
          const ch = findChapter(next, chapterId);
          if (!ch) return;
          ch.items = (ch.items || []).filter((it) => it.id !== id);
          await saveBooklet(next);
        }
        showToast("حذف شد");
        renderKnowledge2(getState());
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  root.querySelectorAll("[data-edit-item]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit-item");
      const li = btn.closest(".kb2-journal__item");
      if (!id || !li || li.classList.contains("is-editing")) return;
      beginItemEdit(li, id, chapterId === "quick" ? "quick" : "booklet");
    });
  });
}

function setupToc(root) {
  if (tocObserver) {
    tocObserver.disconnect();
    tocObserver = null;
  }
  const links = [...root.querySelectorAll(".kb2-toc__link")];
  const nodes = links.map((l) => document.getElementById(l.getAttribute("data-toc"))).filter(Boolean);
  if (!nodes.length) return;
  tocObserver = new IntersectionObserver(
    (entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (!vis.length) return;
      const id = vis[0].target.id;
      links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("data-toc") === id));
    },
    { rootMargin: "-15% 0px -65% 0px", threshold: [0, 0.25, 0.6] },
  );
  nodes.forEach((n) => tocObserver.observe(n));
}

function setupProgress(root) {
  const main = root.querySelector("#kb2-main");
  const bar = root.querySelector("#kb2-progress-bar");
  if (!main || !bar) return;
  const onScroll = () => {
    const max = main.scrollHeight - main.clientHeight;
    const pct = max > 0 ? (main.scrollTop / max) * 100 : 0;
    bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  };
  main.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

async function openChapter(id) {
  if (!id) return;
  ui.chapterId = id;
  ui.sidebarOpen = false;
  const next = structuredClone(getState().booklet);
  if (next) {
    next.activeChapterId = id;
    try {
      await saveBooklet(next);
    } catch {
      /* ignore */
    }
  }
  renderKnowledge2(getState());
  document.getElementById("kb2-main")?.scrollTo?.({ top: 0 });
}

export function bindKnowledge2Events() {
  window.addEventListener("workspace:open-booklet-chapter", (e) => {
    if (typeof e.detail === "string") openChapter(e.detail);
  });

  window.addEventListener("workspace:open-section", (e) => {
    const section = typeof e.detail === "string" ? e.detail : "";
    const map = {
      "quick-notes": "quick",
      quick: "quick",
      "plan-overview": "trading-plan",
      "trading-plan": "trading-plan",
      "legacy-mistakes": "mistakes",
      mistakes: "mistakes",
      "legacy-checklist": "checklist",
      checklist: "checklist",
      "check-presession": "checklist",
      "check-during": "checklist",
      "check-eod": "checklist",
      "legacy-strategies": "strategies",
      "strategies-index": "strategies",
      strategies: "strategies",
      lessons: "lessons",
      "important-notes": "important-notes",
    };
    let chapter = map[section];
    if (!chapter && String(section).startsWith("strat-")) chapter = "strategies";
    if (chapter) openChapter(chapter);
  });
}
