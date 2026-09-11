<script lang="ts">
export default {
    name: 'WebhookTargetPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Webhook subscription detail (read-only) page. Hydrates from the store's cache by route id —
 * there is no `GET .../subscriptions/{id}`, see `store.ts`'s `watchSubscription` — and renders
 * its fields plus the secret-ring actions (rotate/remove) and delete.
 */
import { computed, ref } from 'vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useWebhooksStore } from '@/modules/webhooks/store';
import { useDialogStore } from '@/ui/dialog.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import SecretRevealModal from '@/ui/organisms/SecretRevealModal.vue';
import { Webhook } from 'lucide-vue-next';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import CardInfo from '@/ui/organisms/CardInfo.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import {
    formatText,
    formatDateTime,
    formatFlag,
    EMPTY_VALUE
} from '@/infrastructure/utils/formatters.ts';

/**
 * Translations helper.
 */
const { t } = useI18n();

/**
 * Router instance, for the navigation once the rotate-secret reveal modal is dismissed.
 */
const router = useRouter();

/**
 * Route subscription id.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Webhooks store actions.
 */
const { watchSubscription, rotateSecret, removeSecret, deleteSubscription } = useWebhooksStore();

/**
 * The subscription being displayed.
 */
const { currentSubscription } = storeToRefs(useWebhooksStore());

/**
 * Selects and hydrates the subscription whenever the route id changes.
 */
watchSubscription(() => id);

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Hero heading.
 *
 * @returns The subscription's URL, the route id while loading, or the generic page title as a
 *  last resort.
 */
const heroTitle = computed(
    () => currentSubscription.value?.url ?? id ?? t('webhook-target-page.page-title')
);

/**
 * Hero subheading.
 *
 * @returns The subscription's description, or the empty-value glyph when unknown.
 */
const heroDescription = computed(() => formatText(currentSubscription.value?.description));

/**
 * Label of the status chip.
 *
 * @returns The localized enabled/disabled wording, or the empty-value glyph while the
 *  subscription is unknown.
 */
const subscriptionStatus = computed(() =>
    formatFlag(
        currentSubscription.value?.enabled,
        t('webhooks-list-page.status-enabled'),
        t('webhooks-list-page.status-disabled')
    )
);

/**
 * The newly minted secret, held only long enough to render the reveal modal after a rotation.
 * Never sent anywhere but this component; the store's own cache never sees it (`store.ts`'s
 * `rotateSecret`).
 */
const revealedSecret = ref<string>();

/**
 * Whether a rotate/remove/delete call is in flight, disabling the secret-ring buttons while one
 * settles.
 */
const busy = ref(false);

/**
 * Mints a new secret onto this subscription's ring and opens the reveal modal.
 */
const handleRotateSecret = () => {
    if (!id) return;
    busy.value = true;
    return rotateSecret(id)
        .then((updated) => {
            if (updated?.newSecret) revealedSecret.value = updated.newSecret;
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error))
        .finally(() => {
            busy.value = false;
        });
};

/**
 * Drops one secret from the ring after an explicit confirmation.
 *
 * @param secretId - Identifier of the secret to remove.
 */
