export function complianceFooterTemplate(): string {
  return `
    <footer class="app-footer">
      <div class="app-footer-inner">
        <p>© AEMET · Source: AEMET</p>
        <p>Information provided by the Agencia Estatal de Meteorología (AEMET) · © AEMET.</p>
        <p>Base map data: © OpenStreetMap contributors (ODbL).</p>
        <p class="legal-links">
          <a href="https://www.aemet.es/en/nota_legal" target="_blank" rel="noopener noreferrer">AEMET legal notice</a>
          ·
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap copyright</a>
          ·
          <a href="https://operations.osmfoundation.org/policies/tiles/" target="_blank" rel="noopener noreferrer">OSM tile usage policy</a>
        </p>
      </div>
    </footer>
  `;
}
