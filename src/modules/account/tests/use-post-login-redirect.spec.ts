/**
 * `use-post-login-redirect.ts` — `?continue=` must be a single, same-origin path. A
 * repeated query param (`route.query.continue` then an array) or a protocol-relative one
 * (`//evil.example`, which a browser follows off-site) must fall back to `Home` instead of being
 * handed straight to `router.push`.
 *
 * A saved language preference must be applied by ROUTING to it, never by activating the i18n
 * runtime directly here — `localeChoice` is the one place that loads a locale's dictionary
 * (bundle plus any edited overrides), and a caller that activates first makes every switch look
 * like no switch at all to that guard (FA26). Every case below asserts `changeLanguage` was never
 * called, not only that navigation happened.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn(() => Promise.resolve());
const currentRoute = { query: {} as Record<string, unknown> };
const changeLanguageMock = vi.fn(() => Promise.resolve());
/** Mutable so a single test can simulate a signed-in profile with a saved locale. */
const profileState: { profile: { locale?: string } | undefined } = { profile: undefined };

vi.mock('vue-router', () => ({
    useRoute: () => currentRoute,
    useRouter: () => ({ push })
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ locale: { value: 'en' } })
}));

vi.mock('@/i18n', () => ({
    changeLanguage: changeLanguageMock,
    supportedLanguages: ['en', 'it']
}));

vi.mock('@/i18n/router-link.ts', () => ({
    routerLinkI18n: (location: unknown) => location
}));

vi.mock('@/modules/account/stores/profile.ts', () => ({
    useProfileStore: () => profileState
}));

const { usePostLoginRedirect } =
    await import('@/modules/account/composables/use-post-login-redirect.ts');

describe('redirectAfterLogin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        profileState.profile = undefined;
    });

    it('navigates to a same-origin continue path', () => {
        currentRoute.query = { continue: '/cart' };

        return usePostLoginRedirect()
            .redirectAfterLogin()
            .then(() => {
                expect(push).toHaveBeenCalledWith({ path: '/cart' });
                expect(changeLanguageMock).not.toHaveBeenCalled();
            });
    });

    it('falls back to Home when continue is absent', () => {
        currentRoute.query = {};

        return usePostLoginRedirect()
            .redirectAfterLogin()
            .then(() => {
                expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'Home' }));
                expect(changeLanguageMock).not.toHaveBeenCalled();
            });
    });

    /**
     * The regression FA26 fixes: activating the language here, before navigating, made the guard
     * see no change (the param it compares against was already flipped) and it never fetched the
     * locale's overrides. Routing with an explicit `params.locale` instead lets `localeChoice` do
     * that — this only proves the routing half, since the guard itself is `locale-choice.spec.ts`.
     */
    it('navigates to Home in the saved language preference, without activating it directly', () => {
        currentRoute.query = {};
        profileState.profile = { locale: 'it' };

        return usePostLoginRedirect()
            .redirectAfterLogin()
            .then(() => {
                expect(push).toHaveBeenCalledWith(
                    expect.objectContaining({ name: 'Home', params: { locale: 'it' } })
                );
                expect(changeLanguageMock).not.toHaveBeenCalled();
            });
    });

    it('does not touch the locale when the saved preference matches the active one', () => {
        currentRoute.query = {};
        profileState.profile = { locale: 'en' };

        return usePostLoginRedirect()
            .redirectAfterLogin()
            .then(() => {
                expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'Home' }));
                expect(push).not.toHaveBeenCalledWith(
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Vitest types a nested `expect.objectContaining()` as `any`, since it is a placeholder matcher usable against anything
                    expect.objectContaining({ params: expect.objectContaining({ locale: 'it' }) })
                );
            });
    });

    it('a ?continue= deep link keeps its own locale over the saved preference', () => {
        currentRoute.query = { continue: '/it/cart' };
        profileState.profile = { locale: 'en' };

        return usePostLoginRedirect()
            .redirectAfterLogin()
            .then(() => {
                expect(push).toHaveBeenCalledWith({ path: '/it/cart' });
                expect(changeLanguageMock).not.toHaveBeenCalled();
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
