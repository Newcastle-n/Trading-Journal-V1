import { escapeHtml, uid } from "./config.js";
import { icon } from "./components/icons.js";
import { saveNotes, getState } from "./storage.js";
import { showToast } from "./components/toast.js";

/** @type {{ query: string, tag: string, pageId: string, sidebarOpen: boolean, collapsed: Set<string> }} */
const ui = {
  query: "",
  tag: "",
  pageId: "",
  sidebarOpen: false,
  collapsed: new Set(),
};

let searchTimer = 0;
let collapsedInitialized = false;
let searchComposing = false;

function isWiki(notes) {
  return notes && notes.version === 2 && notes.pages && notes.tree;
}

function ensureWikiShape(notes) {
  if (!isWiki(notes)) return null;
  if (!Array.isArray(notes.expandedCats)) notes.expandedCats = [];
  return notes;
}

function allPages(notes) {
  return Object.values(notes.pages || {});
}

function findPage(notes, id) {
  return notes.pages?.[id] || null;
}

function pageSearchText(page) {
  const parts = [page.title, page.description, ...(page.tags || [])];
  for (const b of page.blocks || []) {
    if (b.text) parts.push(b.text);
    if (b.title) parts.push(b.title);
    if (b.cite) parts.push(b.cite);
    if (Array.isArray(b.items)) {
      for (const it of b.items) {
        if (typeof it === "string") parts.push(it);
        else if (it?.text) parts.push(it.text);
      }
    }
    if (Array.isArray(b.headers)) parts.push(...b.headers);
    if (Array.isArray(b.rows)) b.rows.forEach((r) => parts.push(...r));
    if (Array.isArray(b.blocks)) {
      for (const inner of b.blocks) {
        if (inner.text) parts.push(inner.text);
        if (Array.isArray(inner.items)) parts.push(...inner.items.filter((x) => typeof x === "string"));
      }
    }
  }
  return parts.join(" \n ");
}

function highlight(text, query) {
  const safe = escapeHtml(text || "");
  const q = (query || "").trim();
  if (!q) return safe;
  try {
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return safe.replace(re, '<mark class="kb-mark">$1</mark>');
  } catch {
    return safe;
  }
}

function breadcrumb(notes, pageId) {
  for (const cat of notes.tree || []) {
    const child = (cat.children || []).find((c) => c.id === pageId);
    if (child) return [cat.title, child.title || findPage(notes, pageId)?.title || ""];
  }
  return ["دانش", findPage(notes, pageId)?.title || ""];
}

function relatedPages(notes, page) {
  return (page.related || [])
    .map((id) => findPage(notes, id))
    .filter(Boolean);
}

function renderBlocks(blocks, query) {
  return (blocks || []).map((b) => renderBlock(b, query)).join("");
}

