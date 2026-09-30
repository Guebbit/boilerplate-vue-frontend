/**
 * `useServerSort` — one `filters.sort` CSV behind two editors (a table header, a select), each of
 * which re-searches from page 1 when it changes the sort.
 */
import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import { useServerSort } from '@/ui/composables/use-server-sort.ts';

const setup = (sort?: string) => {
    const filters = ref<{ sort?: string; text?: string }>({ text: 'oak', ...(sort && { sort }) });
    const apply = vi.fn();
    return { filters, apply, ...useServerSort({ filters, apply }) };
};

describe('useServerSort', () => {
    it('reads the stored CSV as a table model and as a select value', () => {
        const { sortBy, choice } = setup('-price');

        expect(sortBy.value).toEqual([{ key: 'price', order: 'desc' }]);
        expect(choice.value).toBe('-price');
    });

    it('reads no sort as an empty table model and a null choice', () => {
        const { sortBy, choice } = setup();

        expect(sortBy.value).toEqual([]);
        expect(choice.value).toBeNull();
    });

    it('stores a header click, keeps the other filters, and re-searches once', () => {
        const { sortBy, filters, apply } = setup();

        sortBy.value = [{ key: 'title', order: 'asc' }];

        expect(filters.value).toEqual({ text: 'oak', sort: 'title' });
        expect(apply).toHaveBeenCalledTimes(1);
    });

    it('removes the key, rather than store an empty one, when the sort is cleared', () => {
        const { sortBy, filters, apply } = setup('title');

        sortBy.value = [];

        expect('sort' in filters.value).toBe(false);
        expect(filters.value.text).toBe('oak');
        expect(apply).toHaveBeenCalledTimes(1);
    });

    it('stores a select choice, and treats null as the default order', () => {
        const { choice, filters, apply } = setup();

        choice.value = '-price';
        expect(filters.value.sort).toBe('-price');

        choice.value = null;
        expect('sort' in filters.value).toBe(false);
        expect(apply).toHaveBeenCalledTimes(2);
    });
});
