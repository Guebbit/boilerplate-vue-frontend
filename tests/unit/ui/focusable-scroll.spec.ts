/**
 * `v-focusable-scroll` on a real `v-table`.
 *
 * Pins what axe `scrollable-region-focusable` needs: the inner scroller (not the outer `.v-table`)
 * is keyboard-focusable, and carries a region name when given one.
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { VTable } from 'vuetify/components';
import { vFocusableScroll } from '@/ui/directives/focusable-scroll';
import vuetify from '@/ui/vuetify';

/**
 * Mounts a table under the directive.
 *
 * @param name - the directive value; the region's accessible name
 */
const mountTable = (name?: string) =>
    mount(
        {
            components: { VTable },
            directives: { focusableScroll: vFocusableScroll },
            props: { label: { type: String, default: undefined } },
            template:
                '<v-table v-focusable-scroll="label"><tbody><tr><td>a</td></tr></tbody></v-table>'
        },
        { props: { label: name }, global: { plugins: [vuetify] } }
    );

describe('v-focusable-scroll', () => {
    it('makes the scroller focusable and names it as a region', () => {
        const scroller = mountTable('Revenue').find('.v-table__wrapper');
        expect(scroller.attributes('tabindex')).toBe('0');
        expect(scroller.attributes('role')).toBe('region');
        expect(scroller.attributes('aria-label')).toBe('Revenue');
    });

    it('leaves the outer table alone', () => {
        expect(mountTable('Revenue').find('.v-table').attributes('tabindex')).toBeUndefined();
    });

    it('still makes it focusable, without a role, when given no name', () => {
        const scroller = mountTable().find('.v-table__wrapper');
        expect(scroller.attributes('tabindex')).toBe('0');
        expect(scroller.attributes('role')).toBeUndefined();
    });

    it('follows a name that changes', async () => {
        const wrapper = mountTable('Revenue');
        await wrapper.setProps({ label: 'Sales' });
        expect(wrapper.find('.v-table__wrapper').attributes('aria-label')).toBe('Sales');
    });
});
