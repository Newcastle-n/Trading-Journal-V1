import { config, DEFAULT_MEDIA_BASE_PATH, escapeHtml, todayISO, uid } from "./config.js";
import { initRouter, onRoute, navigate } from "./router.js";
import { loadAll, getState, saveSettings, saveJournal, upsertJournalEntry } from "./storage.js";
import { bindSidebar, renderSidebar, renderSessionPill, syncNavActive } from "./components/sidebar.js";
import { bindModalDismiss, openModal, closeModal } from "./components/modal.js";
import { showToast } from "./components/toast.js";
import { icon } from "./components/icons.js";
import { renderDashboard } from "./dashboard.js";
import { renderJournal, bindJournalForm } from "./journal.js";
import { addQuickNote } from "./knowledge.js";
import { renderKnowledge2, bindKnowledge2Events } from "./knowledge2.js";
import { renderBacktests, bindBacktestForm } from "./backtests.js";
import { bindCommandPalette } from "./commandPalette.js";
import { bindStrategySelects } from "./components/strategySelect.js";

async function refresh() {
  const state = getState();
  renderSidebar(state);
  renderSessionPill();
  renderDashboard(state);
  renderJournal(state);
  renderKnowledge2(state);
  renderBacktests(state);
  syncNavActive(location.hash.replace(/^#\/?/, "") || "dashboard");
  showActiveView(location.hash.replace(/^#\/?/, "") || "dashboard");
}

function showActiveView(view) {
  const resolved = view === "knowledge" ? "knowledge2" : view;
  document.querySelectorAll(".view").forEach((el) => {
    el.classList.toggle("is-active", el.id === `view-${resolved}`);
  });
  document.querySelector(".view-root")?.setAttribute("data-view", resolved);
  syncNavActive(resolved);
}

function applyTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  const btn = document.getElementById("btn-theme");
  if (btn) {
    const sun = '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    const moon = '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
    btn.innerHTML = next === "light" ? moon : sun;
    btn.classList.toggle("is-active", next === "light");
    btn.title = next === "light" ? "رفتن به تم شب" : "رفتن به تم روز";
  }
  try {
    localStorage.setItem("tw-theme", next);
  } catch {
    /* ignore */
  }
}

function getPreferredTheme(settings) {
  try {
    const local = localStorage.getItem("tw-theme");
    if (local === "light" || local === "dark") return local;
  } catch {
    /* ignore */
  }
  return settings?.theme === "light" ? "light" : "dark";
}

function bindTheme() {
  document.getElementById("btn-theme")?.addEventListener("click", async () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "light" ? "dark" : "light";
    applyTheme(next);
    const state = getState();
    if (!state.settings) return;
    try {
      await saveSettings({ ...state.settings, theme: next });
    } catch {
      /* local still applied */
    }
  });
}

function bindSettings() {
  const form = document.getElementById("settings-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const state = getState();
    const theme = form.elements.theme?.value === "light" ? "light" : "dark";
    const settings = {
      ...state.settings,
      userName: form.elements.userName.value.trim() || "سپهر",
      mediaBasePath: form.elements.mediaBasePath.value.trim(),
      theme,
      goals: {
        dailyPct: Number(form.elements.dailyPct.value) / 100,
        weeklyPct: Number(form.elements.weeklyPct.value) / 100,
        monthlyPct: Number(form.elements.monthlyPct.value) / 100,
      },
    };
    try {
      await saveSettings(settings);
      applyTheme(theme);
      closeModal("modal-settings");
      showToast("تنظیمات ذخیره شد");
      await refresh();
    } catch (err) {
      showToast(err.message);
    }
  });

  document.getElementById("btn-settings")?.addEventListener("click", () => {
    const s = getState().settings || {};
    const form = document.getElementById("settings-form");
    if (!form) return;
    form.elements.userName.value = s.userName || "سپهر";
    form.elements.mediaBasePath.value = s.mediaBasePath || DEFAULT_MEDIA_BASE_PATH;
    form.elements.dailyPct.value = ((s.goals?.dailyPct ?? 0.02) * 100).toFixed(1);
    form.elements.weeklyPct.value = ((s.goals?.weeklyPct ?? 0.04) * 100).toFixed(1);
    form.elements.monthlyPct.value = ((s.goals?.monthlyPct ?? 0.17) * 100).toFixed(1);
    if (form.elements.theme) {
      form.elements.theme.value = getPreferredTheme(s);
    }
    openModal("modal-settings");
  });
}

function bindCapture() {
  document.getElementById("btn-capture")?.addEventListener("click", () => openModal("modal-capture"));
  document.getElementById("capture-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = e.target.elements.note.value.trim();
    if (!text) return;
    try {
      await addQuickNote(text);
      e.target.reset();
      closeModal("modal-capture");
      showToast("نکته در Inbox دانش ذخیره شد");
      await refresh();
      navigate("knowledge2");
      window.dispatchEvent(new CustomEvent("workspace:open-booklet-chapter", { detail: "quick" }));
    } catch (err) {
      showToast(err.message);
    }
  });
}

