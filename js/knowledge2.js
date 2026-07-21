import { escapeHtml, uid } from "./config.js";
import { icon } from "./components/icons.js";
import { getState, saveBooklet } from "./storage.js";
import { showToast } from "./components/toast.js";

const ui = {
  query: "",
  chapterId: "",
  sidebarOpen: false,
  hitAnchor: "",
};

let tocObserver = null;
let searchTimer = 0;

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
  if (Array.isArray(b.items)) parts.push(...b.items.filter((x) => typeof x === "string"));
  return parts.join(" ");
}

function chapterSearchBlob(ch) {
  const parts = [ch.title, ch.intro || ""];
  for (const b of ch.blocks || []) parts.push(blockText(b));
  for (const it of ch.items || []) parts.push(it.text || "");
  return parts.join("\n");
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

function extractHeadings(ch) {
  return (ch.blocks || [])
    .filter((b) => b.type === "heading" && (b.level === 2 || b.level === 3))
    .map((b) => ({ id: b.id, text: b.text, level: b.level }));
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

function renderSearchHits(book) {
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
    for (const it of ch.items || []) {
      if (!(it.text || "").toLowerCase().includes(q)) continue;
      hits.push({ chapterId: ch.id, title: ch.title, snippet: it.text, anchor: "journal-items" });
    }
  }
  // de-dupe similar
  const seen = new Set();
  const unique = [];
  for (const h of hits) {
    const key = `${h.chapterId}|${h.snippet.slice(0, 40)}`;
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

function renderJournal(ch) {
  const items = ch.items || [];
  return `
    <div class="kb2-journal" id="journal-items">
      ${
        items.length
          ? `<ul class="kb2-journal__list">
              ${items
                .map(
                  (it) => `
                <li class="kb2-journal__item">
                  <p>${escapeHtml(it.text)}</p>
                  <button type="button" class="btn-icon kb2-journal__del" data-del-item="${escapeHtml(it.id)}" title="حذف" aria-label="حذف">×</button>
                </li>`,
                )
                .join("")}
            </ul>`
          : `<div class="kb2-empty">
              <p>${escapeHtml(ch.placeholder || "هنوز موردی نیست.")}</p>
            </div>`
      }
      <form class="kb2-add" id="kb2-add-form">
        <label class="sr-only" for="kb2-add-input">${escapeHtml(ch.addLabel || "افزودن")}</label>
        <textarea id="kb2-add-input" rows="3" placeholder="متن جدید…" required></textarea>
        <button class="btn btn-primary" type="submit">${escapeHtml(ch.addLabel || "افزودن مورد جدید")}</button>
      </form>
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

  root.innerHTML = `
    <div class="kb2-shell ${ui.sidebarOpen ? "is-sidebar-open" : ""}">
      <div class="kb2-top">
        <button type="button" class="btn-icon kb2-menu" id="kb2-menu" title="فهرست فصل‌ها" aria-label="فهرست">${icon("menu", 18)}</button>
        <div class="kb2-search field">
          <label class="sr-only" for="kb2-search">جستجو در جزوه</label>
          <span class="kb2-search__ico">${icon("search", 16)}</span>
          <input id="kb2-search" type="search" placeholder="جستجو در کل متن جزوه…" value="${escapeHtml(ui.query)}" autocomplete="off" />
        </div>
        <div class="kb2-top__label muted u-text-sm">دانش ۲ · جزوه مقاله‌ای</div>
      </div>

      <aside class="kb2-sidebar" id="kb2-sidebar">
        <div class="kb2-sidebar__title">فهرست فصل‌ها</div>
        <nav class="kb2-nav" aria-label="فصل‌های جزوه">
          ${chapters(book)
            .map(
              (c) => `
            <button type="button" class="kb2-nav__item ${c.id === ui.chapterId ? "is-active" : ""}" data-ch="${escapeHtml(c.id)}">
              <span class="kb2-nav__num">${String(c.number).padStart(2, "0")}</span>
              <span class="kb2-nav__label">${escapeHtml(c.title)}</span>
              ${c.mode === "journal" ? `<span class="kb2-nav__badge">${(c.items || []).length}</span>` : ""}
            </button>`,
            )
            .join("")}
        </nav>
      </aside>

      <div class="kb2-backdrop" id="kb2-backdrop" hidden></div>

      <main class="kb2-main" id="kb2-main">
        <div class="kb2-progress" aria-hidden="true"><div class="kb2-progress__bar" id="kb2-progress-bar"></div></div>
        ${
          showHits
            ? renderSearchHits(book)
            : ch
              ? `
          <article class="kb2-article">
            <nav class="kb2-crumb" aria-label="مسیر">
              <span>دانش</span><span class="kb2-crumb__sep">›</span>
              <span>جزوه معاملاتی</span><span class="kb2-crumb__sep">›</span>
              <span class="kb2-crumb__cur">${escapeHtml(ch.title)}</span>
            </nav>
            <header class="kb2-article__head">
              <div class="kb2-article__num">فصل ${String(ch.number).padStart(2, "0")}</div>
              <h1>${highlight(ch.title, ui.query)}</h1>
              ${ch.intro ? `<p class="kb2-article__intro">${highlight(ch.intro, ui.query)}</p>` : ""}
            </header>
            <div class="kb2-article__body">
              ${(ch.blocks || []).map((b) => renderBlock(b, ui.query)).join("")}
              ${ch.mode === "journal" ? renderJournal(ch) : ""}
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

  root.querySelector("#kb2-add-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = root.querySelector("#kb2-add-input")?.value.trim();
    if (!text) return;
    const next = structuredClone(getState().booklet);
    const ch = findChapter(next, ui.chapterId);
    if (!ch || ch.mode !== "journal") return;
    ch.items = ch.items || [];
    ch.items.unshift({ id: uid("bk"), text, createdAt: new Date().toISOString() });
    try {
      await saveBooklet(next);
      showToast("اضافه شد");
      renderKnowledge2(getState());
    } catch (err) {
      showToast(err.message);
    }
  });

  root.querySelectorAll("[data-del-item]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del-item");
      const next = structuredClone(getState().booklet);
      const ch = findChapter(next, ui.chapterId);
      if (!ch) return;
      ch.items = (ch.items || []).filter((it) => it.id !== id);
      try {
        await saveBooklet(next);
        showToast("حذف شد");
        renderKnowledge2(getState());
      } catch (err) {
        showToast(err.message);
      }
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
}
