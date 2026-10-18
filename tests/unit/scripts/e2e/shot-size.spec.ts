/**
 * `scripts/e2e/shot-size.ts` — a clamped screenshot never becomes a baseline.
 */
import { describe, expect, it } from 'vitest';
import { shotSizeProblem } from '../../../../scripts/e2e/shot-size';

describe('shotSizeProblem', () => {
    it('passes a shot exactly the viewport’s size', () => {
        expect(
            shotSizeProblem({ width: 390, height: 844 }, { width: 390, height: 844 })
        ).toBeUndefined();
    });

    it('names the window when the shot is shorter than the viewport', () => {
        expect(shotSizeProblem({ width: 390, height: 720 }, { width: 390, height: 844 })).toBe(
            'the shot is 390x720 but the viewport is 390x844: the browser window is smaller than the viewport (see scripts/e2e/browser-launch.ts)'
        );
    });

    it('names the pixel ratio when the shot is exactly double', () => {
        expect(
            shotSizeProblem({ width: 780, height: 1688 }, { width: 390, height: 844 })
        ).toContain('device pixel ratio is 2');
    });
});
