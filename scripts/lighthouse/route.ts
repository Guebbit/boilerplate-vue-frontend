/**
 * @module
 * Resolving a case's route: `{subject:product.rich}` becomes that row's id from the backend's
 * `/__test/scenario`. Pure.
 */

/** Matches `{subject:<guarantee name>}`. */
const PLACEHOLDER = /{subject:([^}]+)}/g;

/**
 * Fills every `{subject:x}` in `route`.
 *
 * @param route - a case's route
 * @param subjects - guarantee name → row id, from the backend
 * @throws when a placeholder names a subject the backend does not publish, naming the ones it does
 */
export const resolveRoute = (route: string, subjects: Readonly<Record<string, string>>): string =>
    route.replaceAll(PLACEHOLDER, (_match, name: string) => {
        const id = (subjects as Partial<Record<string, string>>)[name];
        if (id === undefined)
            throw new Error(
                `route ${route} names subject "${name}", which the backend does not publish ` +
                    `(published: ${Object.keys(subjects).join(', ') || 'none'})`
            );
        return id;
    });
