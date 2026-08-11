/**
 * The console boundary — `src/utils/logger.ts`.
 *
 * Worth its own cases because everything else in the app now routes through it: a level or scope
 * comparison that is wrong one way silences an error, and wrong the other way ships per-navigation
 * noise to a production console. Neither is visible from a call site.
 *
 * The module reads its configuration ONCE, at import, so every case stubs the environment and then
 * imports it fresh. That is also the property being pinned — reading per call would let a stale
 * `.env` change behaviour halfway through a session.
 *
 * Every case stubs `VITE_APP_LOG_LEVEL` explicitly, including the cases about its DEFAULT: Vite
 * loads the developer's own `.env` into `import.meta.env`, so a case that simply omits the variable
 * would assert against whatever happens to be in that file rather than against the fallback.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Imports a fresh logger with the given environment. */
const loadLogger = (env: Record<string, unknown>) => {
    vi.resetModules();
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value as string);
    return import('@/utils/logger');
};

let spies: Record<'debug' | 'info' | 'warn' | 'error', ReturnType<typeof vi.spyOn>>;

beforeEach(() => {
    spies = {
        debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
        info: vi.spyOn(console, 'info').mockImplementation(() => {}),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
});

afterEach(() => {
    for (const spy of Object.values(spies)) spy.mockRestore();
    vi.unstubAllEnvs();
});

describe('scope filtering', () => {
    it('emits a debug message for a scope that was opted into', () =>
        loadLogger({ DEV: true, VITE_APP_LOG_SCOPES: 'router' }).then(({ logger }) => {
            logger.debug('router', 'navigating');

            expect(spies.debug).toHaveBeenCalled();
        }));

    it('drops a debug message for a scope that was not', () =>
        loadLogger({ DEV: true, VITE_APP_LOG_SCOPES: 'http' }).then(({ logger }) => {
            logger.debug('router', 'navigating');

            expect(spies.debug).not.toHaveBeenCalled();
        }));

    it('drops every scope when none are configured, which is the default', () =>
        loadLogger({ DEV: true, VITE_APP_LOG_SCOPES: '' }).then(({ logger }) => {
            logger.debug('router', 'navigating');
            logger.debug('http', 'requesting');

            expect(spies.debug).not.toHaveBeenCalled();
        }));

    it('enables every scope for `*`', () =>
        loadLogger({ DEV: true, VITE_APP_LOG_SCOPES: '*' }).then(({ logger }) => {
            logger.debug('router', 'a');
            logger.debug('demo', 'b');

            expect(spies.debug).toHaveBeenCalledTimes(2);
        }));

    it('tolerates spaces and trailing commas in the list', () =>
        loadLogger({ DEV: true, VITE_APP_LOG_SCOPES: ' router , http , ' }).then(({ logger }) => {
            logger.debug('router', 'a');
            logger.debug('http', 'b');

            expect(spies.debug).toHaveBeenCalledTimes(2);
        }));

    it('prefixes the scope, so a shared console says which area spoke', () =>
        loadLogger({ DEV: true, VITE_APP_LOG_SCOPES: 'router' }).then(({ logger }) => {
            logger.debug('router', 'navigating');

            expect(spies.debug).toHaveBeenCalledWith('[router]', 'navigating');
        }));

    it('never withholds a warning or an error for being out of scope', () =>
        loadLogger({ DEV: true, VITE_APP_LOG_SCOPES: '' }).then(({ logger }) => {
            // The one thing you always want to see is the thing that went wrong.
            logger.warn('careful');
            logger.error('broken');

            expect(spies.warn).toHaveBeenCalledWith('careful');
            expect(spies.error).toHaveBeenCalledWith('broken');
        }));
});

describe('level filtering', () => {
    it('drops everything below the configured level', () =>
        loadLogger({ DEV: true, VITE_APP_LOG_LEVEL: 'warn', VITE_APP_LOG_SCOPES: '*' }).then(
            ({ logger }) => {
                logger.debug('router', 'a');
                logger.info('router', 'b');
                logger.warn('c');
                logger.error('d');

                expect(spies.debug).not.toHaveBeenCalled();
                expect(spies.info).not.toHaveBeenCalled();
                expect(spies.warn).toHaveBeenCalled();
                expect(spies.error).toHaveBeenCalled();
            }
        ));

    it('silences all but errors at `error`', () =>
        loadLogger({ DEV: true, VITE_APP_LOG_LEVEL: 'error', VITE_APP_LOG_SCOPES: '*' }).then(
            ({ logger }) => {
                logger.warn('c');
                logger.error('d');

                expect(spies.warn).not.toHaveBeenCalled();
                expect(spies.error).toHaveBeenCalled();
            }
        ));

    it('defaults to debug in development', () =>
        loadLogger({ DEV: true, VITE_APP_LOG_LEVEL: '', VITE_APP_LOG_SCOPES: '*' }).then(
            ({ logger }) => {
                logger.debug('router', 'a');

                expect(spies.debug).toHaveBeenCalled();
            }
        ));

    it('defaults to warn in production, so a bundle carries no traces', () =>
        loadLogger({ DEV: false, VITE_APP_LOG_LEVEL: '', VITE_APP_LOG_SCOPES: '*' }).then(
            ({ logger }) => {
                logger.debug('router', 'a');
                logger.info('router', 'b');
                logger.warn('c');

                expect(spies.debug).not.toHaveBeenCalled();
                expect(spies.info).not.toHaveBeenCalled();
                expect(spies.warn).toHaveBeenCalled();
            }
        ));

    it('still reports errors in production, where Faro ships them', () =>
        loadLogger({ DEV: false, VITE_APP_LOG_LEVEL: '' }).then(({ logger }) => {
            logger.error('broken');

            expect(spies.error).toHaveBeenCalledWith('broken');
        }));

    it('falls back to the environment default for an unrecognised level', () =>
        loadLogger({ DEV: true, VITE_APP_LOG_LEVEL: 'lowd', VITE_APP_LOG_SCOPES: '*' }).then(
            ({ logger }) => {
                // A typo in an env var must not be the reason an error went unseen, so it degrades
                // to the default rather than to silence.
                logger.debug('router', 'a');
                logger.error('broken');

                expect(spies.debug).toHaveBeenCalled();
                expect(spies.error).toHaveBeenCalled();
            }
        ));
});
