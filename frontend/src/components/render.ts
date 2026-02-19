export function renderPageRoot(content: string, rootId = "app-root"): HTMLElement {
  const root = document.getElementById(rootId);
  if (!root) {
    throw new Error(`Missing page root #${rootId}`);
  }
  root.innerHTML = content;
  return root;
}