function bindChecklists() {
  let morningEditMode = false;
  let draftItems = null;

  const setMorningEditMode = (on) => {
    morningEditMode = on;
    const viewFooter = document.getElementById("morning-footer-view");
    const editFooter = document.getElementById("morning-footer-edit");
    const title = document.getElementById("morning-title");
    const biasWrap = document.getElementById("morning-bias-wrap");
    if (viewFooter) viewFooter.hidden = on;
    if (editFooter) editFooter.hidden = !on;
    if (biasWrap) biasWrap.hidden = on;
    if (title) title.textContent = on ? "ویرایش چک لیست" : "چک لیست";
  };

  const loadMorningBias = () => {
    const ta = document.getElementById("morning-trading-bias");
    if (!ta) return;
    const today = todayISO();
    const entry = (getState().journal?.entries || []).find((e) => e.date === today);
    ta.value = entry?.tradingBias || "";
  };

  const saveMorningBias = async () => {
    const ta = document.getElementById("morning-trading-bias");
    if (!ta) return;
    const tradingBias = ta.value.trim();
    const today = todayISO();
    const existing = (getState().journal?.entries || []).find((e) => e.date === today);
    if (!tradingBias && !existing) return;
    if (!tradingBias && existing && !String(existing.tradingBias || "").trim()) return;
    await saveJournal(
      upsertJournalEntry({
        ...(existing || {}),
        id: existing?.id || uid("j"),
        date: today,
        tradingBias,
      }),
    );
  };

  const collectDraftItems = () =>
    [...document.querySelectorAll("#morning-list [data-morning-text]")]
      .map((input) => input.value.trim())
      .filter(Boolean);

  const renderChecks = () => {
    const s = getState().settings || {};
    const morning = document.getElementById("morning-list");
    const eod = document.getElementById("eod-list");
    if (morning) {
      if (morningEditMode) {
        const items = draftItems ?? [...(s.morningChecklist || [])];
        draftItems = items;
        morning.innerHTML = `
          <div class="checklist-editor">
            ${
              items.length
                ? items
                    .map(
                      (t, i) => `
              <div class="checklist-editor__row" data-morning-index="${i}">
                <button type="button" class="btn-icon checklist-editor__handle" data-morning-drag draggable="true" title="جابه‌جایی" aria-label="جابه‌جایی">${icon("grip", 14)}</button>
                <input type="text" class="checklist-editor__input" data-morning-text value="${escapeHtml(t)}" placeholder="متن آیتم…" />
                <button type="button" class="btn-icon" data-morning-del="${i}" title="حذف" aria-label="حذف">${icon("trash", 14)}</button>
              </div>`,
                    )
                    .join("")
                : `<p class="muted u-text-sm u-mb-3">هنوز آیتمی نیست. یکی اضافه کن.</p>`
            }
            <button type="button" class="btn btn-soft" id="morning-add-item">${icon("plus", 14)} افزودن مورد</button>
          </div>`;
      } else {
        const items = s.morningChecklist || [];
        morning.innerHTML = items.length
          ? items
              .map(
                (t, i) => `
          <label class="list-row" style="cursor:pointer">
            <span class="u-text-sm">${escapeHtml(t)}</span>
            <input type="checkbox" data-check="morning-${i}" />
          </label>`,
              )
              .join("")
          : `<p class="muted u-text-sm">چک‌لیستی تعریف نشده. با «ویرایش» آیتم اضافه کن.</p>`;
      }
    }
    if (eod) {
      eod.innerHTML = (s.eodQuestions || [])
        .map(
          (t, i) => `
          <div class="field u-mb-3">
            <label>${escapeHtml(t)}</label>
            <textarea rows="2" data-eod="${i}" placeholder="پاسخ کوتاه…"></textarea>
          </div>
        `,
        )
        .join("");
    }
  };

  const openMorning = () => {
    draftItems = null;
    setMorningEditMode(false);
    renderChecks();
    loadMorningBias();
    openModal("modal-morning");
  };

  document.getElementById("btn-morning")?.addEventListener("click", openMorning);
  document.getElementById("btn-eod")?.addEventListener("click", () => {
    openModal("modal-eod");
  });

  document.getElementById("morning-edit")?.addEventListener("click", () => {
    draftItems = [...(getState().settings?.morningChecklist || [])];
    setMorningEditMode(true);
    renderChecks();
    document.querySelector("#morning-list [data-morning-text]")?.focus();
  });

  document.getElementById("morning-edit-cancel")?.addEventListener("click", () => {
    draftItems = null;
    setMorningEditMode(false);
    renderChecks();
  });

  document.getElementById("morning-edit-save")?.addEventListener("click", async () => {
    const items = collectDraftItems();
    try {
      const state = getState();
      await saveSettings({ ...state.settings, morningChecklist: items });
      draftItems = null;
      setMorningEditMode(false);
      renderChecks();
      showToast("چک لیست ذخیره شد");
      await refresh();
    } catch (err) {
      showToast(err.message);
    }
  });

  const readDraftFromDom = () =>
    [...document.querySelectorAll("#morning-list [data-morning-text]")].map((el) => el.value);

  const morningList = document.getElementById("morning-list");
  let dragFromIndex = null;

  morningList?.addEventListener("click", (e) => {
    const addBtn = e.target.closest("#morning-add-item");
    if (addBtn) {
      draftItems = [...readDraftFromDom(), ""];
      renderChecks();
      const inputs = document.querySelectorAll("#morning-list [data-morning-text]");
      inputs[inputs.length - 1]?.focus();
      return;
    }
    const delBtn = e.target.closest("[data-morning-del]");
    if (delBtn) {
      const index = Number(delBtn.getAttribute("data-morning-del"));
      const all = readDraftFromDom();
      all.splice(index, 1);
      draftItems = all;
      renderChecks();
    }
  });

  morningList?.addEventListener("dragstart", (e) => {
    const handle = e.target.closest("[data-morning-drag]");
    const row = e.target.closest(".checklist-editor__row");
    if (!handle || !row || !morningEditMode) {
      e.preventDefault();
      return;
    }
    dragFromIndex = Number(row.dataset.morningIndex);
    row.classList.add("is-dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(dragFromIndex));
    try {
      e.dataTransfer.setDragImage(row, 24, 16);
    } catch {
      /* some browsers reject custom drag images */
    }
  });

  morningList?.addEventListener("dragend", () => {
    dragFromIndex = null;
    morningList.querySelectorAll(".checklist-editor__row.is-dragging, .checklist-editor__row.is-drag-over").forEach((el) => {
      el.classList.remove("is-dragging", "is-drag-over");
    });
  });

  morningList?.addEventListener("dragover", (e) => {
    const row = e.target.closest(".checklist-editor__row");
    if (row == null || dragFromIndex == null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    morningList.querySelectorAll(".checklist-editor__row.is-drag-over").forEach((el) => {
      if (el !== row) el.classList.remove("is-drag-over");
    });
    row.classList.add("is-drag-over");
  });

  morningList?.addEventListener("dragleave", (e) => {
    const row = e.target.closest(".checklist-editor__row");
    if (!row) return;
    const related = e.relatedTarget;
    if (related instanceof Node && row.contains(related)) return;
    row.classList.remove("is-drag-over");
  });

  morningList?.addEventListener("drop", (e) => {
    const row = e.target.closest(".checklist-editor__row");
    if (row == null || dragFromIndex == null) return;
    e.preventDefault();
    const toIndex = Number(row.dataset.morningIndex);
    if (Number.isNaN(toIndex) || toIndex === dragFromIndex) return;
    const items = readDraftFromDom();
    const [moved] = items.splice(dragFromIndex, 1);
    items.splice(toIndex, 0, moved);
    draftItems = items;
    dragFromIndex = null;
    renderChecks();
  });

  document.getElementById("morning-done")?.addEventListener("click", async () => {
    try {
      await saveMorningBias();
      closeModal("modal-morning");
      showToast("چک لیست آماده است. موفق باشی.");
      await refresh();
    } catch (err) {
      showToast(err.message || "خطا در ذخیره دیدگاه");
    }
  });

  document.getElementById("eod-to-journal")?.addEventListener("click", () => {
    closeModal("modal-eod");
    navigate("journal");
    window.dispatchEvent(new CustomEvent("workspace:new-journal"));
  });

  window.addEventListener("workspace:refresh-checklists", renderChecks);
  window.addEventListener("workspace:open-morning-checklist", openMorning);
  renderChecks();
}

async function boot() {
  bindSidebar();
  bindModalDismiss();
  bindTheme();
  bindSettings();
  bindCapture();
  bindChecklists();
  bindKnowledge2Events();
  bindCommandPalette();
  bindStrategySelects();
  bindJournalForm(async () => {
    await loadAll();
    await refresh();
  });
  bindBacktestForm(async () => {
    await loadAll();
    await refresh();
  });

  const start = initRouter(config.defaultView);
  onRoute((view) => {
    showActiveView(view);
    renderSidebar(getState());
  });

  try {
    await loadAll();
    applyTheme(getPreferredTheme(getState().settings));
    await refresh();
    showActiveView(start);
    window.dispatchEvent(new Event("workspace:refresh-checklists"));
    setInterval(renderSessionPill, 30000);
  } catch (err) {
    console.error(err);
    showToast("خطا در بارگذاری داده. server.py را اجرا کردی؟");
  }
}

boot();
