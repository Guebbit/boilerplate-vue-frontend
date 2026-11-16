/**
 * @module
 * `MermaidChart` when the Mermaid chunk itself cannot load (offline, a stale deploy, a browser
 * too old for Mermaid 12): the dynamic `import('mermaid')` rejects, and the chart says so rather
 * than leaving a blank box. The table view still holds the numbers.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import MermaidChart from '../components/MermaidChart.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

// A factory that throws makes `import('mermaid')` reject, which is what a failed chunk fetch does.
vi.mock('mermaid', () => {
    throw new Error('Failed to fetch dynamically imported module');
});

beforeEach(() => loadLocale('en'));

describe('MermaidChart when the library cannot load', () => {
    it('shows the failed state instead of a blank box', () => {
        const wrapper = mount(MermaidChart, {
            props: { definition: 'pie\n "a" : 1', label: 'Sales per day' },
            global: { plugins: [vuetify, i18n] }
        });

        return flushPromises().then(() => {
            expect(wrapper.find('[data-test=stats-chart-failed]').exists()).toBe(true);
            expect(wrapper.find('svg').exists()).toBe(false);
        });
    });
});
