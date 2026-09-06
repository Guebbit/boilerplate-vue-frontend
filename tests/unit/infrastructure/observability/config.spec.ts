/**
 * @module
 * `src/infrastructure/observability/config.ts` — the two env readers and the origin escaper.
 *
 * Every case here is a `VITE_*` variable stubbed per test: the readers are pure, so the only way
 * to reach their fallbacks and their two opt-out branches is to control the environment. The
 * `ignoreUrls` assertions matter most — a telemetry transport that instruments itself produces
 * traces about nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    originToRegExp,
    readFaroConfig,
    readUmamiConfig
} from '@/infrastructure/observability/config';

/**
 * The variables these readers look at, blanked before each test so no case inherits another's
 * environment — or the checkout's real `.env`, which sets most of them.
 */
const TELEMETRY_VARIABLES = [
    'VITE_FARO_URL',
    'VITE_FARO_APP_NAME',
    'VITE_FARO_APP_VERSION',
    'VITE_FARO_ENVIRONMENT',
    'VITE_API_URL',
    'VITE_UMAMI_SRC',
    'VITE_UMAMI_WEBSITE_ID'
] as const;

beforeEach(() => {
    for (const variable of TELEMETRY_VARIABLES) vi.stubEnv(variable, '');
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('originToRegExp', () => {
    it('anchors at the start of the URL', () => {
        const pattern = originToRegExp('http://localhost:3000');

        expect(pattern.test('http://localhost:3000/orders')).toBe(true);
        // Unanchored, this would match — and Faro would stop instrumenting an unrelated API.
        expect(pattern.test('http://example.com/http://localhost:3000')).toBe(false);
    });

    /**
     * A dot is a regex wildcard, so an unescaped origin would also match a look-alike host that
     * differs only where the dot is.
     */
    it('escapes regex metacharacters in the origin', () => {
        const pattern = originToRegExp('https://api.example.com');

        expect(pattern.test('https://api.example.com/v1')).toBe(true);
        expect(pattern.test('https://apiXexample.com/v1')).toBe(false);
    });

    it.each(['+', '*', '?', '(', ')', '[', ']', '{', '}', '^', '$', '|'])(
        'treats %s as a literal',
        (character) => {
            const origin = `https://host${character}name`;

            expect(originToRegExp(origin).test(`${origin}/path`)).toBe(true);
        }
    );
});

describe('readUmamiConfig', () => {
    it('is undefined without a website id, which disables analytics entirely', () => {
        expect(readUmamiConfig()).toBeUndefined();
    });

    it('treats a blank website id as unset', () => {
        vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '   ');

        expect(readUmamiConfig()).toBeUndefined();
    });

    it('defaults the script src when only the website id is set', () => {
        vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');

        expect(readUmamiConfig()).toEqual({
            src: 'http://localhost:3080/script.js',
            websiteId: 'site-1'
        });
    });

    it('trims both values and keeps an explicit src', () => {
        vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '  site-2  ');
        vi.stubEnv('VITE_UMAMI_SRC', '  https://umami.example.com/s.js  ');

        expect(readUmamiConfig()).toEqual({
            src: 'https://umami.example.com/s.js',
            websiteId: 'site-2'
        });
    });
});

describe('readFaroConfig', () => {
    it('is undefined without a collector URL, which disables Faro entirely', () => {
        expect(readFaroConfig()).toBeUndefined();
    });

    it('treats a blank collector URL as unset', () => {
        vi.stubEnv('VITE_FARO_URL', '  ');

        expect(readFaroConfig()).toBeUndefined();
    });

    it('falls back to defaults for every optional value', () => {
        vi.stubEnv('VITE_FARO_URL', 'http://collector/collect');

        expect(readFaroConfig()).toEqual({
            url: 'http://collector/collect',
            appName: 'frontend',
            appVersion: '1.0.0',
            environment: import.meta.env.MODE,
            apiOrigin: 'http://localhost:3000',
            ignoreUrls: ['http://collector/collect']
        });
    });

    it('prefers explicit values over the defaults', () => {
        vi.stubEnv('VITE_FARO_URL', 'http://collector/collect');
        vi.stubEnv('VITE_FARO_APP_NAME', 'shop');
        vi.stubEnv('VITE_FARO_APP_VERSION', '2.4.0');
        vi.stubEnv('VITE_FARO_ENVIRONMENT', 'staging');
        vi.stubEnv('VITE_API_URL', 'https://api.example.com');

        expect(readFaroConfig()).toMatchObject({
            appName: 'shop',
            appVersion: '2.4.0',
            environment: 'staging',
            apiOrigin: 'https://api.example.com'
        });
    });

    /**
     * The collector's own URL is compared for EXACT equality by Faro, never as a prefix — which
     * is why it is a string here and Umami's origin is not.
     */
    it('ignores its own collector URL as an exact string', () => {
        vi.stubEnv('VITE_FARO_URL', 'http://collector/collect');

        expect(readFaroConfig()!.ignoreUrls).toEqual(['http://collector/collect']);
    });

    /**
     * Umami's beacon goes to `/api/send` under the configured origin, never to the script URL, so
     * excluding the exact `src` would miss every request that actually gets sent.
     */
    it('ignores the whole Umami origin, not just its script URL', () => {
        vi.stubEnv('VITE_FARO_URL', 'http://collector/collect');
        vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');
        vi.stubEnv('VITE_UMAMI_SRC', 'https://umami.example.com/script.js');

        const [collector, umami] = readFaroConfig()!.ignoreUrls;

        expect(collector).toBe('http://collector/collect');
        expect(umami).toBeInstanceOf(RegExp);
        expect((umami as RegExp).test('https://umami.example.com/api/send')).toBe(true);
    });

    it('excludes nothing for Umami when analytics is off', () => {
        vi.stubEnv('VITE_FARO_URL', 'http://collector/collect');
        vi.stubEnv('VITE_UMAMI_SRC', 'https://umami.example.com/script.js');

        // No website id, so `readUmamiConfig` is undefined and the src is never consulted.
        expect(readFaroConfig()!.ignoreUrls).toEqual(['http://collector/collect']);
    });

    /**
     * Matched rather than parsed: `new URL()` throws on a malformed value, and a half-filled
     * `VITE_UMAMI_SRC` must not take Faro's whole configuration down with it.
     */
    it('survives an Umami src with no recognisable origin', () => {
        vi.stubEnv('VITE_FARO_URL', 'http://collector/collect');
        vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');
        vi.stubEnv('VITE_UMAMI_SRC', 'not-a-url');

        expect(readFaroConfig()!.ignoreUrls).toEqual(['http://collector/collect']);
    });
});
