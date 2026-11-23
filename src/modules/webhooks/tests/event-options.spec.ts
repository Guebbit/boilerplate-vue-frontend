/**
 * @module
 * The two answers the forms take from the event catalogue: which options are pickable, and whether
 * a stored filter locks the url and events fields.
 */
import { describe, expect, it } from 'vitest';
import type { WebhookEventCatalogEntry } from '@types';
import { eventOptionProps, isStreamLocked } from '../domain/event-options.ts';

/** A catalogue as a manager sees it: examples readable, accounts not. */
const CATALOGUE: WebhookEventCatalogEntry[] = [
    { name: 'example.published', actions: { subscribe: true } },
    { name: 'user.updated', actions: { subscribe: false } }
];

describe('eventOptionProps', () => {
    it('disables the options the caller may not subscribe to', () => {
        expect(CATALOGUE.map((entry) => eventOptionProps(entry).disabled)).toEqual([false, true]);
    });
});

describe('isStreamLocked', () => {
    it('locks a filter naming an event the caller may not read', () => {
        expect(isStreamLocked(['example.published', 'user.updated'], CATALOGUE)).toBe(true);
    });

    it('locks `*`, which names every event', () => {
        expect(isStreamLocked(['*'], CATALOGUE)).toBe(true);
    });

    it('leaves a filter of readable events open', () => {
        expect(isStreamLocked(['example.published'], CATALOGUE)).toBe(false);
    });

    it('leaves `*` open for a caller who may read every event', () => {
        const all = CATALOGUE.map((entry) => ({ ...entry, actions: { subscribe: true } }));

        expect(isStreamLocked(['*'], all)).toBe(false);
    });

    it('does not lock before the catalogue has loaded', () => {
        expect(isStreamLocked(['*'], [])).toBe(false);
    });
});
