/**
 * @module
 * Mounts the real Signup page and proves the one new behaviour rung 3 adds: a solved `HumanCheck`
 * token reaches the wire as `x-antibot-challenge-token` on `POST /account/signup`. `HumanCheck`
 * itself is stubbed with a fixed token — its own branching (`none`/`altcha`/`turnstile`) is
 * `tests/unit/ui/human-check.spec.ts`'s job — and `auth-signup.spec.ts` already proves the store
 * forwards `options` unchanged, so this is only about the VIEW wiring the two together.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import Signup from '@/modules/account/views/Signup.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

vi.mock('vue-router', () => ({
    RouterLink: { template: '<a><slot /></a>' },
    useRoute: () => ({ fullPath: '/', params: {}, query: {} }),
    useRouter: () => ({ push: vi.fn() })
}));

/** The token a visitor would only have after solving the real widget. */
const SOLVED_TOKEN = 'solved-token-xyz';

/** Stands in for the real widget: exposes {@link SOLVED_TOKEN} as if already solved. */
const HumanCheckStub = {
    name: 'HumanCheck',
    template: '<div />',
    setup: () => ({ token: ref(SOLVED_TOKEN) })
};

/** Canned responses, keyed `${METHOD} ${url}` — both routes this page calls on mount/submit. */
let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) =>
        Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                responses[`${config.method} ${config.url}`]
            )
        )
    )
}));

/**
 * Every call the transport received, with `config` and `options` headers merged the same way the
 * REAL `orvalMutator` merges them (`{...options?.headers, ...config.headers}`) — the mock above
 * only reads `config` to pick a canned response, so a header attached through `options` (exactly
 * how `withAntibotToken` attaches this one) never reaches it otherwise.
 */
const calls = () =>
    vi.mocked(orvalMutator).mock.calls.map(([config, options]) => {
        const { url, headers } = config as { url: string; headers?: Record<string, string> };
        const optionHeaders = (options as { headers?: Record<string, string> } | undefined)
            ?.headers;
        return { url, headers: { ...optionHeaders, ...headers } };
    });

/**
 * The config `POST /account/signup` was actually sent with, or `undefined` if it was never called.
 */
const signupRequest = () => calls().findLast((call) => call.url === '/account/signup');

/**
 * Mounts the signup page with the real i18n and Vuetify; the human check is stubbed.
 */
const mountSignup = () =>
    mount(Signup, {
        global: {
            plugins: [vuetify, i18n],
            stubs: {
                HumanCheck: HumanCheckStub
            }
        }
    });

/**
 * A password that satisfies the form's strength rules.
 */
const VALID_PASSWORD = 'Str0ng!Passw0rd';

/**
 * Fills in a minimally valid signup form and submits it.
 *
 * @param wrapper - The mounted page.
 */
const fillAndSubmit = (wrapper: ReturnType<typeof mountSignup>) => {
    const passwordFields = wrapper.findAll('input[type=password]');
    return wrapper
        .get('input[type=email]')
        .setValue('ada@example.com')
        .then(() => passwordFields[0].setValue(VALID_PASSWORD))
        .then(() => passwordFields[1].setValue(VALID_PASSWORD))
        .then(() => wrapper.get('[data-test=signup-terms-accepted] input').setValue(true))
        .then(() => wrapper.get('form').trigger('submit'))
        .then(flushPromises);
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'GET /account/oauth/providers': orvalEnvelope({ providers: [] }),
        // A minimal `User`, matching `auth-signup.spec.ts`'s own fixture — `SignupResponse` needs
        // a real object under `data`, not the bodyless shape `orvalEnvelope()` defaults to.
        'POST /account/signup': orvalEnvelope({
            id: 'u1',
            username: 'ada',
            email: 'ada@example.com'
        })
    };
    return loadLocale('en');
});

describe('Signup — the antibot header', () => {
    it('attaches the solved HumanCheck token as x-antibot-challenge-token', () => {
        const wrapper = mountSignup();

        return fillAndSubmit(wrapper).then(() => {
            expect(signupRequest()?.headers?.['x-antibot-challenge-token']).toBe(SOLVED_TOKEN);
            // Typing the password above queued a breach check this spec doesn't otherwise care
            // about; without unmounting, its real 500ms debounce fires later — after this test's
            // own assertions, sometimes mid-way through a LATER spec — and needs a fixture this
            // one has no reason to carry. Unmounting cancels it (the very fix under test).
            wrapper.unmount();
        });
    });
});
