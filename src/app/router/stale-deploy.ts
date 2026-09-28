/**
 * @module
 * Recovery from a stale deployed build: an open tab whose asset manifest a newer deploy already
 * replaced, so its next lazily-imported route chunk 404s. Vite reports that as a `vite:preloadError`
 * event on `globalThis`; the fix is simply to fetch the page fresh — but only once, so a build that is
 * ACTUALLY broken still reaches the error page instead of reloading forever.
 * https://vitejs.dev/guide/build.html#load-error-handling
 */

/**
 * `sessionStorage` key marking "this tab already retried once" — a full page load clears nothing
 * in `sessionStorage`, which is exactly why it, not a module-level flag, is what survives the
 * reload the first attempt performs.
 */
const RELOADED_ONCE_KEY = 'app:stale-deploy-reloaded';

/**
 * Whether the failure `router.onError` is handling right now started life as a Vite
 * `vite:preloadError` — set by {@link registerStaleDeployRecovery}'s listener, read and cleared by
 * {@link recoverFromStaleDeploy}. Module-level rather than passed as data because the two run at
 * different times off different triggers (a browser event; a router error) with no shared caller
 * to thread it through.
 */
let sawPreloadError = false;

/**
 * The minimal shape {@link registerStaleDeployRecovery} needs from its target — deliberately not
 * `typeof globalThis`'s own overloaded `addEventListener`, which pulls in the full DOM
 * `WindowEventMap` and leaves a test fixture with nothing simple to satisfy structurally.
 * `globalThis` matches this by having a more general one, which is the direction TypeScript
 * allows; a plain object literal in a test matches it by having exactly this one.
 */
export interface PreloadErrorSource {
    addEventListener: (
        type: 'vite:preloadError',
        listener: (event: { preventDefault: () => void }) => void
    ) => void;
}

/**
 * Listens for Vite's own `vite:preloadError`, marking the next {@link recoverFromStaleDeploy} call
 * as one worth actually reloading for.
 *
 * `preventDefault()` stops Vite's default rethrow into an unhandled rejection — the recovery
 * happens deliberately, in `router.onError`, where the failed navigation's own target path is
 * available; letting the default rethrow through as well would just report the same failure a
 * second time.
 *
 * @param target - `globalThis` in production; a stub {@link PreloadErrorSource} in tests.
 */
export const registerStaleDeployRecovery = (target: PreloadErrorSource): void => {
    target.addEventListener('vite:preloadError', (event) => {
        event.preventDefault();
        sawPreloadError = true;
    });
};

/**
 * Reloads the page once, if the last router error was a stale chunk and this session has not
 * already retried.
 *
 * @param fullPath - Where to reload to — the failed navigation's own target, so the retry lands
 *  where the visitor was actually headed rather than wherever the tab happens to be.
 * @param navigate - `location.assign` in production; a spy in tests.
 * @param storage - `sessionStorage` in production; an in-memory stub in tests.
 * @returns Whether a reload was performed — `router.onError` returns immediately when it did,
 *  skipping the generic error-page redirect below it.
 */
export const recoverFromStaleDeploy = (
    fullPath: string,
    navigate: (url: string) => void,
    storage: Pick<Storage, 'getItem' | 'setItem'>
): boolean => {
    const wasPreloadError = sawPreloadError;
    sawPreloadError = false;
    if (!wasPreloadError || storage.getItem(RELOADED_ONCE_KEY)) return false;

    storage.setItem(RELOADED_ONCE_KEY, '1');
    navigate(fullPath);
    return true;
};
