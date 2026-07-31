import { escapeHtml, groupStrategies } from "../config.js";

function faintBg(color, amount = 10) {
  const safe = String(color || "#34c5b1").trim() || "#34c5b1";
  return `color-mix(in srgb, ${safe} ${amount}%, transparent)`;
}

function optionLabel(value) {
  return value ? value : "انتخاب استراتژی";
}

export function strategySelectHtml(selected = "", strategies = []) {
  const groups = groupStrategies(strategies);
  return `
    <div class="strategy-select" data-strategy-select>
      <input type="hidden" data-trade-field="strategy" value="${escapeHtml(selected)}" />
      <button type="button" class="strategy-select__trigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="strategy-select__value">${escapeHtml(optionLabel(selected))}</span>
        <span class="strategy-select__chevron" aria-hidden="true">▾</span>
      </button>
      <div class="strategy-select__menu" role="listbox" hidden>
        <button type="button" class="strategy-select__option ${selected ? "" : "is-selected"}" data-value="" role="option">
          انتخاب استراتژی
        </button>
        ${groups.map((group) => `
          <div class="strategy-select__group">
            <div class="strategy-select__group-label" style="background:${faintBg(group.textColor, 8)};color:${escapeHtml(group.textColor)}">
              ${escapeHtml(group.label)}
            </div>
            ${group.strategies.map((strategy) => {
              const isSelected = strategy.name === selected;
              return `
                <button
                  type="button"
                  class="strategy-select__option ${isSelected ? "is-selected" : ""}"
                  data-value="${escapeHtml(strategy.name)}"
                  role="option"
                >${escapeHtml(strategy.name)}</button>
              `;
            }).join("")}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function closeStrategySelect(root) {
  if (!root) return;
  root.classList.remove("is-open");
  const trigger = root.querySelector(".strategy-select__trigger");
  const menu = root.querySelector(".strategy-select__menu");
  trigger?.setAttribute("aria-expanded", "false");
  if (menu) {
    menu.hidden = true;
    menu.style.top = "";
    menu.style.left = "";
    menu.style.width = "";
    menu.style.maxHeight = "";
  }
}

function closeAllStrategySelects(except = null) {
  document.querySelectorAll(".strategy-select.is-open").forEach((root) => {
    if (root !== except) closeStrategySelect(root);
  });
}

function openStrategySelect(root) {
  const trigger = root.querySelector(".strategy-select__trigger");
  const menu = root.querySelector(".strategy-select__menu");
  if (!trigger || !menu) return;

  closeAllStrategySelects(root);
  root.classList.add("is-open");
  trigger.setAttribute("aria-expanded", "true");
  menu.hidden = false;

  const rect = trigger.getBoundingClientRect();
  const gap = 4;
  const spaceBelow = Math.max(120, window.innerHeight - rect.bottom - 12);
  menu.style.position = "fixed";
  menu.style.top = `${Math.round(rect.bottom + gap)}px`;
  menu.style.left = `${Math.round(rect.left)}px`;
  menu.style.width = `${Math.round(rect.width)}px`;
  menu.style.maxHeight = `${Math.round(spaceBelow)}px`;
  // Always open downward — never flip above the trigger.
}

let bound = false;

export function bindStrategySelects() {
  if (bound) return;
  bound = true;

  document.addEventListener("click", (event) => {
    const option = event.target.closest(".strategy-select__option");
    if (option) {
      const root = option.closest(".strategy-select");
      if (!root) return;
      const input = root.querySelector('[data-trade-field="strategy"]');
      const value = option.dataset.value || "";
      if (input) {
        input.value = value;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const label = root.querySelector(".strategy-select__value");
      if (label) label.textContent = optionLabel(value);
      root.querySelectorAll(".strategy-select__option").forEach((item) => {
        item.classList.toggle("is-selected", item === option);
      });
      closeStrategySelect(root);
      event.preventDefault();
      return;
    }

    const trigger = event.target.closest(".strategy-select__trigger");
    if (trigger) {
      const root = trigger.closest(".strategy-select");
      if (!root) return;
      if (root.classList.contains("is-open")) closeStrategySelect(root);
      else openStrategySelect(root);
      event.preventDefault();
      return;
    }

    if (!event.target.closest(".strategy-select")) {
      closeAllStrategySelects();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAllStrategySelects();
  });

  window.addEventListener("resize", () => closeAllStrategySelects());
  document.addEventListener("scroll", (event) => {
    if (event.target?.closest?.(".strategy-select__menu")) return;
    closeAllStrategySelects();
  }, true);
}
