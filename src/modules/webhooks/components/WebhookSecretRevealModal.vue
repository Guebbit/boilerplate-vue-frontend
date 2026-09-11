<script lang="ts">
export default {
    name: 'WebhookSecretRevealModal'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The one-time secret-reveal dialog, shared by creating a subscription and rotating one's secret
 * — both hand a plaintext secret to the view exactly once, never retrievable again. Modeled on
 * `account/components/TwoFactorBackupCodes.vue`: blocking, the checkbox is the only way out.
 */
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { Copy } from 'lucide-vue-next';

/**
 * The one-time secret to display. Shown once and never again.
 */
const { secret } = defineProps<{
    /**
     * The plaintext secret to show, in the clear, once.
     */
    secret: string;
}>();

/**
 * Fires once the visitor confirms they saved the secret.
 */
const emit = defineEmits<{ done: [] }>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used for the copy-to-clipboard confirmation.
 */
const { addMessage } = useNotificationsStore();

/**
 * Whether the visitor has ticked "I have saved this secret" — required before `Continue` is
 * reachable. Reset whenever a fresh secret is shown, so a leftover tick from a previous reveal can
 * never wave this one through unread.
 */
const confirmedSaved = ref(false);

watch(
    () => secret,
    () => {
        confirmedSaved.value = false;
    }
);

/**
 * Copies the secret to the clipboard and confirms it with a toast.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText — requires a secure
 * context, which every deployment of this app already is (the app itself is https-only).
 */
const copySecret = () =>
    navigator.clipboard.writeText(secret).then(() => addMessage(t('webhook-secret-modal.copied')));
</script>

<template>
    <v-card data-test="webhook-secret-reveal">
        <v-card-title>{{ t('webhook-secret-modal.title') }}</v-card-title>
        <v-card-text>
            <p class="mb-4">{{ t('webhook-secret-modal.intro') }}</p>
            <div class="mb-4 flex items-center gap-2">
                <code
                    class="flex-1 overflow-x-auto rounded bg-black/5 p-3 font-mono text-sm"
                    data-test="webhook-secret-value"
                >
                    {{ secret }}
                </code>
                <v-btn
                    variant="tonal"
                    icon
                    :aria-label="t('webhook-secret-modal.button-copy')"
                    @click="copySecret"
                >
                    <Copy :size="18" aria-hidden="true" />
                </v-btn>
            </div>
            <v-checkbox
                v-model="confirmedSaved"
                :label="t('webhook-secret-modal.confirm-saved')"
                data-test="webhook-secret-confirm-saved"
            />
        </v-card-text>
        <v-card-actions>
            <v-spacer />
            <v-btn
                color="primary"
                variant="flat"
                :disabled="!confirmedSaved"
                data-test="webhook-secret-continue"
                @click="emit('done')"
            >
                {{ t('webhook-secret-modal.button-continue') }}
            </v-btn>
        </v-card-actions>
    </v-card>
</template>
