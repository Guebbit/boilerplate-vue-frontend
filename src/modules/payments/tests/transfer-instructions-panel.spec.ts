/**
 * @module
 * `TransferInstructionsPanel` — presentational, so what is worth pinning is the one thing that
 * would silently break the customer's actual bank transfer: the reference shown on screen must
 * GROUP the same characters the copy button puts on the clipboard, never a different string.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TransferInstructionsPanel from '@/modules/payments/components/TransferInstructionsPanel.vue';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import type { OrderTransferInstructions } from '@types';

const INSTRUCTIONS: OrderTransferInstructions = {
    beneficiary: 'Guebbit Shop',
    iban: 'IT60X0542811101000000123456',
    bic: 'BPMOIT22XXX',
    reference: 'RF132EY8H44VJAVZKX80JRL'
};

const writeText = vi.fn(() => Promise.resolve());

Object.assign(navigator, { clipboard: { writeText } });

const mountPanel = (instructions: OrderTransferInstructions = INSTRUCTIONS, payBy?: string) =>
    mount(TransferInstructionsPanel, {
        props: { instructions, payBy },
        global: { plugins: [vuetify, i18n] }
    });

beforeEach(() => {
    setActivePinia(createPinia());
    writeText.mockClear();
    return loadLocale('en');
});

describe('TransferInstructionsPanel', () => {
    it('groups the reference into 4-character blocks, the shape an RF reference is read in', () => {
        const wrapper = mountPanel();

        expect(wrapper.get('[data-test=transfer-reference]').text()).toBe(
            'RF13 2EY8 H44V JAVZ KX80 JRL'
        );
    });

    it('copies the raw, ungrouped reference — never the spaced display string', () => {
        const wrapper = mountPanel();

        return wrapper
            .get('[data-test=transfer-copy-reference]')
            .trigger('click')
            .then(() => {
                expect(writeText).toHaveBeenCalledWith('RF132EY8H44VJAVZKX80JRL');
            });
    });

    it('shows the beneficiary and IBAN as given, with no grouping applied to them', () => {
        const wrapper = mountPanel();

        expect(wrapper.get('[data-test=transfer-beneficiary]').text()).toBe('Guebbit Shop');
        expect(wrapper.get('[data-test=transfer-iban]').text()).toBe('IT60X0542811101000000123456');
    });

    it('omits the BIC row when the deployment has not configured one', () => {
        const wrapper = mountPanel({ ...INSTRUCTIONS, bic: undefined });

        expect(wrapper.find('[data-test=transfer-bic]').exists()).toBe(false);
    });

    it('shows the deadline only when payBy is given', () => {
        expect(mountPanel().find('[data-test=transfer-deadline]').exists()).toBe(false);
        expect(
            mountPanel(INSTRUCTIONS, '2026-01-01T00:00:00.000Z')
                .find('[data-test=transfer-deadline]')
                .exists()
        ).toBe(true);
    });
});
