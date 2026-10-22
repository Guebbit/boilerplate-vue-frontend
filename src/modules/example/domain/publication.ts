/**
 * @module
 * In any module: a reading rule — ranks fields the server already sent into the one thing a
 * screen says, and decides nothing the server decides. Returns a verdict, never copy.
 * Here: what an example's publication reads as. `publishedAt` is stamped on the first publish
 * and never moved or cleared, so the date alone never means "live" — the status does.
 * Delete it if: your record has no field whose meaning depends on another.
 * See: docs/theory/domain-layer.md#the-floor-testable-without-mounting-a-component-is-necessary-not-sufficient
 */
import type { Example } from '@types';

/**
 * What a screen says about an example's publication: `live` (published now), `withdrawn`
 * (published once, archived or back in draft since), or `never` (never published, even if archived).
 */
export type PublicationState = 'live' | 'withdrawn' | 'never';

/**
 * One example's publication, as a screen shows it.
 */
export interface Publication {
    /** Which of the three readings applies. */
    state: PublicationState;
    /** The first publish, kept across archive and restore; absent when `state` is `never`. */
    firstPublishedAt?: string;
}

/**
 * Reads an example's status and first-publish stamp into one publication state.
 *
 * @param example - The two fields the rule reads, as any reader gets them.
 * @returns `live` when the status is `published`; otherwise `withdrawn` when a first publish was
 *  stamped, else `never`. The switch covers every generated status, so a status the contract adds
 *  stops compiling here until it is placed.
 */
export const publicationOf = ({
    status,
    publishedAt
}: Pick<Example, 'status' | 'publishedAt'>): Publication => {
    switch (status) {
        case 'published': {
            return { state: 'live', firstPublishedAt: publishedAt };
        }
        case 'draft':
        case 'archived': {
            return publishedAt
                ? { state: 'withdrawn', firstPublishedAt: publishedAt }
                : { state: 'never' };
        }
    }
};
