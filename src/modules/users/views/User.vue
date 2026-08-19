<script lang="ts">
export default {
    name: 'UserTargetPage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useUsersStore } from '@/modules/users/store';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { User } from 'lucide-vue-next';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import CardInfo from '@/ui/organisms/CardInfo.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import { formatText, formatDateTime, formatFlag } from '@/infrastructure/utils/formatters.ts';

/**
 * Translations helper.
 */
const { t } = useI18n();

/**
 * Route user id.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * User store API and state references.
 */
const { watchUser } = useUsersStore();
const { currentUser } = storeToRefs(useUsersStore());

/**
 * Hero heading.
 *
 * @returns The loaded username, the route id while loading, or the generic page
 *  title as a last resort.
 */
const heroTitle = computed(
    () => currentUser.value?.username ?? id ?? t('user-target-page.page-title')
);

/**
 * Hero subheading.
 *
 * @returns The user email, or the empty-value glyph when unknown.
 */
const heroDescription = computed(() => formatText(currentUser.value?.email));

/**
 * Label of the role chip.
 *
 * @returns The localized administrator/standard-user wording, or the
 *  empty-value glyph while the user is unknown.
 */
const userRole = computed(() =>
    formatFlag(currentUser.value?.admin, t('generic.administrator'), t('generic.standard-user'))
);

/**
 * Label of the status chip.
 *
 * @returns The localized enabled/disabled wording, or the empty-value glyph
 *  while the user is unknown.
 */
const userStatus = computed(() =>
    formatFlag(currentUser.value?.active, t('generic.enabled'), t('generic.disabled'))
);

/**
 * Selects and (re)fetches the user whenever the route id changes.
 */
watchUser(() => id);
</script>

<template>
    <LayoutDefault id="user-target" :title="t('user-target-page.page-title')">
        <ItemDetailLayout accent="secondary">
            <template #hero>
                <ItemDetailHero
                    :title="heroTitle"
                    :description="heroDescription"
                    :eyebrow="currentUser?.id"
                >
                    <template #icon><User :size="32" /></template>
                </ItemDetailHero>
            </template>

            <template #stats>
                <CardMaterialStat
                    :title="t('user-target-page.label-email')"
                    :value="formatText(currentUser?.email)"
                />
                <CardMaterialStat
                    :title="t('user-target-page.label-admin')"
                    :value="userRole"
                    accent="secondary"
                />
                <CardMaterialStat
                    :title="t('user-target-page.label-active')"
                    :value="userStatus"
                    accent="tertiary"
                />
            </template>

            <CardDetail>
                <h3 class="mb-5 text-lg font-semibold">{{ t('generic.details') }}</h3>

                <div v-if="currentUser" class="grid gap-4 sm:grid-cols-2">
                    <ItemDetailField
                        :label="t('user-target-page.label-id')"
                        :value="currentUser.id"
                        icon="#"
                    />
                    <ItemDetailField
                        :label="t('user-target-page.label-username')"
                        :value="currentUser.username"
                        icon="🙂"
                    />
                    <ItemDetailField
                        :label="t('user-target-page.label-email')"
                        :value="currentUser.email"
                        icon="✉"
                    />
                    <ItemDetailField :label="t('user-target-page.label-admin')" icon="🛡">
                        <v-chip variant="tonal" color="secondary" class="font-semibold">
                            {{ userRole }}
                        </v-chip>
                    </ItemDetailField>
                    <ItemDetailField :label="t('user-target-page.label-active')" icon="●">
                        <v-chip variant="tonal" color="secondary" class="font-semibold">
                            {{ userStatus }}
                        </v-chip>
                    </ItemDetailField>
                    <ItemDetailField
                        :label="t('user-target-page.label-updated-at')"
                        :value="formatDateTime(currentUser.updatedAt)"
                        icon="🕒"
                        full-width
                    />
                </div>
                <p v-else class="m-0 opacity-75">{{ t('generic.loading-state') }}</p>
            </CardDetail>

            <template #aside>
                <CardDetail as="aside" class="flex flex-col gap-4">
                    <CardInfo :title="heroTitle" :description="heroDescription" variant="secondary">
                        <template #icon><User :size="28" /></template>
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
                </CardDetail>
            </template>

            <template #actions>
                <v-btn
                    v-if="currentUser"
                    color="secondary"
                    :to="routerLinkI18n({ name: 'UserEdit', params: { id: currentUser.id } })"
                >
                    {{ t('user-target-page.button-go-to-edit') }}
                </v-btn>
                <v-btn variant="tonal" :to="routerLinkI18n({ name: 'UsersList' })">
                    {{ t('user-target-page.button-go-to-list') }}
                </v-btn>
            </template>
        </ItemDetailLayout>
    </LayoutDefault>
</template>
