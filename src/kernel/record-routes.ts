/**
 * @module
 * Which staff page shows each kind of record a task links to. The enabled modules' `recordRoutes`
 * are installed once at boot (`main.ts`), the way `inbox-notices.ts` installs the notices, because
 * the kernel may not import `@/modules` and `tasks` may not import the modules that own the records.
 */

/**
 * Every enabled module's record routes, by task link type.
 */
let registeredRoutes: Record<string, string> = {};

/**
 * Install the enabled modules' record routes. Replaces rather than appends. Skip it and no task
 * links to its record.
 *
 * @param routes - link type to route name, from `collectModuleRecordRoutes`
 */
export const registerRecordRoutes = (routes: Record<string, string>): void => {
    registeredRoutes = routes;
};

/**
 * The route name a module declared for a task link type.
 *
 * @param type - The task link's type (`order`).
 * @returns The route name, or `undefined` for a type no enabled module declares.
 */
export const recordRouteOf = (type: string): string | undefined =>
    Object.hasOwn(registeredRoutes, type) ? registeredRoutes[type] : undefined;
