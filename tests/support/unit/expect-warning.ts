/**
 * A `[Vue warn]` fails the test that caused it, unless the test said it expects one.
 *
 * Vue (and Vuetify, whose deprecations go through Vue's `warn()`) report misuse as a console
 * warning, and a green run hides them. The watcher is started and finished around every test by
 * `setup.ts`; a spec only meets it through {@link expectWarning}.
 *
 * Only the `[Vue warn]` prefix counts. Not every `console.warn`/`console.error`: the app's logger
 * writes there, and error-path specs would fail for doing their job. `[intlify]` stays out too.
 * `@vue/reactivity` warns straight to the console, so a `warnHandler` alone would miss it.
 */

/** What a declared warning is matched against: a substring, or a pattern. */
export type WarningMatcher = string | RegExp;

/** The two console methods Vue's warnings arrive through. */
export type ConsoleTarget = Pick<Console, 'warn' | 'error'>;

/** The prefix every Vue (and Vuetify) warning starts with. */
const VUE_WARN_PREFIX = '[Vue warn]';

/** The methods wrapped; Vue warns through `warn`, and logs a handled error through `error`. */
const WATCHED = ['warn', 'error'] as const;

/**
 * Whether a warning satisfies a declared matcher.
 *
 * @param matcher - substring or pattern the test declared
 * @param warning - the warning's first console argument
 */
const matches = (matcher: WarningMatcher, warning: string): boolean =>
    typeof matcher === 'string' ? warning.includes(matcher) : matcher.test(warning);

/**
 * Watches a console for Vue warnings across one test.
 *
 * @param target - the console to wrap; a parameter so the watcher is testable against a fake
 * @returns `start` (before the test), `expect` (declare a warning), `finish` (after; throws)
 */
export const createWarningWatcher = (target: ConsoleTarget) => {
    /** Warnings seen since `start`. */
    let seen: string[] = [];

    /** Matchers the test declared. */
    let declared: WarningMatcher[] = [];

    /** The console methods as they were at `start`, put back at `finish`. */
    let originals: ConsoleTarget | undefined;

    /** Wraps one console method: record a Vue warning, then pass it on so it still prints. */
    const wrap = (kind: (typeof WATCHED)[number], original: ConsoleTarget[typeof kind]) => {
        target[kind] = (...arguments_: unknown[]) => {
            const first: unknown = arguments_[0];
            if (typeof first === 'string' && first.startsWith(VUE_WARN_PREFIX)) seen.push(first);
            original.apply(target, arguments_);
        };
    };

    return {
        /** Begins watching with an empty slate. */
        start: (): void => {
            seen = [];
            declared = [];
            originals = { warn: target.warn, error: target.error };
            for (const kind of WATCHED) wrap(kind, originals[kind]);
        },

        /** Declares that this test makes Vue warn; the warning must fire, or the test fails. */
        expect: (matcher: WarningMatcher): void => {
            declared.push(matcher);
        },

        /**
         * Stops watching and fails on any warning nobody declared, or any declaration that never fired.
         *
         * @throws {Error} Listing the unexpected warnings and the declarations that never fired.
         */
        finish: (): void => {
            if (originals) Object.assign(target, originals);
            originals = undefined;

            const unexpected = seen.filter((warning) => !declared.some((m) => matches(m, warning)));
            const unfired = declared.filter((m) => !seen.some((warning) => matches(m, warning)));
            if (unexpected.length === 0 && unfired.length === 0) return;

            throw new Error(
                [
                    ...unexpected.map((warning) => `Unexpected Vue warning: ${warning}`),
                    ...unfired.map((m) => `Declared Vue warning never fired: ${String(m)}`)
                ].join('\n')
            );
        }
    };
};

/** The one watcher `setup.ts` runs around every test. */
export const warnings = createWarningWatcher(console);

/**
 * Declares that the running test makes Vue warn, and that is the point of it.
 * Call it in the test (or its `beforeEach`). The warning must fire, so a stale declaration fails.
 *
 * @param matcher - a substring or pattern of the warning text
 */
export const expectWarning = (matcher: WarningMatcher): void => {
    warnings.expect(matcher);
};
