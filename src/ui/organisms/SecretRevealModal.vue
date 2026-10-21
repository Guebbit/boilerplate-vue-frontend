<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'SecretRevealModal'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The one-time secret-reveal dialog: a plaintext secret shown once and never retrievable again.
 * It owns its `DialogShell` — open exactly while `secret` is set, persistent, titled by its own
 * heading. Shared by every module that mints a machine credential — webhooks' subscription
 * secret, the api-keys module's minted key — the mechanism is identical, only the wording differs
 * at the call site. Modeled on `account/components/TwoFactorBackupCodes.vue`: blocking, the
 * checkbox is the only way out.
 */
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import DialogShell from '@/ui/organisms/DialogShell.vue';
import CopyButton from '@/ui/molecules/CopyButton.vue';

/**
 * The one-time secret to display, and the wording around it. `title`/`intro` default to a neutral
 * pair rather than requiring every caller to pass one — every current caller does anyway, because
 * "this secret" means something different per credential kind ("subscription" vs. "credential").
 */
const { secret, title, intro } = defineProps<{
    /**
     * The plaintext secret to show, in the clear, once. The dialog is open while it is set.
     */
    secret?: string;
    /**
     * Overrides the generic dialog title.
     */
    title?: string;
    /**
     * Overrides the generic intro paragraph.
     */
    intro?: string;
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
</script>

<template>
    <DialogShell :model-value="secret !== undefined" persistent max-width="640">
        <template v-slot="{ titleId }">
            <v-card data-test="secret-reveal">
                <v-card-title :id="titleId">{{
                    title ?? t('generic.secret-reveal-title')
                }}</v-card-title>
                <v-card-text>
                    <p class="mb-4">{{ intro ?? t('generic.secret-reveal-intro') }}</p>
                    <div class="mb-4 flex items-center gap-2">
                        <code
                            class="flex-1 overflow-x-auto rounded-md bg-on-surface/5 p-3 font-mono text-sm"
                            data-test="secret-reveal-value"
                        >
                            {{ secret }}
                        </code>
                        <CopyButton
                            :text="secret ?? ''"
                            :aria-label="t('generic.secret-reveal-button-copy')"
                            failure-key="generic.secret-reveal-copy-failed"
                        />
                    </div>
                    <v-checkbox
                        v-model="confirmedSaved"
                        :label="t('generic.secret-reveal-confirm-saved')"
                        data-test="secret-reveal-confirm-saved"
                    />
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        color="primary"
                        variant="flat"
                        :disabled="!confirmedSaved"
                        data-test="secret-reveal-continue"
                        @click="emit('done')"
                    >
                        {{ t('generic.secret-reveal-button-continue') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </template>
    </DialogShell>
</template>
