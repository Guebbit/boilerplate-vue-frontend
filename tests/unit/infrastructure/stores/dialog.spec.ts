/**
 * The dialog store: a queue of questions, each answered by exactly one promise.
 *
 * No component tree — the host is a thin Vuetify wrapper and the contract lives here: `confirm`
 * resolves the viewer's answer and only theirs, in order, and a dismissal is a `false`.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDialogStore } from '@/infrastructure/stores/dialog.ts';

beforeEach(() => {
    setActivePinia(createPinia());
});

describe('useDialogStore', () => {
    it('queues the question for the host to render', () => {
        const store = useDialogStore();
        void store.confirm({ message: 'Delete it?', color: 'error' });
        expect(store.queue).toHaveLength(1);
        expect(store.queue[0]).toMatchObject({ message: 'Delete it?', color: 'error' });
    });

    it('resolves true when the viewer accepts', () => {
        const store = useDialogStore();
        const answer = store.confirm({ message: 'Delete it?' });
        store.answer(true);
        return expect(answer).resolves.toBe(true);
    });

    it('resolves false when the viewer declines or dismisses', () => {
        const store = useDialogStore();
        const answer = store.confirm({ message: 'Delete it?' });
        store.answer(false);
        return expect(answer).resolves.toBe(false);
    });

    it('answers questions in the order they were asked, one click each', () => {
        const store = useDialogStore();
        const first = store.confirm({ message: 'first' });
        const second = store.confirm({ message: 'second' });
        store.answer(false);
        // The second question is still waiting: one click answers one question.
        expect(store.queue.map(({ message }) => message)).toEqual(['second']);
        store.answer(true);
        return Promise.all([first, second]).then((answers) => {
            expect(answers).toEqual([false, true]);
            expect(store.queue).toHaveLength(0);
        });
    });

    it('ignores an answer with nothing asked', () => {
        const store = useDialogStore();
        expect(() => store.answer(true)).not.toThrow();
    });
});
