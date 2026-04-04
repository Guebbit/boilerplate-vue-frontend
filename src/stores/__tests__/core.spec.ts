import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCoreStore } from '../core';

describe('core store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('manages loading states with helpers', () => {
        const store = useCoreStore();

        store.startLoading('core');
        expect(store.getLoading('core')).toBe(true);
        expect(store.isLoading).toBe(true);

        store.stopLoading('core');
        expect(store.getLoading('core')).toBe(false);
        expect(store.isLoading).toBe(false);

        store.setLoading('usersList', true);
        expect(store.getLoading('usersList')).toBe(true);

        store.resetLoadings();
        expect(store.getLoading('usersList')).toBeUndefined();
        expect(store.isLoading).toBe(false);
    });

    it('manages dialogs with helpers', () => {
        const store = useCoreStore();

        store.setDialog('deleteConfirm', true);
        expect(store.getDialog('deleteConfirm')).toBe(true);

        store.setDialog('deleteConfirm', false);
        expect(store.getDialog('deleteConfirm')).toBe(false);

        store.resetDialogs();
        expect(store.getDialog('deleteConfirm')).toBeUndefined();
    });
});
