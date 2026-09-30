/**
 * `scripts/e2e/mail-message.ts` — a rendered email read back into the outbox shape the specs use.
 *
 * What matters is that the two things a flow needs survive the trip through real HTML: the
 * six-digit code a person would type, and the exact link they would click, token included.
 */
import { describe, expect, it } from 'vitest';
import { mailMentions, parseMailpitMessage } from '../../../../scripts/e2e/mail-message';

describe('parseMailpitMessage', () => {
    it('lifts a delivered code out of the rendered body', () => {
        const email = parseMailpitMessage('ada@example.com', {
            Subject: 'Your sign-in code',
            Text: '',
            HTML: '<h1>Hi Ada</h1><p>Use this code:</p><p style="font-size: 2rem">482913</p><p>It expires in 10 minutes.</p>'
        });

        expect(email).toMatchObject({
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

describe('parseMailpitMessage — attachments and text', () => {
    it('lists the attachment file names, and keeps the visible text', () => {
        const email = parseMailpitMessage('ada@example.com', {
            Subject: 'Your order',
            Text: '',
            HTML: '<p>Thanks for ordering.</p>',
            Attachments: [{ FileName: 'invoice-2026-000001.pdf' }]
        });

        expect(email.attachments).toEqual(['invoice-2026-000001.pdf']);
        expect(email.text).toBe('Thanks for ordering.');
    });

    it('keeps every link, so a mail can be told apart by the page it points at', () => {
        const email = parseMailpitMessage('ada@example.com', {
            Subject: 'Payment received',
            Text: '',
            HTML: '<a href="http://localhost:8085/en/orders/abc123?lang=en&amp;x=1">View</a>'
        });

        expect(email.links).toEqual(['http://localhost:8085/en/orders/abc123?lang=en&x=1']);
        expect(mailMentions(email, '/orders/abc123')).toBe(true);
    });

    it('reports no attachments key at all when there are none', () => {
        const email = parseMailpitMessage('ada@example.com', {
            Subject: 'Hi',
            Text: 'plain',
            HTML: '<p>plain</p>',
            Attachments: []
        });

        expect(email).not.toHaveProperty('attachments');
    });
});

describe('mailMentions', () => {
    const inbox = { to: 'a@b.c', subject: 'Shipped', text: 'Tracking code: TRK-42 7' };
    const outbox = { to: 'a@b.c', subject: 'Shipped', lines: ['trackingCode: TRK-E2E-0001'] };

    it('finds the needle in an inbox body and in the outbox variables alike', () => {
        expect(mailMentions(inbox, 'TRK-42')).toBe(true);
        expect(mailMentions(outbox, 'TRK-E2E-0001')).toBe(true);
    });

    it('ignores whitespace, since a reference is grouped differently on screen and in a mail', () => {
        expect(mailMentions(inbox, 'TRK-4 27')).toBe(true);
    });

    it('says no when the needle is nowhere', () => {
        expect(mailMentions(inbox, 'TRK-99')).toBe(false);
        expect(mailMentions(outbox, 'TRK-99')).toBe(false);
    });
});
