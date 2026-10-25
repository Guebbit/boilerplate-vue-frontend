/**
 * @module
 * Mounts the real admin user-edit page against a real, memory-history router: the trap this form
 * exists to avoid — an unchanged `role` riding along in the `PATCH` and re-running the backend's
 * grant check — and the confirm gate a role change or a deactivation goes through first. `UserAccessDialog`
 * itself is stubbed; its own picker/confirm behaviour is `user-access-dialog.spec.ts`'s job.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { VSelect } from 'vuetify/components';
import UserEdit from '../views/UserEdit.vue';
import UserAccessDialog from '../components/UserAccessDialog.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { emitOn, nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import {
    aUser,
    ALL_USER_ACTIONS,
    NO_USER_ACTIONS,
    userActionsOf,
    aProblem
} from '../../../../tests/support/unit/fixtures.ts';
import {
    contractRequest,
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
    actions: ALL_USER_ACTIONS
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
                config.method === 'GET' ? loadedUser : undefined
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
    // An admin-like caller: the server answered with the roles they may assign.
    useSessionStore().grantableRoles = ['customer', 'manager', 'admin'];
    mockTransport();
    return loadLocale('en').then(() =>
        router.push('/en/users/u1/edit').then(() => router.isReady())
    );
});

describe('UserEdit', () => {
    it('saves an unrelated field change with no role in the body, and no dialog', () => {
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
            .then(() => {
                const roleSelect = wrapper
                    .findAllComponents(VSelect)
                    .find((select) => select.attributes('data-test') === 'user-edit-role');
                if (roleSelect) emitOn(roleSelect, 'update:modelValue', 'manager');
                return nextRenderTick(wrapper);
            })
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
    const PRECONDITION_FAILED = aProblem(412, [
        { code: 'PRECONDITION_FAILED', message: 'Precondition failed' }
    ]);

    /** Answers every GET as usual and every PATCH with the 412. */
    const mockRefusedPatch = () => {
        vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) =>
            config.method === 'PATCH'
                ? // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the API's error ENVELOPE is this client's rejection contract
                  Promise.reject(PRECONDITION_FAILED)
                : Promise.resolve(parseOrvalFixture(config.method, config.url, loadedUser))
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
 * Every control follows the row's `actions`: with no `update` the profile fields are disabled, with
 * no `assignRole` the role is, and the status buttons show only when the move is allowed. A
 * credential is the owner's alone, so there is no email field and no password field at all.
 */
