/**
 * Every nightly that measures a browser runs in the same pinned image, tag and digest, so a
 * timing or pixel change is never a silent Chrome upgrade. A bump in one workflow that leaves the
 * other behind fails here.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** The workflows folder. */
const WORKFLOWS = path.resolve(__dirname, '../../.github/workflows');

/** Every `image: cypress/included:…` line in a workflow's text. */
const pinnedImages = (workflow: string): string[] =>
    [...workflow.matchAll(/image:\s*(cypress\/included:\S+)/g)].map((match) => match[1]);

describe('the pinned browser image', () => {
    const images = readdirSync(WORKFLOWS)
        .filter((name) => name.endsWith('.yml'))
        .flatMap((name) => pinnedImages(readFileSync(path.join(WORKFLOWS, name), 'utf8')));

    it('is named by more than one workflow, so the check is not vacuous', () => {
        expect(images.length).toBeGreaterThanOrEqual(3);
    });

    it('pins a digest as well as a tag', () => {
        for (const image of images) expect(image).toMatch(/:\d+\.\d+\.\d+@sha256:[\da-f]{64}$/);
    });

    it('is one and the same everywhere', () => {
        expect(new Set(images).size).toBe(1);
    });

    it('catches a split: two digests are two images', () => {
        const split = [
            'image: cypress/included:15.18.1@sha256:' + 'a'.repeat(64),
            'image: cypress/included:15.18.1@sha256:' + 'b'.repeat(64)
        ].join('\n');

        expect(new Set(pinnedImages(split)).size).toBe(2);
    });
});
