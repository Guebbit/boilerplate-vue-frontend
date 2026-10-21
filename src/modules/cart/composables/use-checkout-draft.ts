/**
 * @module
 * What a customer has typed or picked at checkout that only the browser knows: the order note, the
 * payment choice and the shipping address. Kept in `sessionStorage` under the signed-in user's id,
 * so a reload (or a crashed tab) puts it back, a second user on the same tab never reads it, and it
 * dies with the tab. The delivery method is not here: the server's cart holds that.
 */
import { BROWSER_STORAGE_NAME } from '@/infrastructure/browser-storage.ts';
import type { PaymentMethodId } from '@types';

import { readJson, removeByPrefix, writeJson } from '@/infrastructure/utils/safe-storage.ts';
/** The fields a checkout remembers. */
export interface CheckoutDraft {
    /** The free-text note, as typed (untrimmed). */
    notes: string;
    /** The chosen payment method, when one was picked. */
    paymentMethodId?: PaymentMethodId;
    /** The chosen address entry's id, when one was picked. */
    addressId?: string;
}

/** Every draft's key starts with this, so all of them can be dropped at once. */
const KEY_PREFIX = BROWSER_STORAGE_NAME.checkoutDraft;

/**
 * @param userId - the signed-in user
 * @returns that user's storage key
 */
const keyFor = (userId: string): string => `${KEY_PREFIX}${userId}`;

/**
 * Narrows a parsed value onto {@link CheckoutDraft}, dropping anything that is not the right type.
 *
 * @param value - whatever the storage held
 */
const toDraft = (value: unknown): CheckoutDraft => {
    const record =
        typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
    return {
        notes: typeof record.notes === 'string' ? record.notes : '',
        ...(typeof record.paymentMethodId === 'string'
            ? // A single cast: the API's own method ids are checked when the order is placed.
              { paymentMethodId: record.paymentMethodId as PaymentMethodId }
            : {}),
        ...(typeof record.addressId === 'string' ? { addressId: record.addressId } : {})
    };
};

/**
 * Reads the user's saved draft.
 *
 * @param userId - the signed-in user
 * @returns the draft, or an empty one when none is saved or storage is unavailable
 */
export const readCheckoutDraft = (userId: string): CheckoutDraft =>
    toDraft(readJson('session', keyFor(userId)));

/**
 * Saves the user's draft.
 *
 * @param userId - the signed-in user
 * @param draft - what to remember
 */
export const writeCheckoutDraft = (userId: string, draft: CheckoutDraft): void => {
    writeJson('session', keyFor(userId), draft);
};

/**
 * Drops every saved draft — on checkout, and when the session ends.
 */
export const clearCheckoutDrafts = (): void => {
    removeByPrefix('session', KEY_PREFIX);
};
