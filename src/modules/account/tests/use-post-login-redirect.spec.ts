/**
 * `use-post-login-redirect.ts` — `?continue=` must be a single, same-origin path. A
 * repeated query param (`route.query.continue` then an array) or a protocol-relative one
 * (`//evil.example`, which a browser follows off-site) must fall back to `Home` instead of being
 * handed straight to `router.push`.
 */
import { describe, expect, it, vi } from 'vitest';

const push = vi.fn(() => Promise.resolve());
const currentRoute = { query: {} as Record<string, unknown> };

vi.mock('vue-router', () => ({
    useRoute: () => currentRoute,
    useRouter: () => ({ push })
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ locale: { value: 'en' } })
}));

vi.mock('@/infrastructure/i18n', () => ({
    changeLanguage: vi.fn(() => Promise.resolve()),
    supportedLanguages: ['en', 'it']
}));

vi.mock('@/infrastructure/i18n/router-link.ts', () => ({
    routerLinkI18n: (location: unknown) => location
}));

vi.mock('@/modules/account/stores/profile.ts', () => ({
    useProfileStore: () => ({ profile: undefined })
}));

const { usePostLoginRedirect } =
    await import('@/modules/account/composables/use-post-login-redirect.ts');

describe('redirectAfterLogin', () => {
    it('navigates to a same-origin continue path', () => {
        currentRoute.query = { continue: '/cart' };

        return usePostLoginRedirect()
            .redirectAfterLogin()
            .then(() => {
                expect(push).toHaveBeenCalledWith({ path: '/cart' });
            });
    });

    it('falls back to Home when continue is absent', () => {
        currentRoute.query = {};

        return usePostLoginRedirect()
            .redirectAfterLogin()
            .then(() => {
                expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'Home' }));
            });
    });

    it('falls back to Home for a repeated continue param (an array, not a string)', () => {
        currentRoute.query = { continue: ['/cart', '/checkout'] };

        return usePostLoginRedirect()
            .redirectAfterLogin()
            .then(() => {
                expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'Home' }));
            });
    });

    /** The open-redirect this guards: `//evil.example` is followed off-site by a browser. */
    it('falls back to Home for a protocol-relative continue', () => {
        currentRoute.query = { continue: '//evil.example' };

        return usePostLoginRedirect()
            .redirectAfterLogin()
            .then(() => {
                expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'Home' }));
            });
    });

    it('falls back to Home for an absolute URL continue', () => {
        currentRoute.query = { continue: 'https://evil.example/phish' };

        return usePostLoginRedirect()
            .redirectAfterLogin()
            .then(() => {
                expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'Home' }));
            });
    });
});
