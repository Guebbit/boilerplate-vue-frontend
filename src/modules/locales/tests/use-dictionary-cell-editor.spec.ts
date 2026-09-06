/**
 * @module
 * `use-dictionary-cell-editor.ts` — per-cell writes on the dictionary board.
 *
 * The store, the dialog and the notifications are faked at the module boundary, so what is
 * asserted is which of create/edit/remove a given cell state chooses and what it leaves behind.
 * The blur rules carry the most weight: three outcomes decided by the draft against the stored
 * value, and one of them — remove — deliberately unreachable from a blur.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { useDictionaryCellEditor } from '@/modules/locales/composables/use-dictionary-cell-editor.ts';
import type { LocaleCapability, LocaleEntry } from '@types';

/** The column every test writes into. */
const ENGLISH = { tag: 'en', nativeName: 'English', source: 'dynamic' } as LocaleCapability;

/** The tenant a NEW entry is created in. */
const OWN_TENANT = 'demo-fe';

/** The store's three writes, re-created per test so call counts start at zero. */
const addEntry = vi.fn(() => Promise.resolve());
const editEntry = vi.fn(() => Promise.resolve());
const removeEntry = vi.fn(() => Promise.resolve());

/** What `dialogStore.confirm()` resolves with; flipped per test. */
let confirmAnswer = true;

/** Every toast raised during a test. */
let messages: string[] = [];

vi.mock('@/modules/locales/store.ts', () => ({
    useLocalesStore: () => ({
        addEntry: (...arguments_: unknown[]) => addEntry(...(arguments_ as [])),
        editEntry: (...arguments_: unknown[]) => editEntry(...(arguments_ as [])),
        removeEntry: (...arguments_: unknown[]) => removeEntry(...(arguments_ as []))
    })
}));

vi.mock('@/ui/dialog.ts', () => ({
    useDialogStore: () => ({ confirm: () => Promise.resolve(confirmAnswer) })
}));

vi.mock('@guebbit/vue-toolkit', () => ({
    useNotificationsStore: () => ({
        addMessage: (message: string) => {
            messages.push(message);
        }
    })
}));

// The i18n key is echoed back so an assertion can name the message the cell chose without
// depending on the vocabulary.
vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key })
}));

vi.mock('@/infrastructure/utils/errors.ts', () => ({
    notifyErrorMessages: (addMessage: (message: string) => unknown, error: unknown) => {
        addMessage(`notified:${String(error)}`);
    }
}));

/** One stored entry, as the board's lookup returns it. */
const entry = (key: string, value: string): LocaleEntry => ({
    id: `entry-${key}`,
    locale: 'en',
    tenant: OWN_TENANT,
    key,
    value
});

/**
 * The composable wired to a fixed set of stored entries.
 *
 * `afterWrite` is a spy rather than a no-op: "the column was reloaded" is part of what a
 * successful write promises, and a mutation that drops the call is otherwise invisible.
 */
const editorWith = (
    stored: Record<string, LocaleEntry | undefined> = {},
    baselines: Record<string, string | undefined> = {}
) => {
    const afterWrite = vi.fn(() => Promise.resolve());
    const editor = useDictionaryCellEditor(
        ref(OWN_TENANT),
        (_tag, key) => stored[key],
        (_tag, key) => baselines[key],
        afterWrite
    );
    return { editor, afterWrite };
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.useRealTimers();
    confirmAnswer = true;
    messages = [];
});

