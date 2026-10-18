/**
 * `scripts/e2e/browser-launch.ts` — the browser window every headless run is given.
 */
import { describe, expect, it } from 'vitest';
import {
    windowFor,
    withDesktopPointer,
    withWindowSize
} from '../../../../scripts/e2e/browser-launch';
import { VIEWPORTS } from '../../../../scripts/e2e/viewports';

const SIZE = { width: 1280, height: 844 };
const EMPTY = { args: ['--existing'], preferences: { keep: true } };

describe('windowFor', () => {
    it('takes the width and the height from different entries', () => {
        expect(
            windowFor({ wide: { width: 1000, height: 300 }, tall: { width: 400, height: 900 } })
        ).toEqual({
            width: 1000,
            height: 900
        });
    });

    it('returns the one entry of a single-entry matrix', () => {
        expect(windowFor({ only: { width: 390, height: 844 } })).toEqual({
            width: 390,
            height: 844
        });
    });

    it('holds the whole layout matrix: the desktop width and the phone height', () => {
        expect(windowFor(VIEWPORTS)).toEqual(SIZE);
    });
});

describe('withWindowSize', () => {
    it('sets Electron’s window through its preferences', () => {
        const options = withWindowSize(
            { name: 'electron', family: 'chromium', isHeadless: true },
            EMPTY,
            SIZE
        );

        expect(options.preferences).toEqual({ keep: true, width: 1280, height: 844 });
        expect(options.args).toEqual(['--existing']);
    });

    it('pushes --window-size for a Chromium that is not Electron', () => {
        const options = withWindowSize(
            { name: 'chromium', family: 'chromium', isHeadless: true },
            EMPTY,
            SIZE
        );

        expect(options.args).toEqual(['--existing', '--window-size=1280,844']);
    });

    it('leaves a headed run alone: the developer’s window is theirs', () => {
        expect(
            withWindowSize({ name: 'electron', family: 'chromium', isHeadless: false }, EMPTY, SIZE)
        ).toBe(EMPTY);
    });

    it('leaves Firefox alone', () => {
        expect(
            withWindowSize({ name: 'firefox', family: 'firefox', isHeadless: true }, EMPTY, SIZE)
        ).toBe(EMPTY);
    });
});

describe('withDesktopPointer', () => {
    it('gives a Chromium that is not Electron a hovering, fine pointer', () => {
        const options = withDesktopPointer(
            { name: 'chromium', family: 'chromium', isHeadless: true },
            EMPTY
        );

        expect(options.args).toEqual([
            '--existing',
            '--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4'
        ]);
    });

    it('leaves Electron alone: it already reports a mouse', () => {
        expect(
            withDesktopPointer({ name: 'electron', family: 'chromium', isHeadless: true }, EMPTY)
        ).toBe(EMPTY);
    });

    it('leaves Firefox alone', () => {
        expect(
            withDesktopPointer({ name: 'firefox', family: 'firefox', isHeadless: true }, EMPTY)
        ).toBe(EMPTY);
    });
});
