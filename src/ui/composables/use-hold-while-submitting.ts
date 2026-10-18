/**
 * @module
 * Keeps an edit form's hydration source still while a save is in flight. The store's update is
 * optimistic: it patches the record, and puts the old one back when the save fails. Fed straight
 * to `activateAutoHydrate`, that rollback overwrites what the person typed. A change the server
 * did not confirm never reaches the form.
 */
import { computed, type ComputedRef, type Ref } from 'vue';

/**
 * The form data to hydrate from, frozen while `busy` and unchanged whenever the record's content
 * is.
 *
 * @param busy - Whether a save is in flight (`useStructureFormValidation().isSubmitting`).
 * @param source - Reads the record into the form's shape; `undefined` until it is loaded.
 * @returns The latest form data worth hydrating from. The same object is returned for an equal
 *  record, so a rolled-back save (the old content again) triggers no hydration; a saved one
 *  (new content) does, which also makes it the form's new baseline.
 */
export const holdWhileSubmitting = <T extends object>(
    busy: Readonly<Ref<boolean>>,
    source: () => T | undefined
): ComputedRef<T | undefined> => {
    let held: T | undefined;
    return computed(() => {
        if (busy.value) return held;
        const next = source();
        // Structural equality: the record's own identity changes on every patch and rollback.
        if (JSON.stringify(next) !== JSON.stringify(held)) held = next;
        return held;
    });
};
