export function topNavTemplate(options) {
    const dashboardClass = options.active === "dashboard" ? "top-nav-link active" : "top-nav-link";
    const configClass = options.active === "config" ? "top-nav-link active" : "top-nav-link";
    const authBlock = options.showAuth
        ? `
          <div class="top-nav-auth">
            <span id="auth-user" class="top-nav-user">Not authenticated</span>
            <button id="auth-logout" type="button" class="secondary">Log out</button>
          </div>
    `
        : "";
    return `
    <div class="top-nav-wrap">
      <nav class="top-nav" aria-label="Main navigation">
        <div class="top-nav-brand">${options.brand}</div>
        <div class="top-nav-links-wrap">
          <div class="top-nav-links">
            <a class="${dashboardClass}" href="/">Dashboard</a>
            <a class="${configClass}" href="/config">Config</a>
          </div>
          ${authBlock}
        </div>
      </nav>
    </div>
  `;
}
