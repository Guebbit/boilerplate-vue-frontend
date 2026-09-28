/**
 * `AppLanguageSwitcher` (FA131) — a dedicated mount, rather than only the indirect one
 * `app-navigation.spec.ts` gets by mounting it as a child of `AppNavigation`. What is this
 * component's own job: one menu item per `supportedLanguages`, the active one marked, and picking
 * one re-enters the CURRENT route under the new locale (preserving params/query) rather than
 * switching in place — see the component's own docblock for why ordering matters there.
 */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import AppLanguageSwitcher from '@/app/components/AppLanguageSwitcher.vue';
import vuetify from '@/ui/vuetify';

const replace = vi.fn().mockResolvedValue(undefined);
const push = vi.fn().mockResolvedValue(undefined);
const currentRoute = { params: { id: '42' }, query: { tab: 'details' } };
const persistLocalePreference = vi.fn();

vi.mock('vue-router', () => ({
    useRoute: () => currentRoute,
    useRouter: () => ({ replace, push })
}));

vi.mock('@/infrastructure/session.ts', () => ({
    useSessionStore: () => ({ persistLocalePreference })
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
});
