/**
 * @module
 * A profile save answered 412 (the record changed on another device or tab since this page loaded
 * it): the form warns in place, offers "reload latest", and re-reads `GET /account` when it is
 * pressed. Its own file rather than a block in `profile-page.spec.ts`, whose `orvalMutator` mock
 * answers every PATCH with a success and is shared by all of that file's cases.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import Profile from '@/modules/account/views/Profile.vue';
import { orvalMutator } from '@/infrastructure/http';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

vi.mock('@/infrastructure/http', () => ({ orvalMutator: vi.fn() }));

/**
 * The real app router — child panels resolve links through it.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * The record `GET /account` answers with.
 */
const USER = {
    id: 'u1',
    username: 'ada',
    email: 'ada@example.com',
    role: 'customer',
    analyticsConsent: false
};

/**
 * The reject envelope `onResponseReject` builds for the API's 412.
 */
const PRECONDITION_FAILED = {
    success: false,
    status: 412,
    message: 'Precondition Failed',
    errors: [{ code: 'PRECONDITION_FAILED', message: 'Precondition failed' }]
};

/**
 * How many times the profile was read.
 */
const profileReads = () =>
    vi
        .mocked(orvalMutator)
        .mock.calls.filter(([config]) => config.method === 'GET' && config.url === '/account')
        .length;

/**
 * Answers every read as usual and every `PATCH /account` with the 412.
 */
const mockRefusedPatch = () => {
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) => {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the API's error ENVELOPE is this client's rejection contract
        if (config.method === 'PATCH') return Promise.reject(PRECONDITION_FAILED);
        const body =
            config.url === '/account/abilities'
                ? orvalEnvelope({ platform: [], tenant: [], version: 1, subjects: [] })
                : orvalEnvelope(USER);
        return Promise.resolve(parseOrvalFixture(config.method, config.url, body));
    });
};

/**
 * Mounts the real page, every decorative sibling panel stubbed out, edits the username and
 * submits into the refusal.
 */
const submitRefused = () => {
    mockRefusedPatch();
    const wrapper = mount(Profile, {
        global: {
            plugins: [router, vuetify, i18n],
            stubs: {
                ProfileAvatar: true,
                ProfilePasswordChange: true,
                ProfileTwoFactor: true,
                ProfileSessions: true,
                ProfileAddresses: true,
                ProfileExportData: true,
                ProfileDeleteAccount: true
            }
        }
    });
    return flushPromises()
        .then(() => wrapper.get('[data-test=profile-analytics-consent] input').setValue(true))
        .then(() => wrapper.get('form').trigger('submit'))
        .then(flushPromises)
        .then(() => wrapper);
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(orvalMutator).mockReset();
    return loadLocale('en').then(() => router.push('/en/profile').then(() => router.isReady()));
});

describe('Profile — a save answered 412', () => {
    it('warns that the profile changed elsewhere, and offers to reload', () =>
        submitRefused().then((wrapper) => {
            const alert = wrapper.get('[data-test=profile-form-error]');
            expect(alert.text()).toContain(i18n.global.t('generic.error-stale-record'));
            expect(alert.classes().join(' ')).toContain('warning');
            expect(wrapper.find('[data-test=profile-reload-latest]').exists()).toBe(true);
        }));

    it('re-reads the profile past the store cache on "reload latest", and clears the warning', () =>
        submitRefused().then((wrapper) => {
            const readsBefore = profileReads();
            return wrapper
                .get('[data-test=profile-reload-latest]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    expect(profileReads()).toBe(readsBefore + 1);
                    expect(wrapper.find('[data-test=profile-reload-latest]').exists()).toBe(false);
                });
        }));
});
