import { buildSearchIndex, filterSearch } from "./search.js";
import { getState } from "./storage.js";
import { navigate } from "./router.js";
import { openModal, closeModal } from "./components/modal.js";
import { escapeHtml } from "./config.js";

let activeIndex = 0;
let currentItems = [];

export function openCommandPalette() {
  const backdrop = document.getElementById("modal-command");
  const input = document.getElementById("command-input");
  if (!backdrop || !input) return;
  activeIndex = 0;
  input.value = "";
  renderList("");
  openModal("modal-command");
}

export function bindCommandPalette(handlers) {
  const input = document.getElementById("command-input");
  const list = document.getElementById("command-list");
  if (!input || !list) return;

  input.addEventListener("input", () => {
    activeIndex = 0;
    renderList(input.value);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentItems.length - 1);
      paintActive();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      paintActive();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = currentItems[activeIndex];
      if (item) runAction(item, handlers);
    } else if (e.key === "Escape") {
      closeModal("modal-command");
    }
  });

  list.addEventListener("click", (e) => {
    const row = e.target.closest("[data-cmd-index]");
    if (!row) return;
    const item = currentItems[Number(row.getAttribute("data-cmd-index"))];
    if (item) runAction(item, handlers);
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openCommandPalette();
    }
  });

  document.getElementById("btn-command")?.addEventListener("click", openCommandPalette);
}

function renderList(query) {
  const list = document.getElementById("command-list");
  if (!list) return;
  currentItems = filterSearch(buildSearchIndex(getState()), query);
  list.innerHTML = currentItems
    .map(
      (item, idx) => `
      <li class="command-item ${idx === activeIndex ? "is-active" : ""}" data-cmd-index="${idx}">
        <div>
          <div>${escapeHtml(item.title)}</div>
          <div class="command-item__hint">${escapeHtml(item.subtitle || item.type)}</div>
        </div>
        <span class="command-item__hint">${escapeHtml(item.type)}</span>
      </li>
    `,
    )
    .join("") || `<li class="command-item"><div>نتیجه‌ای نیست</div></li>`;
}

function paintActive() {
  document.querySelectorAll("#command-list .command-item").forEach((el, idx) => {
    el.classList.toggle("is-active", idx === activeIndex);
  });
}

function runAction(item, handlers) {
  closeModal("modal-command");
  const a = item.action || {};
  if (a.type === "view") {
    navigate(a.view);
    if (a.section) {
      window.dispatchEvent(new CustomEvent("workspace:open-section", { detail: a.section }));
    }
  } else if (a.type === "new-journal") {
    navigate("journal");
    window.dispatchEvent(new CustomEvent("workspace:new-journal"));
  } else if (a.type === "morning") {
    openModal("modal-morning");
  } else if (a.type === "eod") {
    openModal("modal-eod");
  } else if (a.type === "settings") {
    openModal("modal-settings");
  } else if (a.type === "capture") {
    openModal("modal-capture");
  }
  handlers?.onAction?.(item);
}
