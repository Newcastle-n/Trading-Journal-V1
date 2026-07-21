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
  current = view;
  const hash = `#/${view}`;
  if (replace) history.replaceState({ view }, "", hash);
  else history.pushState({ view }, "", hash);
  listeners.forEach((fn) => fn(view));
}

export function initRouter(defaultView = "dashboard") {
  const fromHash = location.hash.replace(/^#\/?/, "");
  const start = fromHash || defaultView;
  current = start;
  if (!location.hash) history.replaceState({ view: start }, "", `#/${start}`);

  window.addEventListener("popstate", () => {
    const view = location.hash.replace(/^#\/?/, "") || defaultView;
    current = view;
    listeners.forEach((fn) => fn(view));
  });

  return start;
}
