import { escapeHtml } from "./config.js";
import { icon } from "./components/icons.js";
import { saveNotes, getState } from "./storage.js";
import { showToast } from "./components/toast.js";

let filterQuery = "";
let activeChapter = "";

export function renderKnowledge(state) {
  const root = document.getElementById("view-knowledge");
  if (!root) return;

  const sections = state.notes?.sections || [];
  const q = filterQuery.toLowerCase();

  const visible = sections
    .map((section, si) => {
      const items = (section.items || []).filter((i) => {
        if (!q) return true;
        return (
          i.text.toLowerCase().includes(q) ||
          (i.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          section.title.toLowerCase().includes(q)
        );
      });
      return { section, items, index: si + 1 };
    })
    .filter((x) => x.items.length > 0 || (!q && x.section.id === "quick"));

  if (!activeChapter || !visible.some((v) => v.section.id === activeChapter)) {
    activeChapter = visible[0]?.section.id || "";
  }

  const current = visible.find((v) => v.section.id === activeChapter) || visible[0];

  root.innerHTML = `
    <header class="page-header page-header--tight">
      <div class="page-header__eyebrow">دانش</div>
      <div class="u-flex u-justify-between u-items-center" style="flex-wrap:wrap;gap:16px">
        <div>
          <h1 class="u-mb-2">جزوه معاملاتی</h1>
          <p class="page-header__desc u-mb-0">فصل‌ها را از فهرست انتخاب کن؛ نکات مثل صفحات جزوه کنار هم چیده شده‌اند.</p>
        </div>
        <div class="field kb-search-bar" style="min-width:min(320px,100%);margin:0">
          <label class="sr-only">جستجو</label>
          <input id="kb-search" type="search" placeholder="جستجو در کل جزوه…" value="${escapeHtml(filterQuery)}" />
        </div>
      </div>
    </header>

    <div class="kb-book">
      <aside class="kb-book__toc">
        <div class="kb-book__toc-title">فهرست مطالب</div>
        ${visible
          .map(
            (x) => `
          <button type="button" class="kb-book__toc-item ${x.section.id === activeChapter ? "is-active" : ""}" data-chapter="${escapeHtml(x.section.id)}">
            <span class="kb-book__toc-num">${String(x.index).padStart(2, "0")}</span>
            <span class="kb-book__toc-label">${escapeHtml(x.section.title)}</span>
            <span class="kb-book__toc-count">${x.items.length}</span>
          </button>
        `,
          )
          .join("") || `<p class="muted u-text-sm">فصلی نیست.</p>`}
      </aside>

      <div class="kb-book__pages">
        ${
          current
            ? `
          <div class="kb-book__chapter-head">
            <span class="kb-book__chapter-num">فصل ${String(current.index).padStart(2, "0")}</span>
            <h2 class="kb-book__chapter-title">${escapeHtml(current.section.title)}</h2>
          </div>
          <div class="kb-book__grid">
            ${current.items
              .map(
                (item, i) => `
              <article class="kb-leaf">
                <p class="kb-leaf__text">
                  <span class="kb-leaf__num-inline">${String(i + 1).padStart(2, "0")}</span>
                  <span class="kb-leaf__text-main">${escapeHtml(item.text)}</span>
                </p>
                <button
                  class="kb-pin-btn ${item.favorite ? "is-active" : ""}"
                  type="button"
                  data-toggle-fav="${escapeHtml(item.id)}"
                  data-section="${escapeHtml(current.section.id)}"
                  title="سنجاق"
                  aria-label="سنجاق"
                >
                  ${item.favorite ? icon("star", 14) : icon("starOff", 14)}
                </button>
              </article>
            `,
              )
              .join("") || `<div class="empty-state">هنوز نکته‌ای در این فصل نیست.</div>`}
          </div>
        `
            : `<div class="empty-state">نتیجه‌ای پیدا نشد.</div>`
        }
      </div>
    </div>
  `;

  root.querySelector("#kb-search")?.addEventListener("input", (e) => {
    filterQuery = e.target.value.trim();
    renderKnowledge(getState());
  });

  root.querySelectorAll("[data-chapter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeChapter = btn.getAttribute("data-chapter");
      renderKnowledge(getState());
    });
  });

  root.querySelectorAll("[data-toggle-fav]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sectionId = btn.getAttribute("data-section");
      const itemId = btn.getAttribute("data-toggle-fav");
      const notes = structuredClone(getState().notes);
      const section = notes.sections.find((s) => s.id === sectionId);
      const item = section?.items.find((i) => i.id === itemId);
      if (!item) return;
      item.favorite = !item.favorite;
      try {
        await saveNotes(notes);
        showToast(item.favorite ? "سنجاق شد" : "از سنجاق برداشته شد");
        renderKnowledge(getState());
      } catch (err) {
        showToast(err.message);
      }
    });
  });
}

export function bindKnowledgeEvents() {
  window.addEventListener("workspace:open-section", (e) => {
    activeChapter = e.detail;
    renderKnowledge(getState());
  });
}
