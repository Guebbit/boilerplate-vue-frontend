/**
 * @module
 * The edit form's release date: hydrated from the admin record into the `datetime-local` input,
 * left OUT of the PATCH while untouched (a moved date notifies the buyers who already paid, so it
 * travels only when it changed), sent as an ISO instant when edited and as `null` when cleared.
 * Proven against the contract's own body schema. Mounting mirrors `product-edit-purchasable.spec.ts`.
 */
import { describe, it, expect, beforeEach, vi, type MockInstance } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import ProductEdit from '../views/ProductEdit.vue';
import { createMongoAbility } from '@casl/ability';
import { useDialogStore } from '@/ui/dialog.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
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

vi.mock('@/infrastructure/http', () => ({ orvalMutator: vi.fn() }));

/** Memory-history router carrying the real module routes. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** The `GET /locales` answer: one active language, `en`, also the fallback. */
const LOCALES_RESPONSE = {
    locales: [
        {
            tag: 'en',
            name: 'English',
            nativeName: 'English',
            direction: 'ltr',
            active: true,
            apps: ['demo-fe'],
            source: 'static',
            entryCount: 0,
            revision: 1
        }
    ],
    default: 'en',
    fallback: 'en'
};

/**
 * A promise this spec resolves on its own schedule, one per endpoint — same helper as
 * `product-edit-locale-race.spec.ts`, needed here for the same reason: the admin record must
 * land strictly after the locales response, or the tab bar never opens.
 */
const deferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((settle) => {
        resolve = settle;
    });
    return { promise, resolve };
};

/**
 * The admin record's own PATCH echo — its shape doesn't matter to this spec, only that the
 * post-submit reload has something valid to land on.
 */
const echo = (body: Record<string, unknown>) => ({
    id: 'p1',
    title: 'Widget',
    price: 9.99,
    currency: 'EUR',
    translations: { en: { title: 'Widget', description: 'A widget' } },
    ...body
});

/**
 * The axios config handed to `orvalMutator` for the PATCH — the request that actually matters
 * here (this form always sends PATCH, never PUT — see Q10's answer). The generated client sends
 * every method uppercase (`method: 'PATCH'`), unlike `parseOrvalFixture`'s own case-insensitive
 * lookup.
 */
const lastPatch = () => {
    const call = vi
        .mocked(orvalMutator)
        .mock.calls.findLast(([config]) => (config as { method?: string }).method === 'PATCH');
    if (!call) throw new Error('no PATCH was sent');
    return call[0] as { data: Record<string, unknown> };
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(orvalMutator).mockReset();
    return loadLocale('en').then(() =>
        router.push('/en/products/p1/edit').then(() => router.isReady())
    );
});

/**
 * Mounts the edit form and drives it to a fully hydrated, tab-open state: locales resolve, a
 * flush, then the admin record (with the given fields) resolves, another flush.
 */
const mountHydrated = (adminRecord: Record<string, unknown>) => {
    const locales = deferred<unknown>();
    const admin = deferred<unknown>();
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) => {
        if (config.url === '/locales') return locales.promise;
        if (config.url === '/products/p1/admin') return admin.promise;
        if (config.method === 'PATCH')
            return Promise.resolve(
                parseOrvalFixture('PATCH', '/products/p1', orvalEnvelope(echo({})))
            );
        return Promise.resolve(orvalEnvelope());
    });

    const wrapper = mount(ProductEdit, {
        props: { id: 'p1' },
        global: {
            plugins: [router, vuetify, i18n]
        }
    });

    locales.resolve(parseOrvalFixture('GET', '/locales', orvalEnvelope(LOCALES_RESPONSE)));
    return flushPromises()
        .then(() => {
            admin.resolve(
                parseOrvalFixture('GET', '/products/p1/admin', orvalEnvelope(echo(adminRecord)))
            );
            return flushPromises();
        })
        .then(() => wrapper);
};

