/**
 * @module
 * `publicationOf` — the template's one reading rule. The input space is three statuses times a
 * date present or absent, so the spec is exhaustive rather than property-based. The trap it pins:
 * `publishedAt` is stamped on the first publish and never cleared, so the date alone must never
 * read as "live".
 */
import { describe, expect, it } from 'vitest';
import { ExampleStatus } from '@/types/enums.ts';
import { publicationOf } from '../domain';

/** A first-publish stamp. */
const FIRST = '2026-01-01T00:00:00.000Z';

describe('publicationOf', () => {
    it.each([
        [
            'published, with its date',
            'published',
            FIRST,
            { state: 'live', firstPublishedAt: FIRST }
        ],
        [
            'published, no date (the contract makes it optional)',
            'published',
            undefined,
            { state: 'live', firstPublishedAt: undefined }
        ],
        [
            'archived after a publish',
            'archived',
            FIRST,
            { state: 'withdrawn', firstPublishedAt: FIRST }
        ],
        ['archived, never published', 'archived', undefined, { state: 'never' }],
        [
            'back in draft after a publish',
            'draft',
            FIRST,
            { state: 'withdrawn', firstPublishedAt: FIRST }
        ],
        ['a fresh draft', 'draft', undefined, { state: 'never' }]
    ] as const)('%s', (_name, status, publishedAt, expected) => {
        expect(publicationOf({ status, publishedAt })).toEqual(expected);
    });

    it('never reads the date alone as live', () => {
        for (const status of Object.values(ExampleStatus).filter((one) => one !== 'published'))
            expect(publicationOf({ status, publishedAt: FIRST }).state).not.toBe('live');
    });

    it('keeps the first publish when an example is published again', () => {
        expect(publicationOf({ status: 'published', publishedAt: FIRST }).firstPublishedAt).toBe(
            FIRST
        );
    });
});
