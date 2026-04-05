import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCoreStore } from '@guebbit/vue-toolkit';

describe('core store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('manages loading states with helpers', () => {
        const store = useCoreStore();

        store.setLoading('core', true);
        expect(store.getLoading('core')).toBe(true);
        expect(store.isLoading).toBe(true);

        store.setLoading('core', false);
        expect(store.getLoading('core')).toBe(false);
        expect(store.isLoading).toBe(false);

        store.setLoading('usersList', true);
        expect(store.getLoading('usersList')).toBe(true);

        store.resetLoadings();
        expect(store.getLoading('usersList')).toBe(false);
        expect(store.isLoading).toBe(false);
    });
});