describe('UserEdit — what each row allows', () => {
    it('has no email field and no password field', () => {
        const wrapper = mountPage();

        return flushPromises().then(() => {
            expect(wrapper.find('[data-test=user-edit-email]').exists()).toBe(false);
            expect(wrapper.find('[data-test=user-edit-password]').exists()).toBe(false);
        });
    });

    it('enables every control, the role included, when the row allows them', () => {
        const wrapper = mountPage();

        return flushPromises().then(() => {
            for (const test of ['user-edit-username', 'user-edit-phone', 'user-edit-role'])
                expect(isDisabled(wrapper, test)).toBe(false);
        });
    });

    it('disables the profile fields and the role when the row allows no update', () => {
        loadedUser = aUser({
            ...LOADED_USER,
            actions: userActionsOf({
                setPurchaseHold: true,
                liftPurchaseHold: true,
                activate: true,
                deactivate: true
            })
        });
        const wrapper = mountPage();

        return flushPromises().then(() => {
            expect(isDisabled(wrapper, 'user-edit-username')).toBe(true);
            expect(isDisabled(wrapper, 'user-edit-role')).toBe(true);
            expect(wrapper.find('[data-test=user-edit-deactivate]').exists()).toBe(true);
        });
    });

    // Support: may correct a profile and may not lock someone out.
    it('shows no status button when the row allows no status move', () => {
        loadedUser = aUser({
            ...LOADED_USER,
            actions: userActionsOf({ update: true, assignRole: true })
        });
        const wrapper = mountPage();

        return flushPromises().then(() => {
            expect(wrapper.find('[data-test=user-edit-deactivate]').exists()).toBe(false);
            expect(wrapper.find('[data-test=user-edit-activate]').exists()).toBe(false);
            expect(isDisabled(wrapper, 'user-edit-username')).toBe(false);
        });
    });

    it('disables the whole form on an account that allows nothing', () => {
        loadedUser = aUser({
            ...LOADED_USER,
            actions: NO_USER_ACTIONS
        });
        const wrapper = mountPage();

        return flushPromises().then(() => {
            expect(isDisabled(wrapper, 'user-edit-username')).toBe(true);
            expect(
                wrapper.get('[data-test=user-edit-submit]').attributes('disabled')
            ).toBeDefined();
        });
    });

    it('offers the signed-in admin their own role when the server allows it', () => {
        const session = useSessionStore();
        session.viewer = { id: 'u1', email: 'ada@example.com', role: 'admin' };
        const wrapper = mountPage();

        return flushPromises().then(() => {
            expect(isDisabled(wrapper, 'user-edit-role')).toBe(false);
            expect(isDisabled(wrapper, 'user-edit-username')).toBe(false);
        });
    });

    it('disables the role select for a caller who may assign no role', () => {
        useSessionStore().grantableRoles = [];
        const wrapper = mountPage();

        return flushPromises().then(() => {
            expect(isDisabled(wrapper, 'user-edit-role')).toBe(true);
            expect(isDisabled(wrapper, 'user-edit-username')).toBe(false);
        });
    });

    it('offers a moderator-like caller only support, plus the account’s current role', () => {
        useSessionStore().grantableRoles = ['support'];
        loadedUser = aUser({ ...LOADED_USER, role: 'manager' });
        const wrapper = mountPage();

        return flushPromises().then(() => {
            const select = wrapper
                .findAllComponents({ name: 'VSelect' })
                .find((candidate) => candidate.attributes('data-test') === 'user-edit-role');
            expect(select?.props('items')).toEqual([
                { value: '', title: 'No staff role (customer)' },
                { value: 'support', title: 'support' },
                { value: 'manager', title: 'manager' }
            ]);
        });
    });
});

/** The requests of one method and url, in call order. */
const callsTo = (method: string, url: string) =>
    vi
        .mocked(orvalMutator)
        .mock.calls.filter(([config]) => config.method === method && config.url === url);

/**
 * Status is an action, not a field of the `PATCH`: Deactivate asks the access dialog first (it
 * ends every session), Activate calls straight away, and neither sends a `PATCH`.
 */
describe('UserEdit — activating and deactivating', () => {
    it('asks the access dialog to confirm a deactivation, and calls the endpoint once confirmed', () => {
        const wrapper = mountPage();

        return flushPromises()
            .then(() => wrapper.get('[data-test=user-edit-deactivate]').trigger('click'))
            .then(flushPromises)
            .then(() => {
                const dialog = wrapper.findComponent(UserAccessDialog);
                expect(dialog.props('options')).toMatchObject({
                    skipPicker: true,
                    chosenActive: false
                });
                expect(callsTo('POST', '/users/u1/deactivate')).toHaveLength(0);
                emitOn(dialog, 'confirm', { active: false });
            })
            .then(flushPromises)
            .then(() => {
                expect(callsTo('POST', '/users/u1/deactivate')).toHaveLength(1);
                expect(lastPatchBody()).toBeUndefined();
            });
    });

    it('sends nothing when the deactivation is cancelled', () => {
        const wrapper = mountPage();

        return flushPromises()
            .then(() => wrapper.get('[data-test=user-edit-deactivate]').trigger('click'))
            .then(flushPromises)
            .then(() => emitOn(wrapper.findComponent(UserAccessDialog), 'cancel'))
            .then(flushPromises)
            .then(() => {
                expect(callsTo('POST', '/users/u1/deactivate')).toHaveLength(0);
            });
    });

    it('activates straight away, with no dialog', () => {
        const wrapper = mountPage();

        return flushPromises()
            .then(() => wrapper.get('[data-test=user-edit-activate]').trigger('click'))
            .then(flushPromises)
            .then(() => {
                expect(callsTo('POST', '/users/u1/activate')).toHaveLength(1);
                expect(wrapper.findComponent(UserAccessDialog).props('target')).toBeUndefined();
            });
    });
});
