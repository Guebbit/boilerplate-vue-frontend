/**
 * @module
 * `StatsPeriodForm`: it reports only a period the API will take, says why when it will not, and
 * lets the bucket size follow the range until the visitor picks one.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import StatsPeriodForm from '../components/StatsPeriodForm.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();
import type { StatsPeriodChoice } from '../domain';

/** The period the page currently shows. */
const CURRENT: StatsPeriodChoice = { from: '2026-09-01', to: '2026-09-30', interval: 'day' };

/** Mounts the form with the real i18n and Vuetify. */
const mountForm = (period: StatsPeriodChoice = CURRENT) =>
    mount(StatsPeriodForm, {
        props: { modelValue: period },
        global: { plugins: [vuetify, i18n] }
    });

/**
 * What the form has applied so far.
 *
 * @param wrapper - The mounted form.
 * @returns One tuple per `apply` event, empty when none fired.
 */
const applied = (wrapper: ReturnType<typeof mountForm>) =>
    wrapper.emitted<[StatsPeriodChoice]>('apply') ?? [];

beforeEach(() => loadLocale('en'));

describe('StatsPeriodForm', () => {
    it('applies the draft it was given', () => {
        const wrapper = mountForm();
        return wrapper
            .get('[data-test=stats-period-form]')
            .trigger('submit')
            .then(() => {
                expect(wrapper.emitted('apply')).toEqual([[CURRENT]]);
            });
    });

    it('explains and refuses a reversed range', () => {
        const wrapper = mountForm();
        return wrapper
            .get('[data-test=stats-from] input')
            .setValue('2026-10-05')
            .then(() => {
                expect(wrapper.get('[data-test=stats-period-problem]').text()).toContain(
                    'must not be after'
                );
                expect(wrapper.get('[data-test=stats-apply]').attributes('disabled')).toBeDefined();
                return wrapper.get('[data-test=stats-period-form]').trigger('submit');
            })
            .then(() => {
                expect(wrapper.emitted('apply')).toBeUndefined();
            });
    });

    it('refuses a range over two years', () => {
        const wrapper = mountForm();
        return wrapper
            .get('[data-test=stats-from] input')
            .setValue('2020-01-01')
            .then(() => {
                expect(wrapper.get('[data-test=stats-period-problem]').text()).toContain(
                    'two years'
                );
            });
    });

    it('applies a preset at once, ending today', () => {
        const wrapper = mountForm();
        return wrapper
            .get('[data-test=stats-preset-last-7]')
            .trigger('click')
            .then(() => {
                const [[period]] = applied(wrapper);
                expect(period.interval).toBe('day');
                expect(period.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                expect(new Date(period.to).getTime() - new Date(period.from).getTime()).toBe(
                    6 * 86_400_000
                );
            });
    });

    it('widens the bucket size with the range until the visitor picks one', () => {
        const wrapper = mountForm();
        return wrapper
            .get('[data-test=stats-from] input')
            .setValue('2026-08-01')
            .then(() => wrapper.get('[data-test=stats-period-form]').trigger('submit'))
            .then(() => {
                const [[period]] = applied(wrapper);
                expect(period.interval).toBe('week');
            });
    });

    it('follows a change made from outside', () => {
        const wrapper = mountForm();
        return wrapper
            .setProps({ modelValue: { from: '2026-02-01', to: '2026-02-10', interval: 'day' } })
            .then(() => {
                expect(
                    (wrapper.get('[data-test=stats-from] input').element as HTMLInputElement).value
                ).toBe('2026-02-01');
            });
    });
});