describe('handleCellBlur', () => {
    it('does nothing when the cell was never typed into', () => {
        const { editor, afterWrite } = editorWith({ greeting: entry('greeting', 'Hello') });

        expect(editor.handleCellBlur(ENGLISH, 'greeting')).toBeUndefined();
        expect(addEntry).not.toHaveBeenCalled();
        expect(editEntry).not.toHaveBeenCalled();
        expect(afterWrite).not.toHaveBeenCalled();
    });

    /**
     * "Clicked through" — focus moved on, nothing changed. A save here would write the value the
     * cell already holds on every pass of the keyboard.
     */
    it('does nothing when the draft matches the stored value', () => {
        const { editor } = editorWith({ greeting: entry('greeting', 'Hello') });
        editor.handleCellInput(ENGLISH, 'greeting', 'Hello');

        expect(editor.handleCellBlur(ENGLISH, 'greeting')).toBeUndefined();
        expect(editEntry).not.toHaveBeenCalled();
    });

    it('does nothing when an empty draft matches an absent entry', () => {
        const { editor } = editorWith();
        editor.handleCellInput(ENGLISH, 'greeting', '');

        expect(editor.handleCellBlur(ENGLISH, 'greeting')).toBeUndefined();
        expect(addEntry).not.toHaveBeenCalled();
    });

    it('creates an entry in the chosen tenant when the cell was empty', () => {
        const { editor, afterWrite } = editorWith();
        editor.handleCellInput(ENGLISH, 'greeting', 'Ciao');

        return editor.handleCellBlur(ENGLISH, 'greeting')!.then(() => {
            expect(addEntry).toHaveBeenCalledWith('en', {
                tenant: OWN_TENANT,
                key: 'greeting',
                value: 'Ciao'
            });
            expect(editEntry).not.toHaveBeenCalled();
            expect(afterWrite).toHaveBeenCalledWith('en');
        });
    });

    it('edits the stored entry by its own id when the cell held one', () => {
        const { editor } = editorWith({ greeting: entry('greeting', 'Hello') });
        editor.handleCellInput(ENGLISH, 'greeting', 'Ciao');

        return editor.handleCellBlur(ENGLISH, 'greeting')!.then(() => {
            expect(editEntry).toHaveBeenCalledWith('en', 'entry-greeting', 'Ciao');
            expect(addEntry).not.toHaveBeenCalled();
        });
    });

    /**
     * The rule the composable's own doc calls out: a confirmation that opens because focus moved
     * on is a dialog nobody asked for. An emptied cell left by blur just reads its stored value
     * again.
     */
    it('never removes an entry — an emptied cell only forgets its draft', () => {
        const { editor } = editorWith({ greeting: entry('greeting', 'Hello') });
        editor.handleCellInput(ENGLISH, 'greeting', '');

        expect(editor.handleCellBlur(ENGLISH, 'greeting')).toBeUndefined();
        expect(removeEntry).not.toHaveBeenCalled();
        expect(editor.drafts.value[editor.cellId('en', 'greeting')]).toBeUndefined();
    });

    it('drops the draft and shows the saved mark once a write lands', () => {
        vi.useFakeTimers();
        const { editor } = editorWith();
        const id = editor.cellId('en', 'greeting');
        editor.handleCellInput(ENGLISH, 'greeting', 'Ciao');

        return editor.handleCellBlur(ENGLISH, 'greeting')!.then(() => {
            expect(editor.savedCells.value[id]).toBe(true);
            expect(editor.drafts.value[id]).toBeUndefined();

            // The mark is transient — it must not outlive the beat it was given.
            vi.advanceTimersByTime(1500);
            expect(editor.savedCells.value[id]).toBeUndefined();
        });
    });

    it('leaves the error on the cell and raises a toast when the write fails', () => {
        editEntry.mockRejectedValueOnce(new Error('nope'));
        const { editor, afterWrite } = editorWith({ greeting: entry('greeting', 'Hello') });
        const id = editor.cellId('en', 'greeting');
        editor.handleCellInput(ENGLISH, 'greeting', 'Ciao');

        return editor.handleCellBlur(ENGLISH, 'greeting')!.then(() => {
            expect(editor.cellErrors.value[id]).toBe('locales-dictionary-page.error-save');
            expect(messages).toContain('notified:Error: nope');
            // The column is not reloaded after a failure: nothing changed to reload.
            expect(afterWrite).not.toHaveBeenCalled();
        });
    });
});

describe('handleCellInput', () => {
    it('records the draft', () => {
        const { editor } = editorWith();
        editor.handleCellInput(ENGLISH, 'greeting', 'Ci');

        expect(editor.drafts.value[editor.cellId('en', 'greeting')]).toBe('Ci');
    });

    it('clears a previous error, so a fresh attempt starts clean', () => {
        editEntry.mockRejectedValueOnce(new Error('nope'));
        const { editor } = editorWith({ greeting: entry('greeting', 'Hello') });
        const id = editor.cellId('en', 'greeting');
        editor.handleCellInput(ENGLISH, 'greeting', 'Ciao');

        return editor.handleCellBlur(ENGLISH, 'greeting')!.then(() => {
            expect(editor.cellErrors.value[id]).toBeDefined();

            editor.handleCellInput(ENGLISH, 'greeting', 'Ciao!');
            expect(editor.cellErrors.value[id]).toBeUndefined();
        });
    });
});