describe('ProductEdit — release date', () => {
    /**
     * An instant on the minute, so the input's spelling loses nothing.
     */
    const RELEASE = new Date(2027, 2, 15, 9, 30).toISOString();

    it('shows a dated product in the input, in the browser zone', () =>
        mountHydrated({ releaseDate: RELEASE, preorder: true }).then((wrapper) => {
            const input = wrapper.get('[data-test=product-release-date-field] input');

            expect((input.element as HTMLInputElement).value).toBe('2027-03-15T09:30');
        }));

    it('leaves an untouched date out of the PATCH', () =>
        mountHydrated({ releaseDate: RELEASE })
            .then((wrapper) => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(lastPatch().data).not.toHaveProperty('releaseDate');
            }));

    it('sends a changed date as an ISO instant the contract accepts', () =>
        mountHydrated({ releaseDate: RELEASE })
            .then((wrapper) =>
                wrapper
                    .get('[data-test=product-release-date-field] input')
                    .setValue('2027-04-01T10:00')
                    .then(() => wrapper.get('form').trigger('submit'))
            )
            .then(flushPromises)
            .then(() => {
                expect(
                    contractRequest(schemas.UpdateProductByIdBody, lastPatch().data)
                ).toMatchObject({
                    releaseDate: new Date(2027, 3, 1, 10, 0).toISOString()
                });
            }));

    it('sends null when the date is cleared', () =>
        mountHydrated({ releaseDate: RELEASE })
            .then((wrapper) =>
                wrapper
                    .get('[data-test=product-release-date-field] input')
                    .setValue('')
                    .then(() => wrapper.get('form').trigger('submit'))
            )
            .then(flushPromises)
            .then(() => {
                expect(
                    contractRequest(schemas.UpdateProductByIdBody, lastPatch().data)
                ).toMatchObject({
                    releaseDate: null
                });
            }));

    it('sends nothing for a product that never had a date', () =>
        mountHydrated({})
            .then((wrapper) => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(lastPatch().data).not.toHaveProperty('releaseDate');
            }));
});

/**
 * A signed-in visitor holding the given rules, as the session sees abilities.
 */
const signIn = (rules: { action: string; subject: string }[]) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'manager@example.com', role: 'manager' };
    session.tenantAbility = createMongoAbility(rules);
};

/** Whether a PATCH was sent. */
const patched = () =>
    vi
        .mocked(orvalMutator)
        .mock.calls.some(([config]) => (config as { method?: string }).method === 'PATCH');

