/**
 * @module
 * A route location bound only when the module system actually resolves the name — the module-
 * system-generic guard a module uses to reach a SIBLING's route by name: that reach is a
 * dependency `MODULE_EDGES` cannot see, so `router.hasRoute` is what stands between it and
 * `vue-router`'s own throw on an unresolved name. Lives in `kernel`, not `src/app`, because it
 * knows nothing about THIS app's own routes — only the module system's `hasRoute` contract — and a
 * module may reach kernel but never `src/app` (the module-boundary rules in `eslint.config.ts`).
 */
import type { LocationQueryRaw, RouteParamsRawGeneric } from 'vue-router';

/**
 * A route location naming `name`, or `undefined` when this build ships no such route — a caller
 * decides what "nowhere to go" means for it: hide the link, or fall back to a route it knows for
 * certain exists (usually `Home`).
 *
 * A `MODULE_EDGES`-declared reach (`cart` → `products`'s `ProductsList`) does not need this: the
 * coupling is already reviewed and visible, so a missing route there is a deployment choice made
 * with the risk understood, not a silent landmine.
 *
 * @param router - The active router, for the `hasRoute` check.
 * @param name - The route name a sibling module owns.
 * @param parameters - The location's own path params, e.g. `{ id }`.
 * @param query - The location's own query params, e.g. `{ target: id }` — `AuditLog`'s own shape,
 *  which carries no path param at all. Both are omitted from the result along with `name` when
 *  the route does not resolve, since there is then nothing to link to at all.
 * @returns A location naming `name`, or `undefined` when this build ships no such route.
 */
export const linkIfRouted = (
    router: { hasRoute: (name: string) => boolean },
    name: string,
    parameters?: RouteParamsRawGeneric,
    query?: LocationQueryRaw
): { name: string; params?: RouteParamsRawGeneric; query?: LocationQueryRaw } | undefined =>
    router.hasRoute(name)
        ? { name, ...(parameters && { params: parameters }), ...(query && { query }) }
        : undefined;
