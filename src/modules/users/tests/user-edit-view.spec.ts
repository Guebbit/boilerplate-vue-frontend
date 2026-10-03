/**
 * @module
 * Mounts the real admin user-edit page against a real, memory-history router: the trap this form
 * exists to avoid — an unchanged `role` riding along in the `PATCH` and re-running the backend's
 * grant check — and the confirm gate role/active changes go through first. `UserAccessDialog`
 * itself is stubbed; its own picker/confirm behaviour is `user-access-dialog.spec.ts`'s job.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { VSelect } from 'vuetify/components';
import UserEdit from '@/modules/users/views/UserEdit.vue';
import UserAccessDialog from '@/modules/users/components/UserAccessDialog.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { emitOn, nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { aUser } from '../../../../tests/support/unit/fixtures.ts';
import {
    contractRequest,
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import * as schemas from '@api/schemas';

wireModulesIntoCore();

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn()
}));

/**
 * The real app router, scoped to the modules this suite enables.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** The record every test loads and edits. */
const LOADED_USER = aUser({
    id: 'u1',
    username: 'ada',
    email: 'ada@example.com',
    role: 'customer',
    active: true,
    // The server's answer for the signed-in admin on this account.
    actions: { update: true, ban: true, delete: true }
});

/** The record the clearing cases load: all three optional fields set. */
const USER_WITH_CONTACT = aUser({
    ...LOADED_USER,
    phone: '+15550100',
    website: 'https://ada.example.com',
    locale: 'en'
});

/** Which record `GET` answers with; reset per test. */
let loadedUser = LOADED_USER;

/**
 * Answers every GET with {@link LOADED_USER} and every PATCH with a bare success envelope.
 */
const mockTransport = () => {
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) =>
        Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                config.method === 'GET' ? orvalEnvelope(loadedUser) : orvalEnvelope()
            )
        )
    );
};

/**
 * The last PATCH request's body, or `undefined` when none was sent.
 */
const lastPatchBody = () =>
    vi.mocked(orvalMutator).mock.calls.find(([config]) => config.method === 'PATCH')?.[0].data as
        Record<string, unknown> | undefined;

/**
 * Mounts the page for user `u1`, as the router would with `props: true` on `users/:id/edit`.
 *
 * @returns The mounted wrapper.
 */
const mountPage = () =>
    mount(UserEdit, {
        props: { id: 'u1' },
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { UserAccessDialog: true }
        }
    });

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    loadedUser = LOADED_USER;
    mockTransport();
    return loadLocale('en').then(() =>
        router.push('/en/users/u1/edit').then(() => router.isReady())
    );
});

