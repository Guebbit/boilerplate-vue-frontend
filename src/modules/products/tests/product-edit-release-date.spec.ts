/**
 * @module
 * The edit form's release date: hydrated from the admin record into the `date` input,
 * left OUT of the PATCH while untouched (a moved date notifies the buyers who already paid, so it
 * travels only when it changed), sent as a plain day when edited and as `null` when cleared.
 * Proven against the contract's own body schema. Mounting mirrors `product-edit-purchasable.spec.ts`.
 */
import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import ProductEdit from '../views/ProductEdit.vue';
import { clearAvailability, recordAvailability } from '../availability.ts';
import { loadShop } from '@/modules/shop';
import { resetShop } from '../../../../tests/support/unit/reset-shop.ts';
import { aShop } from '../../../../tests/support/unit/fixtures.ts';
import { asStub } from '../../../../tests/support/stub.ts';
import type { ProductAvailability } from '@types';
import { createMongoAbility } from '@casl/ability';
import { useDialogStore } from '@/ui/dialog.ts';
import {
    useSessionStore,
    type PermissionAction,
    type PermissionSubject
} from '@/infrastructure/session.ts';
import { orvalMutator } from '@/infrastructure/http';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import * as schemas from '@api/schemas';
import {
    contractRequest,
    parseOrvalFixture
} from '../../../../tests/support/unit/orval-fixture-schema.ts';

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
    price: '9.99',
    currency: 'EUR',
    source: { title: 'Widget', description: 'A widget' },
    translations: {},
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
    clearAvailability();
    resetShop();
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
        if (config.url === '/products/p1' && config.method === 'GET') return admin.promise;
        if (config.url === '/shop')
            return Promise.resolve(
                parseOrvalFixture('GET', '/shop', aShop({ timeZone: 'Europe/Rome' }))
            );
        if (config.method === 'PATCH')
            return Promise.resolve(parseOrvalFixture('PATCH', '/products/p1', echo({})));
        return Promise.resolve(undefined);
    });

    const wrapper = mount(ProductEdit, {
        props: { id: 'p1' },
        global: {
            plugins: [router, vuetify, i18n]
        }
    });

    locales.resolve(parseOrvalFixture('GET', '/locales', LOCALES_RESPONSE));
    return flushPromises()
        .then(() => {
            admin.resolve(parseOrvalFixture('GET', '/products/p1', echo(adminRecord)));
            return flushPromises();
        })
        .then(() => wrapper);
};

