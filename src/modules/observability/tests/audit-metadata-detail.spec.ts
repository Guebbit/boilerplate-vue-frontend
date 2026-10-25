/**
 * @module
 * `AuditMetadataDetail.vue` — the generic "what changed" row of an audit entry: every metadata key
 * as a label and a value, and `changes` as a before/after table. It reads no action name, so what
 * is pinned here is the shape handling, not any one audited action.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AuditMetadataDetail from '../components/AuditMetadataDetail.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/** Mounts the detail over a metadata object. */
const mountDetail = (metadata?: Record<string, unknown>) =>
    mount(AuditMetadataDetail, {
        props: { metadata },
        attachTo: document.body,
        global: { plugins: [vuetify, i18n] }
    });

beforeEach(() => {
    document.body.innerHTML = '';
    return loadLocale('en');
});

describe('AuditMetadataDetail', () => {
    it.each([undefined, {}])('renders nothing for metadata %j', (metadata) => {
        expect(mountDetail(metadata).find('[data-test=audit-details-toggle]').exists()).toBe(false);
    });

    it('starts closed and opens on the toggle, keeping aria-expanded in step', async () => {
        const wrapper = mountDetail({ changedFields: ['url'] });
        const toggle = wrapper.get('[data-test=audit-details-toggle]');

        expect(toggle.attributes('aria-expanded')).toBe('false');
        expect(wrapper.get('[data-test=audit-details]').isVisible()).toBe(false);

        await toggle.trigger('click');

        expect(toggle.attributes('aria-expanded')).toBe('true');
        expect(wrapper.get('[data-test=audit-details]').isVisible()).toBe(true);
    });

    it('lists every key with its value, arrays and objects as compact JSON', () => {
        const wrapper = mountDetail({
            changedFields: ['url', 'description'],
            clientRequestId: 'r-1'
        });

        const text = wrapper.get('[data-test=audit-details]').text();

        expect(text).toContain('changedFields');
        expect(text).toContain('["url","description"]');
        expect(text).toContain('clientRequestId');
        expect(text).toContain('r-1');
    });

    it('shows `changes` as a table of field, before and after, an unset side as a dash', () => {
        const wrapper = mountDetail({
            changes: {
                eventTypes: { from: ['order.created'], to: ['order.paid'] },
                note: { from: null, to: 'x' }
            }
        });

        const rows = wrapper
            .findAll('[data-test=audit-changes] tbody tr')
            .map((row) => row.findAll('th, td').map((cell) => cell.text()));

        expect(rows).toEqual([
            ['eventTypes', '["order.created"]', '["order.paid"]'],
            ['note', '—', 'x']
        ]);
        // The table replaces the raw `changes` pair, so the object is not printed twice.
        expect(wrapper.find('dl').exists()).toBe(false);
    });

    it('prints a `changes` value that is not a change set as an ordinary key', () => {
        const wrapper = mountDetail({ changes: 'not an object' });

        expect(wrapper.find('[data-test=audit-changes]').exists()).toBe(false);
        expect(wrapper.get('dl').text()).toContain('not an object');
    });
});
