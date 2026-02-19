import { fetchJson, hasValidAuthToken, saveAuthToken } from "./core/api.js";
import { requiredElement } from "./core/dom.js";
import { resolveNextPath } from "./core/navigation.js";
import { saveAuthUser } from "./core/settings.js";
import { AuthTokenResponse } from "./core/types.js";
import { renderLoginPage } from "./components/login/page.js";

renderLoginPage();

const form = requiredElement<HTMLFormElement>("login-form");
const usernameInput = requiredElement<HTMLInputElement>("login-username");
const passwordInput = requiredElement<HTMLInputElement>("login-password");
const submitButton = requiredElement<HTMLButtonElement>("login-submit");
const statusEl = requiredElement<HTMLParagraphElement>("login-status");

const nextPath = resolveNextPath(window.location.search);
if (hasValidAuthToken()) {
  window.location.replace(nextPath);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    statusEl.textContent = "Username and password are required.";
    statusEl.className = "status status-error";
    return;
  }

  submitButton.disabled = true;
  statusEl.textContent = "Authenticating...";
  statusEl.className = "status status-info";
  try {
    const payload = await fetchJson<AuthTokenResponse>("/api/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    saveAuthToken(payload.accessToken, payload.expiresInSeconds);
    saveAuthUser(username);
    passwordInput.value = "";
    window.location.replace(nextPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication failed.";
    statusEl.textContent = message;
    statusEl.className = "status status-error";
    submitButton.disabled = false;
  }
});
