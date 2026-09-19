/**
 * @module
 * `AdminOverviewTab.vue` — scoped to the one section this file's own CLEANUP_0917 work added
 * (`queues`, the parked-jobs card): every other KPI/section on this tab is a pure function of
 * props this suite does not otherwise exercise.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AdminOverviewTab from '@/modules/admin/components/AdminOverviewTab.vue';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { ObservabilityHealth } from '@types';

wireModulesIntoCore();

/** A minimal health payload, everything but `queues` fixed. */
const aHealth = (queues: ObservabilityHealth['queues']): ObservabilityHealth => ({
    status: 'ok',
    environment: 'test',
    service: 'api',
    runtimeVersion: 'v24',
    uptimeSeconds: 10,
    dependencies: {
        database: { status: 'ready' },
        cache: { status: 'disabled' },
        queue: { status: 'disabled' }
    },
    jobs: [],
    queues,
    timestamp: '2026-09-19T00:00:00.000Z'
});

const mountTab = (health?: ObservabilityHealth) =>
    mount(AdminOverviewTab, {
        props: { health, loading: false },
        global: { plugins: [vuetify, i18n] }
    });

beforeEach(() => loadLocale('en'));

describe('AdminOverviewTab — parked jobs', () => {
    it('shows no section at all when queues is empty', () => {
        const wrapper = mountTab(aHealth([]));
        expect(wrapper.findAll('[data-test=parked-queue-row]')).toHaveLength(0);
    });

    it('shows no section at all when queues is absent (no health yet)', () => {
        const wrapper = mountTab(undefined);
        expect(wrapper.findAll('[data-test=parked-queue-row]')).toHaveLength(0);
    });

    it('names every queue ObservabilityHealthQueue lists, with its own parked count', () => {
        const wrapper = mountTab(
            aHealth([
                { name: 'worker.email.send', parked: 0 },
                { name: 'worker.image.digest', parked: 3 }
            ])
        );

        const rows = wrapper.findAll('[data-test=parked-queue-row]');
        expect(rows).toHaveLength(2);
        expect(rows[0]?.text()).toContain('worker.email.send');
        expect(rows[0]?.text()).toContain('0');
        expect(rows[1]?.text()).toContain('worker.image.digest');
        expect(rows[1]?.text()).toContain('3');
    });
});
