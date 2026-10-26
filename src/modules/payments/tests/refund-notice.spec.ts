/**
 * @module
 * What the operator is told about a refund they asked for: money back, money on file, or a refusal
 * with the next step the SERVER names (`actions.settleByHand`), never one the client derives.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { EToastType } from '@guebbit/vue-toolkit';
import { loadLocale, translate } from '@/i18n';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { refundNotice } from '../composables/refund-notice.ts';

wireModulesIntoCore();

beforeEach(() => loadLocale('en'));

describe('refundNotice', () => {
    it('says what the screen says for a refund that went through', () => {
        const notice = refundNotice(
            translate,
            { id: 'r1', status: 'succeeded' },
            [],
            'payments-list-page.refund-done'
        );

        expect(notice).toEqual({ text: 'Refund requested', type: EToastType.SUCCESS });
    });

    it('says a hand-paid refund is on file, not done', () => {
        const notice = refundNotice(
            translate,
            { id: 'r1', status: 'pending' },
            ['r1'],
            'payments-list-page.refund-done'
        );

        expect(notice.text).toContain('Mark returned');
        expect(notice.type).toBe(EToastType.SUCCESS);
    });

    it('warns of a refusal, and points at Mark returned only when the server lists the record', () => {
        const refused = { id: 'r1', status: 'failed', failureReason: 'declined' } as const;

        const settleable = refundNotice(translate, refused, ['r1'], 'x');
        const retried = refundNotice(translate, refused, [], 'x');

        expect(settleable.type).toBe(EToastType.WARNING);
        expect(settleable.text).toContain('The bank declined the refund');
        expect(settleable.text).toContain('press Mark returned');
        expect(retried.text).toContain('retried automatically');
    });

    it('does not invent a reason when the server sent none', () => {
        const notice = refundNotice(translate, { id: 'r1', status: 'failed' }, [], 'x');

        expect(notice.text).toContain('no usable reason given');
    });
});