describe('handleCellClear', () => {
    it('removes the entry once confirmed and names the cell in the toast', () => {
        const { editor, afterWrite } = editorWith({ greeting: entry('greeting', 'Hello') });

        return editor.handleCellClear(ENGLISH, 'greeting', new Event('click'))!.then(() => {
            expect(removeEntry).toHaveBeenCalledWith('en', 'entry-greeting');
            expect(messages).toContain('locales-dictionary-page.success-remove-named');
            expect(afterWrite).toHaveBeenCalledWith('en');
        });
    });

    /**
     * A cancel has to put the cell back exactly as it was — the stored value AND the focus, which
     * the dialog took.
     */
    it('removes nothing and restores the draft when the confirmation is declined', () => {
        confirmAnswer = false;
        const { editor } = editorWith({ greeting: entry('greeting', 'Hello') });
        const id = editor.cellId('en', 'greeting');
        editor.handleCellInput(ENGLISH, 'greeting', '');

        return editor.handleCellClear(ENGLISH, 'greeting', new Event('click'))!.then(() => {
            expect(removeEntry).not.toHaveBeenCalled();
            expect(editor.drafts.value[id]).toBeUndefined();
        });
    });

    it('asks nothing when the cell has no stored entry to remove', () => {
        const { editor } = editorWith();
        editor.handleCellInput(ENGLISH, 'greeting', '');

        expect(editor.handleCellClear(ENGLISH, 'greeting', new Event('click'))).toBeUndefined();
        expect(removeEntry).not.toHaveBeenCalled();
    });

    it('returns focus to the input the event came from on cancel', () => {
        confirmAnswer = false;
        document.body.innerHTML =
            '<div class="v-field"><input id="cell" /><button id="clear"></button></div>';
        const input = document.querySelector<HTMLInputElement>('#cell')!;
        const button = document.querySelector<HTMLButtonElement>('#clear')!;
        const { editor } = editorWith({ greeting: entry('greeting', 'Hello') });

        const event = new Event('click');
        Object.defineProperty(event, 'target', { value: button });

        return editor.handleCellClear(ENGLISH, 'greeting', event)!.then(() => {
            // The click landed on the clear button; the focus belongs on the field beside it.
            expect(document.activeElement).toBe(input);
        });
    });
});

describe('handleCellEnter', () => {
    it('removes when the cell was emptied', () => {
        const { editor } = editorWith({ greeting: entry('greeting', 'Hello') });
        editor.handleCellInput(ENGLISH, 'greeting', '');

        return editor.handleCellEnter(ENGLISH, 'greeting', new Event('keydown'))!.then(() => {
            expect(removeEntry).toHaveBeenCalledOnce();
            expect(editEntry).not.toHaveBeenCalled();
        });
    });

    it('saves when the cell holds a value — the same save a blur would do', () => {
        const { editor } = editorWith({ greeting: entry('greeting', 'Hello') });
        editor.handleCellInput(ENGLISH, 'greeting', 'Ciao');

        return editor.handleCellEnter(ENGLISH, 'greeting', new Event('keydown'))!.then(() => {
            expect(editEntry).toHaveBeenCalledWith('en', 'entry-greeting', 'Ciao');
            expect(removeEntry).not.toHaveBeenCalled();
        });
    });

    it('saves rather than removes when the cell was never typed into', () => {
        const { editor } = editorWith({ greeting: entry('greeting', 'Hello') });

        // An undefined draft is not an emptied cell: Enter on an untouched cell must not confirm
        // a removal.
        expect(editor.handleCellEnter(ENGLISH, 'greeting', new Event('keydown'))).toBeUndefined();
        expect(removeEntry).not.toHaveBeenCalled();
    });
});

describe('cellLabel', () => {
    it('names the baseline the cell would replace', () => {
        const { editor } = editorWith({}, { greeting: 'Hello' });

        expect(editor.cellLabel(ENGLISH, 'greeting')).toBe(
            'locales-dictionary-page.cell-label-baseline'
        );
    });

    it('omits the baseline when the cell already holds an entry', () => {
        const { editor } = editorWith(
            { greeting: entry('greeting', 'Ciao') },
            { greeting: 'Hello' }
        );

        expect(editor.cellLabel(ENGLISH, 'greeting')).toBe('locales-dictionary-page.cell-label');
    });

    it('omits the baseline when there is none', () => {
        const { editor } = editorWith();

        expect(editor.cellLabel(ENGLISH, 'greeting')).toBe('locales-dictionary-page.cell-label');
    });
});

describe('cellId', () => {
    /**
     * The separator has to be something no BCP 47 tag can contain, or two different cells could
     * share a draft.
     */
    it('joins tag and key with a separator no tag can contain', () => {
        const { editor } = editorWith();

        expect(editor.cellId('pt-BR', 'a.b')).toBe('pt-BR|a.b');
        expect(editor.cellId('en', 'x')).not.toBe(editor.cellId('e', 'nx'));
    });
});
