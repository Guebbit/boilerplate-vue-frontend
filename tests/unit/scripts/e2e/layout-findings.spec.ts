/**
 * @module
 * `scripts/e2e/layout-findings.ts` — the rules around a finding: what blocks, how a case accepts
 * one, which reasons are refused, how a failure reads and which sizes a case runs at.
 */
import { describe, expect, it } from 'vitest';
import {
    applyAllowances,
    assertCaseOptions,
    assertReason,
    blockingFindings,
    gateMessage,
    sizesFor,
    type LayoutFinding
} from '../../../../scripts/e2e/layout-findings';

/** A blocking overflow finding on a plain element. */
const finding = (overrides: Partial<LayoutFinding> = {}): LayoutFinding => ({
    check: 'overflow',
    mode: 'normal',
    severity: 'blocking',
    selector: 'main div.card',
    text: 'Pay now',
    detail: 'right edge 352 > viewport 320; escapes main',
    rect: { x: 0, y: 0, width: 352, height: 40 },
    ...overrides
});

describe('assertReason', () => {
    it('accepts an argument', () => {
        expect(() => {
            assertReason('the table scrolls on purpose and says so', 'case');
        }).not.toThrow();
    });

    it.each(['', 'x', 'too short', 'TODO: fix this later when there is time'])(
        'refuses %j',
        (reason) => {
            expect(() => {
                assertReason(reason, 'case');
            }).toThrow(/not a reason/);
        }
    );

    it('points at the docs', () => {
        expect(() => {
            assertReason('x', 'case');
        }).toThrow(/layout-sweep\.md#opting-out/);
    });
});

describe('assertCaseOptions', () => {
    it('checks the reason of an only and of every allow, naming the case', () => {
        expect(() => {
            assertCaseOptions('menu open', {
                only: { viewports: ['phone'], reason: 'the activator is hidden on a phone' }
            });
        }).not.toThrow();
        expect(() => {
            assertCaseOptions('menu open', {
                allow: [{ check: 'clipped', selector: 'x', reason: 'no' }]
            });
        }).toThrow(/menu open/);
    });

    it('lets a case with no options through', () => {
        expect(() => {
            assertCaseOptions('home', undefined);
        }).not.toThrow();
    });
});

describe('applyAllowances', () => {
    const allowance = {
        check: 'overflow' as const,
        selector: 'main div.card',
        reason: 'a wide table, by design'
    };
    const allow = [allowance];

    it('marks a finding of the same check and element with the reason', () => {
        const [marked] = applyAllowances([finding()], 'phone', allow);

        expect(marked?.allowed).toBe('a wide table, by design');
    });

    it('accepts an element inside the named one', () => {
        const [marked] = applyAllowances(
            [finding({ selector: 'main div.card button.pay' })],
            'phone',
            allow
        );

        expect(marked?.allowed).toBeDefined();
    });

    it('does not accept a sibling that merely shares the prefix', () => {
        const [marked] = applyAllowances(
            [finding({ selector: 'main div.card-wide' })],
            'phone',
            allow
        );

        expect(marked?.allowed).toBeUndefined();
    });

    it('never accepts a whole check: another check on the same element still fails', () => {
        const [marked] = applyAllowances([finding({ check: 'clipped' })], 'phone', allow);

        expect(marked?.allowed).toBeUndefined();
    });

    it('limits an acceptance to the sizes it names', () => {
        const limited = [{ ...allowance, viewports: ['tablet' as const] }];

        expect(applyAllowances([finding()], 'phone', limited)[0]?.allowed).toBeUndefined();
        expect(applyAllowances([finding()], 'tablet', limited)[0]?.allowed).toBeDefined();
    });

    it('keeps the accepted finding in the list, for the report', () => {
        expect(applyAllowances([finding()], 'phone', allow)).toHaveLength(1);
    });
});

describe('blockingFindings', () => {
    it('keeps blocking findings no case accepted, and drops advisory and accepted ones', () => {
        const kept = finding({ selector: 'a' });
        const list = [
            kept,
            finding({ selector: 'b', severity: 'advisory' }),
            finding({ selector: 'c', allowed: 'because' })
        ];

        expect(blockingFindings(list)).toEqual([kept]);
    });
});

describe('gateMessage', () => {
    it('names the case, the size and one line per finding', () => {
        const message = gateMessage('home', 'phone-small', [
            finding(),
            finding({ check: 'covered', mode: 'text-spacing', selector: '#pay', detail: 'covered' })
        ]);

        expect(message).toContain('[layout home @ phone-small] 2 blocking finding(s):');
        expect(message).toContain('overflow — main div.card — right edge 352');
        expect(message).toContain('covered (text-spacing) — #pay — covered');
    });
});

describe('sizesFor', () => {
    const order = ['desktop', 'tablet', 'phone'] as const;

    it('runs every size when the case does not narrow the matrix', () => {
        expect(sizesFor(order, undefined)).toEqual(order);
    });

    it('runs the named sizes only, in matrix order', () => {
        expect(
            sizesFor(order, { only: { viewports: ['phone', 'desktop'], reason: 'r'.repeat(25) } })
        ).toEqual(['desktop', 'phone']);
    });
});
