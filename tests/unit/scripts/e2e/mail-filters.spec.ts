/**
 * `scripts/e2e/mail-filters.ts` — which email a spec means, on a profile that may not say.
 */
import { describe, expect, it } from 'vitest';
import { byTemplate, inLocale, mailAbout } from '../../../../scripts/e2e/mail-filters';

describe('byTemplate', () => {
    it('keeps the named template and drops the others', () => {
        const matches = byTemplate('orders.placed');

        expect(matches({ to: 'a@b.c', subject: 's', template: 'orders.placed' })).toBe(true);
        expect(matches({ to: 'a@b.c', subject: 's', template: 'orders.shipped' })).toBe(false);
    });

    it('lets an inbox email through, which has no template name', () => {
        expect(byTemplate('orders.placed')({ to: 'a@b.c', subject: 's' })).toBe(true);
    });
});

describe('inLocale', () => {
    it('compares the recorded language', () => {
        const matches = inLocale('it');

        expect(matches({ to: 'a@b.c', subject: 's', locale: 'it' })).toBe(true);
        expect(matches({ to: 'a@b.c', subject: 's', locale: 'en' })).toBe(false);
    });

    it('falls to the subject when the email records no language', () => {
        const matches = inLocale('it', 'Ordine');

        expect(matches({ to: 'a@b.c', subject: 'Il tuo Ordine' })).toBe(true);
        expect(matches({ to: 'a@b.c', subject: 'Your order' })).toBe(false);
    });

    it('matches a recordless email when no subject fallback is given', () => {
        expect(inLocale('it')({ to: 'a@b.c', subject: 'Your order' })).toBe(true);
    });
});

describe('mailAbout', () => {
    const matches = mailAbout('order was cancelled', 'ORD-17');

    it('wants the subject fragment and the order number together', () => {
        expect(
            matches({ to: 'a@b.c', subject: 'Your order was cancelled', lines: ['number: ORD-17'] })
        ).toBe(true);
        expect(matches({ to: 'a@b.c', subject: 'Your order was cancelled ORD-17' })).toBe(true);
    });

    it('refuses the right subject about another order, and the right order under another subject', () => {
        expect(
            matches({ to: 'a@b.c', subject: 'Your order was cancelled', lines: ['number: ORD-18'] })
        ).toBe(false);
        expect(matches({ to: 'a@b.c', subject: 'Your refund ORD-17' })).toBe(false);
    });
});
