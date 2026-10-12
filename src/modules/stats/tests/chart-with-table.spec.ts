/**
 * @module
 * `ChartWithTable`: the picture, the same numbers as a table, and the CSV built from that table.
 * Mermaid is stubbed out — its own spec covers the drawing — so what is pinned is which source the
 * picture is given and that the table and the file carry the same rows.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ChartWithTable from '../components/ChartWithTable.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();
import type { ChartModel } from '../domain';

/** The download helper, observed rather than clicked. */
const downloadBlob = vi.hoisted(() => vi.fn());

vi.mock('@guebbit/js-toolkit', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@guebbit/js-toolkit')>()),
    downloadBlob
}));

/** The picture replaced by a marker that exposes the source it was given. */
const MermaidStub = {
    props: ['definition', 'label'],
    template: '<pre data-test="stub-chart">{{ definition }}</pre>'
};

/** Two days of two series. */
const CHART: ChartModel = {
    title: 'Total sales (EUR)',
    labels: ['Oct 1', '=Oct 2'],
    yTitle: 'EUR',
    series: [{ name: 'Total sales', kind: 'bar', values: [10, 20.5] }]
};

/** Mounts the block with the picture stubbed. */
const mountBlock = (chart: ChartModel = CHART, kind: 'xy' | 'pie' = 'xy') =>
    mount(ChartWithTable, {
        props: { chart, kind, labelTitle: 'Period', fileName: 'sales' },
        global: { plugins: [vuetify, i18n], stubs: { MermaidChart: MermaidStub } }
    });

beforeEach(() => {
    vi.clearAllMocks();
    return loadLocale('en');
});

describe('ChartWithTable', () => {
    it('draws an xy chart from the xy source and a pie from the pie source', () => {
        expect(mountBlock().get('[data-test=stub-chart]').text()).toMatch(/^xychart-beta/);
        expect(mountBlock(CHART, 'pie').get('[data-test=stub-chart]').text()).toMatch(/^pie /);
    });

    it('swaps the picture for the same numbers as a table, and back', () => {
        const wrapper = mountBlock();
        return wrapper
            .get('[data-test=chart-toggle]')
            .trigger('click')
            .then(() => {
                expect(wrapper.find('[data-test=stub-chart]').exists()).toBe(false);
                const cells = wrapper
                    .findAll('[data-test=chart-table] tbody tr')
                    .map((row) => row.text());
                expect(cells).toEqual(['Oct 110', '=Oct 220.5']);
                expect(wrapper.get('[data-test=chart-toggle]').attributes('aria-pressed')).toBe(
                    'true'
                );
                return wrapper.get('[data-test=chart-toggle]').trigger('click');
            })
            .then(() => {
                expect(wrapper.find('[data-test=stub-chart]').exists()).toBe(true);
            });
    });

    it('downloads the table as a CSV with formula cells neutralised', () => {
        const wrapper = mountBlock();
        return wrapper
            .get('[data-test=chart-csv]')
            .trigger('click')
            .then(() => {
                expect(downloadBlob).toHaveBeenCalledWith(
                    "Period,Total sales\r\nOct 1,10\r\n'=Oct 2,20.5",
                    'sales.csv',
                    'text/csv'
                );
            });
    });

    it('shows an empty line and no controls when there is nothing to draw', () => {
        const wrapper = mountBlock({
            ...CHART,
            labels: [],
            series: [{ ...CHART.series[0], values: [] }]
        });
        expect(wrapper.find('[data-test=chart-empty]').exists()).toBe(true);
        expect(wrapper.find('[data-test=chart-toggle]').exists()).toBe(false);
        expect(wrapper.find('[data-test=chart-csv]').exists()).toBe(false);
    });
});