describe('UserEdit', () => {
    it('saves an unrelated field change with no role/active in the body, and no dialog', () => {
        const wrapper = mountPage();

        return flushPromises()
            .then(() => wrapper.get('[data-test=user-edit-username] input').setValue('ada2'))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(wrapper.findComponent(UserAccessDialog).props('target')).toBeUndefined();
                const body = lastPatchBody();
                // Proves the PATCH is a shape the real endpoint accepts, not just the
                // shape this test expected — `UpdateUserByIdBody` is a `strictObject`, so a stray
                // key this assertion never thought to name would fail it too.
                const sent = contractRequest(schemas.UpdateUserByIdBody, body);
                // Only what changed is sent: the loaded record is the baseline.
                expect(sent).toEqual({ username: 'ada2' });
            });
    });

    /**
     * The bug e2e's users.cy.ts caught: a record loaded with no phone/website/locale
     * defaults those fields to `''` (see the form's own initial-value note), and sending `''`
     * back trips the contract's own `minLength`/pattern with a live 422 — every edit of a user
     * who has never set any of the three failed, unrelated to what was actually being changed.
     * `contractRequest` is what actually caught it: the old `toMatchObject` here
     * only checked the fields it named, and `locale: ''` slipped past that unnoticed.
     */
    it('omits phone, website and locale from the PATCH when the record has none set', () => {
        const wrapper = mountPage();

        return flushPromises()
            .then(() => wrapper.get('[data-test=user-edit-username] input').setValue('ada2'))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                const body = lastPatchBody();
                // Proves the PATCH is a shape the real endpoint accepts — a `strictObject` schema
                // that also enforces `minLength`/pattern per field, not just the shape this test
                // expected.
                expect(contractRequest(schemas.UpdateUserByIdBody, body)).toMatchObject({
                    username: 'ada2'
                });
                expect(body?.locale).toBeUndefined();
                expect(body?.phone).toBeUndefined();
                expect(body?.website).toBeUndefined();
            });
    });

    it('sends null for a phone and website the admin cleared, so the value really goes', () => {
        loadedUser = USER_WITH_CONTACT;
        const wrapper = mountPage();

        return flushPromises()
            .then(() => wrapper.get('[data-test=user-edit-phone] input').setValue(''))
            .then(() => wrapper.get('[data-test=user-edit-website] input').setValue(''))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                const body = lastPatchBody();
                expect(contractRequest(schemas.UpdateUserByIdBody, body)).toMatchObject({
                    phone: null,
                    website: null
                });
            });
    });

    it('sends null for a locale the admin cleared', () => {
        loadedUser = USER_WITH_CONTACT;
        const wrapper = mountPage();

        return flushPromises()
            .then(() => {
                const localeSelect = wrapper
                    .findAllComponents(VSelect)
                    .find((select) => select.attributes('data-test') === 'user-edit-locale');
                if (localeSelect) emitOn(localeSelect, 'update:modelValue', '');
                return nextRenderTick(wrapper);
            })
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(contractRequest(schemas.UpdateUserByIdBody, lastPatchBody())).toMatchObject({
                    locale: null
                });
            });
    });

    it('opens the confirm dialog on a role change, and omits it from the body until confirmed', () => {
        const wrapper = mountPage();

        return flushPromises()
            .then(() => {
                // Vuetify's `VSelect` drives its value through `update:modelValue`, not the
                // hidden native `<select>` it renders for autofill — emitting the update directly
                // is what `setValue()` would otherwise need a real menu click to reach.
                const roleSelect = wrapper
                    .findAllComponents(VSelect)
                    .find((select) => select.attributes('data-test') === 'user-edit-role');
                if (roleSelect) emitOn(roleSelect, 'update:modelValue', 'manager');
                return nextRenderTick(wrapper);
            })
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                // Nothing sent yet — the dialog is open, waiting on the admin.
                expect(lastPatchBody()).toBeUndefined();
                const dialog = wrapper.findComponent(UserAccessDialog);
                expect(dialog.props('target')).toMatchObject({ id: 'u1', role: 'customer' });
                expect(dialog.props('options')).toMatchObject({
                    skipPicker: true,
                    chosenRole: 'manager'
                });
                emitOn(dialog, 'confirm', { role: 'manager' });
            })
            .then(flushPromises)
            .then(() => {
                // The critical trap: `role` rides along ONLY because it actually changed, not as
                // part of a blanket "send everything" body.
                expect(contractRequest(schemas.UpdateUserByIdBody, lastPatchBody())).toEqual({
                    role: 'manager'
                });
            });
    });

    it('sends nothing when the confirm dialog is cancelled', () => {
        const wrapper = mountPage();

        return flushPromises()
            .then(() => wrapper.get('[data-test=user-edit-active] input').setValue(false))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => emitOn(wrapper.findComponent(UserAccessDialog), 'cancel'))
            .then(flushPromises)
            .then(() => {
                expect(lastPatchBody()).toBeUndefined();
            });
    });
});

/** How many times the record was read. */
const userReads = () =>
    vi
        .mocked(orvalMutator)
        .mock.calls.filter(([config]) => config.method === 'GET' && config.url === '/users/u1')
        .length;

