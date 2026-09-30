/**
 * @module
 * `useTranslatedEntityForm`: the language-tab state both product forms share — seeding, restoring
 * and removing a tab, and what a failed submit does with the error.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { z } from 'zod';
import { createPinia } from 'pinia';
import { i18n, loadLocale } from '@/i18n';
import {
    useTranslatedEntityForm,
    type TranslatedForm
} from '@/modules/products/composables/use-translated-entity-form.ts';

/**
 * The composable's return, captured from inside a mounted component.
 */
type Harness = ReturnType<typeof useTranslatedEntityForm<TranslatedForm>>;

/**
 * The harness component's render function: nothing to look at.
 */
const renderNothing = () => h('div');

/**
 * A constant getter, or none when there is no value — the shape `stored` takes.
 *
 * @param value - What the getter should always return.
 */
const getterOf = <T>(value: T | undefined) => (value === undefined ? undefined : () => value);

/**
 * Mounts a component that runs the composable, and hands its return back.
 *
 * @param options - Only what a case varies; the rest is a bare-minimum form.
 */
const setup = (options: {
    fallback?: string;
    seedFallback?: boolean;
    stored?: Record<string, { title: string; description?: string }>;
    onStale?: (error: unknown) => boolean;
    reportSubmitError?: (error: unknown) => void;
}) => {
    const { fallback, seedFallback, stored, onStale, reportSubmitError } = options;
    const fallbackLocale: Ref<string | undefined> = ref(fallback);
    const storedGetter = getterOf(stored);
    const onReport = reportSubmitError ?? vi.fn();
    let result!: Harness;
    mount(
        defineComponent({
            setup() {
                result = useTranslatedEntityForm<TranslatedForm>({
                    initial: { translations: {} },
                    schema: z.custom<TranslatedForm>(),
                    formElement: ref(),
                    fallbackLocale,
                    seedFallback,
                    stored: storedGetter,
                    onStale,
                    reportSubmitError: onReport
                });
                return renderNothing;
            }
        }),
        { global: { plugins: [createPinia(), i18n] } }
    );
    return { result, fallbackLocale };
};

beforeEach(() => loadLocale('en'));

describe('useTranslatedEntityForm — tabs', () => {
    it('seeds the fallback tab once known, and makes it the shown one', async () => {
        const { result, fallbackLocale } = setup({ seedFallback: true });
        expect(result.openTags.value).toEqual([]);

        fallbackLocale.value = 'en';
        await nextTick();

        expect(result.openTags.value).toEqual(['en']);
        expect(result.activeTab.value).toBe('en');
        expect(result.form.value.translations.en).toEqual({ title: '', description: '' });
    });

    it('does not seed a fallback tab it was not asked to', async () => {
        const { result } = setup({ fallback: 'en' });
        await nextTick();

        expect(result.openTags.value).toEqual([]);
    });

    it('opens a blank tab, and shows it', () => {
        const { result } = setup({ fallback: 'en', seedFallback: true });

        result.handleAddLocale('it');

        expect(result.form.value.translations.it).toEqual({ title: '', description: '' });
        expect(result.activeTab.value).toBe('it');
    });

    it('drops a tab the server never held', () => {
        const { result } = setup({ fallback: 'en', seedFallback: true });
        result.handleAddLocale('it');

        result.handleRemoveLocale('it');

        expect('it' in result.form.value.translations).toBe(false);
        expect(result.activeTab.value).toBe('en');
    });

    it('marks a stored tab null, and brings its content back when re-opened', () => {
        const { result } = setup({
            fallback: 'en',
            stored: { en: { title: 'Desk' }, it: { title: 'Scrivania', description: 'Legno' } }
        });
        result.form.value.translations = {
            en: { title: 'Desk' },
            it: { title: 'Scrivania', description: 'Legno' }
        };

        result.handleRemoveLocale('it');
        expect(result.form.value.translations.it).toBeNull();
        expect(result.openTags.value).toEqual(['en']);

        result.handleAddLocale('it');
        expect(result.form.value.translations.it).toEqual({
            title: 'Scrivania',
            description: 'Legno'
        });
    });
});

describe('useTranslatedEntityForm — a failed submit', () => {
    it('stops at a 412 the caller handled', () => {
        const report = vi.fn();
        const { result } = setup({ onStale: () => true, reportSubmitError: report });

        result.handleSubmitFailure(new Error('412'));

        expect(report).not.toHaveBeenCalled();
    });

    it('blocks the form in place when no field can take the error', () => {
        const report = vi.fn();
        const error = { errors: ['Something broke'] };
        const { result } = setup({ onStale: () => false, reportSubmitError: report });

        result.handleSubmitFailure(error);

        expect(report).toHaveBeenCalledWith(error);
    });
});
