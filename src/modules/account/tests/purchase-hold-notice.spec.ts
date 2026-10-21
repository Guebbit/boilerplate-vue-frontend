/**
 * @module
 * The buyer's purchase-hold banner: it says why and until when checkout is paused, shows the note
 * staff left, links to the contact page when the build has one, renders nothing without a hold in
 * force, and reloads the record on request.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import PurchaseHoldNotice from '../components/PurchaseHoldNotice.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { User } from '@types';
wireModulesIntoCore();

/** The profile the mocked store holds. */
const profile = ref<Partial<User> | undefined>();

/** The mocked store's loader. */
const fetchProfile = vi.fn(() => Promise.resolve(undefined));

vi.mock('../stores/profile.ts', () => ({
    useProfileStore: () => ({ profile, fetchProfile })
}));

// The store above is a plain object of refs, not a real Pinia store: an identity `storeToRefs` is enough.
vi.mock('pinia', async (importOriginal) => ({
    ...(await importOriginal<typeof import('pinia')>()),
    storeToRefs: (store: unknown) => store
}));

/**
 * A router with a `Contact` page, or without one.
 *
 * @param withContact - Whether the build ships the feedback module's page.
 */
const routerWith = (withContact: boolean) =>
    createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/', name: 'Home', component: { template: '<div />' } },
            ...(withContact
                ? [{ path: '/contact', name: 'Contact', component: { template: '<div />' } }]
                : [])
        ]
    });

/**
 * Mounts the banner.
 *
 * @param withContact - Whether a `Contact` route exists.
 */
const mountNotice = (withContact = true) => {
    const router = routerWith(withContact);
    return router
        .push('/')
        .then(() => router.isReady())
        .then(() => mount(PurchaseHoldNotice, { global: { plugins: [router, vuetify, i18n] } }));
};

beforeEach(() => {
    vi.clearAllMocks();
    profile.value = undefined;
    return loadLocale('en');
});

describe('PurchaseHoldNotice', () => {
    it('renders nothing while no hold is in force', () =>
        mountNotice().then((wrapper) => {
            expect(wrapper.find('[data-test=purchase-hold-notice]').exists()).toBe(false);
        }));

    it('renders nothing for a hold whose end has passed', () => {
        profile.value = {
            purchaseHold: {
                until: '2020-01-01T00:00:00.000Z',
                reason: 'staff',
                setAt: '2019-12-01T00:00:00.000Z'
            }
        };

        return mountNotice().then((wrapper) => {
            expect(wrapper.find('[data-test=purchase-hold-notice]').exists()).toBe(false);
        });
    });

    it('explains an automatic hold and says what is still allowed', () => {
        profile.value = {
            purchaseHold: {
                until: '2999-01-01T12:00:00.000Z',
                reason: 'repeated_cancellations',
                setAt: '2026-10-19T10:00:00.000Z'
            }
        };

        return mountNotice().then((wrapper) => {
            const text = wrapper.get('[data-test=purchase-hold-notice]').text();
            expect(text).toContain('Checkout is paused for your account');
            expect(text).toContain('cancelled or left unpaid');
            expect(text).toContain('at most 7 days');
            expect(text).toContain('still pay for, cancel or return');
            expect(wrapper.find('[data-test=purchase-hold-note]').exists()).toBe(false);
        });
    });

    it('shows the note staff wrote, and the contact link', () => {
        profile.value = {
            purchaseHold: {
                until: '2999-01-01T12:00:00.000Z',
                reason: 'staff',
                note: 'Please write to us about your recent orders.',
                setAt: '2026-10-19T10:00:00.000Z'
            }
        };

        return mountNotice().then((wrapper) => {
            expect(wrapper.get('[data-test=purchase-hold-note]').text()).toBe(
                'Please write to us about your recent orders.'
            );
            // The contact form opens on the account category, so the question reaches the right inbox.
            expect(wrapper.get('[data-test=purchase-hold-contact]').attributes('href')).toContain(
                '/contact?category=account'
            );
        });
    });

    it('drops the contact link on a build with no contact page', () => {
        profile.value = {
            purchaseHold: {
                until: '2999-01-01T12:00:00.000Z',
                reason: 'staff',
                setAt: '2026-10-19T10:00:00.000Z'
            }
        };

        return mountNotice(false).then((wrapper) => {
            expect(wrapper.find('[data-test=purchase-hold-contact]').exists()).toBe(false);
        });
    });

    it('loads the record on mount and reloads it, forced, when the page raises the signal', () =>
        mountNotice().then((wrapper) =>
            flushPromises()
                .then(() => {
                    expect(fetchProfile).toHaveBeenCalledWith();
                    return wrapper.setProps({ refreshSignal: 1 });
                })
                .then(() => {
                    expect(fetchProfile).toHaveBeenLastCalledWith(true);
                })
        ));
});
