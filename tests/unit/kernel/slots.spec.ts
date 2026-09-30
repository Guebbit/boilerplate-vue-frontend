/**
 * `kernel/slots.ts` and `collectModuleSlots` — a module contributes components to a place another
 * module owns, and the owner reads them without importing the contributor.
 */
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import type { Component } from 'vue';
import { mount } from '@vue/test-utils';
import { collectModuleSlots } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import { SLOTS_KEY, useSlot } from '@/kernel/slots';
import type { Slots } from '@/kernel/slots';

const Alpha: Component = { template: '<i>alpha</i>' };
const Beta: Component = { template: '<i>beta</i>' };

/**
 * A module with no routes of its own, contributing what it is given.
 *
 * @param name - The module's name.
 * @param slots - What it puts into other modules' slots.
 */
const contributor = (name: string, slots?: Slots): AppModule => ({ name, routes: [], slots });

/**
 * Mounts a host that reads `product-actions` through `useSlot`, optionally under a provided set.
 *
 * @param provided - What the composition root would provide; absent means nothing was provided.
 */
const mountOwner = (provided?: Slots) => {
    const Owner = defineComponent({
        setup() {
            const actions = useSlot('product-actions');
            return () =>
                h(
                    'div',
                    actions.map((action) => h(action))
                );
        }
    });
    return mount(Owner, {
        global: provided ? { provide: { [SLOTS_KEY as symbol]: provided } } : {}
    });
};

describe('collectModuleSlots', () => {
    it('merges every contributor per slot, in module order', () => {
        const merged = collectModuleSlots([
            contributor('cart', { 'product-actions': [Alpha] }),
            contributor('orders'),
            contributor('wishlist', { 'product-actions': [Beta] })
        ]);

        expect(merged['product-actions']).toEqual([Alpha, Beta]);
    });

    it('is empty when no module contributes', () => {
        expect(collectModuleSlots([contributor('orders')])).toEqual({});
    });
});

describe('useSlot', () => {
    it('renders what the composition root provided, in order', () => {
        const wrapper = mountOwner({ 'product-actions': [Alpha, Beta] });

        expect(wrapper.text()).toBe('alphabeta');
    });

    it('renders nothing when nothing was provided at all', () => {
        expect(mountOwner().text()).toBe('');
    });

    it('renders nothing for a slot no module contributed to', () => {
        expect(mountOwner({}).text()).toBe('');
    });
});
