/**
 * Transitional scaffolding for the Nocturne v2 (light+dark) rollout — NOT a
 * permanent feature flag. Every Nocturne page is still ~100% literal inline
 * hex (see index.css's light-theme override block comment), so a route not
 * listed here would render half-migrated (global chrome re-themed, page
 * content stuck on old dark literals) if the user's preference is "light".
 * Layout.tsx puts data-theme="dark" on <main> itself (scoped, not the
 * document root — see theme.tsx) for any route not in this list, regardless
 * of the user's actual preference, so no page is ever caught looking broken
 * mid-rollout while global chrome (Rail, BottomTabBar, ...) outside <main>
 * stays fully theme-reactive.
 *
 * Each per-surface redesign phase adds its own route(s) here as its last
 * step. Once every route is listed, this file and its one call site in
 * Layout.tsx get deleted outright (the final regression-pass phase) — this
 * never renders two implementations of a page, it only ever picks which
 * single theme's tokens apply, so it doesn't violate the project's
 * no-coexisting-old/new-UI convention.
 */
export const THEME_READY_ROUTE_PREFIXES: string[] = ["/", "/words", "/review", "/plan", "/exam-take"];

export function isThemeReadyRoute(pathname: string): boolean {
  return THEME_READY_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
