<template>
    <LayoutDefault id="user-target">
        <template #header>
            <h1 class="text-h4 mb-6">
                <span>{{ t('user-target-page.page-title') }}</span>
            </h1>
        </template>

        <VRow class="mb-6" dense>
            <VCol cols="12" lg="6">
                <ItemDetailHero
                    :title="heroTitle"
                    :description="heroDescription"
                    :eyebrow="currentUser?.id"
                >
                    <template #icon><VIcon icon="$account" size="32" /></template>
                </ItemDetailHero>
            </VCol>
            <VCol cols="12" sm="4" lg="2">
                <CardMaterialStat
                    :title="t('user-target-page.label-email')"
                    :value="formatText(currentUser?.email)"
                />
            </VCol>
            <VCol cols="12" sm="4" lg="2">
                <CardMaterialStat
                    :title="t('user-target-page.label-admin')"
                    :value="userRole"
                    accent="secondary"
                />
            </VCol>
            <VCol cols="12" sm="4" lg="2">
                <CardMaterialStat
                    :title="t('user-target-page.label-active')"
                    :value="userStatus"
                    accent="tertiary"
                />
            </VCol>
        </VRow>

        <VRow dense>
            <VCol cols="12" lg="8">
                <CardDetail>
                    <div class="mb-4">
                        <h3 class="text-h6">{{ t('generic.details') }}</h3>
                    </div>

                    <VRow v-if="currentUser" dense>
                        <VCol cols="12" sm="6">
                            <ItemDetailField
                                :label="t('user-target-page.label-id')"
                                :value="currentUser.id"
                                icon="#"
                            />
                        </VCol>
                        <VCol cols="12" sm="6">
                            <ItemDetailField
                                :label="t('user-target-page.label-username')"
                                :value="currentUser.username"
                                icon="$account"
                            />
                        </VCol>
                        <VCol cols="12" sm="6">
                            <ItemDetailField
                                :label="t('user-target-page.label-email')"
                                :value="currentUser.email"
                                icon="✉"
                            />
                        </VCol>
                        <VCol cols="12" sm="6">
                            <ItemDetailField
                                :label="t('user-target-page.label-admin')"
                                icon="$admin"
                            >
                                <VChip color="secondary" size="small" variant="tonal">{{
                                    userRole
                                }}</VChip>
                            </ItemDetailField>
                        </VCol>
                        <VCol cols="12" sm="6">
                            <ItemDetailField
                                :label="t('user-target-page.label-active')"
                                icon="$success"
                            >
                                <VChip color="success" size="small" variant="tonal">{{
                                    userStatus
                                }}</VChip>
                            </ItemDetailField>
                        </VCol>
                        <VCol cols="12" sm="6">
                            <ItemDetailField
                                :label="t('user-target-page.label-updated-at')"
                                :value="formatDateTime(currentUser.updatedAt)"
                                icon="🕒"
                                full-width
                            />
                        </VCol>
                    </VRow>
                    <p v-else class="text-body-2 text-medium-emphasis mb-0">
                        {{ t('generic.loading-state') }}
                    </p>
                </CardDetail>
            </VCol>

            <VCol cols="12" lg="4">
                <CardDetail as="aside">
                    <div class="d-flex flex-column ga-4">
                        <CardInfo
                            :title="heroTitle"
                            :description="heroDescription"
                            variant="secondary"
                        >
                            <template #icon><VIcon icon="$account" size="28" /></template>
                        </CardInfo>
                        <ItemDetailField
                            :label="t('user-target-page.label-created-at')"
                            :value="formatDateTime(currentUser?.createdAt)"
                            icon="📅"
                        />
                        <ItemDetailField
                            :label="t('user-target-page.label-updated-at')"
                            :value="formatDateTime(currentUser?.updatedAt)"
                            icon="🕘"
                        />
                    </div>
                </CardDetail>
            </VCol>
        </VRow>

        <div class="d-flex flex-wrap ga-3 mt-6">
            <VBtn
                v-if="currentUser"
                :to="routerLinkI18n({ name: 'UserEdit', params: { id: currentUser.id } })"
                color="primary"
            >
                <VIcon icon="$pencil" start />
                {{ t('user-target-page.button-go-to-edit') }}
            </VBtn>
            <VBtn :to="routerLinkI18n({ name: 'UsersList' })" variant="tonal">
                {{ t('user-target-page.button-go-to-list') }}
            </VBtn>
        </div>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'UserTargetPage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useUsersStore } from '@/features/users/store';
import { VBtn, VChip, VCol, VIcon, VRow } from 'vuetify/components';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import CardDetail from '@/components/organisms/CardDetail.vue';
import CardInfo from '@/components/organisms/CardInfo.vue';
import ItemDetailHero from '@/components/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/components/organisms/CardMaterialStat.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';

/*
 * Translations helper.
 */
const { t } = useI18n();

/*
 * Route user id.
 */
const { id } = defineProps<{
    id?: string;
}>();

/*
 * User store API and state references.
 */
const { fetchUser } = useUsersStore();
const { currentUser, selectedUserId } = storeToRefs(useUsersStore());

/*
 * Shared display/format helpers.
 */
const { formatText, formatDateTime, formatFlag } = useItemDetailDisplay();

/*
 * Hero and status computed values.
 */
const heroTitle = computed(
    () => currentUser.value?.username ?? id ?? t('user-target-page.page-title')
);
const heroDescription = computed(() => formatText(currentUser.value?.email));
const userRole = computed(() =>
    formatFlag(currentUser.value?.admin, t('generic.administrator'), t('generic.standard-user'))
);
const userStatus = computed(() =>
    formatFlag(currentUser.value?.active, t('generic.enabled'), t('generic.disabled'))
);

/*
 * Activates route-based user selection and mount-time fetch.
 */
useItemDetailRecord({
    id,
    selectedId: selectedUserId,
    fetchRecord: fetchUser
});
</script>
