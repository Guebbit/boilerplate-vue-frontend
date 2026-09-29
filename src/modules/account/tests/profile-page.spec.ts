/**
 * @module
 * Mounts the real profile page for the record-edit form's own behaviour: what an ordinary save
 * sends over `PATCH /account` and, deliberately, what it leaves out. Every sibling panel
 * (`ProfileAvatar`, ...) is stubbed — each fetches its own data on mount and has its own test
 * file; this one is scoped to the form `Profile.vue` owns directly.
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
import * as schemas from '@api/schemas';
import {
    contractRequest,
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
 * Whether `cancelPendingEmail` reached its own endpoint — the assertion for the cancel test below,
 * since the call carries no body worth inspecting.
 */
const calledCancelPendingEmail = () =>
    vi
        .mocked(orvalMutator)
        .mock.calls.some(
            (call) =>
                (call[0] as { url: string; method?: string }).method?.toUpperCase() === 'DELETE' &&
                (call[0] as { url: string }).url === '/account/pending-email'
        );

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
        'PATCH /account': orvalEnvelope(USER),
        'DELETE /account/pending-email': orvalEnvelope()
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
                expect(contractRequest(schemas.UpdateAccountBody, patch?.data)).toMatchObject({
                    analyticsConsent: true
                });
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

/**
 * An ordinary save must never carry the visitor's own unchanged address, because the backend
 * reads any INCLUDED `email` as "cancel/redirect the pending change" — see `updateAccount`'s
 * generated doc comment on `PATCH /account`. The notice's UI and the save-side fix are pinned in
 * one file since they are the same mechanism proven from two ends.
 */
describe('the email field, and a pending change', () => {
    it('omits email from the PATCH body on an ordinary save that leaves it untouched', () => {
        const wrapper = mountProfile();

        return flushPromises()
            .then(() => wrapper.get('input[type=tel]').setValue('+1 555 0100'))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                const patch = lastAccountPatch();
                // Same "absent means untouched" proof as the consent switch above — this is the
                // actual bug B5 fixes: a routine save silently cancelling a pending email change.
                expect(JSON.stringify(patch?.data)).not.toContain('"email"');
            });
    });

    it('sends the new address when the visitor actually edits the email field', () => {
        const wrapper = mountProfile();

        return flushPromises()
            .then(() => wrapper.get('input[type=email]').setValue('new@example.com'))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                const patch = lastAccountPatch();
                expect(contractRequest(schemas.UpdateAccountBody, patch?.data)).toMatchObject({
                    email: 'new@example.com'
                });
            });
    });

    it('shows no pending-email notice when none is parked', () => {
        const wrapper = mountProfile();

        return flushPromises().then(() => {
            expect(wrapper.find('[data-test=pending-email-notice]').exists()).toBe(false);
        });
    });

    it('shows the parked address, and resend sends PATCH /account with it — not the current one', () => {
        responses['GET /account'] = orvalEnvelope({ ...USER, pendingEmail: 'new@example.com' });
        const wrapper = mountProfile();

        return flushPromises()
            .then(() => {
                const notice = wrapper.get('[data-test=pending-email-notice]');
                expect(notice.text()).toContain('new@example.com');
                return wrapper.get('[data-test=pending-email-resend]').trigger('click');
            })
            .then(flushPromises)
            .then(() => {
                const patch = lastAccountPatch();
                expect(contractRequest(schemas.UpdateAccountBody, patch?.data)).toEqual({
                    email: 'new@example.com'
                });
            });
    });

    it('cancel calls DELETE /account/pending-email, its own dedicated endpoint', () => {
        responses['GET /account'] = orvalEnvelope({ ...USER, pendingEmail: 'new@example.com' });
        const wrapper = mountProfile();

        return flushPromises()
            .then(() => wrapper.get('[data-test=pending-email-cancel]').trigger('click'))
            .then(flushPromises)
            .then(() => {
                expect(calledCancelPendingEmail()).toBe(true);
            });
    });

    it('a double click on resend sends only one PATCH', () => {
        responses['GET /account'] = orvalEnvelope({ ...USER, pendingEmail: 'new@example.com' });
        const wrapper = mountProfile();

        return flushPromises()
            .then(() => {
                const button = wrapper.get('[data-test=pending-email-resend]');
                // Neither `.trigger()` call is awaited before the next: both click handlers run
                // synchronously back to back, before the first request's promise ever settles —
                // exactly the race a `disabled` bound only after the promise resolves would miss.
                return Promise.all([button.trigger('click'), button.trigger('click')]);
            })
            .then(flushPromises)
            .then(() => {
                const patchesToAccount = vi
                    .mocked(orvalMutator)
                    .mock.calls.filter(
                        (call) =>
                            (call[0] as { url: string; method?: string }).method?.toUpperCase() ===
                                'PATCH' && (call[0] as { url: string }).url === '/account'
                    );
                expect(patchesToAccount).toHaveLength(1);
            });
    });

    it('a double click on cancel sends only one DELETE', () => {
        responses['GET /account'] = orvalEnvelope({ ...USER, pendingEmail: 'new@example.com' });
        const wrapper = mountProfile();

        return flushPromises()
            .then(() => {
                const button = wrapper.get('[data-test=pending-email-cancel]');
                return Promise.all([button.trigger('click'), button.trigger('click')]);
            })
            .then(flushPromises)
            .then(() => {
                const deletes = vi
                    .mocked(orvalMutator)
                    .mock.calls.filter(
                        (call) =>
                            (call[0] as { url: string; method?: string }).method?.toUpperCase() ===
                                'DELETE' &&
                            (call[0] as { url: string }).url === '/account/pending-email'
                    );
                expect(deletes).toHaveLength(1);
            });
    });
});

