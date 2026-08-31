<script setup lang="ts">
import { ref } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';

/**
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
 * Slots: default (the fields).
 */
const { loading } = defineProps<{
    /**
     * The submit button's text, already translated.
     */
    submitLabel: string;
    /**
     * Where the text link under the form goes; the locale prefix is added here.
     */
    backTo: RouteLocationRaw;
    /**
     * The text link's own text, already translated.
     */
    backLabel: string;
    /**
     * Whether a submit is in flight — the button spins and refuses a second one.
     */
    loading?: boolean;
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
    <v-card class="mx-auto mt-10 w-full max-w-xl p-8">
        <form ref="formElement" novalidate @submit.prevent="emit('submit')">
            <slot />
            <v-btn type="submit" color="primary" size="large" block :loading="loading" class="mt-2">
                {{ submitLabel }}
            </v-btn>
        </form>
        <div class="mt-4 flex justify-center">
            <v-btn variant="text" :to="routerLinkI18n(backTo)">
                {{ backLabel }}
            </v-btn>
        </div>
    </v-card>
</template>
