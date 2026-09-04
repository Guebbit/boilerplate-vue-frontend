<script lang="ts">
export default {
    name: 'TwoFactorBackupCodes'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The one-time backup-codes screen: shown exactly once, after the FIRST factor an account arms —
 * `useTwoFactorStore().confirmed.backupCodes` is only ever populated on that call. Blocking: the
 * checkbox is the only way out, since these codes are never retrievable again.
 */
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { codes } = defineProps<{
    /**
     * The codes to show, in the clear, once.
     */
    codes: string[];
}>();

/**
 * Fires once the visitor confirms they saved the codes.
 */
const emit = defineEmits<{ done: [] }>();

const { t } = useI18n();

/**
 * Whether the visitor has ticked "I have saved these codes" — required before `Done` is
 * reachable. Reset whenever a fresh set of codes is shown, so a leftover tick from a previous
 * enrollment can never wave this one through unread.
 */
const confirmedSaved = ref(false);

watch(
    () => codes,
    () => {
        confirmedSaved.value = false;
    }
);
</script>

<template>
    <v-card data-test="two-factor-backup-codes">
        <v-card-title>{{ t('two-factor.backup-codes-title') }}</v-card-title>
        <v-card-text>
            <p class="mb-4">{{ t('two-factor.backup-codes-intro') }}</p>
            <ul class="mb-4 grid grid-cols-2 gap-2 font-mono text-sm" data-test="backup-codes-list">
                <li v-for="backupCode in codes" :key="backupCode">{{ backupCode }}</li>
            </ul>
            <v-checkbox
                v-model="confirmedSaved"
                :label="t('two-factor.backup-codes-confirm-saved')"
                data-test="backup-codes-confirm-saved"
            />
        </v-card-text>
        <v-card-actions>
            <v-spacer />
            <v-btn
                color="primary"
                variant="flat"
                :disabled="!confirmedSaved"
                data-test="backup-codes-continue"
                @click="emit('done')"
            >
                {{ t('two-factor.backup-codes-continue') }}
            </v-btn>
        </v-card-actions>
    </v-card>
</template>