describe('ProductEdit — the preview before a later or cleared date', () => {
    /** The preview route the form asks. */
    const IMPACT_URL = '/delivery/fulfillment-orders/release-date-impact';

    /** The dialog's answer, set per test; the host is not mounted, so the spy answers. */
    let confirmSpy: MockInstance<ReturnType<typeof useDialogStore>['confirm']>;

    /** Rules of a manager: moves dates and reads orders. */
    const MANAGER = [
        { action: 'update', subject: 'Product' },
        { action: 'display', subject: 'Order' }
    ];

    /** The preview calls sent so far. */
    const previewCalls = () =>
        vi
            .mocked(orvalMutator)
            .mock.calls.filter(([config]) => (config as { url?: string }).url === IMPACT_URL);

    /**
     * Mounts with the preview answering `impact` (or failing), sets the date input and submits.
     */
    const submitWith = (
        impact: Record<string, unknown> | Error,
        next: string,
        original: string | null = RELEASE_ISO
    ) => {
        return mountHydrated(original === null ? {} : { releaseDate: original }).then((wrapper) => {
            const inner = vi.mocked(orvalMutator).getMockImplementation();
            vi.mocked(orvalMutator).mockImplementation((config: { url?: string }) =>
                config.url === IMPACT_URL
                    ? impact instanceof Error
                        ? Promise.reject(impact)
                        : Promise.resolve(orvalEnvelope(impact))
                    : (inner?.(config) ?? Promise.resolve(orvalEnvelope()))
            );
            return wrapper
                .get('[data-test=product-release-date-field] input')
                .setValue(next)
                .then(() => wrapper.get('form').trigger('submit'))
                .then(flushPromises);
        });
    };

    /** An instant on the minute, so the input's spelling loses nothing. */
    const RELEASE_ISO = new Date(2027, 2, 15, 9, 30).toISOString();

    beforeEach(() => {
        signIn(MANAGER);
        confirmSpy = vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
    });

    it('asks before saving a later date, naming the notices and the questions', () =>
        submitWith(
            { notify: 12, ask: 3, answerBy: '2027-11-16T00:00:00.000Z' },
            '2027-04-01T10:00'
        ).then(() => {
            expect(previewCalls()).toHaveLength(1);
            expect(previewCalls()[0][0]).toMatchObject({
                params: { productId: 'p1', releaseDate: new Date(2027, 3, 1, 10, 0).toISOString() }
            });
            expect(confirmSpy).toHaveBeenCalledOnce();
            const request = confirmSpy.mock.calls[0][0] as { message: string; color: string };
            expect(request.message).toContain('12 orders get a notice');
            expect(request.message).toContain('3 orders must say yes by');
            expect(request.message).toContain('silence cancels and refunds');
            expect(request.color).toBe('warning');
            expect(patched()).toBe(true);
        }));

    it('names only the notices when nobody has to answer', () =>
        submitWith(
            { notify: 1, ask: 0, answerBy: '2027-11-16T00:00:00.000Z' },
            '2027-04-01T10:00'
        ).then(() => {
            const request = confirmSpy.mock.calls[0][0] as { message: string };
            expect(request.message).toBe('1 order gets a notice');
        }));

    it('asks for a cleared date without sending a releaseDate', () =>
        submitWith({ notify: 0, ask: 2, answerBy: '2027-11-16T00:00:00.000Z' }, '').then(() => {
            expect(previewCalls()[0][0]).toMatchObject({ params: { productId: 'p1' } });
            expect(
                (previewCalls()[0][0] as { params: Record<string, unknown> }).params.releaseDate
            ).toBeUndefined();
            expect(confirmSpy).toHaveBeenCalledOnce();
        }));

    it('does not save when the staff go back', () => {
        confirmSpy.mockResolvedValue(false);

        return submitWith({ notify: 0, ask: 1, answerBy: '2027-11-16T00:00:00.000Z' }, '').then(
            () => {
                expect(confirmSpy).toHaveBeenCalledOnce();
                expect(patched()).toBe(false);
            }
        );
    });

    it('saves without a dialog when nobody is reached', () =>
        submitWith({ notify: 0, ask: 0, answerBy: '2027-11-16T00:00:00.000Z' }, '').then(() => {
            expect(confirmSpy).not.toHaveBeenCalled();
            expect(patched()).toBe(true);
        }));

    it('saves without a dialog when the preview fails', () =>
        submitWith(new Error('module off'), '').then(() => {
            expect(confirmSpy).not.toHaveBeenCalled();
            expect(patched()).toBe(true);
        }));

    it('does not even ask the server when the visitor cannot read orders', () => {
        signIn([{ action: 'update', subject: 'Product' }]);

        return submitWith({ notify: 5, ask: 5, answerBy: '2027-11-16T00:00:00.000Z' }, '').then(
            () => {
                expect(previewCalls()).toHaveLength(0);
                expect(confirmSpy).not.toHaveBeenCalled();
                expect(patched()).toBe(true);
            }
        );
    });

    it.each([
        ['an earlier date', '2027-03-01T10:00', RELEASE_ISO],
        ['a product that never had a date', '2027-04-01T10:00', null]
    ])('does not ask for %s', (_name, next, original) =>
        submitWith(
            { notify: 5, ask: 5, answerBy: '2027-11-16T00:00:00.000Z' },
            next,
            original
        ).then(() => {
            expect(previewCalls()).toHaveLength(0);
            expect(patched()).toBe(true);
        })
    );
});
