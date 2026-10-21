/**
 * `useRowActions` — every list's row write in one pipeline: clear the alert, write, toast, follow
 * up; a failure anywhere lands in the alert and is never rethrown. The confirmed variant writes
 * nothing on a "no".
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRowActions } from '@/ui/composables/use-row-actions.ts';
import { useDialogStore } from '@/ui/dialog.ts';

// Hoisted: the toolkit mock below is evaluated before any later top-level `const`.
const { addMessageMock } = vi.hoisted(() => ({ addMessageMock: vi.fn() }));

vi.mock('@guebbit/vue-toolkit', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@guebbit/vue-toolkit')>()),
    useNotificationsStore: () => ({ addMessage: addMessageMock })
}));

/** The list's alert, as spies; `calls` records the order of every step. */
const makeSink = (calls: string[]) => ({
    report: vi.fn((error: unknown) => {
        calls.push(`report:${String(error)}`);
    }),
    clear: vi.fn(() => {
        calls.push('clear');
    })
});

beforeEach(() => {
    setActivePinia(createPinia());
    addMessageMock.mockReset();
});

describe('useRowActions — run', () => {
    it('clears, writes, toasts, then follows up — in that order', async () => {
        const calls: string[] = [];
        addMessageMock.mockImplementation((message: string) => calls.push(`toast:${message}`));
        const { run } = useRowActions(makeSink(calls));

        await run({
            action: () => Promise.resolve(calls.push('write')),
            success: 'Done',
            afterwards: () => Promise.resolve(calls.push('reload'))
        });

        expect(calls).toEqual(['clear', 'write', 'toast:Done', 'reload']);
    });

    it('reports a failed write into the alert, without toasting or following up', async () => {
        const calls: string[] = [];
        const sink = makeSink(calls);
        const afterwards = vi.fn(() => Promise.resolve());

        await expect(
            useRowActions(sink).run({
                action: () => Promise.reject(new Error('boom')),
                success: 'Done',
                afterwards
            })
        ).resolves.toBeUndefined();

        expect(sink.report).toHaveBeenCalledWith(new Error('boom'));
        expect(addMessageMock).not.toHaveBeenCalled();
        expect(afterwards).not.toHaveBeenCalled();
    });

    it('reports a failed follow-up too, after the write was toasted', async () => {
        const sink = makeSink([]);

        await useRowActions(sink).run({
            action: () => Promise.resolve(),
            success: 'Done',
            afterwards: () => Promise.reject(new Error('reload failed'))
        });

        expect(addMessageMock).toHaveBeenCalledWith('Done');
        expect(sink.report).toHaveBeenCalledWith(new Error('reload failed'));
    });
});

describe('useRowActions — runConfirmed', () => {
    it('asks with an error-coloured confirm carrying the question', async () => {
        const confirm = vi.fn(() => Promise.resolve(false));
        useDialogStore().confirm = confirm;

        await useRowActions(makeSink([])).runConfirmed({
            confirm: 'Delete "Widget"?',
            action: () => Promise.resolve(),
            success: 'Deleted'
        });

        expect(confirm).toHaveBeenCalledWith({ message: 'Delete "Widget"?', color: 'error' });
    });

    it('runs nothing — not even the alert clear — on a "no"', async () => {
        useDialogStore().confirm = () => Promise.resolve(false);
        const sink = makeSink([]);
        const action = vi.fn(() => Promise.resolve());

        await useRowActions(sink).runConfirmed({ confirm: 'Sure?', action, success: 'Deleted' });

        expect(action).not.toHaveBeenCalled();
        expect(sink.clear).not.toHaveBeenCalled();
        expect(addMessageMock).not.toHaveBeenCalled();
    });

    it('runs the whole pipeline on a "yes"', async () => {
        useDialogStore().confirm = () => Promise.resolve(true);
        const calls: string[] = [];
        addMessageMock.mockImplementation((message: string) => calls.push(`toast:${message}`));

        await useRowActions(makeSink(calls)).runConfirmed({
            confirm: 'Sure?',
            action: () => Promise.resolve(calls.push('write')),
            success: 'Deleted'
        });

        expect(calls).toEqual(['clear', 'write', 'toast:Deleted']);
    });
});
