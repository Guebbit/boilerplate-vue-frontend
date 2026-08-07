import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import Login from '@/features/account/views/Login.vue';
import { i18n, loadLocale } from '@/utils/i18n.ts';
import vuetify from '@/plugins/vuetify';
import enMessages from '@/locales/en.json';
import itMessages from '@/locales/it.json';

/**
 * One real view, end to end: the schema module, the composable, vue-i18n and the rendered
 * `v-text-field`. `tests/unit/features/schemas-i18n.spec.ts` proves the mechanism in isolation;
 * this proves a view is actually WIRED to it — `revalidateOn: locale` is easy to forget, and a
 * view that forgets it looks perfectly fine until someone switches language mid-form.
 *
 * vue-i18n is NOT mocked. A `t` stubbed to return its key would make both languages identical and
 * the assertion meaningless.
 */
vi.mock('vue-router', () => ({
    RouterLink: { template: '<a><slot /></a>' },
    useRoute: () => ({ fullPath: '/', params: {}, query: {} }),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}));

vi.mock('@/stores/profile.ts', () => ({
    useProfileStore: () => ({
        login: vi.fn(),
        isAuth: ref(false),
        isAdmin: ref(false),
        profile: ref(undefined)
    })
}));

const mountLogin = () =>
    mount(Login, {
        global: {
            plugins: [createPinia(), vuetify, i18n],
            stubs: {
                LayoutDefault: { template: '<div><slot /></div>' }
            }
        }
    });

const errorTexts = (wrapper: ReturnType<typeof mountLogin>) =>
    wrapper.findAll('.v-messages__message').map((node) => node.text());

describe('Login view, language switched mid-form', () => {
    beforeEach(() => loadLocale('en'));
    afterEach(() => loadLocale('en'));

    it('re-translates a displayed validation error', () => {
        const wrapper = mountLogin();

        return wrapper
            .get('input[type="email"]')
            .setValue('not-an-email')
            .then(() => wrapper.get('form').trigger('submit'))
            .then(() => nextTick())
            .then(() => {
                expect(errorTexts(wrapper)).toContain(enMessages['users-form']['email-invalid']);
                return loadLocale('it');
            })
            .then(() => nextTick())
            .then(() => {
                expect(errorTexts(wrapper)).toContain(itMessages['users-form']['email-invalid']);
                expect(errorTexts(wrapper)).not.toContain(
                    enMessages['users-form']['email-invalid']
                );
            });
    });

    it('does not put errors on a pristine form just because the language changed', () => {
        const wrapper = mountLogin();

        return loadLocale('it')
            .then(() => nextTick())
            .then(() => {
                expect(errorTexts(wrapper)).toEqual([]);
            });
    });
});
