export const ROUTES = ["schedule", "workout", "reading", "log", "settings"];

export function createRouter(nav, onRouteChange) {
  const scrollPositions = {};
  let renderedRoute = "schedule";

  function currentRoute() {
    const route = window.location.hash.slice(1).toLowerCase();
    return ROUTES.includes(route) ? route : "schedule";
  }

  function updateNavigation(route) {
    nav.querySelectorAll("[data-route]").forEach(link => {
      link.classList.toggle("active", link.dataset.route === route);
    });
  }

  function renderCurrentRoute() {
    const route = currentRoute();
    renderedRoute = route;
    updateNavigation(route);
    onRouteChange(route);
  }

  nav.querySelectorAll("[data-route]").forEach(link => link.onclick = () => {
    scrollPositions[renderedRoute] = window.scrollY;
  });

  window.addEventListener("hashchange", () => {
    scrollPositions[renderedRoute] = window.scrollY;
    renderCurrentRoute();
    window.scrollTo(0, scrollPositions[currentRoute()] || 0);
  });

  return {
    start() {
      if (!ROUTES.includes(window.location.hash.slice(1).toLowerCase())) {
        history.replaceState(null, "", `${window.location.pathname}${window.location.search}#schedule`);
      }
    },
    showNavigation() {
      nav.hidden = false;
    },
    hideNavigation() {
      nav.hidden = true;
    },
    renderCurrentRoute,
  };
}
