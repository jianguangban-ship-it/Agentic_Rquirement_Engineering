export interface Route {
  /** View identifier; matches `#view-<id>` element and `data-view="<id>"` nav tab. */
  id: string;
  /** Called once, the first time this view is shown. */
  onFirstShow?: () => void;
}

/**
 * Lightweight hash-based router that toggles `.view` elements and `.nav-tab`
 * active states. Hashes take the form `#/<id>`; an unknown or empty hash falls
 * back to the first route.
 */
export function initRouter(routes: Route[]): void {
  if (routes.length === 0) return;

  const shown = new Set<string>();

  function currentId(): string {
    const id = window.location.hash.replace(/^#\//, '');
    return routes.some((r) => r.id === id) ? id : routes[0].id;
  }

  function render(): void {
    const activeId = currentId();

    for (const route of routes) {
      const view = document.getElementById(`view-${route.id}`);
      const isActive = route.id === activeId;
      if (view) view.hidden = !isActive;

      if (isActive && !shown.has(route.id)) {
        shown.add(route.id);
        route.onFirstShow?.();
      }
    }

    document.querySelectorAll<HTMLElement>('.nav-tab').forEach((tab) => {
      tab.classList.toggle('nav-tab--active', tab.dataset.view === activeId);
    });
  }

  window.addEventListener('hashchange', render);
  render();
}
