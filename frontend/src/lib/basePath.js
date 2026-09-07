/**
 * Returns the app's base path prefix (e.g. "/carc"), or "" when served at root.
 *
 * next/link and next/image automatically prepend `basePath`, but raw
 * fetch() / router.push() / <a href> calls do NOT. Use this to prefix any
 * manually-constructed URL so the app works both at root (prod) and under a
 * sub-path (demo/test domain).
 *
 * NEXT_PUBLIC_BASE_PATH is inlined at build time; for the demo/test image it
 * should be set to the same value as the Dockerfile's NEXT_BASE_PATH arg.
 */
export function basePath() {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

/** Prefix a root-absolute path ("/api/orders") with the app base path. */
export function withBasePath(path) {
  const bp = basePath();
  if (!bp) return path;
  return `${bp}${path.startsWith("/") ? path : `/${path}`}`;
}
