/**
 * @module
 * `holdWhileSubmitting` — the hydration source of an edit form does not move while a save is in
 * flight, and a rolled-back save (the old content again) is not a change worth hydrating from.
 */
import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import { holdWhileSubmitting } from '@/ui/composables/use-hold-while-submitting.ts';

describe('holdWhileSubmitting', () => {
    it('follows the record while no save is running', () => {
        const record = ref<{ title: string } | undefined>({ title: 'a' });
        const held = holdWhileSubmitting(ref(false), () => record.value);

        expect(held.value).toEqual({ title: 'a' });
        record.value = { title: 'b' };
        expect(held.value).toEqual({ title: 'b' });
    });

    it('freezes while busy, so an optimistic patch never reaches the form', () => {
        const busy = ref(false);
        const record = ref<{ title: string }>({ title: 'a' });
        const held = holdWhileSubmitting(busy, () => ({ ...record.value }));
        expect(held.value).toEqual({ title: 'a' });

        busy.value = true;
        record.value = { title: 'typed' };

        expect(held.value).toEqual({ title: 'a' });
    });

    it('returns the same object after a rollback, so nothing re-hydrates', async () => {
        const busy = ref(false);
        const record = ref<{ title: string }>({ title: 'a' });
        const held = holdWhileSubmitting(busy, () => ({ ...record.value }));
        const before = held.value;

        busy.value = true;
        record.value = { title: 'typed' };
        record.value = { title: 'a' };
        busy.value = false;
        await nextTick();

        expect(held.value).toBe(before);
    });

    it('moves to the saved content once the save is over', () => {
        const busy = ref(true);
        const record = ref<{ title: string }>({ title: 'a' });
        const held = holdWhileSubmitting(busy, () => ({ ...record.value }));

        record.value = { title: 'saved' };
        busy.value = false;

        expect(held.value).toEqual({ title: 'saved' });
    });
});
