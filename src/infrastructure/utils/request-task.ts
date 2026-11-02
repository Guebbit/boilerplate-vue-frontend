/**
 * @module
 * Orders the answers of requests that all write the same state. Each request takes a task when
 * it leaves; an answer is applied only if no fresher answer has been applied since, so a slow
 * old answer can never overwrite a newer one. A reset is a barrier: every task taken before it
 * is dead, which is how a late answer for the previous person is kept out of the next one's store.
 * Pure: no Vue, no timers.
 */

/**
 * What a request holds from the moment it leaves.
 *
 * Calling it asks "may my answer be applied?" and, when the answer is yes, makes it the freshest
 * one applied. Ask once per answer.
 */
export interface RequestClaim {
    /**
     * Whether this answer is fresher than everything applied so far, and no reset happened since
     * the request left. `true` makes it the freshest.
     */
    (): boolean;
    /**
     * Whether no reset happened since the request left: the answer is still for the same person,
     * even if a fresher answer already won.
     */
    isSameEra: () => boolean;
}

/**
 * One ordering for one piece of state: a store's cart, a store's list.
 */
export interface RequestTasks {
    /**
     * Takes the next task. Call it synchronously where the request is sent.
     */
    take: () => RequestClaim;
    /**
     * Kills every task taken so far, and returns nothing: the next task is the first of a new era.
     */
    reset: () => void;
}

/**
 * Creates the ordering.
 *
 * @returns The task dispenser and its reset barrier.
 */
export const createRequestTasks = (): RequestTasks => {
    /**
     * The newest task handed out.
     */
    let issued = 0;

    /**
     * The newest task whose answer was applied, or the barrier a reset raised.
     */
    let applied = 0;

    /**
     * Counts resets, so a task can tell whether one happened after it was taken.
     */
    let era = 0;

    return {
        take: () => {
            issued += 1;
            const mine = issued;
            const mineEra = era;
            // Object.assign: a function that also carries `isSameEra`, so the claim is one callable.
            return Object.assign(
                () => {
                    if (mineEra !== era || mine <= applied) return false;
                    applied = mine;
                    return true;
                },
                { isSameEra: () => mineEra === era }
            );
        },
        reset: () => {
            era += 1;
            issued += 1;
            applied = issued;
        }
    };
};
