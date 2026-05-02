<template>
    <LayoutDefault id="user-edit-page" class="item-detail-page item-detail-page-user">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('user-edit-page.page-title') }}</span>
            </h1>
        </template>

        <section class="item-detail-page-content">
            <div class="item-detail-page-grid-top">
                <DetailCard class="item-detail-page-hero animate-on-hover">
                    <div class="item-detail-page-hero-icon" aria-hidden="true">✏️</div>
                    <div>
                        <p v-if="id" class="item-detail-page-eyebrow">{{ id }}</p>
                        <h2 class="item-detail-page-hero-title">{{ heroTitle }}</h2>
                        <p class="item-detail-page-hero-description">{{ heroDescription }}</p>
                    </div>
                </DetailCard>

                <div class="item-detail-page-stats">
                    <MaterialStatCard :title="t('user-target-page.label-id')" :value="id ?? EMPTY_VALUE" />
                    <MaterialStatCard :title="t('user-target-page.label-admin')" :value="userRole" accent="secondary" />
                    <MaterialStatCard
                        :title="t('user-target-page.label-active')"
                        :value="userStatus"
                        accent="tertiary"
                    />
                </div>
            </div>

            <div class="item-detail-page-grid-main item-detail-page-grid-main-with-aside">
                <DetailCard class="item-detail-page-main">
                    <div class="item-detail-page-section-header">
                        <h3>{{ t('generic.details') }}</h3>
                        <p>{{ t('user-edit-page.page-title') }}</p>
                    </div>

                    <form class="theme-form item-detail-page-form" @submit.prevent="submitForm">
                        <BaseInput
                            v-model="form.email"
                            type="email"
                            :label="t('user-edit-page.label-email')"
                            :errors="formErrors.email"
                            :show-errors="showErrors"
                        />
                        <BaseInput
                            v-model="form.password"
                            type="password"
                            :label="t('user-edit-page.label-password')"
                            :errors="formErrors.password"
                            :show-errors="showErrors"
                        />

                        <div class="item-detail-page-form-actions">
                            <BaseButton type="submit" :disabled="isSubmitting || loading">
                                {{ t('user-edit-page.button-submit') }}
                            </BaseButton>
                            <BaseButton type="button" @click="resetForm">
                                {{ t('user-edit-page.reset-form') }}
                            </BaseButton>
                        </div>
                    </form>
                </DetailCard>

                <DetailCard as="aside" class="item-detail-page-aside">
                    <MaterialGraphicCard :title="heroTitle" :description="heroDescription" variant="secondary" />
                    <ItemDetailField :label="t('user-target-page.label-id')" :value="id ?? EMPTY_VALUE" icon="#" />
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
                </DetailCard>
            </div>

            <div class="item-detail-page-actions">
                <RouterLink v-if="id" :to="routerLinkI18n({ name: 'UserTarget', params: { id } })" class="theme-button">
                    {{ t('user-edit-page.button-go-to-details') }}
                </RouterLink>
                <RouterLink :to="routerLinkI18n({ name: 'UsersList' })" class="theme-button">
                    {{ t('user-edit-page.button-go-to-list') }}
                </RouterLink>
            </div>
        </section>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'UserEditPage'
};
</script>

<script setup lang="ts">
import '@/styles/pages/itemDetail.scss';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useUsersStore } from '@/stores/users';
import { z } from 'zod';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import DetailCard from '@/components/molecules/DetailCard.vue';
import MaterialGraphicCard from '@/components/molecules/MaterialGraphicCard.vue';
import MaterialStatCard from '@/components/molecules/MaterialStatCard.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailForm } from '@/composables/useItemDetailForm.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';
import { EMPTY_VALUE } from '@/utils/constants.ts';

/**
 * Generic i18n/notifications helpers.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();

/**
 * User id route param.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * User store APIs and references.
 */
const { fetchUser, updateUser, zodSchemaUsers, zodSchemaUsersPassword } = useUsersStore();
const { currentUser, selectedUserId, loading } = storeToRefs(useUsersStore());

/**
 * Shared display formatting helpers.
 */
const { formatText, formatDateTime, formatFlag } = useItemDetailDisplay();

/**
 * Edit form data model.
 */
interface IUserEditForm {
    email?: string;
    password?: string;
}

/**
 * Edit validation schema with optional password replacement.
 */
const editSchema = zodSchemaUsers.pick({ email: true }).extend({
    password: z.preprocess((v) => (v === '' ? undefined : v), zodSchemaUsersPassword.optional())
});

/**
 * Toolkit form bindings.
 */
const { form, formErrors, isSubmitting, handleSubmit } = useStructureFormValidation<IUserEditForm>(
    {},
    editSchema
);

/**
 * Shared watcher-based form hydration.
 */
const { showErrors, resetForm } = useItemDetailForm({
    currentItem: currentUser,
    form,
    mapToForm: (user) => ({
        email: user?.email ?? '',
        password: ''
    })
});

/**
 * Hero and status labels.
 */
const heroTitle = computed(() => currentUser.value?.username ?? id ?? t('user-edit-page.page-title'));
const heroDescription = computed(() => formatText(currentUser.value?.email));
const userRole = computed(() =>
    formatFlag(currentUser.value?.admin, t('generic.administrator'), t('generic.standard-user'))
);
const userStatus = computed(() =>
    formatFlag(currentUser.value?.active, t('generic.enabled'), t('generic.disabled'))
);

/**
 * Validates and persists user updates.
 */
const submitForm = () =>
    handleSubmit(async () => {
        if (!id) return;
        await updateUser(id, {
            email: form.value.email,
            password: form.value.password || undefined
        });
        addMessage(t('user-edit-page.success-update'));
        showErrors.value = false;
    })
        .then((success) => {
            if (!success) showErrors.value = true;
        })
        .catch((error) => notifyErrorMessages(addMessage, error));

/**
 * Activates route selection + onBeforeMount record load.
 */
useItemDetailRecord({
    id,
    selectedId: selectedUserId,
    fetchRecord: fetchUser
});
</script>
