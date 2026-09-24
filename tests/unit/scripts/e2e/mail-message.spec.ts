/**
 * `scripts/e2e/mail-message.ts` — a rendered email read back into the outbox shape the specs use.
 *
 * What matters is that the two things a flow needs survive the trip through real HTML: the
 * six-digit code a person would type, and the exact link they would click, token included.
 */
import { describe, expect, it } from 'vitest';
import { parseMailpitMessage } from '../../../../scripts/e2e/mail-message';

describe('parseMailpitMessage', () => {
    it('lifts a delivered code out of the rendered body', () => {
        const email = parseMailpitMessage('ada@example.com', {
            Subject: 'Your sign-in code',
            Text: '',
            HTML: '<h1>Hi Ada</h1><p>Use this code:</p><p style="font-size: 2rem">482913</p><p>It expires in 10 minutes.</p>'
        });

        expect(email).toEqual({
            to: 'ada@example.com',
            subject: 'Your sign-in code',
            lines: ['code: 482913']
        });
    });

    it('keeps the mailed link whole, and lifts its token', () => {
        const email = parseMailpitMessage('ada@example.com', {
            Subject: 'Reset your password',
            Text: '',
            HTML: '<p><a href="https://shop.test/">Shop</a></p><p><a href="http://localhost:8085/en/password-reset/confirm?lang=en&amp;token=abc%2Fdef">Reset</a></p>'
        });

        expect(email.token).toBe('abc/def');
        expect(email.lines).toEqual([
            'linkUrl: http://localhost:8085/en/password-reset/confirm?lang=en&token=abc%2Fdef'
        ]);
    });

    it('prefers the plain-text body when the sender provided one', () => {
        const email = parseMailpitMessage('ada@example.com', {
            Subject: 'Code',
            Text: 'Your code is\n123456\n',
            HTML: '<p>000000</p>'
        });

        expect(email.lines).toEqual(['code: 123456']);
    });

    it('reports neither when the message carries neither', () => {
        const email = parseMailpitMessage('ada@example.com', {
            Subject: 'Your order',
            Text: '',
            HTML: '<p>Order 2026-000001 is on its way.</p>'
        });

        expect(email.lines).toEqual([]);
        expect(email.token).toBeUndefined();
    });
});