describe('ProductEdit — release date', () => {
    /**
     * The day the product holds, as the server answers it.
     */
    const RELEASE = '2027-03-15';

    it('shows the day of a dated product in the input, as the server sent it', () =>
        mountHydrated({ releaseDate: RELEASE }).then((wrapper) => {
            const input = wrapper.get('[data-test=product-release-date-field] input');

            expect((input.element as HTMLInputElement).value).toBe('2027-03-15');
        }));

    it('leaves an untouched date out of the PATCH', () =>
        mountHydrated({ releaseDate: RELEASE })
            .then((wrapper) => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(lastPatch().data).not.toHaveProperty('releaseDate');
            }));

    it('sends a changed day as the plain day the contract accepts', () =>
        mountHydrated({ releaseDate: RELEASE })
            .then((wrapper) =>
                wrapper
                    .get('[data-test=product-release-date-field] input')
                    .setValue('2027-04-01')
                    .then(() => wrapper.get('form').trigger('submit'))
            )
            .then(flushPromises)
            .then(() => {
                expect(
                    contractRequest(schemas.UpdateProductByIdBody, lastPatch().data)
                ).toMatchObject({
                    releaseDate: '2027-04-01'
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
 * The hint line under the date input, as rendered.
 */
const hintOf = (wrapper: Awaited<ReturnType<typeof mountHydrated>>) =>
    wrapper.get('[data-test=product-release-date-field]').text();

describe('ProductEdit — the preorder hint under the release date', () => {
    it('warns that moving the date notifies the paid buyers while the date is ahead', () =>
        mountHydrated({ releaseDate: '2099-01-01' }).then((wrapper) => {
            expect(hintOf(wrapper)).toContain(
                i18n.global.t('product-edit-page.hint-release-date-preorder')
            );
        }));

    it('still warns for a preorder whose allowance is sold out', () => {
        // The server says `out_of_stock` once the allowance is gone, but paid buyers still wait.
        recordAvailability('p1', asStub<ProductAvailability>({ availability: 'out_of_stock' }), 0);

        return mountHydrated({ releaseDate: '2099-01-01' }).then((wrapper) => {
            expect(hintOf(wrapper)).toContain(
                i18n.global.t('product-edit-page.hint-release-date-preorder')
            );
        });
    });

    it.each([
        ['a hidden product', { active: false }],
        ['a product off sale', { purchasable: false }]
    ])('gives the plain hint for %s, whatever its date', (_name, flags) =>
        mountHydrated({ releaseDate: '2099-01-01', ...flags }).then((wrapper) => {
            expect(hintOf(wrapper)).not.toContain(
                i18n.global.t('product-edit-page.hint-release-date-preorder')
            );
        })
    );

    describe("on the shop's calendar", () => {
        beforeEach(() => {
            // Only `Date` is faked: promises and the router keep their real timers.
            vi.useFakeTimers({ toFake: ['Date'] });
            // 23:30 UTC on 1 June is already 2 June in Rome (UTC+2): the shop's today is the 2nd.
            vi.setSystemTime('2030-06-01T23:30:00Z');
            // The shop is read once at boot in the app; the zone is what this block is about.
            vi.mocked(orvalMutator).mockImplementation((config: { url?: string }) =>
                config.url === '/shop'
                    ? Promise.resolve(
                          parseOrvalFixture('GET', '/shop', aShop({ timeZone: 'Europe/Rome' }))
                      )
                    : Promise.resolve(undefined)
            );
            return loadShop();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("gives the plain hint for the shop's own today: it is no longer ahead", () =>
            mountHydrated({ releaseDate: '2030-06-02' }).then((wrapper) => {
                expect(hintOf(wrapper)).not.toContain(
                    i18n.global.t('product-edit-page.hint-release-date-preorder')
                );
            }));

        it("warns from the shop's tomorrow, which is still ahead", () =>
            mountHydrated({ releaseDate: '2030-06-03' }).then((wrapper) => {
                expect(hintOf(wrapper)).toContain(
                    i18n.global.t('product-edit-page.hint-release-date-preorder')
                );
            }));
    });

    it.each([
        ['a date already passed', { releaseDate: '2000-01-01' }],
        ['no date', {}]
    ])('gives the plain hint for %s', (_name, record) =>
        mountHydrated(record).then((wrapper) => {
            expect(hintOf(wrapper)).not.toContain(
                i18n.global.t('product-edit-page.hint-release-date-preorder')
            );
        })
    );
});

/**
 * A signed-in visitor holding the given rules, as the session sees abilities.
 */
const signIn = (rules: { action: PermissionAction; subject: PermissionSubject }[]) => {
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

describe('ProductEdit — the preview before a changed date', () => {
    /** The preview route the form asks. */
    const IMPACT_URL = '/delivery/fulfillment-orders/release-date-impact';

    /** The dialog's answer, set per test; the host is not mounted, so the spy answers. */
    let confirmSpy: MockInstance<ReturnType<typeof useDialogStore>['confirm']>;

    /** Rules of a manager: moves dates and reads orders. */
    const MANAGER: Parameters<typeof signIn>[0] = [
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
                        : Promise.resolve(impact)
                    : (inner?.(config) ?? Promise.resolve(undefined))
            );
            return wrapper
                .get('[data-test=product-release-date-field] input')
                .setValue(next)
                .then(() => wrapper.get('form').trigger('submit'))
                .then(flushPromises);
        });
    };

    /** The day the product holds. */
    const RELEASE_ISO = '2027-03-15';

    beforeEach(() => {
        signIn(MANAGER);
        confirmSpy = vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
    });

    it('asks before saving a later date, naming how many orders get an email', () =>
        submitWith({ notify: 12 }, '2027-04-01').then(() => {
            expect(previewCalls()).toHaveLength(1);
            expect(previewCalls()[0][0]).toMatchObject({
                params: { productId: 'p1', releaseDate: '2027-04-01' }
            });
            expect(confirmSpy).toHaveBeenCalledOnce();
            const request = confirmSpy.mock.calls[0][0] as { message: string; color: string };
            expect(request.message).toContain('12 orders get an email about the new date');
            // The shop asks nothing of the buyers: no question, no deadline, no silence rule.
            expect(request.message).not.toContain('must say yes');
            expect(request.message).not.toContain('silence');
            expect(request.color).toBe('warning');
            expect(patched()).toBe(true);
        }));

    it('names one order in the singular', () =>
        submitWith({ notify: 1 }, '2027-04-01').then(() => {
            const request = confirmSpy.mock.calls[0][0] as { message: string };
            expect(request.message).toBe('1 order gets an email about the new date');
        }));

    it('asks for a cleared date without sending a releaseDate', () =>
        submitWith({ notify: 2 }, '').then(() => {
            expect(previewCalls()[0][0]).toMatchObject({ params: { productId: 'p1' } });
            expect(
                (previewCalls()[0][0] as { params: Record<string, unknown> }).params.releaseDate
            ).toBeUndefined();
            expect(confirmSpy).toHaveBeenCalledOnce();
        }));

    it('does not save when the staff go back', () => {
        confirmSpy.mockResolvedValue(false);

        return submitWith({ notify: 1 }, '').then(() => {
            expect(confirmSpy).toHaveBeenCalledOnce();
            expect(patched()).toBe(false);
        });
    });

    it('saves without a dialog when nobody is reached', () =>
        submitWith({ notify: 0 }, '').then(() => {
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

        return submitWith({ notify: 5 }, '').then(() => {
            expect(previewCalls()).toHaveLength(0);
            expect(confirmSpy).not.toHaveBeenCalled();
            expect(patched()).toBe(true);
        });
    });

    it.each([
        ['an earlier date', '2027-03-01', RELEASE_ISO],
        ['a product that never had a date', '2027-04-01', null]
    ])('asks the server for %s, which counts nobody, and saves', (_name, next, original) =>
        submitWith({ notify: 0 }, next, original).then(() => {
            expect(previewCalls()).toHaveLength(1);
            expect(confirmSpy).not.toHaveBeenCalled();
            expect(patched()).toBe(true);
        })
    );
});
