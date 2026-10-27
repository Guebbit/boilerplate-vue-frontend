<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'WebhookTargetPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Webhook subscription detail (read-only) page. Loads its own record by route id (`store.ts`'s
 * `watchSubscription`, a 404 or 403 leaves for the Error page) and renders its fields, its status
 * with the enable/disable action, the secret-ring actions (rotate/remove) and delete. Every button
 * shows only when the record's own `actions` flag says the server would accept it.
 */
import { computed, ref } from 'vue';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useWebhooksStore } from '../store';
import { useMissingRecord } from '@/infrastructure/utils/use-missing-record.ts';
import { subscriptionStatusOf } from '../domain/subscription-status.ts';
import SubscriptionStatusChip from '../components/SubscriptionStatusChip.vue';
import { useDialogStore } from '@/ui/dialog.ts';
import { singleFlight } from '@/infrastructure/utils/single-flight.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import SecretRevealModal from '@/ui/organisms/SecretRevealModal.vue';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { Ban, Calendar, Clock, FileText, Hash, Link, Webhook, Zap } from 'lucide-vue-next';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import RecordAsideCard from '@/ui/organisms/RecordAsideCard.vue';
import type { DetailFieldRow } from '@/ui/types.ts';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import { vFocusableScroll } from '@/ui/directives/focusable-scroll';
import { formatText, formatDateTime, EMPTY_VALUE } from '@/infrastructure/utils/formatters.ts';

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
const {
    watchSubscription,
    createSecret,
    removeSecret,
    deleteSubscription,
    enableSubscription,
    disableSubscription
} = useWebhooksStore();

/**
 * The subscription being displayed.
 */
const { currentSubscription, writingSubscription } = storeToRefs(useWebhooksStore());

/**
 * Selects and loads the subscription whenever the route id changes; a missing or forbidden one
 * leaves for the Error page instead of sitting on placeholders.
 */
watchSubscription(() => id, { onError: useMissingRecord() });

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
 * Label of the status stat.
 *
 * @returns The localized enabled/paused/auto-disabled wording, or the empty-value glyph while the
 *  subscription is unknown.
 */
const subscriptionStatus = computed(() =>
    currentSubscription.value
        ? t(`webhook-status.${subscriptionStatusOf(currentSubscription.value)}`)
        : EMPTY_VALUE
);

/**
 * When a superseded secret stops signing, by secret id; a secret absent here is the current one.
 */
const retiresAtBySecret = computed(
    () =>
        new Map(
            (currentSubscription.value?.retiringSecrets ?? []).map(
                ({ id: secretId, retiresAt }) => [secretId, retiresAt]
            )
        )
);

/**
 * The newly minted secret, held only long enough to render the reveal modal after a rotation.
 * Never sent anywhere but this component; the store's own cache never sees it (`store.ts`'s
 * `createSecret`).
 */
const revealedSecret = ref<string>();

/**
 * The status action's own blocked state — enable and disable share one control area, so they
 * share one alert beside it.
 */
const {
    message: statusError,
    report: reportStatusError,
    clear: clearStatusError
} = useBlockingError();

/**
 * Switches the subscription back on and toasts the outcome.
 */
const handleEnable = () => {
    if (!id) return;
    clearStatusError();
    return enableSubscription(id)
        .then(() => addMessage(t('webhook-target-page.success-enable')))
        .catch((error: unknown) => reportStatusError(error));
};

/**
 * Pauses the subscription after a confirmation: nothing is sent to it, and events that fire
 * meanwhile are not queued for it, until it is enabled again.
 */
const handleDisable = singleFlight(() => {
    if (!id) return;
    return useDialogStore()
        .confirm({
            message: t('webhook-target-page.confirm-disable', {
                url: currentSubscription.value?.url ?? id
            })
        })
        .then((accepted) => {
            if (!accepted) return;
            clearStatusError();
            return disableSubscription(id)
                .then(() => addMessage(t('webhook-target-page.success-disable')))
                .catch((error: unknown) => reportStatusError(error));
        });
});

/**
 * The rotate-secret button's own blocked state — its own dedicated control, so a failure blocks
 * it in place rather than joining a toast queue the visitor may have looked away from.
 */
const {
    message: createSecretError,
    report: reportCreateSecretError,
    clear: clearCreateSecretError
} = useBlockingError();

/**
 * Mints a new secret onto this subscription's ring and opens the reveal modal.
 */