const handleRemoveSecret = (secretId: string) => {
    if (!id) return;
    return useDialogStore()
        .confirm({ message: t('webhook-target-page.confirm-remove-secret'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            busy.value = true;
            return removeSecret(id, secretId)
                .then(() => addMessage(t('webhook-target-page.success-remove-secret')))
                .catch((error: unknown) => notifyErrorMessages(addMessage, error))
                .finally(() => {
                    busy.value = false;
                });
        });
};

/**
 * Deletes this subscription after an explicit confirmation, then returns to the list — there is
 * nothing left on this page to show.
 */
const handleDelete = () => {
    if (!id) return;
    return useDialogStore()
        .confirm({ message: t('webhook-target-page.confirm-delete'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            return deleteSubscription(id)
                .then(() => {
                    addMessage(t('webhook-target-page.success-delete'));
                    void router.push(routerLinkI18n({ name: 'WebhooksList' }));
                })
                .catch((error: unknown) => notifyErrorMessages(addMessage, error));
        });
};
</script>

<template>
    <LayoutDefault id="webhook-target" :title="t('webhook-target-page.page-title')">
        <v-dialog :model-value="!!revealedSecret" persistent max-width="640">
            <SecretRevealModal
                v-if="revealedSecret"
                :secret="revealedSecret"
                :title="t('webhook-secret-modal.title')"
                :intro="t('webhook-secret-modal.intro')"
                @done="revealedSecret = undefined"
            />
        </v-dialog>

        <ItemDetailLayout accent="secondary">
            <template #hero>
                <ItemDetailHero :title="heroTitle" :description="heroDescription" :eyebrow="id">
                    <template #icon><Webhook :size="32" /></template>
                </ItemDetailHero>
            </template>

            <template #stats>
                <CardMaterialStat
                    :title="t('webhook-target-page.label-enabled')"
                    :value="subscriptionStatus"
                />
                <CardMaterialStat
                    :title="t('webhook-target-page.label-consecutive-failures')"
                    :value="currentSubscription?.consecutiveFailures?.toString() ?? EMPTY_VALUE"
                    accent="secondary"
                />
                <CardMaterialStat
                    :title="t('webhook-target-page.label-event-types')"
                    :value="currentSubscription?.eventTypes.length.toString() ?? EMPTY_VALUE"
                    accent="tertiary"
                />
            </template>

            <CardDetail>
                <h3 class="mb-5 text-lg font-semibold">{{ t('generic.details') }}</h3>

                <div v-if="currentSubscription" class="grid gap-4 sm:grid-cols-2">
                    <ItemDetailField
                        :label="t('webhook-target-page.label-id')"
                        :value="currentSubscription.id"
                        icon="#"
                    />
                    <ItemDetailField
                        :label="t('webhook-target-page.label-url')"
                        :value="currentSubscription.url"
                        icon="🔗"
                        full-width
                    />
                    <ItemDetailField
                        :label="t('webhook-target-page.label-description')"
                        :value="formatText(currentSubscription.description)"
                        icon="📝"
                        full-width
                    />
                    <ItemDetailField
                        :label="t('webhook-target-page.label-event-types')"
                        icon="⚡"
                        full-width
                    >
                        <div class="flex flex-wrap gap-1">
                            <v-chip
                                v-for="eventType in currentSubscription.eventTypes"
                                :key="eventType"
                                size="small"
                                variant="tonal"
                                color="tertiary"
                            >
                                {{ eventType }}
                            </v-chip>
                        </div>
                    </ItemDetailField>
                    <ItemDetailField
                        v-if="currentSubscription.disabledAt"
                        :label="t('webhook-target-page.label-disabled-at')"
                        :value="formatDateTime(currentSubscription.disabledAt)"
                        icon="⛔"
                    />
                </div>
                <p v-else class="m-0 opacity-75">{{ t('generic.loading-state') }}</p>

                <div v-if="currentSubscription" class="mt-8">
                    <h3 class="text-lg font-semibold">
                        {{ t('webhook-target-page.section-secrets') }}
                    </h3>
                    <p class="mt-1 mb-4 opacity-75">{{ t('webhook-target-page.secrets-intro') }}</p>

                    <v-table density="comfortable">
                        <thead>
                            <tr>
                                <th>{{ t('webhook-target-page.column-secret-id') }}</th>
                                <th>{{ t('webhook-target-page.column-secret-actions') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="secretId in currentSubscription.secretIds" :key="secretId">
                                <td class="font-mono text-sm">{{ secretId }}</td>
                                <td>
                                    <v-btn
                                        size="small"
                                        variant="tonal"
                                        color="error"
                                        :disabled="busy"
                                        :aria-label="
                                            t('webhook-target-page.button-remove-secret-named', {
                                                id: secretId
                                            })
                                        "
                                        @click="handleRemoveSecret(secretId)"
                                    >
                                        {{ t('webhook-target-page.button-remove-secret') }}
                                    </v-btn>
                                </td>
                            </tr>
                        </tbody>
                    </v-table>

                    <v-btn
                        class="mt-4"
                        variant="tonal"
                        color="secondary"
                        :disabled="busy"
                        data-test="webhook-rotate-secret"
                        @click="handleRotateSecret"
                    >
                        {{ t('webhook-target-page.button-rotate-secret') }}
                    </v-btn>
                </div>
            </CardDetail>

            <template #aside>
                <CardDetail as="aside" class="flex flex-col gap-4">
                    <CardInfo :title="heroTitle" :description="heroDescription" variant="secondary">
                        <template #icon><Webhook :size="28" /></template>
                    </CardInfo>
                    <ItemDetailField
                        :label="t('webhook-target-page.label-created-at')"
                        :value="formatDateTime(currentSubscription?.createdAt)"
                        icon="📅"
                    />
                    <ItemDetailField
                        :label="t('webhook-target-page.label-updated-at')"
                        :value="formatDateTime(currentSubscription?.updatedAt)"
                        icon="🕘"
                    />
                </CardDetail>
            </template>

            <template #actions>
                <v-btn
                    v-if="currentSubscription"
                    color="secondary"
                    :to="routerLinkI18n({ name: 'WebhookEdit', params: { id } })"
                >
                    {{ t('webhook-target-page.button-go-to-edit') }}
                </v-btn>
                <v-btn
                    v-if="currentSubscription"
                    variant="tonal"
                    :to="
                        routerLinkI18n({ name: 'WebhookDeliveries', query: { subscriptionId: id } })
                    "
                >
                    {{ t('webhook-target-page.button-go-to-deliveries') }}
                </v-btn>
                <v-btn variant="tonal" :to="routerLinkI18n({ name: 'WebhooksList' })">
                    {{ t('webhook-target-page.button-go-to-list') }}
                </v-btn>
                <v-btn
                    v-if="currentSubscription"
                    variant="text"
                    color="error"
                    data-test="webhook-delete"
                    @click="handleDelete"
                >
                    {{ t('webhook-target-page.button-delete') }}
                </v-btn>
            </template>
        </ItemDetailLayout>
    </LayoutDefault>
</template>
