<script setup lang="ts">
/**
 * @module
 * The "already paid outside the app" statement staff attach to a refund: a switch, and once it is
 * on, how the money went back and an optional reference. One `v-model`: `undefined` while the
 * switch is off, the contract's `PaidOutside` while it is on, so a caller sends the value as it is.
 * The order page and the return page share it; each decides where it may be shown.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { paidOutsideReferenceMax } from '../paid-outside-limits.ts';
import { OutsideMoneyMethod } from '../enums.ts';
import type { PaidOutside } from '@types';

/**
 * The statement, or `undefined` while the money did not go back outside the app.
 */
const model = defineModel<PaidOutside | undefined>({ required: true });

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * The methods the contract names for money that moved outside the app — `card` is never one.
 */
const methods = Object.values(OutsideMoneyMethod);

/**
 * The switch: turning it on starts at cash, the common counter case; turning it off drops the
 * whole statement, reference included.
 */
const enabled = computed({
    get: () => model.value !== undefined,
    set: (on: boolean | null) => {
        model.value = on ? { method: OutsideMoneyMethod.cash } : undefined;
    }
});

/**
 * Picks how the money went back, keeping the reference typed so far.
 *
 * @param method - The chosen method.
 */
const setMethod = (method: PaidOutside['method']) => {
    model.value = { ...model.value, method };
};

/**
 * Sets the reference; an empty field removes it, because the contract wants at least one character.
 *
 * @param value - What the field holds.
 */
const setReference = (value: string | null) => {
    if (!model.value) return;
    const { method } = model.value;
    model.value = value ? { method, reference: value } : { method };
};
</script>

<template>
    <div class="flex flex-col gap-2" data-test="paid-outside-fields">
        <v-switch
            v-model="enabled"
            :label="t('paid-outside-fields.label-switch')"
            :hint="t('paid-outside-fields.hint-switch')"
            persistent-hint
            color="primary"
            density="compact"
            data-test="paid-outside-switch"
        />
        <div v-if="model" class="flex flex-wrap items-start gap-3">
            <v-select
                :model-value="model.method"
                :items="
                    methods.map((value) => ({
                        value,
                        title: t(`paid-outside-fields.method-${value}`)
                    }))
                "
                :label="t('paid-outside-fields.label-method')"
                hide-details="auto"
                class="min-w-48"
                data-test="paid-outside-method"
                @update:model-value="setMethod"
            />
            <v-text-field
                :model-value="model.reference ?? ''"
                :label="t('paid-outside-fields.label-reference')"
                :maxlength="paidOutsideReferenceMax"
                hide-details="auto"
                class="min-w-40 grow"
                data-test="paid-outside-reference"
                @update:model-value="setReference"
            />
        </div>
    </div>
</template>
