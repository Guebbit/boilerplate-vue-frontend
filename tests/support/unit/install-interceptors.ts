/**
 * Registers the app's axios interceptors on the shared instance, for a spec that goes through
 * the real one. `src/main.ts` does this at boot; the http tier no longer does it on import (see
 * `src/infrastructure/http/install.ts`).
 *
 * Imported dynamically, so a spec that calls `vi.resetModules()` gets the fresh instance's
 * registry, not the previous case's.
 */

/** Wires every interceptor onto the current copy of the shared instance. */
export const installInterceptors = (): Promise<void> =>
    import('@/infrastructure/http/install.ts').then(({ installHttpInterceptors }) => {
        installHttpInterceptors();
    });
