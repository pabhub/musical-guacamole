import { renderPageRoot } from "../render.js";

export function loginPageTemplate(): string {
  return `
    <main class="login-page">
      <section class="login-panel">
        <h1>Antarctic Wind Feasibility</h1>
        <p>Sign in to access protected Antarctic analysis endpoints.</p>
        <form id="login-form">
          <label>
            Username
            <input id="login-username" type="text" autocomplete="username" required />
          </label>
          <label>
            Password
            <input id="login-password" type="password" autocomplete="current-password" required />
          </label>
          <button id="login-submit" type="submit">Sign in</button>
          <p id="login-status" class="status status-info">Waiting for credentials.</p>
        </form>
      </section>
    </main>
  `;
}

export function renderLoginPage(): void {
  document.body.classList.add("login-body");
  renderPageRoot(loginPageTemplate());
}
