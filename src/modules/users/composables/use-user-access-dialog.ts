/**
 * @module
 * Promise wrapper around `UserAccessDialog.vue`, so a caller awaits the admin's decision the same
 * way it already awaits `useDialogStore().confirm()` — `request(...).then((result) => ...)` —
 * instead of wiring its own open flag and resolver. `UserAccessDialog` itself stays a plain
 * `v-model` component (this module's usual pattern, see `LanguageFormDialog.vue`); this composable
 * is what three call sites (`UsersList.vue`, `User.vue`, `UserEdit.vue`) would otherwise each
 * reimplement.
 */
import { ref } from 'vue';

/**
 * The user the dialog is acting on, and its current, server-loaded role/active state — the
 * baseline `UserAccessDialog` compares an admin's choice against.
 */
export interface UserAccessDialogTarget {
    id: string;
    name: string;
    role?: string;
    active?: boolean;
}

/**
 * A `request()` call's options — `skipPicker` and the values already chosen elsewhere, for
 * `UserEdit.vue`'s case: its own form collected role/active, so the dialog only needs to run its
 * confirm step, not offer the picker again.
 */
export interface UserAccessDialogRequestOptions {
    skipPicker?: boolean;
    chosenRole?: string;
    chosenActive?: boolean;
}

/**
 * The admin's decision — each field present only when it differs from the target's loaded value,
 * ready to spread straight into a `PATCH /users/{id}` body.
 */
export interface UserAccessDialogResult {
    role?: string;
    active?: boolean;
}

/**
 * One dialog instance's open state and pending request, shared between a view and its template.
 *
 * @returns `isOpen` and `target`/`options` to bind onto `<UserAccessDialog>`, `request()` to open
 *  it and await the outcome, and `confirm`/`cancel` to wire onto the dialog's own events.
 */
export const useUserAccessDialog = () => {
    /**
     * Whether the dialog is currently shown.
     */
    const isOpen = ref(false);

    /**
     * The user the open dialog is acting on; `undefined` while closed.
     */
    const target = ref<UserAccessDialogTarget>();

    /**
     * The open dialog's picker/skip-picker configuration; `undefined` while closed.
     */
    const options = ref<UserAccessDialogRequestOptions>();

    /**
     * Settles the promise `request()` handed back to its caller. `undefined` while closed.
     */
    let settle: ((result?: UserAccessDialogResult) => void) | undefined;

    /**
     * Opens the dialog for one user and returns a promise for the admin's decision.
     *
     * @param requestedTarget - Who the dialog acts on, and their loaded role/active.
     * @param requestOptions - Skip-picker mode plus the values already chosen, for `UserEdit.vue`.
     * @returns A promise resolving with the changed fields once the admin confirms, or `undefined`
     *  once they cancel — never rejects, mirroring `useDialogStore().confirm()`.
     */
    const request = (
        requestedTarget: UserAccessDialogTarget,
        requestOptions: UserAccessDialogRequestOptions = {}
    ): Promise<UserAccessDialogResult | undefined> => {
        target.value = requestedTarget;
        options.value = requestOptions;
        isOpen.value = true;
        return new Promise((resolve) => {
            settle = resolve;
        });
    };

    /**
     * Closes the dialog and settles its promise, whichever way it ended.
     *
     * @param result - The confirmed change, or `undefined` on cancel.
     */
    const settleAndClose = (result?: UserAccessDialogResult) => {
        isOpen.value = false;
        settle?.(result);
        settle = undefined;
    };

    return {
        isOpen,
        target,
        options,
        request,
        confirm: (result: UserAccessDialogResult) => settleAndClose(result),
        cancel: () => settleAndClose(undefined)
    };
};
