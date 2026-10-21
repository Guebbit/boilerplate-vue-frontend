<script setup lang="ts">
/**
 * @module
 * The card a single-form page is: the fields, one submit button, and the way back.
 *
 * The create pages are the same skeleton over different fields — `ProductCreate` and `UserCreate`
 * agreed on the card's width, the `novalidate` form, the block submit button and the centred text
 * link under it, and disagreed only about what goes between. What is left in each view is its own
 * fields and its own script, which is the part worth reading.
 *
 * Sibling of {@link ItemDetailLayout}, and it stays out of `LayoutDefault` for the same reason
 * that one does: the page owns its layout, and a card that brought its own could not be used
 * inside a page that already has one.
 *
 * Slots: `before` (above the form), default (the fields), `after-submit` (inside the form, under the
 * button — the blocking error), `footer` (below the form — e.g. the OAuth buttons).
 */
import { ref } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';

/**
 * Card width and top margin per size: `md` is the narrow auth card, `xl` the wide create-form card.
 */
const SIZE_CLASSES = {
    md: 'mt-16 max-w-md',
    xl: 'mt-10 max-w-xl'
} as const;

/**
 * Whether the card's submit is in flight, which disables its actions.
 */
const {
    loading,
    size = 'xl',
    submitColor = 'primary'
} = defineProps<{
    /**
     * The submit button's text, already translated.
     */
    submitLabel: string;
    /**
     * Where the text link under the form goes; the locale prefix is added here. The link renders
     * only when both this and `backLabel` are set.
     */
    backTo?: RouteLocationRaw;
    /**
     * The text link's own text, already translated.
     */
    backLabel?: string;
    /**
     * Card width: `xl` (default) or the narrower `md`.
     */
    size?: keyof typeof SIZE_CLASSES;
    /**
     * Colour of the submit button; a destructive action passes `error`.
     */
    submitColor?: string;
    /**
     * Test hook of the submit button.
     */
    submitTest?: string;
    /**
     * Whether a submit is in flight — the button spins and refuses a second one.
     */
    loading?: boolean;
}>();

/**
 * The slots around and inside the form; see the module header.
 */
defineSlots<{
    /**
     * Content above the form.
     */
    before?(): unknown;
    /**
     * The fields.
     */
    default?(): unknown;
    /**
     * Content under the submit button, inside the form.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention -- slot names are kebab-case in templates (`#after-submit`)
    'after-submit'?(): unknown;
    /**
     * Content below the form.
     */
    footer?(): unknown;
}>();

/**
 * Emitted on form submit; the page owns validation and does the actual submitting.
 */
const emit = defineEmits<{ submit: [] }>();

/**
 * The `<form>` itself, exposed because `useStructureFormValidation` focuses the first invalid field inside it and
 * the page that owns the form's state is a level up from the element.
 */
const formElement = ref<HTMLFormElement>();
defineExpose({ formElement });
</script>

<template>
    <v-card class="mx-auto w-full p-8" :class="SIZE_CLASSES[size]">
        <slot name="before" />
        <form ref="formElement" novalidate @submit.prevent="emit('submit')">
            <slot />
            <v-btn
                type="submit"
                :color="submitColor"
                size="large"
                block
                :loading="loading"
                :disabled="loading"
                class="mt-2"
                :data-test="submitTest"
            >
                {{ submitLabel }}
            </v-btn>
            <slot name="after-submit" />
        </form>
        <div v-if="backTo && backLabel" class="mt-4 flex justify-center">
            <v-btn variant="text" :to="routerLinkI18n(backTo)">
                {{ backLabel }}
            </v-btn>
        </div>
        <slot name="footer" />
    </v-card>
</template>
