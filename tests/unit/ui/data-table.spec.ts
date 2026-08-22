/**
 * `DataTable.vue` — the accessible surface the views rely on without restating it.
 *
 * Every list page hands this component its rows and trusts it for three things no page checks
 * itself: that the table has a NAME (a page with two tables announces two nameless ones
 * otherwise), that an actions column is not a focusable sort control that sorts nothing, and
 * that a selectable row is reachable by keyboard — `@click:row` is mouse-only, and the
 * products/orders/users pages select through it.
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DataTable from '@/ui/organisms/DataTable.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import vuetify from '@/ui/vuetify';
import { i18n } from '@/infrastructure/i18n';

interface Row {
    id: string;
    name: string;
}

const headers: CoreDataTableHeader<Row>[] = [
    { title: 'Name', key: 'name' },
    { title: 'Actions', key: 'actions', synthetic: true }
];

const items: Row[] = [
    { id: 'a', name: 'Alpha' },
    { id: 'b', name: 'Beta' }
];

/** The listener `v-model` passes — the evidence the table reads selectability from. */
// eslint-disable-next-line @typescript-eslint/naming-convention -- Vue's own listener name
const selectable = { 'onUpdate:modelValue': () => {} };

/*
 * `headers` is typed on the row; the generic component's mount signature only knows `object`,
 * so the cast says what the template already checks.
 */
const mountTable = (
    props: Record<string, unknown> = {},
    attributes: Record<string, unknown> = {}
) =>
    mount(DataTable, {
        props: {
            headers: headers as CoreDataTableHeader<object>[],
            items,
            caption: 'Things',
            ...props
        },
        attrs: attributes,
        global: { plugins: [vuetify, i18n] }
    });

describe('DataTable — the name and the busy flag', () => {
    it('names the region around the table after the caption', () => {
        const region = mountTable().find('[role=region]');

        expect(region.attributes('aria-label')).toBe('Things');
        expect(region.attributes('aria-busy')).toBeUndefined();
    });

    it('flags the region busy while loading', () => {
        expect(mountTable({ loading: true }).find('[role=region]').attributes('aria-busy')).toBe(
            'true'
        );
    });
});

describe('DataTable — the headers', () => {
    it('keeps a field column sortable and makes a synthetic one inert', () => {
        const heads = mountTable().findAll('th');

        expect(heads[0].classes()).toContain('v-data-table__th--sortable');
        expect(heads[0].attributes('tabindex')).toBe('0');
        expect(heads[1].classes()).not.toContain('v-data-table__th--sortable');
        expect(heads[1].attributes('tabindex')).toBeUndefined();
    });
});

describe('DataTable — keyboard selection', () => {
    it('leaves a table without a v-model out of the tab order', () => {
        const row = mountTable().find('[data-test=list-row]');

        expect(row.attributes('tabindex')).toBeUndefined();
        expect(row.attributes('aria-selected')).toBeUndefined();
    });

    it('selects a focused row on Enter and on Space, like a click', async () => {
        const wrapper = mountTable({ modelValue: undefined }, selectable);
        const rows = wrapper.findAll('[data-test=list-row]');

        expect(rows[0].attributes('tabindex')).toBe('0');
        expect(rows[0].attributes('aria-selected')).toBe('false');

        await rows[0].trigger('keydown', { key: 'Enter' });
        await rows[1].trigger('keydown', { key: ' ' });

        expect(wrapper.emitted('update:modelValue')).toEqual([['a'], ['b']]);
    });

    it('ignores a key pressed inside a control the row contains', async () => {
        const wrapper = mount(DataTable, {
            props: {
                headers: headers as CoreDataTableHeader<object>[],
                items,
                caption: 'Things',
                modelValue: undefined
            },
            attrs: selectable,
            slots: { 'item.actions': '<button data-test="inner">x</button>' },
            global: { plugins: [vuetify, i18n] }
        });

        await wrapper.find('[data-test=inner]').trigger('keydown', { key: 'Enter' });

        expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });

    it('marks the selected row', async () => {
        const wrapper = mountTable({ modelValue: 'b' }, selectable);
        await wrapper.vm.$nextTick();

        expect(wrapper.findAll('[data-test=list-row]')[1].attributes('aria-selected')).toBe('true');
    });
});
