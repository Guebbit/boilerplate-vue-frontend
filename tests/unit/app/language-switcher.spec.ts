/**
 * `AppLanguageSwitcher` — a dedicated mount, rather than only the indirect one
 * `app-navigation.spec.ts` gets by mounting it as a child of `AppNavigation`. What is this
 * component's own job: one menu item per `supportedLanguages`, the active one marked, and picking
 * one re-enters the CURRENT route under the new locale (preserving params/query) rather than
 * switching in place — see the component's own docblock for why ordering matters there.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import AppLanguageSwitcher from '@/app/components/AppLanguageSwitcher.vue';
import vuetify from '@/ui/vuetify';

/** Stub for the router's `replace`. */
const replace = vi.fn().mockResolvedValue(undefined);

/** Stub for the router's `push`. */
const push = vi.fn().mockResolvedValue(undefined);

/** The mocked current route, with a param and a query the switch must keep. */
const currentRoute = { params: { id: '42' }, query: { tab: 'details' } };

/** Stub for `persistLocalePreference`. */
const persistLocalePreference = vi.fn<(locale: string) => unknown>();

/** The languages the caller is previewing as drafts; `isDraftLanguage` reads it. */
const drafts = vi.hoisted(() => new Set<string>());

vi.mock('@/infrastructure/locale-overrides.ts', () => ({
    isDraftLanguage: (tag: string) => drafts.has(tag)
}));

vi.mock('vue-router', () => ({
    useRoute: () => currentRoute,
    useRouter: () => ({ replace, push })
}));

vi.mock('@/infrastructure/locale-preference.ts', () => ({
    persistLocalePreference: (locale: string) => persistLocalePreference(locale)
}));

vi.mock('vue-i18n', async (importOriginal) => {
    const actual = await importOriginal<typeof import('vue-i18n')>();
    return {
        ...actual,
        useI18n: () => ({
            t: (key: string) => key,
            te: () => false,
            locale: ref('en')
        })
    };
});

/*
 * `v-menu` teleports its content and renders it lazily, on open — stubbed the same way
 * `app-navigation.spec.ts` stubs it, so the language options are in the DOM to assert against
 * without first having to open the real menu.
 */
const mountSwitcher = () =>
    mount(AppLanguageSwitcher, {
        global: {
            plugins: [vuetify],
            stubs: {
                VMenu: {
                    template:
                        '<div data-test="menu"><slot name="activator" :props="{}" /><slot /></div>'
                }
            }
        }
    });

describe('AppLanguageSwitcher', () => {
    beforeEach(() => {
        drafts.clear();
        persistLocalePreference.mockClear();
    });

    it('offers one option per supported language, in a menu of role="menu"', () => {
        const switcher = mountSwitcher();

        expect(switcher.find('[role="menu"]').exists()).toBe(true);
        expect(switcher.find('[data-test="language-option-en"]').exists()).toBe(true);
        expect(switcher.find('[data-test="language-option-it"]').exists()).toBe(true);
    });

    it("marks the active locale's option with aria-current", () => {
        const switcher = mountSwitcher();

        expect(switcher.get('[data-test="language-option-en"]').attributes('aria-current')).toBe(
            'true'
        );
        expect(
            switcher.get('[data-test="language-option-it"]').attributes('aria-current')
        ).toBeUndefined();
    });

    it("re-enters the current route under the new locale, keeping the route's own params and query", () =>
        mountSwitcher()
            .get('[data-test="language-option-it"]')
            .trigger('click')
            .then(() => {
                expect(persistLocalePreference).toHaveBeenCalledWith('it');
                expect(replace).toHaveBeenCalledWith({
                    params: { id: '42', locale: 'it' },
                    query: { tab: 'details' }
                });
            }));

    it('falls back to Home when the locale-prefixed replace navigation fails', () => {
        replace.mockRejectedValueOnce(new Error('no matching route'));

        return mountSwitcher()
            .get('[data-test="language-option-it"]')
            .trigger('click')
            .then(() => vi.waitFor(() => expect(push).toHaveBeenCalledWith('/')));
    });

    it("labels the trigger button with the language name and the current locale's code", () => {
        const button = mountSwitcher().get('[data-test="language-switcher"]');

        expect(button.text()).toContain('EN');
        expect(button.attributes('aria-label')).toBe('navigation.label-language: EN');
    });

    it('labels a draft option "(draft)" in the viewer\'s language, and a live option not', () => {
        drafts.add('it');
        const switcher = mountSwitcher();

        const marker = switcher.get('[data-test="language-draft-it"]');
        expect(marker.text()).toBe('navigation.label-draft-language');
        expect(marker.attributes('lang')).toBe('en');
        expect(switcher.find('[data-test="language-draft-en"]').exists()).toBe(false);
    });

    it('shows the draft cue on the bar button while a draft is the active language', () => {
        drafts.add('en');
        const button = mountSwitcher().get('[data-test="language-switcher"]');

        expect(button.find('[data-test="language-draft-cue"]').exists()).toBe(true);
        expect(button.attributes('aria-label')).toBe(
            'navigation.label-language: EN navigation.label-draft-language'
        );
    });

    it('previews a draft for the session: the choice is not saved on the account', () => {
        drafts.add('it');

        return mountSwitcher()
            .get('[data-test="language-option-it"]')
            .trigger('click')
            .then(() => {
                expect(replace).toHaveBeenCalled();
                expect(persistLocalePreference).not.toHaveBeenCalled();
            });
    });
});
