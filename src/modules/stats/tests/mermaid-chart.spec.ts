/**
 * @module
 * `MermaidChart` with the library mocked: what is pinned is the contract with Mermaid (strict
 * security level, errors thrown rather than drawn), that the SVG arrives as a parsed node, that a
 * newer definition wins over a slower older render, and that a failed render says so.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import MermaidChart from '../components/MermaidChart.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/** Mermaid's two entry points the component uses. */
const mermaidMock = vi.hoisted(() => ({
    initialize: vi.fn(),
    render: vi.fn()
}));

vi.mock('mermaid', () => ({ default: mermaidMock }));

/** A minimal SVG answer. */
const svgOf = (text: string) => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg"><text>${text}</text></svg>`
});

/** Mounts the chart with the real i18n and Vuetify. */
const mountChart = (definition: string) =>
    mount(MermaidChart, {
        props: { definition, label: 'Sales per day' },
        global: { plugins: [vuetify, i18n] }
    });

beforeEach(() => {
    vi.clearAllMocks();
    return loadLocale('en');
});

describe('MermaidChart', () => {
    it('renders the definition at the strict security level, errors thrown not drawn', () => {
        mermaidMock.render.mockResolvedValue(svgOf('one'));
        const wrapper = mountChart('pie\n "a" : 1');

        return flushPromises().then(() => {
            expect(mermaidMock.initialize).toHaveBeenCalledWith(
                expect.objectContaining({
                    securityLevel: 'strict',
                    suppressErrorRendering: true,
                    startOnLoad: false
                })
            );
            expect(mermaidMock.render).toHaveBeenCalledWith(expect.any(String), 'pie\n "a" : 1');
            expect(wrapper.get('svg text').text()).toBe('one');
        });
    });

    it('names the picture for a screen reader', () => {
        mermaidMock.render.mockResolvedValue(svgOf('one'));
        const wrapper = mountChart('pie');
        return flushPromises().then(() => {
            expect(wrapper.get('[role=img]').attributes('aria-label')).toBe('Sales per day');
        });
    });

    it('redraws when the definition changes', () => {
        mermaidMock.render.mockImplementation((_id: string, text: string) =>
            Promise.resolve(svgOf(text))
        );
        const wrapper = mountChart('first');
        return flushPromises()
            .then(() => wrapper.setProps({ definition: 'second' }))
            .then(() => flushPromises())
            .then(() => {
                expect(wrapper.get('svg text').text()).toBe('second');
            });
    });

    it('keeps the newest render when an older one answers last', () => {
        let releaseFirst: ((value: ReturnType<typeof svgOf>) => void) | undefined;
        mermaidMock.render
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        releaseFirst = resolve;
                    })
            )
            .mockImplementationOnce(() => Promise.resolve(svgOf('newer')));
        const wrapper = mountChart('first');
        return flushPromises()
            .then(() => wrapper.setProps({ definition: 'second' }))
            .then(() => flushPromises())
            .then(() => {
                releaseFirst?.(svgOf('older'));
                return flushPromises();
            })
            .then(() => {
                expect(wrapper.get('svg text').text()).toBe('newer');
            });
    });

    it('says so when the library throws', () => {
        mermaidMock.render.mockRejectedValue(new Error('Parse error'));
        const wrapper = mountChart('nonsense');
        return flushPromises().then(() => {
            expect(wrapper.find('[data-test=stats-chart-failed]').exists()).toBe(true);
        });
    });
});
