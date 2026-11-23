/**
 * @module
 * Which staff page shows a record, for the three readers that name records they do not own: the
 * tasks inbox (task link types), the audit log (target types) and the notification bell (parked
 * event families). The enabled modules' `recordRoutes`, `auditTargets` and `eventTargets` are
 * installed once at boot (`main.ts`), the way `inbox-notices.ts` installs the notices, because the
 * kernel may not import `@/modules` and those readers may not import the modules that own the
 * records.
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

/**
 * Every enabled module's audit targets, by audit row target type.
 */
let registeredAuditTargets: Record<string, string> = {};

/**
 * Install the enabled modules' audit targets. Replaces rather than appends.
 *
 * @param targets - target type to route name, from `collectModuleAuditTargets`
 */
export const registerAuditTargets = (targets: Record<string, string>): void => {
    registeredAuditTargets = targets;
};

/**
 * The route name a module declared for an audit row's target type.
 *
 * @param type - The row's `targetType` (`order`).
 * @returns The route name, or `undefined` for a type no enabled module declares.
 */
export const auditTargetRouteOf = (type: string): string | undefined =>
    Object.hasOwn(registeredAuditTargets, type) ? registeredAuditTargets[type] : undefined;

/**
 * Every enabled module's event targets, by event family or exact event name. `false` marks an
 * event whose record is gone.
 */
let registeredEventTargets: Record<string, string | false> = {};

/**
 * Install the enabled modules' event targets. Replaces rather than appends.
 *
 * @param targets - family or event name to route name (or `false`), from `collectModuleEventTargets`
 */
export const registerEventTargets = (targets: Record<string, string | false>): void => {
    registeredEventTargets = targets;
};

/**
 * The route name of the page of the record a parked event was about. An exact event name wins over
 * its family, so a family's page can have gone-record exceptions.
 *
 * @param eventName - The event, `<family>.<what happened>`.
 * @returns The route name, or `undefined` for a record that is gone or a family no enabled module
 *  declares.
 */
export const eventTargetRouteOf = (eventName: string): string | undefined => {
    const declared = [eventName, eventName.split('.', 1)[0] ?? ''].find((key) =>
        Object.hasOwn(registeredEventTargets, key)
    );
    const route = declared === undefined ? undefined : registeredEventTargets[declared];
    return route || undefined;
};
