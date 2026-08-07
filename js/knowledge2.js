import { escapeHtml, todayISO, uid } from "./config.js";
import { icon } from "./components/icons.js";
import { getState, saveBooklet, saveNotes } from "./storage.js";
import { showToast } from "./components/toast.js";

const ui = {
  query: "",
  chapterId: "",
  sidebarOpen: false,
  hitAnchor: "",
  editing: false,
  editBookletSnapshot: null,
  editNotesSnapshot: null,
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

/** Local YYYY-MM-DD from Date or ISO string. */
function toLocalDateISO(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function itemDateLabel(it) {
  const raw = String(it?.date || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (it?.createdAt) return toLocalDateISO(it.createdAt);
  if (raw) return toLocalDateISO(raw) || raw;
  return "";
}

function newJournalItem(text, prefix = "bk") {
  const now = new Date();
  return {
    id: uid(prefix),
    text,
    date: toLocalDateISO(now) || todayISO(),
    createdAt: now.toISOString(),
  };
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

function ensureWikiChecklistBlock(notes, pageId, title = "") {
  notes.pages = notes.pages || {};
  let page = notes.pages[pageId];
  if (!page) {
    page = { id: pageId, title: title || pageId, tags: [], blocks: [] };
    notes.pages[pageId] = page;
  }
  page.blocks = page.blocks || [];
  let block = page.blocks.find((b) => b.type === "checklist");
  if (!block) {
    block = { type: "checklist", items: [] };
    page.blocks.push(block);
  }
  block.items = block.items || [];
  return block;
}

function slugifyHeading(text) {
  const base = String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "")
    .slice(0, 40);
  return base || `h-${uid("h").slice(-6)}`;
}

function emptyBlock(type) {
  switch (type) {
    case "heading":
      return { type: "heading", level: 2, text: "عنوان جدید", id: slugifyHeading("عنوان جدید") };
    case "list":
      return { type: "list", ordered: false, items: ["مورد اول"] };
    case "callout":
      return { type: "callout", variant: "key", title: "نکته", text: "متن کادر…" };
    case "paragraph":
    default:
      return { type: "paragraph", text: "متن پاراگراف…" };
  }
}

async function withChapter(mutator) {
  const next = structuredClone(getState().booklet);
  const ch = findChapter(next, ui.chapterId);
  if (!ch) throw new Error("فصل پیدا نشد");
  mutator(ch, next);
  next.activeChapterId = ui.chapterId;
  await saveBooklet(next);
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

function blockTypeLabel(type) {
  switch (type) {
    case "heading":
      return "عنوان";
    case "list":
      return "لیست";
    case "callout":
      return "کادر";
    case "paragraph":
      return "پاراگراف";
    default:
      return type || "بلوک";
  }
}

function renderBlockEditorFields(b) {
  switch (b.type) {
    case "heading":
      return `
        <div class="field">
          <label>متن عنوان</label>
          <input type="text" data-f="text" value="${escapeHtml(b.text || "")}" />
        </div>
        <div class="field">
          <label>سطح</label>
          <select data-f="level">
            <option value="2" ${Number(b.level) !== 3 ? "selected" : ""}>عنوان ۲</option>
            <option value="3" ${Number(b.level) === 3 ? "selected" : ""}>عنوان ۳</option>
          </select>
        </div>`;
    case "list":
      return `
        <div class="field">
          <label>آیتم‌ها (هر خط یک مورد)</label>
          <textarea data-f="items" rows="5">${escapeHtml((b.items || []).join("\n"))}</textarea>
        </div>`;
    case "callout":
      return `
        <div class="field">
          <label>نوع کادر</label>
          <select data-f="variant">
            <option value="key" ${b.variant === "key" || !b.variant ? "selected" : ""}>نکته</option>
            <option value="rule" ${b.variant === "rule" ? "selected" : ""}>قانون</option>
            <option value="definition" ${b.variant === "definition" ? "selected" : ""}>تعریف</option>
          </select>
        </div>
        <div class="field">
          <label>عنوان کادر</label>
          <input type="text" data-f="title" value="${escapeHtml(b.title || "")}" />
        </div>
        <div class="field">
          <label>متن</label>
          <textarea data-f="text" rows="4">${escapeHtml(b.text || "")}</textarea>
        </div>`;
    case "paragraph":
    default:
      return `
        <div class="field">
          <label>متن پاراگراف</label>
          <textarea data-f="text" rows="5">${escapeHtml(b.text || "")}</textarea>
        </div>`;
  }
}

function renderEditableBlock(b, idx, total, query) {
  return `
    <div class="kb2-block" data-block-idx="${idx}">
      <div class="kb2-block__toolbar">
        <span class="kb2-block__type muted u-text-xs">${escapeHtml(blockTypeLabel(b.type))}</span>
        <button type="button" class="btn-icon" data-block-up="${idx}" title="بالا" aria-label="بالا" ${idx === 0 ? "disabled" : ""}>
          <span style="display:inline-flex;transform:rotate(180deg)">${icon("chevron", 14)}</span>
        </button>
        <button type="button" class="btn-icon" data-block-down="${idx}" title="پایین" aria-label="پایین" ${idx >= total - 1 ? "disabled" : ""}>
          ${icon("chevron", 14)}
        </button>
        <button type="button" class="btn-icon" data-block-edit="${idx}" title="ویرایش" aria-label="ویرایش">${icon("edit", 14)}</button>
        <button type="button" class="btn-icon kb2-block__del" data-block-del="${idx}" title="حذف" aria-label="حذف">${icon("trash", 14)}</button>
      </div>
      <div class="kb2-block__content">${renderBlock(b, query)}</div>
    </div>`;
}

function renderBlocksSection(ch, query) {
  const blocks = ch.blocks || [];
  if (!ui.editing) {
    return blocks.map((b) => renderBlock(b, query)).join("");
  }
  return `
    <div class="kb2-blocks-edit">
      ${
        blocks.length
          ? blocks.map((b, i) => renderEditableBlock(b, i, blocks.length, query)).join("")
          : `<div class="kb2-empty"><p>هنوز بلوکی نیست. یکی اضافه کن.</p></div>`
      }
      <div class="kb2-block-add">
        <span class="muted u-text-sm">افزودن بلوک:</span>
        <button type="button" class="btn btn-soft" data-add-block="paragraph">${icon("plus", 14)} پاراگراف</button>
        <button type="button" class="btn btn-soft" data-add-block="heading">${icon("plus", 14)} عنوان</button>
        <button type="button" class="btn btn-soft" data-add-block="list">${icon("plus", 14)} لیست</button>
        <button type="button" class="btn btn-soft" data-add-block="callout">${icon("plus", 14)} کادر</button>
      </div>
    </div>`;
}

function updateOutlineToc(ch) {
  const toc = document.getElementById("kb2-toc");
  if (!toc || !ch) return;
  const headings = extractHeadings(ch);
  toc.innerHTML = headings.length
    ? headings
        .map(
          (h) => `
            <a class="kb2-toc__link kb2-toc__link--${h.level}" href="#${escapeHtml(h.id)}" data-toc="${escapeHtml(h.id)}">${escapeHtml(h.text)}</a>`,
        )
        .join("")
    : `<div class="muted u-text-sm">زیربخشی نیست</div>`;
  toc.querySelectorAll("[data-toc]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById(a.getAttribute("data-toc"))?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  const root = document.getElementById("view-knowledge2");
  if (root) setupToc(root);
}

/** Refresh only the blocks area — keeps scroll container & page shell intact. */
function refreshBlocksSection() {
  const state = getState();
  const ch = findChapter(state.booklet, ui.chapterId);
  const host = document.getElementById("kb2-blocks-root");
  if (!ch || !host) {
    renderKnowledge2(state);
    return;
  }
  host.innerHTML = renderBlocksSection(ch, ui.query);
  bindBlockEditors(document.getElementById("view-knowledge2"));
  updateOutlineToc(ch);
}

/** Refresh only journal/live lists under the article — no full page rebuild. */
function refreshLiveJournalSection() {
  const state = getState();
  const ch = findChapter(state.booklet, ui.chapterId);
  const host = document.getElementById("kb2-live-root");
  if (!ch || !host) {
    renderKnowledge2(state);
    return;
  }
  const isLive = Boolean(LIVE[ch.id]);
  const isJournal = ch.mode === "journal" || isLive;
  host.innerHTML = isJournal
    ? (isLive ? renderLiveSection(ch, state) : renderJournalFallback(ch))
    : "";
  bindLiveJournalEditors(document.getElementById("view-knowledge2"));
}

function renderChapterHead(ch, query) {
  if (ui.editing) {
    return `
      <header class="kb2-article__head kb2-article__head--edit">
        <div class="kb2-article__head-row">
          <div class="kb2-article__num">فصل ${String(ch.number).padStart(2, "0")}</div>
          <div class="kb2-article__head-actions">
            <button type="button" class="btn btn-ghost" id="kb2-cancel-edit">لغو ویرایش</button>
            <button type="button" class="btn btn-primary" id="kb2-toggle-edit">پایان ویرایش</button>
          </div>
        </div>
        <div class="field">
          <label for="kb2-ch-title">عنوان فصل</label>
          <input id="kb2-ch-title" type="text" value="${escapeHtml(ch.title || "")}" />
        </div>
        <div class="field">
          <label for="kb2-ch-intro">مقدمه</label>
          <textarea id="kb2-ch-intro" rows="3">${escapeHtml(ch.intro || "")}</textarea>
        </div>
        <button type="button" class="btn btn-primary" id="kb2-save-meta">ذخیره عنوان و مقدمه</button>
      </header>`;
  }

  return `
    <header class="kb2-article__head">
      <div class="kb2-article__head-row">
        <div class="kb2-article__num">فصل ${String(ch.number).padStart(2, "0")}</div>
        <button type="button" class="btn btn-soft" id="kb2-toggle-edit">${icon("edit", 14)} ویرایش مطالب</button>
      </div>
      <h1>${highlight(ch.title, query)}</h1>
      ${ch.intro ? `<p class="kb2-article__intro">${highlight(ch.intro, query)}</p>` : ""}
    </header>`;
}

function renderJournalList(items, { editable = true, emptyText = "هنوز موردی نیست." } = {}) {
  if (!items.length) {
    return `<div class="kb2-empty"><p>${escapeHtml(emptyText)}</p></div>`;
  }
  return `
    <ul class="kb2-journal__list">
      ${items
        .map((it) => {
          const dateLabel = itemDateLabel(it);
          return `
        <li class="kb2-journal__item" data-note-id="${escapeHtml(it.id)}">
          <div class="kb2-journal__body">
            <p>${escapeHtml(it.text)}</p>
            ${dateLabel ? `<div class="kb2-journal__meta muted u-text-xs num">${escapeHtml(dateLabel)}</div>` : ""}
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
        </li>`;
        })
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
        ${ui.editing ? `<button type="button" class="btn btn-ghost" data-open-strategy="${escapeHtml(s.id || "")}">ویرایش</button>` : ""}
      </div>
      ${s.description ? `<p>${highlight(s.description, query)}</p>` : ""}
    </article>`;

  return `
    <div class="kb2-live" id="journal-items">
      <div class="kb2-live__tools">
        <h2 class="kb2-h kb2-h--2" id="strat-primary">استراتژی‌های اصلی</h2>
        ${ui.editing ? `<button type="button" class="btn btn-soft" data-manage-strategies>${icon("plus", 14)} مدیریت استراتژی‌ها</button>` : ""}
      </div>
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

function renderChecklistGroup(id, pageId, title, items, query) {
  if (!ui.editing) {
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

  return `
    <h2 class="kb2-h kb2-h--2" id="${escapeHtml(id)}">${escapeHtml(title)}</h2>
    <div class="kb2-checklist kb2-checklist--edit" data-wiki-check="${escapeHtml(pageId)}">
      ${(items || [])
        .map((it, i) => {
          const text = typeof it === "string" ? it : it.text || "";
          return `
        <div class="kb2-check-edit" data-check-idx="${i}">
          <input type="text" data-check-text value="${escapeHtml(text)}" />
          <button type="button" class="btn-icon" data-check-del="${i}" title="حذف" aria-label="حذف">${icon("trash", 14)}</button>
        </div>`;
        })
        .join("") || `<div class="kb2-empty"><p>آیتمی نیست.</p></div>`}
      <div class="kb2-check-add">
        <input type="text" data-check-new placeholder="آیتم جدید…" />
        <button type="button" class="btn btn-soft" data-check-add>${icon("plus", 14)} افزودن</button>
        <button type="button" class="btn btn-primary" data-check-save>ذخیره این چک‌لیست</button>
      </div>
    </div>`;
}

function renderChecklists(ch, state, query) {
  const notes = state.notes;
  const pre = getWikiChecklist(notes, "check-presession");
  const during = getWikiChecklist(notes, "check-during");
  const eod = getWikiChecklist(notes, "check-eod");
  const morning = (state.settings?.morningChecklist || []).map((t) => ({ text: t, checked: false }));
  const preItems = pre.items.length ? pre.items : morning;

  return `
    <div class="kb2-live" id="journal-items">
      ${renderChecklistGroup("check-pre", "check-presession", pre.title || "پیش از سشن", preItems, query)}
      ${renderChecklistGroup("check-during", "check-during", during.title || "حین معامله", during.items, query)}
      ${renderChecklistGroup("check-eod", "check-eod", eod.title || "پایان روز", eod.items, query)}
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

export function renderKnowledge2(state, { restoreScroll = true } = {}) {
  const root = document.getElementById("view-knowledge2");
  if (!root) return;
  const book = state.booklet;
  if (!book?.chapters?.length) {
    root.innerHTML = `<div class="empty-state">جزوه بارگذاری نشد. <code>data/notes-booklet.json</code> را چک کن.</div>`;
    return;
  }

  const mainBefore = document.getElementById("kb2-main");
  const prevScroll = restoreScroll ? (mainBefore?.scrollTop ?? 0) : 0;
  const prevWindowScroll = restoreScroll
    ? (window.scrollY || document.documentElement.scrollTop || 0)
    : 0;

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
          <article class="kb2-article ${ui.editing ? "is-editing" : ""}">
            <nav class="kb2-crumb" aria-label="مسیر">
              <span>دانش</span><span class="kb2-crumb__sep">›</span>
              <span class="kb2-crumb__cur">${escapeHtml(ch.title)}</span>
            </nav>
            ${renderChapterHead(ch, ui.query)}
            <div class="kb2-article__body">
              <div id="kb2-blocks-root">${renderBlocksSection(ch, ui.query)}</div>
              <div id="kb2-live-root">${isJournal ? (isLive ? renderLiveSection(ch, state) : renderJournalFallback(ch)) : ""}</div>
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

  const restoreScrollPosition = () => {
    if (!restoreScroll) return;
    const mainAfter = document.getElementById("kb2-main");
    if (mainAfter) mainAfter.scrollTop = prevScroll;
    window.scrollTo({ top: prevWindowScroll, left: 0, behavior: "auto" });
  };

  bindDom(root, book);
  if (!showHits && ch) {
    setupToc(root);
    setupProgress(root);
    if (ui.hitAnchor) {
      const el = document.getElementById(ui.hitAnchor);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      ui.hitAnchor = "";
    } else {
      restoreScrollPosition();
      requestAnimationFrame(restoreScrollPosition);
    }
  } else {
    restoreScrollPosition();
    requestAnimationFrame(restoreScrollPosition);
  }
}

function clearEditSnapshots() {
  ui.editBookletSnapshot = null;
  ui.editNotesSnapshot = null;
}

function beginEditSession() {
  const state = getState();
  ui.editing = true;
  ui.query = "";
  ui.editBookletSnapshot = structuredClone(state.booklet);
  ui.editNotesSnapshot = structuredClone(state.notes);
}

async function cancelEditSession() {
  try {
    if (ui.editBookletSnapshot) await saveBooklet(structuredClone(ui.editBookletSnapshot));
    if (ui.editNotesSnapshot) await saveNotes(structuredClone(ui.editNotesSnapshot));
    ui.editing = false;
    clearEditSnapshots();
    showToast("ویرایش لغو شد");
    renderKnowledge2(getState());
  } catch (err) {
    showToast(err.message || "خطا در لغو ویرایش");
  }
}

function endEditSession() {
  ui.editing = false;
  clearEditSnapshots();
  renderKnowledge2(getState());
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
    refreshLiveJournalSection();
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
        if (!item.date) item.date = itemDateLabel(item) || todayISO();
        if (!item.createdAt) item.createdAt = new Date().toISOString();
        await saveNotes(next);
      } else {
        const next = structuredClone(getState().booklet);
        const ch = findChapter(next, ui.chapterId);
        const item = (ch?.items || []).find((it) => it.id === id);
        if (!item) throw new Error("مورد پیدا نشد");
        item.text = text;
        if (!item.date) item.date = itemDateLabel(item) || todayISO();
        if (!item.createdAt) item.createdAt = new Date().toISOString();
        await saveBooklet(next);
      }
      showToast("ذخیره شد");
      refreshLiveJournalSection();
    } catch (err) {
      showToast(err.message || "خطا در ذخیره");
    }
  });
}

function beginBlockEdit(blockEl, idx) {
  const ch = findChapter(getState().booklet, ui.chapterId);
  const block = ch?.blocks?.[idx];
  if (!block || !blockEl) return;
  const content = blockEl.querySelector(".kb2-block__content");
  const toolbar = blockEl.querySelector(".kb2-block__toolbar");
  if (!content) return;
  blockEl.classList.add("is-editing");
  if (toolbar) toolbar.hidden = true;
  content.innerHTML = `
    <div class="kb2-block__editor">
      ${renderBlockEditorFields(block)}
      <div class="kb2-journal__edit-actions">
        <button type="button" class="btn btn-primary" data-save-block>ذخیره</button>
        <button type="button" class="btn btn-ghost" data-cancel-block>انصراف</button>
      </div>
    </div>`;

  content.querySelector("[data-cancel-block]")?.addEventListener("click", () => {
    refreshBlocksSection();
  });

  content.querySelector("[data-save-block]")?.addEventListener("click", async () => {
    try {
      await withChapter((chapter) => {
        const target = chapter.blocks?.[idx];
        if (!target) throw new Error("بلوک پیدا نشد");
        const get = (name) => content.querySelector(`[data-f="${name}"]`);
        if (target.type === "heading") {
          const text = String(get("text")?.value || "").trim();
          if (!text) throw new Error("عنوان خالی نباشد");
          target.text = text;
          target.level = Number(get("level")?.value) === 3 ? 3 : 2;
          target.id = slugifyHeading(text);
        } else if (target.type === "list") {
          const lines = String(get("items")?.value || "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          if (!lines.length) throw new Error("حداقل یک آیتم لازم است");
          target.items = lines;
        } else if (target.type === "callout") {
          const text = String(get("text")?.value || "").trim();
          if (!text) throw new Error("متن کادر خالی نباشد");
          const variant = get("variant")?.value;
          target.variant = variant === "rule" || variant === "definition" ? variant : "key";
          target.title = String(get("title")?.value || "").trim() || "نکته";
          target.text = text;
        } else {
          const text = String(get("text")?.value || "").trim();
          if (!text) throw new Error("متن خالی نباشد");
          target.type = "paragraph";
          target.text = text;
        }
      });
      showToast("بلوک ذخیره شد");
      refreshBlocksSection();
    } catch (err) {
      showToast(err.message || "خطا در ذخیره");
    }
  });

  content.querySelector("textarea, input")?.focus();
}

function collectWikiChecklistItems(wrap) {
  return [...wrap.querySelectorAll("[data-check-text]")]
    .map((input) => String(input.value || "").trim())
    .filter(Boolean)
    .map((text) => ({ text, checked: false }));
}

function bindBlockEditors(root) {
  if (!root) return;
  const host = root.querySelector?.("#kb2-blocks-root") || root;

  host.querySelectorAll("[data-add-block]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const type = btn.getAttribute("data-add-block") || "paragraph";
      try {
        await withChapter((ch) => {
          ch.blocks = ch.blocks || [];
          ch.blocks.push(emptyBlock(type));
        });
        showToast("بلوک اضافه شد");
        refreshBlocksSection();
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  host.querySelectorAll("[data-block-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.getAttribute("data-block-del"));
      if (!window.confirm("این بلوک حذف شود؟")) return;
      try {
        await withChapter((ch) => {
          ch.blocks = ch.blocks || [];
          ch.blocks.splice(idx, 1);
        });
        showToast("حذف شد");
        refreshBlocksSection();
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  host.querySelectorAll("[data-block-up], [data-block-down]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const up = btn.hasAttribute("data-block-up");
      const idx = Number(btn.getAttribute(up ? "data-block-up" : "data-block-down"));
      try {
        await withChapter((ch) => {
          const blocks = ch.blocks || [];
          const to = up ? idx - 1 : idx + 1;
          if (to < 0 || to >= blocks.length) return;
          const [moved] = blocks.splice(idx, 1);
          blocks.splice(to, 0, moved);
        });
        refreshBlocksSection();
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  host.querySelectorAll("[data-block-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-block-edit"));
      const blockEl = btn.closest(".kb2-block");
      if (!blockEl || blockEl.classList.contains("is-editing")) return;
      beginBlockEdit(blockEl, idx);
    });
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

  root.querySelector("#kb2-toggle-edit")?.addEventListener("click", () => {
    if (ui.editing) endEditSession();
    else {
      beginEditSession();
      renderKnowledge2(getState());
    }
  });

  root.querySelector("#kb2-cancel-edit")?.addEventListener("click", () => {
    if (!window.confirm("تغییرات این جلسه ویرایش لغو شود و به حالت قبل برگردد؟")) return;
    cancelEditSession();
  });

  root.querySelector("#kb2-save-meta")?.addEventListener("click", async () => {
    const title = root.querySelector("#kb2-ch-title")?.value.trim();
    const intro = root.querySelector("#kb2-ch-intro")?.value.trim() || "";
    if (!title) {
      showToast("عنوان فصل خالی نباشد");
      return;
    }
    try {
      await withChapter((ch) => {
        ch.title = title;
        ch.intro = intro;
      });
      const crumb = root.querySelector(".kb2-crumb__cur");
      if (crumb) crumb.textContent = title;
      const navBtn = root.querySelector(`.kb2-nav__item[data-ch="${ui.chapterId}"] .kb2-nav__label`);
      if (navBtn) navBtn.textContent = title;
      showToast("عنوان و مقدمه ذخیره شد");
    } catch (err) {
      showToast(err.message);
    }
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

  bindBlockEditors(root);
  bindLiveJournalEditors(root);
}

function bindLiveJournalEditors(root) {
  if (!root) return;
  const chapterId = ui.chapterId;
  const liveRoot = root.querySelector("#kb2-live-root") || root;

  liveRoot.querySelectorAll("[data-check-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const wrap = btn.closest("[data-wiki-check]");
      const input = wrap?.querySelector("[data-check-new]");
      const text = input?.value.trim();
      if (!wrap || !text) return;
      const row = document.createElement("div");
      row.className = "kb2-check-edit";
      row.innerHTML = `
        <input type="text" data-check-text value="${escapeHtml(text)}" />
        <button type="button" class="btn-icon" data-check-del title="حذف" aria-label="حذف">${icon("trash", 14)}</button>`;
      wrap.insertBefore(row, wrap.querySelector(".kb2-check-add"));
      input.value = "";
      row.querySelector("[data-check-del]")?.addEventListener("click", () => row.remove());
      wrap.querySelector(".kb2-empty")?.remove();
    });
  });

  liveRoot.querySelectorAll("[data-check-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.closest(".kb2-check-edit")?.remove();
    });
  });

  liveRoot.querySelectorAll("[data-check-save]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const wrap = btn.closest("[data-wiki-check]");
      const pageId = wrap?.getAttribute("data-wiki-check");
      if (!wrap || !pageId) return;
      try {
        const next = structuredClone(getState().notes);
        const block = ensureWikiChecklistBlock(next, pageId);
        block.items = collectWikiChecklistItems(wrap);
        await saveNotes(next);
        showToast("چک‌لیست ذخیره شد");
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  liveRoot.querySelector("[data-manage-strategies]")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("workspace:manage-strategies"));
  });

  liveRoot.querySelectorAll("[data-open-strategy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("workspace:manage-strategies", {
        detail: { id: btn.getAttribute("data-open-strategy") || "" },
      }));
    });
  });

  liveRoot.querySelector("#kb2-add-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = liveRoot.querySelector("#kb2-add-input")?.value.trim();
    if (!text) return;
    try {
      if (chapterId === "quick") {
        const next = structuredClone(getState().notes);
        const list = ensureQuickNotesList(next);
        const item = newJournalItem(text, "qc");
        list.items.unshift({ ...item, tags: [], favorite: false });
        await saveNotes(next);
      } else {
        const next = structuredClone(getState().booklet);
        const ch = findChapter(next, chapterId);
        if (!ch || (ch.mode !== "journal" && !LIVE[ch.id])) return;
        ch.items = ch.items || [];
        ch.items.unshift(newJournalItem(text, "bk"));
        await saveBooklet(next);
      }
      showToast("اضافه شد");
      refreshLiveJournalSection();
    } catch (err) {
      showToast(err.message);
    }
  });

  liveRoot.querySelectorAll("[data-del-item]").forEach((btn) => {
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
        refreshLiveJournalSection();
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  liveRoot.querySelectorAll("[data-edit-item]").forEach((btn) => {
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
  ui.editing = false;
  clearEditSnapshots();
  const next = structuredClone(getState().booklet);
  if (next) {
    next.activeChapterId = id;
    try {
      await saveBooklet(next);
    } catch {
      /* ignore */
    }
  }
  renderKnowledge2(getState(), { restoreScroll: false });
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
