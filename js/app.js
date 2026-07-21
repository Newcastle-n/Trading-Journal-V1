import { config } from "./config.js";
import { initRouter, onRoute, navigate } from "./router.js";
import { loadAll, getState, saveNotes, saveSettings } from "./storage.js";
import { bindSidebar, renderSidebar, renderSessionPill, syncNavActive } from "./components/sidebar.js";
import { bindModalDismiss, openModal, closeModal } from "./components/modal.js";
import { showToast } from "./components/toast.js";
import { renderDashboard } from "./dashboard.js";
import { renderJournal, bindJournalForm } from "./journal.js";
import { renderKnowledge, bindKnowledgeEvents } from "./knowledge.js";
import { renderBacktests } from "./search.js";
import { bindCommandPalette } from "./commandPalette.js";
import { uid } from "./config.js";

async function refresh() {
  const state = getState();
  renderSidebar(state);
  renderSessionPill();
  renderDashboard(state);
  renderJournal(state);
  renderKnowledge(state);
  renderBacktests(state);
  syncNavActive(location.hash.replace(/^#\/?/, "") || "dashboard");
  showActiveView(location.hash.replace(/^#\/?/, "") || "dashboard");
}

function showActiveView(view) {
  document.querySelectorAll(".view").forEach((el) => {
    el.classList.toggle("is-active", el.id === `view-${view}`);
  });
  document.querySelector(".view-root")?.setAttribute("data-view", view);
  syncNavActive(view);
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
    form.elements.mediaBasePath.value = s.mediaBasePath || "";
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
    const notes = structuredClone(getState().notes);
    let section = notes.sections.find((s) => s.id === "quick");
    if (!section) {
      section = { id: "quick", title: "یادداشت‌های سریع", items: [] };
      notes.sections.push(section);
    }
    section.items.unshift({
      id: uid("qc"),
      text,
      tags: ["quick"],
      favorite: false,
    });
    try {
      await saveNotes(notes);
      e.target.reset();
      closeModal("modal-capture");
      showToast("نکته در بخش «یادداشت‌های سریع» ذخیره شد");
      await refresh();
    } catch (err) {
      showToast(err.message);
    }
  });
}

function bindChecklists() {
  document.getElementById("btn-morning")?.addEventListener("click", () => openModal("modal-morning"));
  document.getElementById("btn-eod")?.addEventListener("click", () => {
    openModal("modal-eod");
  });

  const renderChecks = () => {
    const s = getState().settings || {};
    const morning = document.getElementById("morning-list");
    const eod = document.getElementById("eod-list");
    if (morning) {
      morning.innerHTML = (s.morningChecklist || [])
        .map(
          (t, i) => `
          <label class="list-row" style="cursor:pointer">
            <span class="u-text-sm">${t}</span>
            <input type="checkbox" data-check="morning-${i}" />
          </label>
        `,
        )
        .join("");
    }
    if (eod) {
      eod.innerHTML = (s.eodQuestions || [])
        .map(
          (t, i) => `
          <div class="field u-mb-3">
            <label>${t}</label>
            <textarea rows="2" data-eod="${i}" placeholder="پاسخ کوتاه…"></textarea>
          </div>
        `,
        )
        .join("");
    }
  };

  document.getElementById("morning-done")?.addEventListener("click", () => {
    closeModal("modal-morning");
    showToast("چک لیست آماده است. موفق باشی.");
  });

  document.getElementById("eod-to-journal")?.addEventListener("click", () => {
    closeModal("modal-eod");
    navigate("journal");
    window.dispatchEvent(new CustomEvent("workspace:new-journal"));
  });

  window.addEventListener("workspace:refresh-checklists", renderChecks);
  renderChecks();
}

async function boot() {
  bindSidebar();
  bindModalDismiss();
  bindTheme();
  bindSettings();
  bindCapture();
  bindChecklists();
  bindKnowledgeEvents();
  bindCommandPalette();
  bindJournalForm(async () => {
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
