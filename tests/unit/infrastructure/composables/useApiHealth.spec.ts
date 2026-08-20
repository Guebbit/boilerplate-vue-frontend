/**
 * The liveness-ping watcher — `src/infrastructure/composables/use-api-health.ts`.
 *
 * The composable's whole reason to exist is that it polls *only while down* and *slowly*. That
 * contract is invisible to types and invisible to a single-probe test: it breaks the moment two
 * retry chains exist at once, and the symptom is a background request storm nobody attributes to
 * a banner. So what is asserted here is the number of probes over time, not the banner's flag.
 */
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';

import { useApiHealth } from '@/infrastructure/composables/use-api-health.ts';

const { getHealth } = vi.hoisted(() => ({ getHealth: vi.fn() }));

vi.mock('@api', () => ({ getHealth }));

/** Mounts the composable in a real component, so `onMounted`/`onUnmounted` actually run. */
const mountHealth = () =>
    mount(
        defineComponent({
            setup: () => useApiHealth(),
            template: '<div />'
        })
    );

/** Lets the probe's promise chain settle without advancing the fake clock. */
const settle = () => Promise.resolve().then(() => undefined);

beforeEach(() => {
    vi.useFakeTimers();
    getHealth.mockRejectedValue(new Error('unreachable'));
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe('useApiHealth', () => {
    it('reports down after a failed probe and up again once one succeeds', () => {
        const wrapper = mountHealth();

        return settle()
            .then(() => {
                expect(wrapper.vm.down).toBe(true);
                getHealth.mockResolvedValue({});
                globalThis.dispatchEvent(new Event('online'));
                return settle();
            })
            .then(() => {
                expect(wrapper.vm.down).toBe(false);
                wrapper.unmount();
            });
    });

    /**
     * Two `online` events while the API is down must not leave two independent 30s chains
     * running, each spawning its own successor forever with `onUnmounted` able to cancel only the
     * last one scheduled. Asserted as a probe count because that is what a network tab shows.
     */
    it('keeps exactly one retry chain across repeated online events', () => {
        const wrapper = mountHealth();

        return settle()
            .then(() => {
                // Mount probe.
                expect(getHealth).toHaveBeenCalledTimes(1);
                globalThis.dispatchEvent(new Event('online'));
                return settle();
            })
            .then(() => {
                globalThis.dispatchEvent(new Event('online'));
                return settle();
            })
            .then(() => {
                // Three probes so far: mount, and one per event.
                expect(getHealth).toHaveBeenCalledTimes(3);
                vi.advanceTimersByTime(30_000);
                return settle();
            })
            .then(() => {
                // One retry, not three.
                expect(getHealth).toHaveBeenCalledTimes(4);
                wrapper.unmount();
            });
    });

    it('stops retrying once the component is gone', () => {
        const wrapper = mountHealth();

        return settle()
            .then(() => {
                expect(getHealth).toHaveBeenCalledTimes(1);
                wrapper.unmount();
                vi.advanceTimersByTime(120_000);
                return settle();
            })
            .then(() => {
                expect(getHealth).toHaveBeenCalledTimes(1);
            });
    });
});
