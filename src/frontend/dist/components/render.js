export function renderPageRoot(content, rootId = "app-root") {
    const root = document.getElementById(rootId);
    if (!root) {
        throw new Error(`Missing page root #${rootId}`);
    }
    root.innerHTML = content;
    return root;
}
