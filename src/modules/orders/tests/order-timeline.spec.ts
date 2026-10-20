/**
 * @module
 * The timeline component on its own: what it renders for staff against a buyer, and that it reads
 * again when the order moves. The store read is stubbed (its own call is covered in `store.spec.ts`);
 * the server's per-caller filtering is its job, so the buyer case hands the component the rows a
 * buyer would get and asserts nothing extra is shown or invented.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import OrderTimeline from '../components/OrderTimeline.vue';
import { useOrdersStore } from '../store.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { OrderTimelineEntry } from '@types';

wireModulesIntoCore();

/**
 * Rows as the API sends them to staff: a hold only staff may see, a payment, an override with its
 * reason text and the acting account.
 */
const STAFF_ROWS: OrderTimelineEntry[] = [
    { id: 'e1', at: '2026-10-01T10:00:00.000Z', type: 'created', data: {} },
    {
        id: 'e2',
        at: '2026-10-01T10:05:00.000Z',
        type: 'paid',
        actor: 'u9',
        data: { method: 'card' }
    },
    {
        id: 'e3',
        at: '2026-10-02T09:00:00.000Z',
        type: 'status_overridden',
        actor: 'u9',
        text: 'Courier confirmed by phone',
        data: { mode: 'status', from: 'paid', to: 'shipped' }
    }
];

/**
 * The buyer's rows: no staff-only type, no actor, no text.
 */
const BUYER_ROWS: OrderTimelineEntry[] = STAFF_ROWS.slice(0, 2).map(
    ({ actor: _actor, ...row }) => row
);

/**
 * Signs in with one read rule on orders: the staff `display` makes a viewer staff, the pinned `read` a buyer.
 *
 * @param staff - whether the rule is `display:Order`
 */
const signIn = (staff: boolean) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'a@example.com', role: 'owner' };
    session.setAbilities({
        tenant: [staff ? ['display', 'Order', {}] : ['read', 'Order', { userId: 'u1' }]],
        platform: []
    });
};

/**
 * Mounts the component with the store read answering `rows`.
 *
 * @param rows - what the endpoint returns
 * @returns the mounted wrapper, after the read settled
 */
const mountTimeline = (rows: OrderTimelineEntry[], ownerId?: string) => {
    const fetchTimeline = vi.spyOn(useOrdersStore(), 'fetchTimeline').mockResolvedValue(rows);
    const wrapper = mount(OrderTimeline, {
        props: { orderId: 'o1', refreshKey: 'a', ownerId },
        global: { plugins: [vuetify, i18n] }
    });
    return flushPromises().then(() => ({ wrapper, fetchTimeline }));
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('OrderTimeline — the staff view', () => {
    it('shows every row with its actor, its note, and a badge on the rows the buyer cannot see', async () => {
        signIn(true);

        const { wrapper } = await mountTimeline(STAFF_ROWS);

        const rows = wrapper.findAll('[data-test="order-timeline-entry"]');
        expect(rows.map((row) => row.attributes('data-type'))).toEqual([
            'created',
            'paid',
            'status_overridden'
        ]);
        expect(rows[1]?.get('[data-test="order-timeline-actor"]').text()).toContain('u9');
        expect(rows[2]?.get('[data-test="order-timeline-text"]').text()).toContain(
            'Courier confirmed by phone'
        );
        expect(rows[2]?.find('[data-test="order-timeline-staff-only"]').exists()).toBe(true);
        expect(rows[1]?.find('[data-test="order-timeline-staff-only"]').exists()).toBe(false);
    });
});

describe('OrderTimeline — own money', () => {
    it('chips the rows the order’s own buyer did, for staff, and no others', async () => {
        signIn(true);

        const { wrapper } = await mountTimeline(STAFF_ROWS, 'u9');

        const rows = wrapper.findAll('[data-test="order-timeline-entry"]');
        expect(
            rows.map((row) => row.find('[data-test="order-timeline-own-order"]').exists())
        ).toEqual([false, true, true]);
    });

    it('chips nothing when the buyer did none of the rows, or the order has no buyer', async () => {
        signIn(true);

        const strangers = await mountTimeline(STAFF_ROWS, 'someone-else');
        const nobody = await mountTimeline(STAFF_ROWS);

        expect(strangers.wrapper.find('[data-test="order-timeline-own-order"]').exists()).toBe(
            false
        );
        expect(nobody.wrapper.find('[data-test="order-timeline-own-order"]').exists()).toBe(false);
    });

    it('shows no chip to a buyer, who never sees an actor', async () => {
        signIn(false);

        const { wrapper } = await mountTimeline(BUYER_ROWS, 'u9');

        expect(wrapper.find('[data-test="order-timeline-own-order"]').exists()).toBe(false);
    });
});

describe('OrderTimeline — the buyer view', () => {
    it('shows what it was given, with no actor and no staff badge', async () => {
        signIn(false);

        const { wrapper } = await mountTimeline(BUYER_ROWS);

        expect(wrapper.findAll('[data-test="order-timeline-entry"]')).toHaveLength(2);
        expect(wrapper.find('[data-test="order-timeline-actor"]').exists()).toBe(false);
        expect(wrapper.find('[data-test="order-timeline-staff-only"]').exists()).toBe(false);
    });

    it('says so when nothing has happened yet', async () => {
        signIn(false);

        const { wrapper } = await mountTimeline([]);

        expect(wrapper.find('[data-test="order-timeline-empty"]').exists()).toBe(true);
    });
});

describe('OrderTimeline — reading', () => {
    it('reads again when the order moves, and not otherwise', async () => {
        signIn(false);
        const { wrapper, fetchTimeline } = await mountTimeline(BUYER_ROWS);
        expect(fetchTimeline).toHaveBeenCalledTimes(1);

        await wrapper.setProps({ refreshKey: 'a' });
        expect(fetchTimeline).toHaveBeenCalledTimes(1);

        await wrapper.setProps({ refreshKey: 'b' });
        expect(fetchTimeline).toHaveBeenCalledTimes(2);
    });

    it('blocks in place with the failure instead of showing an empty history', async () => {
        signIn(false);
        vi.spyOn(useOrdersStore(), 'fetchTimeline').mockRejectedValue({
            status: 404,
            errors: [{ message: 'Order not found' }]
        });

        const wrapper = mount(OrderTimeline, {
            props: { orderId: 'o1' },
            global: { plugins: [vuetify, i18n] }
        });
        await flushPromises();

        expect(wrapper.get('[data-test="order-timeline-error"]').text()).toContain(
            'Order not found'
        );
        expect(wrapper.find('[data-test="order-timeline-empty"]').exists()).toBe(false);
    });
});
