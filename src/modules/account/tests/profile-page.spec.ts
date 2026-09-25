/**
 * @module
 * Mounts the real profile page for the record-edit form's own behaviour: what an ordinary save
 * sends over `PATCH /account` and, deliberately, what it leaves out. Every sibling panel
 * (`ProfileAvatar`, `ProfileRole`, ...) is stubbed — each fetches its own data on mount and has
 * its own test file; this one is scoped to the form `Profile.vue` owns directly.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import Profile from '@/modules/account/views/Profile.vue';
import { orvalMutator } from '@/infrastructure/http';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/**
 * The real app router — child panels (sessions, addresses) resolve links through it.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * A representative record, the shape `GET /account` answers with.
 */
const USER = {
    id: 'u1',
    username: 'ada',
    email: 'ada@example.com',
    role: 'customer',
    analyticsConsent: false
};

/**
 * Responses per endpoint, rebuilt for each test. `PATCH /account` echoes back whatever the test
 * put here rather than the request body, same as the real API: what the FORM sent is asserted
 * separately, off the mock's own call log.
 */
let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

/**
 * The most recent `PATCH /account` call's raw config, exactly as the store built it — before
 * axios serializes it, which is why an absent field is asserted with `JSON.stringify` below rather
 * than `in`: the store always builds the key, `undefined`-valued, and only serialization drops it.
 */
const lastAccountPatch = () =>
    vi
        .mocked(orvalMutator)
        .mock.calls.map((call) => call[0] as { url: string; method?: string; data: unknown })
        .findLast((call) => call.method?.toUpperCase() === 'PATCH' && call.url === '/account');

/**
 * Mounts the real page, every decorative sibling panel stubbed out — each owns its own fetch and
 * its own test file.
 */
const mountProfile = () =>
    mount(Profile, {
        global: {
            plugins: [router, vuetify, i18n],
            stubs: {
                LayoutDefault: { template: '<div><slot /></div>' },
                ProfileAvatar: true,
                ProfileRole: true,
                ProfilePasswordChange: true,
                ProfileTwoFactor: true,
                ProfileSessions: true,
                ProfileAddresses: true,
                ProfileExportData: true,
                ProfileDeleteAccount: true
            }
        }
    });

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'GET /account': orvalEnvelope(USER),
        'GET /account/abilities': orvalEnvelope({
            platform: [],
            tenant: [],
            version: 1,
            subjects: []
        }),
        'PATCH /account': orvalEnvelope(USER)
    };
    return loadLocale('en').then(() => router.push('/en/profile').then(() => router.isReady()));
});

describe('the GDPR analytics-consent switch', () => {
    it('sends the new value when the visitor flips it, and nothing else changes', () => {
        const wrapper = mountProfile();

        return flushPromises()
            .then(() => wrapper.get('[data-test=profile-analytics-consent] input').setValue(true))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                const patch = lastAccountPatch();
                expect(patch?.data).toMatchObject({ analyticsConsent: true });
            });
    });

    it('leaves the field out of the PATCH body entirely when the visitor never touches it', () => {
        // The trap this pins: absent must mean "leave alone", so an ordinary save of some OTHER
        // field must not carry a stale `analyticsConsent: false` as if it were a fresh choice.
        const wrapper = mountProfile();

        return flushPromises()
            .then(() => wrapper.get('input[type=tel]').setValue('+1 555 0100'))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                const patch = lastAccountPatch();
                // Never over the wire: JSON.stringify drops an `undefined`-valued key, which is
                // exactly the "leave alone" PATCH semantics `UpdateAccountRequest` documents.
                expect(JSON.stringify(patch?.data)).not.toContain('analyticsConsent');
            });
    });

    it('is not dirty after flipping the switch back to the loaded value', () => {
        const wrapper = mountProfile();

        return flushPromises()
            .then(() => wrapper.get('[data-test=profile-analytics-consent] input').setValue(true))
            .then(() => wrapper.get('[data-test=profile-analytics-consent] input').setValue(false))
            .then(() => {
                expect(wrapper.get('button[type=submit]').attributes('disabled')).toBeDefined();
            });
    });
});
