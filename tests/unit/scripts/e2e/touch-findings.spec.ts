/**
 * @module
 * `scripts/e2e/touch-findings.ts` — each rule gets a red probe and a green probe.
 */
import { describe, expect, it } from 'vitest';
import {
    classifyTouchProbes,
    gatedFindings,
    type TouchProbe
} from '../../../../scripts/e2e/touch-findings';

/** A plain, visible button: no rule fires on it. */
const probe = (overrides: Partial<TouchProbe> = {}): TouchProbe => ({
    selector: 'button.save',
    isControl: true,
    interactive: true,
    opacity: 1,
    visibility: 'visible',
    selectionControlInput: false,
    fileInput: false,
    title: '',
    text: 'Save',
    clipped: false,
    accessibleName: 'Save',
    describedByTooltip: false,
    ...overrides
});

describe('hidden-control', () => {
    it('flags a control a hover would reveal (opacity 0)', () => {
        const findings = classifyTouchProbes([probe({ opacity: 0 })]);

        expect(findings).toEqual([
            { kind: 'hidden-control', detail: 'button.save', count: 1, selectors: ['button.save'] }
        ]);
    });

    it('flags a control that is visibility: hidden', () => {
        expect(classifyTouchProbes([probe({ visibility: 'hidden' })])[0]?.kind).toBe(
            'hidden-control'
        );
    });

    it('lets a fully visible control, and a half-faded one, pass', () => {
        expect(classifyTouchProbes([probe(), probe({ opacity: 0.5 })])).toEqual([]);
    });

    it('lets a selection-control input and a file input hide: the glyph beside them is the control', () => {
        expect(
            classifyTouchProbes([
                probe({ opacity: 0, selectionControlInput: true }),
                probe({ opacity: 0, fileInput: true })
            ])
        ).toEqual([]);
    });

    it('ignores a hidden thing that is not an interactive control on screen', () => {
        expect(classifyTouchProbes([probe({ opacity: 0, interactive: false })])).toEqual([]);
    });
});

describe('title-only-data', () => {
    it('flags a title the CSS clipped away', () => {
        const findings = classifyTouchProbes([
            probe({
                isControl: false,
                interactive: false,
                title: 'Connection refused after 30 seconds',
                text: 'Connection refused',
                clipped: true
            })
        ]);

        expect(findings[0]?.kind).toBe('title-only-data');
    });

    it('flags a title the JavaScript cut short with an ellipsis', () => {
        const findings = classifyTouchProbes([
            probe({
                isControl: false,
                interactive: false,
                title: 'f3a9c1d2-77aa-4c1e-9b0d-1234567890ab',
                text: 'f3a9c1d2...'
            })
        ]);

        expect(findings[0]?.kind).toBe('title-only-data');
    });

    it('lets a title that the visible text already holds pass', () => {
        expect(
            classifyTouchProbes([probe({ title: 'Save', text: 'Save changes', clipped: true })])
        ).toEqual([]);
    });
});

describe('title-only-hint', () => {
    it('records a title that adds a hint nothing cut off', () => {
        const findings = classifyTouchProbes([
            probe({ isControl: false, interactive: false, title: 'What this means', text: 'API' })
        ]);

        expect(findings[0]?.kind).toBe('title-only-hint');
    });

    it('lets an icon button whose title is its own accessible name pass', () => {
        expect(
            classifyTouchProbes([
                probe({ title: 'Notifications', text: '', accessibleName: 'Notifications (3)' })
            ])
        ).toEqual([]);
    });
});

describe('tooltip-on-non-control', () => {
    it('flags a tooltip hung on a plain element', () => {
        const findings = classifyTouchProbes([
            probe({ isControl: false, interactive: false, describedByTooltip: true })
        ]);

        expect(findings[0]?.kind).toBe('tooltip-on-non-control');
    });

    it('lets a tooltip on a button pass: the label is also its name', () => {
        expect(classifyTouchProbes([probe({ describedByTooltip: true })])).toEqual([]);
    });
});

describe('grouping and the gate', () => {
    it('groups identical hints into one finding with a count and three selectors', () => {
        const cells = Array.from({ length: 5 }, (_, index) =>
            probe({
                selector: `td.cell-${String(index)}`,
                isControl: false,
                interactive: false,
                title: 'Which baseline the tint shows',
                text: '12'
            })
        );

        const findings = classifyTouchProbes(cells);

        expect(findings).toHaveLength(1);
        expect(findings[0]?.count).toBe(5);
        expect(findings[0]?.selectors).toEqual(['td.cell-0', 'td.cell-1', 'td.cell-2']);
    });

    it('fails a test on the gated kinds and not on a hint', () => {
        const findings = classifyTouchProbes([
            probe({ opacity: 0 }),
            probe({ isControl: false, interactive: false, title: 'A hint', text: 'x' })
        ]);

        expect(findings.map(({ kind }) => kind)).toEqual(['hidden-control', 'title-only-hint']);
        expect(gatedFindings(findings).map(({ kind }) => kind)).toEqual(['hidden-control']);
    });
});