/**
 * Regression for the bug this pins: the details form used to send back the ALREADY-LOADED
 * `imageUrl` on every save, since the field lived in the form model like any other. That silently
 * overwrote whatever `ProfileAvatar.vue`'s own request had just written — including a concurrent
 * avatar change — and left the record pointing at a file the backend then deleted as orphaned.
 * Only `ProfileAvatar.vue` (stubbed out here) may ever write `imageUrl`.
 */
describe('the image field', () => {
    it('never includes imageUrl in an ordinary details save, loaded or not', () => {
        responses['GET /account'] = orvalEnvelope({
            ...USER,
            imageUrl: 'https://cdn.example.com/avatars/ada.png'
        });
        const wrapper = mountProfile();

        return flushPromises()
            .then(() => wrapper.get('input[type=tel]').setValue('+1 555 0100'))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                const patch = lastAccountPatch();
                // Not merely falsy: the KEY itself must be absent, the same "absent means
                // untouched" proof the email and consent fields above pin.
                expect(JSON.stringify(patch?.data)).not.toContain('imageUrl');
            });
    });
});

/**
 * `''` is what a hand-cleared field holds, and `UpdateAccountBody` refuses it with a live 422:
 * `null` is the contract's spelling of "clear". A field that was never set stays omitted.
 */
describe('clearing the phone and website', () => {
    it('sends null for a phone and website the visitor cleared', () => {
        responses['GET /account'] = orvalEnvelope({
            ...USER,
            phone: '+15550100',
            website: 'https://ada.example.com'
        });
        const wrapper = mountProfile();

        return flushPromises()
            .then(() => wrapper.get('input[type=tel]').setValue(''))
            .then(() => wrapper.get('input[type=url]').setValue(''))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(
                    contractRequest(schemas.UpdateAccountBody, lastAccountPatch()?.data)
                ).toMatchObject({
                    phone: null,
                    website: null
                });
            });
    });

    it('omits both when the profile never had them', () => {
        const wrapper = mountProfile();

        return flushPromises()
            .then(() => wrapper.get('[data-test=profile-analytics-consent] input').setValue(true))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                const sent = JSON.stringify(lastAccountPatch()?.data);
                expect(sent).not.toContain('phone');
                expect(sent).not.toContain('website');
            });
    });
});
