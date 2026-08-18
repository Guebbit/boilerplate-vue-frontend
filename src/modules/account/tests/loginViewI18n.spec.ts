import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import Login from '@/modules/account/views/Login.vue';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { usersSchema } from '@/modules/users';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wireModules.ts';

/*
 * Login is account's view, but the field rules it renders are users' — so the expected copy is
 * derived by parsing with `usersSchema` itself, taken from the users **barrel**. That the two
 * modules agree on one set of rules is the point of `account`'s `dependsOn: ['users']`.
 *
 * Reading users' locale JSON directly would be quicker and is what this spec did at first; lint
 * rejected it, correctly — a sibling's dictionary is an internal, and `@/modules/users` is the
 * whole surface account is entitled to. Parsing through the schema is also the better assertion:
 * it compares the rendered text to what the schema actually produces, rather than to a file that
 * might not be the one loaded.
 *
 * The wiring below is what puts those keys into the i18n instance at all; without it every
 * assertion here would compare a rendered key against a translation.
 */
wireModulesIntoCore();

/** The message `usersSchema` produces for an invalid email, in whatever locale is active. */
const emailInvalidMessage = () => {
    const [message] = (
        usersSchema.safeParse({ email: 'nope', username: 'ada' }).error?.issues ?? []
    )
        .filter(({ path }) => path[0] === 'email')
        .map(({ message: text }) => text);
    // A raw key here would mean the dictionaries never loaded, which would make every
    // assertion below vacuously true.
    expect(message).not.toContain('users-form.');
    return message;
};

/**
 * One real view, end to end: the schema module, the composable, vue-i18n and the rendered
 * `v-text-field`. `tests/cross-cutting/schemas-i18n.spec.ts` proves the mechanism in isolation;
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

vi.mock('@/infrastructure/profile.ts', () => ({
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
        let english = '';
        const wrapper = mountLogin();

        return wrapper
            .get('input[type="email"]')
            .setValue('not-an-email')
            .then(() => wrapper.get('form').trigger('submit'))
            .then(() => nextTick())
            .then(() => {
                english = emailInvalidMessage();
                expect(errorTexts(wrapper)).toContain(english);
                return loadLocale('it');
            })
            .then(() => nextTick())
            .then(() => {
                const italian = emailInvalidMessage();
                // Both halves matter: the Italian message is on screen AND the English one is
                // gone. Asserting only the first would pass on a field that renders both.
                expect(italian).not.toBe(english);
                expect(errorTexts(wrapper)).toContain(italian);
                expect(errorTexts(wrapper)).not.toContain(english);
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