const handleCreateSecret = () => {
    if (!id) return;
    clearCreateSecretError();
    return createSecret(id)
        .then((updated) => {
            if (updated?.newSecret) revealedSecret.value = updated.newSecret;
        })
        .catch((error: unknown) => reportCreateSecretError(error));
};

/**
 * The secrets table's own blocked state — each row's own remove button has nowhere to host an
 * alert, and the confirm dialog has already closed by the time the request answers, so every
 * removal shares one instance rendered above the table.
 */
const {
    message: removeSecretError,
    report: reportRemoveSecretError,
    clear: clearRemoveSecretError
} = useBlockingError();

/**
 * Drops one secret from the ring after an explicit confirmation.
 *
 * @param secretId - Identifier of the secret to remove.
 */
const handleRemoveSecret = singleFlight((secretId: string) => {
    if (!id) return;
    return useDialogStore()
        .confirm({
            message: t('webhook-target-page.confirm-remove-secret', { id: secretId }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) return;
            clearRemoveSecretError();
            return removeSecret(id, secretId)
                .then(() => addMessage(t('webhook-target-page.success-remove-secret')))
                .catch((error: unknown) => reportRemoveSecretError(error));
        });
});

/**
 * The page-level delete button's own blocked state — its own dedicated control, distinct from
 * the secret-ring actions above.
 */
const {
    message: deleteError,
    report: reportDeleteError,
    clear: clearDeleteError
} = useBlockingError();

/**
 * Deletes this subscription after an explicit confirmation, then returns to the list — there is
 * nothing left on this page to show.
 */
const handleDelete = singleFlight(() => {
    if (!id) return;
    return useDialogStore()
        .confirm({
            message: t('webhook-target-page.confirm-delete', {
                url: currentSubscription.value?.url ?? id
            }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) return;
            clearDeleteError();
            return deleteSubscription(id)
                .then(() => {
                    addMessage(t('webhook-target-page.success-delete'));
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- vue-router reports a failed navigation through router.onError (app/router/index.ts)
                    void router.push(routerLinkI18n({ name: 'WebhooksList' }));
                })
                .catch((error: unknown) => reportDeleteError(error));
        });
});

/**
 * The rows of the aside summary card: identity and timestamps, formatted for display.
 */
const asideFields = computed<DetailFieldRow[]>(() => [
    {
        label: t('webhook-target-page.label-created-at'),
        value: formatDateTime(currentSubscription.value?.createdAt),
        icon: Calendar
    },
    {
        label: t('webhook-target-page.label-updated-at'),
        value: formatDateTime(currentSubscription.value?.updatedAt),
        icon: Clock
    }
]);
</script>

