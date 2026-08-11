/**
 * The only module in this app allowed to touch `console`.
 *
 * `no-console` is an error everywhere else, with the single exemption below. One boundary is what
 * lets that rule be an error rather than a warning nobody acts on.
 *
 * ── Two axes ──────────────────────────────────────────────────────────────────────────────────
 * Output is governed by a level and a scope list, which is the model the paired backend uses for
 * the half it needs. A boolean per feature does not scale: each new noisy area costs a variable, a
 * README row and its own copy of the guard expression, and none of them govern the console calls
 * that were never given a flag.
 *
 *   - **`VITE_APP_LOG_LEVEL`** — `error` | `warn` | `info` | `debug`. The same ladder and the same
 *     names as the backend's `NODE_LOG_LEVEL`, so one mental model covers both repos. Defaults to
 *     `debug` in development and `warn` in production, mirroring that side's `debug`/`info` split.
 *
 *   - **`VITE_APP_LOG_SCOPES`** — a comma-separated list of areas, or `*` for all. Severity and
 *     volume are genuinely different questions: a trace on every navigation is noisy without being
 *     low-severity, so no level alone can silence just that one. Scopes answer "which area", levels
 *     answer "how bad".
 *
 * Scopes filter `debug` and `info` only. A `warn` or an `error` is never withheld because its area
 * was not opted into — the one thing you always want to see is the thing that went wrong.
 *
 * ── Production ────────────────────────────────────────────────────────────────────────────────
 * The default `warn` leaves `debug`/`info` silent in a production bundle. `error` deliberately
 * still reaches the console there, because Faro's `getWebInstrumentations()` captures console
 * errors and ships them — so this module needs no dependency on the observability store, and a
 * failure during bootstrap (before Faro is even initialised) still leaves a trace in the browser.
 */

/** Severity, most severe first. Position in this array IS the ordering. */
const LEVELS = ['error', 'warn', 'info', 'debug'] as const;

export type TLogLevel = (typeof LEVELS)[number];

/**
 * The area a message belongs to, matched against `VITE_APP_LOG_SCOPES`.
 *
 * A closed union rather than a free string, so a typo is a compile error instead of a message that
 * silently never appears. Add an area here when you add one.
 */
export type TLogScope = 'router' | 'http' | 'observability' | 'demo';

/**
 * The configured ceiling. Anything more verbose than this is dropped.
 *
 * An unrecognised value falls back to the environment default rather than silencing everything: a
 * typo in an env var must not be the reason an error went unseen.
 */
const resolveLevel = (): TLogLevel => {
    const configured = (import.meta.env.VITE_APP_LOG_LEVEL as string | undefined)?.trim();
    if (configured && (LEVELS as readonly string[]).includes(configured))
        return configured as TLogLevel;
    return import.meta.env.DEV ? 'debug' : 'warn';
};

/**
 * The opted-in areas. Empty is the default and means no scoped output at all: a per-navigation or
 * per-request trace is worth having available and not worth paying for unasked.
 */
const resolveScopes = (): Set<string> => {
    const configured = (import.meta.env.VITE_APP_LOG_SCOPES as string | undefined)?.trim();
    if (!configured) return new Set();
    return new Set(
        configured
            .split(',')
            .map((scope) => scope.trim())
            .filter(Boolean)
    );
};

const level = resolveLevel();
const scopes = resolveScopes();

/** Whether `candidate` is at or above the configured ceiling. */
const meetsLevel = (candidate: TLogLevel): boolean =>
    LEVELS.indexOf(candidate) <= LEVELS.indexOf(level);

/** Whether this area was opted into. `*` enables every area, present and future. */
const inScope = (scope: TLogScope): boolean => scopes.has('*') || scopes.has(scope);

/**
 * Area-scoped, lowest-severity output: request traces, navigation traces, lifecycle chatter.
 *
 * @param scope - Which area this belongs to; must be listed in `VITE_APP_LOG_SCOPES` to appear.
 * @param parts - Anything `console.debug` accepts.
 */
export const debug = (scope: TLogScope, ...parts: unknown[]): void => {
    if (!meetsLevel('debug') || !inScope(scope)) return;
    // eslint-disable-next-line no-console -- this module is the single console boundary
    console.debug(`[${scope}]`, ...parts);
};

/**
 * Area-scoped, notable-but-not-wrong output.
 *
 * @param scope - Which area this belongs to; must be listed in `VITE_APP_LOG_SCOPES` to appear.
 * @param parts - Anything `console.info` accepts.
 */
export const info = (scope: TLogScope, ...parts: unknown[]): void => {
    if (!meetsLevel('info') || !inScope(scope)) return;
    // eslint-disable-next-line no-console -- this module is the single console boundary
    console.info(`[${scope}]`, ...parts);
};

/**
 * Something went wrong but the app carried on. Not scope-filtered.
 *
 * @param parts - Anything `console.warn` accepts.
 */
export const warn = (...parts: unknown[]): void => {
    if (!meetsLevel('warn')) return;
    // eslint-disable-next-line no-console -- this module is the single console boundary
    console.warn(...parts);
};

/**
 * Something went wrong. Not scope-filtered, and reaches production, where Faro ships it.
 *
 * @param parts - Anything `console.error` accepts.
 */
export const error = (...parts: unknown[]): void => {
    if (!meetsLevel('error')) return;
    // eslint-disable-next-line no-console -- this module is the single console boundary
    console.error(...parts);
};

/** Grouped export, for call sites that read better as `logger.debug(...)`. */
export const logger = { debug, info, warn, error };
