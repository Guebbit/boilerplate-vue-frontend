/**
 * `RowDeletedChip.vue` — the "Deleted" marker of a soft-deleted row. The caller owns the `v-if`;
 * this fixes the label, the warning colour and the `row-deleted` hook the e2e specs look for.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { VChip } from 'vuetify/components';
import RowDeletedChip from '@/ui/molecules/RowDeletedChip.vue';
import vuetify from '@/ui/vuetify';
import { i18n, loadLocale } from '@/i18n';
import enMessages from '@/locales/en.json';

beforeAll(() => loadLocale('en'));

/** The mounted chip. */
const mountChip = () => mount(RowDeletedChip, { global: { plugins: [vuetify, i18n] } });

describe('RowDeletedChip', () => {
    it('shows the generic "deleted" label', () => {
        expect(mountChip().text()).toBe(enMessages.generic.deleted);
    });

    it('carries the row-deleted test hook', () => {
        expect(mountChip().find('[data-test="row-deleted"]').exists()).toBe(true);
    });

    it('is a small tonal warning chip', () => {
        const chip = mountChip().findComponent(VChip);

        expect(chip.props()).toMatchObject({ size: 'small', variant: 'tonal', color: 'warning' });
    });
});
