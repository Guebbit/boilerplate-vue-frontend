/**
 * `OperatorIdentityBlock` — the provider identity e-Commerce Directive Art. 5 wants on the site:
 * nothing until the config loads, every required field after, and the phone, VAT number, trade
 * register and registration number only when the operator has them.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { Ref } from 'vue';
import OperatorIdentityBlock from '@/app/components/OperatorIdentityBlock.vue';
import { publicConfig } from '@/infrastructure/config.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { configAnswer } from '../../support/unit/config-answer.ts';

vi.mock('@/infrastructure/config.ts', async () => {
    const { ref } = await import('vue');
    return {
        publicConfig: ref(),
        loadConfig: vi.fn(() => Promise.resolve()),
        resetConfig: vi.fn()
    };
});

/**
 * Makes `GET /config` read as this answer. `publicConfig` is a plain ref under the mock above, and
 * the real one is a readonly view of the same shape; the single cast bridges that.
 */
const answerConfig = (answer: ReturnType<typeof configAnswer> | undefined): void => {
    (publicConfig as Ref<unknown>).value = answer;
};

/** The required fields of an operator, nothing optional. */
const REQUIRED = {
    legalName: 'Guebbit Demo Shop Srl',
    street: 'Via Roma 1',
    city: 'Milano',
    zip: '20100',
    country: 'IT',
    email: 'shop@example.com'
};

/** Makes `GET /config` answer with an operator carrying the required fields and these. */
const operatorAnswers = (extra: Record<string, unknown>) =>
    answerConfig(configAnswer({ operator: { ...REQUIRED, ...extra } }));

/** Mounts the block, waits for the config read to land, and returns the text of its rows. */
const renderedText = (): Promise<string> => {
    const wrapper = mount(OperatorIdentityBlock, { global: { plugins: [vuetify, i18n] } });
    return flushPromises().then(() => wrapper.get('[data-test="operator-identity"]').text());
};

beforeEach(() => {
    answerConfig(undefined);
    return loadLocale('en');
});

describe('OperatorIdentityBlock', () => {
    it('renders nothing while the config is unknown', () => {
        const wrapper = mount(OperatorIdentityBlock, { global: { plugins: [vuetify, i18n] } });

        expect(wrapper.find('[data-test="operator-identity"]').exists()).toBe(false);
    });

    it('shows the name, address and email of the operator', async () => {
        operatorAnswers({});

        const text = await renderedText();

        expect(text).toContain('Guebbit Demo Shop Srl');
        expect(text).toContain('Via Roma 1, 20100 Milano, Italy');
        expect(text).toContain('shop@example.com');
    });

    it('shows the phone, VAT number, trade register and registration number when set', async () => {
        operatorAnswers({
            phone: '+39 02 1234567',
            vatNumber: 'IT12345678901',
            tradeRegister: 'Registro Imprese di Milano',
            registrationNumber: 'MI-998877'
        });

        const text = await renderedText();

        expect(text).toContain('+39 02 1234567');
        expect(text).toContain('IT12345678901');
        expect(text).toContain('Registro Imprese di Milano');
        expect(text).toContain('MI-998877');
    });

    it('leaves out the rows the operator has no value for', async () => {
        operatorAnswers({});

        const text = await renderedText();

        expect(text).not.toContain('Phone');
        expect(text).not.toContain('VAT number');
        expect(text).not.toContain('Trade register');
        expect(text).not.toContain('Registration number');
    });
});