describe('UserEdit — a save answered 412', () => {
    /** The reject envelope `onResponseReject` builds for the API's 412. */
    const PRECONDITION_FAILED = {
        success: false,
        status: 412,
        message: 'Precondition Failed',
        errors: [{ code: 'PRECONDITION_FAILED', message: 'Precondition failed' }]
    };

    /** Answers every GET as usual and every PATCH with the 412. */
    const mockRefusedPatch = () => {
        vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) =>
            config.method === 'PATCH'
                ? // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the API's error ENVELOPE is this client's rejection contract
                  Promise.reject(PRECONDITION_FAILED)
                : Promise.resolve(
                      parseOrvalFixture(config.method, config.url, orvalEnvelope(loadedUser))
                  )
        );
    };

    /** Mounts, edits the username, submits, and settles. */
    const submitRefused = () => {
        mockRefusedPatch();
        const wrapper = mountPage();
        return flushPromises()
            .then(() => wrapper.get('[data-test=user-edit-username] input').setValue('ada2'))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => wrapper);
    };

    it('warns that someone else changed the user, and offers to reload', () =>
        submitRefused().then((wrapper) => {
            const alert = wrapper.get('[data-test=user-edit-submit-error]');
            expect(alert.text()).toContain(i18n.global.t('generic.error-stale-record'));
            expect(alert.classes().join(' ')).toContain('warning');
            expect(wrapper.find('[data-test=user-edit-reload-latest]').exists()).toBe(true);
        }));

    it('re-reads the user past the store cache on "reload latest", and clears the warning', () =>
        submitRefused().then((wrapper) => {
            const readsBefore = userReads();
            return wrapper
                .get('[data-test=user-edit-reload-latest]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    expect(userReads()).toBe(readsBefore + 1);
                    expect(wrapper.find('[data-test=user-edit-reload-latest]').exists()).toBe(
                        false
                    );
                });
        }));
});

/** Whether the Vuetify field behind a `data-test` id is disabled. */
const isDisabled = (wrapper: ReturnType<typeof mountPage>, test: string) =>
    wrapper.get(`[data-test=${test}]`).classes().includes('v-input--disabled');

/**
 * Every control follows the row's `actions`: with no `update` the profile fields and the role are
 * disabled, with no `ban` the active switch is, and one's own role is never offered. A credential
 * is the owner's alone, so there is no email field and no password field at all.
 */
describe('UserEdit — what each row allows', () => {
    it('has no email field and no password field', () => {
        const wrapper = mountPage();

        return flushPromises().then(() => {
            expect(wrapper.find('[data-test=user-edit-email]').exists()).toBe(false);
            expect(wrapper.find('[data-test=user-edit-password]').exists()).toBe(false);
        });
    });

    it('enables every control, the role included, when the row allows update and ban', () => {
        const wrapper = mountPage();

        return flushPromises().then(() => {
            for (const test of [
                'user-edit-username',
                'user-edit-phone',
                'user-edit-role',
                'user-edit-active'
            ])
                expect(isDisabled(wrapper, test)).toBe(false);
        });
    });

    it('disables the profile fields and the role when the row allows no update', () => {
        loadedUser = aUser({
            ...LOADED_USER,
            actions: { update: false, ban: true, delete: false }
        });
        const wrapper = mountPage();

        return flushPromises().then(() => {
            expect(isDisabled(wrapper, 'user-edit-username')).toBe(true);
            expect(isDisabled(wrapper, 'user-edit-role')).toBe(true);
            expect(isDisabled(wrapper, 'user-edit-active')).toBe(false);
        });
    });

    // Support: may correct a profile and may not lock someone out.
    it('disables the active switch when the row allows no ban', () => {
        loadedUser = aUser({
            ...LOADED_USER,
            actions: { update: true, ban: false, delete: false }
        });
        const wrapper = mountPage();

        return flushPromises().then(() => {
            expect(isDisabled(wrapper, 'user-edit-active')).toBe(true);
            expect(isDisabled(wrapper, 'user-edit-username')).toBe(false);
        });
    });

    it('disables the whole form on an account that allows nothing', () => {
        loadedUser = aUser({
            ...LOADED_USER,
            actions: { update: false, ban: false, delete: false }
        });
        const wrapper = mountPage();

        return flushPromises().then(() => {
            expect(isDisabled(wrapper, 'user-edit-username')).toBe(true);
            expect(
                wrapper.get('[data-test=user-edit-submit]').attributes('disabled')
            ).toBeDefined();
        });
    });

    it('never offers the signed-in admin their own role', () => {
        const session = useSessionStore();
        session.viewer = { id: 'u1', email: 'ada@example.com', role: 'admin' };
        const wrapper = mountPage();

        return flushPromises().then(() => {
            expect(isDisabled(wrapper, 'user-edit-role')).toBe(true);
            expect(isDisabled(wrapper, 'user-edit-username')).toBe(false);
        });
    });
});
