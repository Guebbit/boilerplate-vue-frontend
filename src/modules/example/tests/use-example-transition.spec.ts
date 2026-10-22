/**
 * @module
 * `useExampleTransition` — the status door used by the detail and the edit screen. A success
 * toasts; a refusal blocks in place; a 409 (someone moved it first) additionally re-reads the
 * record past the cache, so the buttons show what the server now offers.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useExampleTransition } from '../composables/use-example-transition.ts';
import { useExampleStore } from '../store';
import { i18n, loadLocale } from '@/i18n';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { Example } from '@types';

wireModulesIntoCore();

/** An example the store answers with. */
const MOVED = { id: 'ex-1', status: 'published' } as Example;

/** What the composable gave back to the host that is mounted right now. */
const hosted: { current?: ReturnType<typeof useExampleTransition> } = {};

/** The id the host routes to. */
const routedId = () => 'ex-1';

/** The host's empty render. */
const renderNothing = () => h('div');

/** A component whose only job is to run the composable inside a setup. */
const Host = defineComponent({
    setup() {
        hosted.current = useExampleTransition(routedId);
        return renderNothing;
    }
});

/** Mounts the host and returns what the composable gave back. */
const mountHost = () => {
    mount(Host, { global: { plugins: [i18n] } });
    return hosted.current!;
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('useExampleTransition', () => {
    it('moves the example and leaves no error', () => {
        const store = useExampleStore();
        const move = vi.spyOn(store, 'transitionExample').mockResolvedValue(MOVED);
        const { changeStatus, error } = mountHost();

        return changeStatus('published').then(() => {
            expect(move).toHaveBeenCalledWith('ex-1', 'published');
            expect(error.value).toBeFalsy();
        });
    });

    it('shows a 409 in place and re-reads the record once, past the cache', () => {
        const store = useExampleStore();
        vi.spyOn(store, 'transitionExample').mockRejectedValue({
            success: false,
            status: 409,
            message: 'Conflict',
            errors: [{ code: 'EXAMPLE_TRANSITION_NOT_ALLOWED', message: 'Not allowed' }]
        });
        const reread = vi.spyOn(store, 'fetchExample').mockResolvedValue(MOVED);
        const { changeStatus, error } = mountHost();

        return changeStatus('published').then(() => {
            expect(error.value).toBeTruthy();
            expect(reread).toHaveBeenCalledTimes(1);
            expect(reread).toHaveBeenCalledWith('ex-1', { forced: true });
        });
    });

    it('shows any other refusal in place without re-reading', () => {
        const store = useExampleStore();
        vi.spyOn(store, 'transitionExample').mockRejectedValue({
            success: false,
            status: 500,
            message: 'Server error',
            errors: [{ code: 'INTERNAL', message: 'Server error' }]
        });
        const reread = vi.spyOn(store, 'fetchExample').mockResolvedValue(MOVED);
        const { changeStatus, error } = mountHost();

        return changeStatus('published').then(() => {
            expect(error.value).toBeTruthy();
            expect(reread).not.toHaveBeenCalled();
        });
    });
});
