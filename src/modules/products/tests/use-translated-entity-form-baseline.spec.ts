/**
 * @module
 * A create form nobody has touched reads clean, even after the fallback language arrives and its
 * blank tab is seeded — otherwise the leave guard asks before the visitor leaves an empty form.
 */
import { describe, it, expect } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { z } from 'zod';
import { i18n } from '@/i18n';
import { useTranslatedEntityForm } from '../composables/use-translated-entity-form.ts';

/** The form this spec drives: a price and the language tabs, the shape both product forms share. */
interface PriceForm {
    price: number;
    translations: Record<string, { title: string; description: string }>;
}

/** A submit failure nobody reads in this spec. */
const noReport = () => undefined;

/** The host component draws nothing: only the composable's state is read. */
const renderNothing = () => null;

/**
 * Mounts a host component around the composable and hands back what the host would read.
 *
 * @param fallback - the fallback language, which a spec sets later to mimic `GET /locales` landing
 */
const mountForm = (fallback = ref<string | undefined>()) => {
    let form!: ReturnType<typeof useTranslatedEntityForm<PriceForm>>;
    mount(
        defineComponent({
            setup() {
                form = useTranslatedEntityForm<PriceForm>({
                    initial: { price: 0, translations: {} },
                    schema: z.object({
                        price: z.number(),
                        translations: z.record(
                            z.string(),
                            z.object({ title: z.string(), description: z.string() })
                        )
                    }),
                    formElement: () => undefined,
                    fallbackLocale: fallback,
                    seedFallback: true,
                    reportSubmitError: noReport
                });
                return renderNothing;
            }
        }),
        { global: { plugins: [createPinia(), i18n] } }
    );
    return { form, fallback };
};

describe('useTranslatedEntityForm — the seeded fallback tab', () => {
    it('keeps an untouched form clean when the fallback language arrives later', async () => {
        const { form, fallback } = mountForm();

        fallback.value = 'en';
        await nextTick();

        expect(Object.keys(form.form.value.translations)).toEqual(['en']);
        expect(form.isDirty.value).toBe(false);
    });

    it('still reads dirty once the visitor types into the seeded tab', async () => {
        const { form, fallback } = mountForm();
        fallback.value = 'en';
        await nextTick();

        form.form.value.translations = { en: { title: 'Basket', description: '' } };

        expect(form.isDirty.value).toBe(true);
    });

    it('does not move the baseline of a form that was already edited', async () => {
        const { form, fallback } = mountForm();
        form.form.value.price = 5;

        fallback.value = 'en';
        await nextTick();

        expect(form.isDirty.value).toBe(true);
    });
});
