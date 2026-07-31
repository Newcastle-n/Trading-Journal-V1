const listeners = new Set();
let current = "dashboard";

export function getView() {
  return current;
}

export function onRoute(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function navigate(view, { replace = false } = {}) {
  const resolved = view === "knowledge" ? "knowledge2" : view;
  current = resolved;
  const hash = `#/${resolved}`;
  if (replace) history.replaceState({ view: resolved }, "", hash);
  else history.pushState({ view: resolved }, "", hash);
  listeners.forEach((fn) => fn(resolved));
}

export function initRouter(defaultView = "dashboard") {
  const fromHash = location.hash.replace(/^#\/?/, "");
  let start = fromHash || defaultView;
  if (start === "knowledge") start = "knowledge2";
  current = start;
  if (!location.hash || fromHash === "knowledge") {
    history.replaceState({ view: start }, "", `#/${start}`);
  }

  window.addEventListener("popstate", () => {
    let view = location.hash.replace(/^#\/?/, "") || defaultView;
    if (view === "knowledge") view = "knowledge2";
    current = view;
    listeners.forEach((fn) => fn(view));
  });

  return start;
}
