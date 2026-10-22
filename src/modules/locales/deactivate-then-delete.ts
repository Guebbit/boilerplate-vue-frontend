/**
 * @module
 * Deletes something that must be deactivated first — the API's guard rail against deleting an
 * active language — restoring it if the delete itself fails, so a failed delete never leaves a
 * silent deactivation behind.
 */

/**
 * @param wasActive - Whether the row was active before this call. `deactivate`/`reactivate` are
 *  only ever called when this is true — an already-inactive row needs neither.
 * @param deactivate - Deactivates the row, ahead of `remove`.
 * @param remove - The actual delete.
 * @param reactivate - Reverses `deactivate`, only once `remove` has failed. Its own failure is
 *  swallowed: a failed restore must not hide the delete's own error, which is what this rejects
 *  with either way.
 * @returns A promise resolving once `remove` succeeds, or rejecting with `remove`'s own error
 *  (after the best-effort restore, when one was owed).
 */
export function deactivateThenDelete(
    wasActive: boolean,
    deactivate: () => Promise<unknown>,
    remove: () => Promise<unknown>,
    reactivate: () => Promise<unknown>
): Promise<void> {
    const deactivated = wasActive ? deactivate() : Promise.resolve(undefined);

    return deactivated.then(() =>
        remove()
            .then(() => undefined)
            .catch((deleteError: unknown) => {
                const restored = wasActive
                    ? reactivate().catch(() => undefined)
                    : Promise.resolve(undefined);
                return restored.then(() => {
                    throw deleteError;
                });
            })
    );
}