function renderBlock(b, query) {
  switch (b.type) {
    case "heading": {
      const lvl = Math.min(Math.max(b.level || 2, 2), 4);
      const id = escapeHtml(b.id || "");
      return `<h${lvl} class="kb-h kb-h--${lvl}" id="${id}">${highlight(b.text, query)}</h${lvl}>`;
    }
    case "paragraph":
      return `<p class="kb-p">${highlight(b.text, query)}</p>`;
    case "list": {
      const tag = b.ordered ? "ol" : "ul";
      const items = (b.items || []).map((it) => `<li>${highlight(it, query)}</li>`).join("");
      return `<${tag} class="kb-list">${items}</${tag}>`;
    }
    case "callout": {
      const variant = escapeHtml(b.variant || "info");
      return `
        <aside class="kb-callout kb-callout--${variant}" data-variant="${variant}">
          <div class="kb-callout__title">${escapeHtml(b.title || "")}</div>
          <div class="kb-callout__body">${highlight(b.text, query)}</div>
        </aside>`;
    }
    case "quote":
      return `
        <blockquote class="kb-quote">
          <p>${highlight(b.text, query)}</p>
          ${b.cite ? `<cite>${escapeHtml(b.cite)}</cite>` : ""}
        </blockquote>`;
    case "table": {
      const head = (b.headers || []).map((h) => `<th>${highlight(h, query)}</th>`).join("");
      const rows = (b.rows || [])
        .map((r) => `<tr>${r.map((c) => `<td>${highlight(c, query)}</td>`).join("")}</tr>`)
        .join("");
      return `<div class="kb-table-wrap"><table class="kb-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    case "checklist": {
      const items = (b.items || [])
        .map(
          (it, i) => `
          <label class="kb-check">
            <input type="checkbox" data-check-idx="${i}" ${it.checked ? "checked" : ""} />
            <span>${highlight(it.text, query)}</span>
          </label>`,
        )
        .join("");
      return `<div class="kb-checklist">${items}</div>`;
    }
    case "accordion":
      return `
        <details class="kb-acc">
          <summary>
            <span class="kb-acc__chev">${icon("chevron", 14)}</span>
            <span>${escapeHtml(b.title || "جزئیات")}</span>
          </summary>
          <div class="kb-acc__body">${renderBlocks(b.blocks || [], query)}</div>
        </details>`;
    case "notes-list": {
      const items = b.items || [];
      if (!items.length) {
        return `<div class="kb-empty-inline">هنوز یادداشت سریعی نیست. از «ثبت نکته» اضافه کن.</div>`;
      }
      return `
        <div class="kb-notes-list">
          ${items
            .map(
              (it) => `
            <article class="kb-note-row ${it.favorite ? "is-fav" : ""}">
              <p>${highlight(it.text, query)}</p>
              <div class="kb-note-row__meta">
                ${(it.tags || []).map((t) => `<button type="button" class="kb-tag" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</button>`).join("")}
              </div>
            </article>`,
            )
            .join("")}
        </div>`;
    }
    default:
      return "";
  }
}

function renderSidebarNav(notes, activeId) {
  const q = ui.query.trim().toLowerCase();
  const tag = ui.tag.trim().toLowerCase();

  return (notes.tree || [])
    .map((cat) => {
      let children = cat.children || [];
      if (q || tag) {
        children = children.filter((c) => {
          const page = findPage(notes, c.id);
          if (!page) return false;
          if (tag && !(page.tags || []).some((t) => t.toLowerCase() === tag || t.toLowerCase().includes(tag))) {
            return false;
          }
          if (q) {
            return pageSearchText(page).toLowerCase().includes(q) || (c.title || "").toLowerCase().includes(q);
          }
          return true;
        });
        if (!children.length) return "";
      }

      const expanded = !ui.collapsed.has(cat.id);
      return `
        <div class="kb-nav__group ${expanded ? "is-open" : ""}" data-cat="${escapeHtml(cat.id)}">
          <button type="button" class="kb-nav__cat" data-toggle-cat="${escapeHtml(cat.id)}">
            <span class="kb-nav__cat-ico">${icon(cat.icon || "book", 14)}</span>
            <span class="kb-nav__cat-label">${escapeHtml(cat.title)}</span>
            <span class="kb-nav__chev">${icon("chevron", 14)}</span>
          </button>
          <div class="kb-nav__children" ${expanded ? "" : "hidden"}>
            ${children
              .map((c) => {
                const page = findPage(notes, c.id);
                const badges = [];
                if (page?.pinned) badges.push("pin");
                if (page?.favorite) badges.push("fav");
                if (page?.needsReview) badges.push("rev");
                if (page?.learned) badges.push("ok");
                return `
                  <button type="button"
                    class="kb-nav__item ${c.id === activeId ? "is-active" : ""}"
                    data-page="${escapeHtml(c.id)}">
                    <span class="kb-nav__item-title">${escapeHtml(c.title || page?.title || c.id)}</span>
                    <span class="kb-nav__badges">
                      ${page?.pinned ? `<span title="پین">📌</span>` : ""}
                      ${page?.favorite ? `<span title="علاقه">⭐</span>` : ""}
                      ${page?.needsReview ? `<span title="مرور">🔄</span>` : ""}
                      ${page?.learned ? `<span title="یاد گرفته">✅</span>` : ""}
                    </span>
                  </button>`;
              })
              .join("")}
          </div>
        </div>`;
    })
    .join("");
}

function renderSearchResults(notes) {
  const q = ui.query.trim().toLowerCase();
  const tag = ui.tag.trim().toLowerCase();
  if (!q && !tag) return "";

  let results = allPages(notes);
  if (tag) {
    results = results.filter((p) => (p.tags || []).some((t) => t.toLowerCase() === tag || t.toLowerCase().includes(tag)));
  }
  if (q) {
    results = results
      .map((p) => {
        const hay = pageSearchText(p).toLowerCase();
        const score =
          (p.title.toLowerCase().includes(q) ? 5 : 0) +
          ((p.tags || []).some((t) => t.toLowerCase().includes(q)) ? 3 : 0) +
          (hay.includes(q) ? 1 : 0);
        return { page: p, score, hay };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.page);
  }

  if (!results.length) {
    return `<div class="kb-search-panel"><p class="muted">نتیجه‌ای پیدا نشد.</p></div>`;
  }

  return `
    <div class="kb-search-panel">
      <div class="kb-search-panel__head">${results.length} نتیجه${tag ? ` برای #${escapeHtml(ui.tag)}` : ""}</div>
      <div class="kb-search-panel__list">
        ${results
          .slice(0, 40)
          .map((p) => {
            const snippet = pageSearchText(p).replace(/\s+/g, " ").slice(0, 120);
            return `
              <button type="button" class="kb-search-hit" data-page="${escapeHtml(p.id)}">
                <div class="kb-search-hit__title">${highlight(p.title, ui.query)}</div>
                <div class="kb-search-hit__snip">${highlight(snippet, ui.query)}…</div>
                <div class="kb-search-hit__tags">
                  ${(p.tags || []).slice(0, 4).map((t) => `<span>#${escapeHtml(t)}</span>`).join("")}
                </div>
              </button>`;
          })
          .join("")}
      </div>
    </div>`;
  }

function statusBtn(key, active, label, ico) {
  return `
    <button type="button" class="kb-status ${active ? "is-active" : ""}" data-status="${key}" title="${label}" aria-pressed="${active}">
      ${ico}<span>${label}</span>
    </button>`;
}

export function renderKnowledge(state, options = {}) {
  const { keepSearch = false, navOnly = false } = options;
  const root = document.getElementById("view-knowledge");
  if (!root) return;

  const notes = ensureWikiShape(state.notes);
  if (!notes) {
    root.innerHTML = `
      <div class="empty-state">
        پایگاه دانش نسخه ۲ یافت نشد. فایل <code>data/notes.json</code> را بررسی کن.
      </div>`;
    return;
  }

  if (!ui.pageId || !findPage(notes, ui.pageId)) {
    ui.pageId = notes.activePageId || "wiki-home";
    if (!findPage(notes, ui.pageId)) {
      ui.pageId = Object.keys(notes.pages)[0] || "";
    }
  }

  if (!collapsedInitialized) {
    collapsedInitialized = true;
    for (const cat of notes.tree || []) {
      if (!(notes.expandedCats || []).includes(cat.id)) ui.collapsed.add(cat.id);
    }
  }

  const page = findPage(notes, ui.pageId);
  const crumbs = breadcrumb(notes, ui.pageId);
  const related = page ? relatedPages(notes, page) : [];
  const showSearch = Boolean(ui.query.trim() || ui.tag.trim());
  const existingShell = root.querySelector(".kb-shell");

  if ((keepSearch || navOnly) && existingShell) {
    const nav = root.querySelector(".kb-nav");
    if (nav) nav.innerHTML = renderSidebarNav(notes, ui.pageId);
    if (!navOnly) {
      const main = root.querySelector("#kb-main");
      if (main) {
        main.innerHTML = showSearch
          ? renderSearchResults(notes)
          : page
            ? renderArticle(page, crumbs, related)
            : `<div class="empty-state">صفحه‌ای انتخاب نشده.</div>`;
      }
    }
    bindKnowledgeDom(root, notes, { panelsOnly: true, navOnly });
    return;
  }

  root.innerHTML = `
    <div class="kb-shell ${ui.sidebarOpen ? "is-sidebar-open" : ""}">
      <div class="kb-topbar">
        <button type="button" class="btn-icon kb-topbar__menu" id="kb-toggle-sidebar" title="فهرست" aria-label="فهرست">
          ${icon("menu", 18)}
        </button>
        <div class="kb-topbar__search field">
          <label class="sr-only" for="kb-search">جستجو</label>
          <span class="kb-topbar__search-ico">${icon("search", 16)}</span>
          <input id="kb-search" type="search" placeholder="جستجو در عنوان، محتوا و تگ‌ها…  /" value="${escapeHtml(ui.query)}" autocomplete="off" />
          ${ui.tag ? `<button type="button" class="kb-tag-chip" id="kb-clear-tag">#${escapeHtml(ui.tag)} ×</button>` : ""}
        </div>
        <div class="kb-topbar__hint muted u-text-sm">میانبر: <kbd>/</kbd> جستجو · <kbd>[</kbd><kbd>]</kbd> صفحه</div>
      </div>

      <aside class="kb-sidebar" id="kb-sidebar">
        <div class="kb-sidebar__head">
          <div class="kb-sidebar__eyebrow">Trading Knowledge</div>
          <h2>دانش معاملاتی</h2>
        </div>
        <nav class="kb-nav" aria-label="فهرست دانش">
          ${renderSidebarNav(notes, ui.pageId)}
        </nav>
      </aside>

      <div class="kb-backdrop" id="kb-backdrop" hidden></div>

      <main class="kb-main" id="kb-main">
        ${
          showSearch
            ? renderSearchResults(notes)
            : page
              ? renderArticle(page, crumbs, related)
              : `<div class="empty-state">صفحه‌ای انتخاب نشده.</div>`
        }
      </main>
    </div>
  `;

  bindKnowledgeDom(root, notes);
}

function renderArticle(page, crumbs, related) {
  return `
    <div class="kb-article" id="kb-article">
      <nav class="kb-breadcrumb" aria-label="مسیر">
        <span>دانش</span>
        <span class="kb-breadcrumb__sep">/</span>
        <span>${escapeHtml(crumbs[0] || "")}</span>
        <span class="kb-breadcrumb__sep">/</span>
        <span class="kb-breadcrumb__current">${escapeHtml(crumbs[1] || page.title)}</span>
      </nav>

      <header class="kb-article__header">
        <h1 class="kb-article__title">${highlight(page.title, ui.query)}</h1>
        ${page.description ? `<p class="kb-article__desc">${highlight(page.description, ui.query)}</p>` : ""}
        <div class="kb-article__tags">
          ${(page.tags || [])
            .map((t) => `<button type="button" class="kb-tag" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</button>`)
            .join("")}
        </div>
        <div class="kb-article__actions">
          ${statusBtn("favorite", page.favorite, "علاقه", icon("star", 14))}
          ${statusBtn("pinned", page.pinned, "پین", icon("pin", 14))}
          ${statusBtn("learned", page.learned, "یاد گرفته", icon("check", 14))}
          ${statusBtn("needsReview", page.needsReview, "نیاز به مرور", icon("refresh", 14))}
        </div>
      </header>

      <div class="kb-article__body">
        ${renderBlocks(page.blocks, ui.query)}
      </div>

      ${
        related.length
          ? `
        <section class="kb-related">
          <h2 class="kb-related__title">موضوعات مرتبط</h2>
          <div class="kb-related__grid">
            ${related
              .map(
                (r) => `
              <button type="button" class="kb-related__card" data-page="${escapeHtml(r.id)}">
                <span class="kb-related__card-title">${escapeHtml(r.title)}</span>
                <span class="kb-related__card-desc">${escapeHtml((r.description || "").slice(0, 90))}</span>
              </button>`,
              )
              .join("")}
          </div>
        </section>`
          : ""
      }
    </div>`;
}

function bindKnowledgeDom(root, notes, options = {}) {
  const { panelsOnly = false, navOnly = false } = options;
  const navScope = root.querySelector(".kb-nav") || root;

  if (!panelsOnly && !navOnly) {
    const searchInput = root.querySelector("#kb-search");
    searchInput?.addEventListener("compositionstart", () => {
      searchComposing = true;
    });
    searchInput?.addEventListener("compositionend", (e) => {
      searchComposing = false;
      ui.query = e.target.value;
      renderKnowledge(getState(), { keepSearch: true });
    });
    searchInput?.addEventListener("input", (e) => {
      ui.query = e.target.value;
      if (searchComposing) return;
      clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        renderKnowledge(getState(), { keepSearch: true });
      }, 180);
    });

    root.querySelector("#kb-clear-tag")?.addEventListener("click", () => {
      ui.tag = "";
      renderKnowledge(getState());
    });

    root.querySelector("#kb-toggle-sidebar")?.addEventListener("click", () => {
      ui.sidebarOpen = !ui.sidebarOpen;
      root.querySelector(".kb-shell")?.classList.toggle("is-sidebar-open", ui.sidebarOpen);
      const bd = root.querySelector("#kb-backdrop");
      if (bd) bd.hidden = !ui.sidebarOpen;
    });

    root.querySelector("#kb-backdrop")?.addEventListener("click", () => {
      ui.sidebarOpen = false;
      root.querySelector(".kb-shell")?.classList.remove("is-sidebar-open");
      const bd = root.querySelector("#kb-backdrop");
      if (bd) bd.hidden = true;
    });
  }

  navScope.querySelectorAll("[data-toggle-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-toggle-cat");
      if (!id) return;
      if (ui.collapsed.has(id)) ui.collapsed.delete(id);
      else ui.collapsed.add(id);

      const next = structuredClone(getState().notes);
      if (isWiki(next)) {
        next.expandedCats = (next.tree || []).map((c) => c.id).filter((cid) => !ui.collapsed.has(cid));
        saveNotes(next).catch(() => {});
      }
      renderKnowledge(getState(), { navOnly: true });
    });
  });

  navScope.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => openPage(btn.getAttribute("data-page")));
  });

  if (navOnly) return;

  const mainScope = panelsOnly ? root.querySelector("#kb-main") || root : root;

  mainScope.querySelectorAll("[data-page]").forEach((btn) => {
    if (btn.closest(".kb-nav")) return;
    btn.addEventListener("click", () => openPage(btn.getAttribute("data-page")));
  });

  mainScope.querySelectorAll("[data-tag]").forEach((btn) => {
    btn.addEventListener("click", () => {
      ui.tag = btn.getAttribute("data-tag") || "";
      ui.query = "";
      renderKnowledge(getState());
    });
  });

  mainScope.querySelectorAll("[data-status]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const key = btn.getAttribute("data-status");
      const map = {
        favorite: "favorite",
        pinned: "pinned",
        learned: "learned",
        needsReview: "needsReview",
      };
      const field = map[key];
      if (!field) return;
      const next = structuredClone(getState().notes);
      const page = next.pages?.[ui.pageId];
      if (!page) return;
      page[field] = !page[field];
      try {
        await saveNotes(next);
        const labels = {
          favorite: page.favorite ? "به علاقه‌مندی‌ها اضافه شد" : "از علاقه‌مندی‌ها برداشته شد",
          pinned: page.pinned ? "پین شد" : "پین برداشته شد",
          learned: page.learned ? "به‌عنوان یادگرفته علامت خورد" : "علامت یادگرفته برداشته شد",
          needsReview: page.needsReview ? "نیاز به مرور" : "مرور برداشته شد",
        };
        showToast(labels[field]);
        renderKnowledge(getState());
      } catch (err) {
        showToast(err.message);
      }
    });
  });
}

async function openPage(pageId) {
  if (!pageId) return;
  ui.pageId = pageId;
  ui.query = "";
  ui.tag = "";
  ui.sidebarOpen = false;
  const notes = structuredClone(getState().notes);
  if (isWiki(notes)) {
    notes.activePageId = pageId;
    try {
      await saveNotes(notes);
    } catch {
      /* ignore persistence errors for navigation */
    }
  }
  renderKnowledge(getState());
  document.getElementById("kb-main")?.scrollTo?.({ top: 0 });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function siblingPageIds(notes, pageId) {
  for (const cat of notes.tree || []) {
    const ids = (cat.children || []).map((c) => c.id);
    const idx = ids.indexOf(pageId);
    if (idx >= 0) return { ids, idx };
  }
  const ids = allPages(notes).map((p) => p.id);
  return { ids, idx: ids.indexOf(pageId) };
}

export function bindKnowledgeEvents() {
  window.addEventListener("workspace:open-section", (e) => {
    const detail = e.detail;
    const notes = getState().notes;
    if (!isWiki(notes)) return;

    // Map legacy section ids → wiki pages
    const legacyMap = {
      "trading-plan": "plan-overview",
      "important-notes": "personal-core",
      "strategy-cards": "strategies-index",
      quick: "quick-notes",
      "subhan-pinbar": "course-pinbar",
      "subhan-structure": "course-cycles",
    };

    if (typeof detail === "string") {
      if (notes.pages?.[detail]) openPage(detail);
      else if (legacyMap[detail]) openPage(legacyMap[detail]);
      else if (detail.startsWith("strat-") || notes.pages?.[`strat-${detail}`]) {
        openPage(notes.pages[`strat-${detail}`] ? `strat-${detail}` : detail);
      }
    }
  });

  window.addEventListener("keydown", (e) => {
    const view = document.querySelector(".view-root")?.getAttribute("data-view");
    if (view !== "knowledge") return;
    const tag = (e.target?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) {
      if (e.key === "Escape") e.target.blur();
      return;
    }
    if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      document.getElementById("kb-search")?.focus();
      return;
    }
    if (e.key === "[" || e.key === "]") {
      const notes = getState().notes;
      if (!isWiki(notes)) return;
      const { ids, idx } = siblingPageIds(notes, ui.pageId);
      if (idx < 0 || !ids.length) return;
      e.preventDefault();
      const next = e.key === "]" ? ids[(idx + 1) % ids.length] : ids[(idx - 1 + ids.length) % ids.length];
      openPage(next);
    }
  });
}

/** Append a quick note into wiki inbox — used by capture modal */
export async function addQuickNote(text) {
  const notes = structuredClone(getState().notes);
  if (!isWiki(notes)) throw new Error("پایگاه دانش آماده نیست");
  let page = notes.pages["quick-notes"];
  if (!page) throw new Error("صفحه یادداشت سریع یافت نشد");
  let list = (page.blocks || []).find((b) => b.type === "notes-list");
  if (!list) {
    list = { type: "notes-list", items: [] };
    page.blocks = page.blocks || [];
    page.blocks.push(list);
  }
  list.items = list.items || [];
  list.items.unshift({
    id: uid("qc"),
    text,
    tags: ["quick"],
    favorite: false,
    createdAt: new Date().toISOString(),
  });
  await saveNotes(notes);
  ui.pageId = "quick-notes";
  return notes;
}

export function getKnowledgeFavorites(notes) {
  if (!isWiki(notes)) return [];
  return allPages(notes)
    .filter((p) => p.favorite || p.pinned)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned))
    .slice(0, 6)
    .map((p) => ({
      id: p.id,
      text: p.title,
      section: (p.tags || [])[0] || "دانش",
      favorite: true,
    }));
}
