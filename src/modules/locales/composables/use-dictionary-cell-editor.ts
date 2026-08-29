import { ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useDialogStore } from '@/infrastructure/stores/dialog.ts';
import { useLocalesStore } from '@/modules/locales/store.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import type { LocaleCapability, LocaleEntry } from '@types';

/** How long the "saved" mark stays on a cell, in milliseconds. */
const SAVED_MARK_MS = 1500;

/** The cell's draft key: tag and key joined by a separator no BCP 47 tag can contain. */
const cellId = (tag: string, key: string) => `${tag}|${key}`;

/**
 * Per-cell writes on the dictionary board: the draft that lets a blur tell "changed" from
 * "clicked through", the save/clear/enter handlers, and the transient saved-mark and error state
 * a cell shows for its own last write.
 *
 * @param tenant - Whose dictionary a NEW entry is created in; an edit or removal targets the
 *  entry's own id instead and never reads this.
 * @param entryAt - The aggregation's current entry lookup, so a write reads the record it is
 *  about to replace rather than a stale one.
 * @param baselineAt - The aggregation's current baseline lookup, for the cell's accessible label.
 * @param afterWrite - What runs once a write settles: reload the column, the manifest, the live app.
 */
export function useDictionaryCellEditor(
    tenant: Ref<string>,
    entryAt: (tag: string, key: string) => LocaleEntry | undefined,
    baselineAt: (tag: string, key: string) => string | undefined,
    afterWrite: (tag: string) => Promise<unknown>
) {
    const { t } = useI18n();
    const { addMessage } = useNotificationsStore();
    const dialogStore = useDialogStore();
    const localesStore = useLocalesStore();

    /** Local draft per cell, so a blur can tell "changed" from "clicked through". */
    const drafts = ref<Partial<Record<string, string>>>({});

    /** Cells whose last save just landed; the check mark inside the field, cleared after a beat. */
    const savedCells = ref<Partial<Record<string, true>>>({});

    /** Cells whose last write failed; the message stays under the field until the cell is edited. */
    const cellErrors = ref<Partial<Record<string, string>>>({});

    /** The board's element, so a new row's cell can be found and focused without a global query. */
    const boardElement = ref<HTMLElement>();

    /** Drops one cell's draft, so the cell reads the stored value again. */
    const forgetDraft = (id: string) => {
        drafts.value = Object.fromEntries(Object.entries(drafts.value).filter(([k]) => k !== id));
    };

    /** Drops one cell's error, so a fresh attempt starts clean. */
    const forgetError = (id: string) => {
        cellErrors.value = Object.fromEntries(
            Object.entries(cellErrors.value).filter(([k]) => k !== id)
        );
    };

    /** Shows the saved mark on one cell, then takes it away. */
    const markSaved = (id: string) => {
        savedCells.value = { ...savedCells.value, [id]: true };
        setTimeout(() => {
            savedCells.value = Object.fromEntries(
                Object.entries(savedCells.value).filter(([k]) => k !== id)
            );
        }, SAVED_MARK_MS);
    };

    /** The `<input>` a cell event came from, whether the key landed on it or its clear button. */
    const inputOf = (event: Event): HTMLElement | null =>
        (event.target as HTMLElement | null)?.closest('.v-field')?.querySelector('input') ?? null;

    /** What every cell write ends with: the draft gone, the column reloaded, a failure on the cell. */
    const settleWrite = (language: LocaleCapability, id: string, request: Promise<unknown>) =>
        request
            .then(() => {
                forgetDraft(id);
                return afterWrite(language.tag);
            })
            .catch((error: unknown) => {
                // On the cell as well as the toast: the toast is gone in seconds, the cell is not.
                cellErrors.value = {
                    ...cellErrors.value,
                    [id]: t('locales-dictionary-page.error-save')
                };
                notifyErrorMessages(addMessage, error);
            });

    /**
     * Saves one cell on blur — if it actually changed.
     *
     * Two of the three outcomes live here, decided by what the cell held and what it holds now: a new
     * value over an empty cell CREATES the entry, a different value EDITS it. The third — an emptied
     * cell REMOVING its entry — is {@link handleCellClear}, and it is deliberately NOT reached from a
     * blur: a confirmation that opens because focus moved on is a dialog nobody asked for, and it
     * steals the focus it then has to give back. An emptied cell left by blur just reads its stored
     * value again.
     *
     * @param language - The column.
     * @param key - The row.
     * @returns Nothing; success is shown on the cell, failure on the cell and as a toast.
     */
    const handleCellBlur = (language: LocaleCapability, key: string) => {
        const id = cellId(language.tag, key);
        const draft = drafts.value[id];
        const current = entryAt(language.tag, key);
        if (draft === undefined || draft === (current?.value ?? '')) return;
        if (draft === '') {
            forgetDraft(id);
            return;
        }
        const request = current
            ? localesStore.editEntry(language.tag, current.id, draft)
            : localesStore.addEntry(language.tag, { tenant: tenant.value, key, value: draft });
        return settleWrite(
            language,
            id,
            request.then(() => markSaved(id))
        );
    };

    /**
     * Removes one cell's entry, on an explicit action: Enter on an emptied cell, or the clear button.
     *
     * Confirmed first, because an accidental select-all-and-delete must cost a click, not a
     * translation. A cancel puts the stored value and the focus back where they were. Removing an
     * entry uncovers the baseline again; it never deletes the bundled text.
     *
     * @param language - The column.
     * @param key - The row.
     * @param event - The keystroke or click, so a cancel can focus the cell it came from.
     * @returns Nothing; the outcome is reported as a toast naming the cell.
     */
    const handleCellClear = (language: LocaleCapability, key: string, event: Event) => {
        const id = cellId(language.tag, key);
        const current = entryAt(language.tag, key);
        if (!current) {
            forgetDraft(id);
            return;
        }
        const origin = inputOf(event);
        return dialogStore
            .confirm({
                message: t('locales-dictionary-page.confirm-clear', {
                    key,
                    language: language.nativeName
                }),
                color: 'error'
            })
            .then((accepted) => {
                if (!accepted) {
                    forgetDraft(id);
                    origin?.focus();
                    return;
                }
                return settleWrite(
                    language,
                    id,
                    localesStore.removeEntry(language.tag, current.id).then(() =>
                        addMessage(
                            t('locales-dictionary-page.success-remove-named', {
                                key,
                                language: language.nativeName
                            })
                        )
                    )
                );
            });
    };

    /**
     * Enter on a cell: a removal when the cell was emptied, a save otherwise — the same save a blur
     * would do, one keystroke sooner.
     */
    const handleCellEnter = (language: LocaleCapability, key: string, event: Event) => {
        const draft = drafts.value[cellId(language.tag, key)];
        return draft === '' ? handleCellClear(language, key, event) : handleCellBlur(language, key);
    };

    /** Records a keystroke in the cell's draft; a cell being typed into is no longer in error. */
    const handleCellInput = (language: LocaleCapability, key: string, draft: string) => {
        const id = cellId(language.tag, key);
        drafts.value[id] = draft;
        if (cellErrors.value[id]) forgetError(id);
    };

    /** The cell's accessible name: the key, the language, and the baseline it would be replacing. */
    const cellLabel = (language: LocaleCapability, key: string) => {
        const baseline = baselineAt(language.tag, key);
        return baseline === undefined || entryAt(language.tag, key)
            ? t('locales-dictionary-page.cell-label', { key, language: language.nativeName })
            : t('locales-dictionary-page.cell-label-baseline', {
                  key,
                  language: language.nativeName,
                  baseline
              });
    };

    return {
        drafts,
        savedCells,
        cellErrors,
        boardElement,
        cellId,
        handleCellBlur,
        handleCellClear,
        handleCellEnter,
        handleCellInput,
        cellLabel
    };
}
