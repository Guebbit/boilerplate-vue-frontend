/**
 * `src/app/utils/branding.ts` — the two values a derived project changes to look like its own.
 * Each reads a deployment value with a build-time fallback, and the logo resolves a path against
 * the app's base so a sub-path deployment still finds it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { brandLogoSource, brandName } from '@/app/utils/branding.ts';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('brandName', () => {
    it('is Guebbit until a deployment names itself', () => {
        expect(brandName()).toBe('Guebbit');
    });

    it('prefers the running container’s value to the build-time one', () => {
        vi.stubEnv('VITE_APP_NAME', 'Build Shop');
        vi.stubGlobal('__APP_CONFIG', { APP_NAME: 'Runtime Shop' });

        expect(brandName()).toBe('Runtime Shop');
    });

    it('falls back to the build-time value', () => {
        vi.stubEnv('VITE_APP_NAME', 'Build Shop');

        expect(brandName()).toBe('Build Shop');
    });
});

describe('brandLogoSource', () => {
    it('serves the bundled logo from under the base when none is configured', () => {
        expect(brandLogoSource('/app/')).toBe('/app/images/guebbit-logo-colored.png');
    });

    it('resolves a configured path against the base, whatever leading slashes it carries', () => {
        vi.stubEnv('VITE_APP_LOGO', '/images/acme.svg');

        expect(brandLogoSource('/app/')).toBe('/app/images/acme.svg');
    });

    it.each(['https://cdn.example/logo.png', '//cdn.example/logo.png', 'data:image/png;base64,AA'])(
        'uses a complete URL as it is: %s',
        (url) => {
            vi.stubGlobal('__APP_CONFIG', { APP_LOGO: url });

            expect(brandLogoSource('/app/')).toBe(url);
        }
    );
});
