<script setup lang="ts">
/**
 * @module
 * A live, advisory-only strength bar for a password field, scored by {@link usePasswordStrength}.
 * Renders nothing for an empty password and never blocks submission — the schema plus the
 * server's own checks are the actual gate. The breach warning is a separate component beside this
 * one (`use-password-breach-check.ts`'s own hint), not duplicated here.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePasswordStrength } from '@/modules/account/composables/use-password-strength.ts';

/**
 * Component props.
 */
const props = defineProps<{
    /**
     * The candidate password to score, read reactively.
     */
    password: string;
}>();

/** Translator for the meter's labels. */
const { t } = useI18n();

/**
 * The composable driving this display.
 */
const { score } = usePasswordStrength(computed(() => props.password));

/**
 * One label + Vuetify color per zxcvbn score (0–4), lowest first.
 */
const STRENGTH_LEVELS = [
    { label: 'password-strength-very-weak', color: 'error' },
    { label: 'password-strength-weak', color: 'error' },
    { label: 'password-strength-fair', color: 'warning' },
    { label: 'password-strength-good', color: 'success' },
    { label: 'password-strength-strong', color: 'success' }
] as const;

/**
 * The bar's fill, as a percentage of its five buckets.
 */
const percent = computed(() => (score.value === undefined ? 0 : ((score.value + 1) / 5) * 100));

/**
 * Vuetify color for the current bucket, `undefined` while there is nothing to score.
 */
const color = computed(() =>
    score.value === undefined ? undefined : STRENGTH_LEVELS[score.value].color
);

/**
 * The translated strength label, `undefined` while there is nothing to score.
 */
const label = computed(() =>
    score.value === undefined ? undefined : t(`users-form.${STRENGTH_LEVELS[score.value].label}`)
);
</script>

<template>
    <div v-if="password.length > 0" class="mt-1" data-test="password-strength-meter">
        <v-progress-linear
            :model-value="percent"
            :color="color"
            height="6"
            rounded
            aria-hidden="true"
        />
        <p class="mt-1 text-xs" aria-live="polite">
            {{ label }}
        </p>
    </div>
</template>
