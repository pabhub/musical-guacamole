export function redirectToLogin(nextPath = "/") {
    const next = encodeURIComponent(nextPath);
    window.location.replace(`/login?next=${next}`);
    throw new Error("redirecting");
}
export function resolveNextPath(search) {
    const params = new URLSearchParams(search);
    const raw = params.get("next");
    if (!raw || !raw.startsWith("/"))
        return "/";
    if (raw.startsWith("/login"))
        return "/";
    return raw;
}