<template>
    <div id="webhook-target">
        <SecretRevealModal
            :secret="revealedSecret"
            :title="t('webhook-secret-modal.title')"
            :intro="t('webhook-secret-modal.intro')"
            @done="revealedSecret = undefined"
        />

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

            <CardDetail :title="t('generic.details')">
                <div v-if="currentSubscription" class="grid gap-4 sm:grid-cols-2">
                    <ItemDetailField
                        :label="t('webhook-target-page.label-id')"
                        :value="currentSubscription.id"
                        :icon="Hash"
                    />
                    <ItemDetailField
                        :label="t('webhook-target-page.label-url')"
                        :value="currentSubscription.url"
                        :icon="Link"
                        full-width
                    />
                    <ItemDetailField
                        :label="t('webhook-target-page.label-description')"
                        :value="formatText(currentSubscription.description)"
                        :icon="FileText"
                        full-width
                    />
                    <ItemDetailField
                        :label="t('webhook-target-page.label-event-types')"
                        :icon="Zap"
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
                        :icon="Ban"
                    />
                    <ItemDetailField
                        v-if="currentSubscription.autoDisabledAt"
                        :label="t('webhook-target-page.label-auto-disabled-at')"
                        :value="formatDateTime(currentSubscription.autoDisabledAt)"
                        :icon="Ban"
                    />
                </div>
                <p v-else class="m-0 opacity-75">{{ t('generic.loading-state') }}</p>

                <div v-if="currentSubscription" class="mt-8" data-test="webhook-status-section">
                    <h3 class="text-lg font-semibold">
                        {{ t('webhook-target-page.section-status') }}
                    </h3>
                    <p class="mt-1 mb-3 flex items-center gap-2">
                        <SubscriptionStatusChip :subscription="currentSubscription" />
                    </p>
                    <p
                        v-if="!currentSubscription.enabled"
                        class="mt-1 mb-3 opacity-75"
                        data-test="webhook-status-intro"
                    >
                        {{
                            t(
                                currentSubscription.autoDisabledAt
                                    ? 'webhook-target-page.status-intro-auto-disabled'
                                    : 'webhook-target-page.status-intro-paused'
                            )
                        }}
                    </p>
                    <v-btn
                        v-if="currentSubscription.actions.enable"
                        variant="tonal"
                        color="success"
                        :disabled="writingSubscription"
                        data-test="webhook-enable"
                        @click="handleEnable"
                    >
                        {{ t('webhook-target-page.button-enable') }}
                    </v-btn>
                    <v-btn
                        v-if="currentSubscription.actions.disable"
                        variant="tonal"
                        color="secondary"
                        :disabled="writingSubscription"
                        data-test="webhook-disable"
                        @click="handleDisable"
                    >
                        {{ t('webhook-target-page.button-disable') }}
                    </v-btn>
                    <InlineErrorAlert
                        :message="statusError"
                        class="mt-3"
                        data-test="webhook-target-status-error"
                    />
                </div>

                <div v-if="currentSubscription" class="mt-8">
                    <h3 class="text-lg font-semibold">
                        {{ t('webhook-target-page.section-secrets') }}
                    </h3>
                    <p class="mt-1 mb-4 opacity-75">{{ t('webhook-target-page.secrets-intro') }}</p>

                    <InlineErrorAlert
                        :message="removeSecretError"
                        class="mb-3"
                        data-test="webhook-target-remove-secret-error"
                    />

                    <v-table
                        v-focusable-scroll="t('webhook-target-page.secrets-table-label')"
                        density="comfortable"
                    >
                        <thead>
                            <tr>
                                <th>{{ t('webhook-target-page.column-secret-id') }}</th>
                                <th>{{ t('webhook-target-page.column-secret-retires') }}</th>
                                <th>{{ t('webhook-target-page.column-secret-actions') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="secretId in currentSubscription.secretIds"
                                :key="secretId"
                                data-test="webhook-secret-row"
                            >
                                <td class="font-mono text-sm">{{ secretId }}</td>
                                <td data-test="webhook-secret-retires">
                                    {{
                                        retiresAtBySecret.has(secretId)
                                            ? formatDateTime(retiresAtBySecret.get(secretId))
                                            : t('webhook-target-page.secret-current')
                                    }}
                                </td>
                                <td>
                                    <v-btn
                                        v-if="currentSubscription.actions.removeSecret"
                                        size="small"
                                        variant="tonal"
                                        color="error"
                                        :disabled="writingSubscription"
                                        :aria-label="
                                            t('webhook-target-page.button-remove-secret-named', {
                                                id: secretId
                                            })
                                        "
                                        data-test="webhook-secret-remove"
                                        @click="handleRemoveSecret(secretId)"
                                    >
                                        {{ t('webhook-target-page.button-remove-secret') }}
                                    </v-btn>
                                </td>
                            </tr>
                        </tbody>
                    </v-table>

                    <v-btn
                        v-if="currentSubscription.actions.createSecret"
                        class="mt-4"
                        variant="tonal"
                        color="secondary"
                        :disabled="writingSubscription"
                        data-test="webhook-rotate-secret"
                        @click="handleCreateSecret"
                    >
                        {{ t('webhook-target-page.button-rotate-secret') }}
                    </v-btn>

                    <InlineErrorAlert
                        :message="createSecretError"
                        class="mt-3"
                        data-test="webhook-target-rotate-secret-error"
                    />
                </div>
            </CardDetail>

            <template #aside>
                <RecordAsideCard
                    :title="heroTitle"
                    :description="heroDescription"
                    accent="secondary"
                    :fields="asideFields"
                >
                    <template #icon><Webhook :size="28" /></template>
                </RecordAsideCard>
            </template>

            <template #actions>
                <v-btn
                    v-if="currentSubscription?.actions.update"
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
                    v-if="currentSubscription?.actions.delete"
                    variant="text"
                    color="error"
                    data-test="webhook-delete"
                    @click="handleDelete"
                >
                    {{ t('webhook-target-page.button-delete') }}
                </v-btn>
                <InlineErrorAlert
                    :message="deleteError"
                    class="w-full"
                    data-test="webhook-target-delete-error"
                />
            </template>
        </ItemDetailLayout>
    </div>
</template>
