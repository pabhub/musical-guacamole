import { topNavTemplate } from "../layout/top_nav.js";
import { renderPageRoot } from "../render.js";
export function configPageTemplate() {
    return `
    ${topNavTemplate({
        active: "config",
        brand: "AEMET Antarctic Analytics",
        showAuth: false,
    })}
    <main class="config-page">
      <section class="config-card">
        <h1>Input Timezone Configuration</h1>
        <p>
          This timezone is used as the API <code>location</code> value for all queries.
          If you do not set a custom value, the dashboard uses your browser timezone.
        </p>

        <label>Detected browser timezone
          <input id="browser-timezone" type="text" readonly />
        </label>

        <label>Custom input timezone (IANA format, e.g. Europe/Madrid)
          <input id="custom-timezone" type="text" placeholder="America/Santiago" />
        </label>

        <div class="config-actions">
          <button id="save-custom" type="button">Save custom timezone</button>
          <button id="use-browser" type="button" class="secondary">Use browser timezone (default)</button>
        </div>
        <p class="status-note" id="config-status">Loading settings…</p>

        <section class="subsection">
          <h2>Simulated Wind Farm Parameters</h2>
          <p>
            These values are used by Timeframe Analysis to estimate expected generation in the selected period.
            Generation applies air-density correction from measured temperature/pressure (fallback to reference density)
            and zeros output outside the selected operating temperature/pressure envelope.
          </p>
          <div class="grid-2">
            <label>Turbine count
              <input id="wf-turbines" type="number" min="1" step="1" />
            </label>
            <label>Rated power per turbine (kW)
              <input id="wf-rated-power" type="number" min="1" step="0.1" />
            </label>
            <label>Cut-in speed (m/s)
              <input id="wf-cut-in" type="number" min="0" step="0.1" />
            </label>
            <label>Rated speed (m/s)
              <input id="wf-rated-speed" type="number" min="0.1" step="0.1" />
            </label>
            <label>Cut-out speed (m/s)
              <input id="wf-cut-out" type="number" min="0.1" step="0.1" />
            </label>
            <label>Reference air density (kg/m³)
              <input id="wf-ref-density" type="number" min="0.1" step="0.001" />
            </label>
            <label>Min operating temperature (°C)
              <input id="wf-min-temp" type="number" step="0.1" />
            </label>
            <label>Max operating temperature (°C)
              <input id="wf-max-temp" type="number" step="0.1" />
            </label>
            <label>Min operating pressure (hPa)
              <input id="wf-min-pressure" type="number" min="100" step="0.1" />
            </label>
            <label>Max operating pressure (hPa)
              <input id="wf-max-pressure" type="number" min="100" step="0.1" />
            </label>
          </div>
          <div class="config-actions">
            <button id="save-wf" type="button">Save wind farm parameters</button>
            <button id="reset-wf" type="button" class="secondary">Reset to defaults</button>
          </div>
          <p class="status-note" id="wf-status">Wind farm parameters not configured.</p>
        </section>
      </section>
    </main>
  `;
}
export function renderConfigPage() {
    renderPageRoot(configPageTemplate());
}
