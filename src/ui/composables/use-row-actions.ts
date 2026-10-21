/**
 * @module
 * The write a list row offers (delete, restore, revoke, a status move), as one pipeline: clear the
 * list's blocking alert, run the write, toast the success, optionally reload, and route a failure
 * into that same alert. The confirmed variant asks `useDialogStore().confirm` first and runs nothing
 * on a "no".
 *
 * The alert itself is the caller's `useBlockingError()`, passed in as its `report`/`clear` pair:
 * `ui` may not reach observability, which `report` does — see `eslint.config.ts`'s tier rules.
 */
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useDialogStore } from '@/ui/dialog.ts';

/**
 * Where a row action's failure lands: the list's own blocking alert.
 */
export interface RowActionErrorSink {
    /**
     * Shows a caught failure in the alert (and reports it, in the caller's implementation).
     */
    report: (error: unknown) => void;
    /**
     * Empties the alert before the next attempt.
     */
    clear: () => void;
}

/**
 * One row write, and what follows a success.
 */
export interface RowActionRequest {
    /**
     * The write itself.
     */
    action: () => Promise<unknown>;
    /**
     * The already-translated toast shown once the write landed.
     */
    success: string;
    /**
     * Runs after the toast, e.g. a reload when an active filter may no longer match the row.
     */
    afterwards?: () => Promise<unknown>;
}

/**
 * A row write that needs the viewer's explicit yes first.
 */
export interface ConfirmedRowActionRequest extends RowActionRequest {
    /**
     * The already-translated question. A destructive one names its row (see `DialogRequest`).
     */
    confirm: string;
}

/**
 * Everything {@link useRowActions} returns.
 */
export interface UseRowActionsReturn {
    /**
     * Runs a write straight away — for the reversible ones, like a restore.
     */
    run: (request: RowActionRequest) => Promise<void>;
    /**
     * Asks first, with an `error`-coloured confirm, and runs the write only on a yes.
     */
    runConfirmed: (request: ConfirmedRowActionRequest) => Promise<void>;
}

/**
 * Binds the row-action pipeline to one list's blocking alert.
 *
 * @param sink - The `report`/`clear` pair of the list's own `useBlockingError()`.
 * @returns The two ways to run a row write.
 */
export const useRowActions = (sink: RowActionErrorSink): UseRowActionsReturn => {
    /**
     * Toast dispatcher for the success message.
     */
    const { addMessage } = useNotificationsStore();

    /**
     * Clears the alert, writes, toasts, follows up; a failure anywhere lands in the alert.
     *
     * @param request - The write and its success message.
     * @returns A promise that always settles: a failure is reported, never rethrown.
     */
    const run = ({ action, success, afterwards }: RowActionRequest): Promise<void> => {
        sink.clear();
        return action()
            .then(() => addMessage(success))
            .then(() => afterwards?.())
            .then(() => undefined)
            .catch((error: unknown) => sink.report(error));
    };

    /**
     * Asks the viewer, then runs the write only when they accepted.
     *
     * @param request - The question, the write and its success message.
     * @returns A promise settling once the viewer answered and, on a yes, the write finished.
     */
    const runConfirmed = ({ confirm, ...request }: ConfirmedRowActionRequest): Promise<void> =>
        useDialogStore()
            .confirm({ message: confirm, color: 'error' })
            .then((accepted) => (accepted ? run(request) : undefined));

    return { run, runConfirmed };
};
