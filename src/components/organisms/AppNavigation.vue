<template>
    <VAppBar class="page-header" density="comfortable" elevation="2">
        <template #prepend>
            <img alt="logo" class="logo" :src="PUBLIC_PATH + 'images/guebbit-logo-colored.png'" />
        </template>

        <VBtn :to="routerLinkI18n({ name: 'Home' })" prepend-icon="$home" exact>
            {{ t('navigation.label-home') }}
        </VBtn>
        <VBtn :to="routerLinkI18n({ name: 'Playground' })">
            {{ t('navigation.label-playground') }}
        </VBtn>
        <VBtn v-show="isAdmin" :to="routerLinkI18n({ name: 'Admin' })" prepend-icon="$admin">
            {{ t('navigation.label-admin') }}
        </VBtn>
        <VBtn v-show="isAdmin" :to="routerLinkI18n({ name: 'UsersList' })" prepend-icon="$account">
            {{ t('navigation.label-users-list', 2) }}
        </VBtn>
        <VBtn :to="routerLinkI18n({ name: 'ProductsList' })" prepend-icon="$package">
            {{ t('navigation.label-products-list', 2) }}
        </VBtn>
        <VBtn v-show="isAuth" :to="routerLinkI18n({ name: 'Profile' })">
            {{ t('navigation.label-profile', 2) }}
        </VBtn>
        <VBtn v-show="isAuth" :to="routerLinkI18n({ name: 'Cart' })" prepend-icon="$cart">
            {{ t('navigation.label-cart') }}
        </VBtn>
        <VBtn v-show="isAuth" :to="routerLinkI18n({ name: 'OrdersList' })">
            {{ t('navigation.label-orders') }}
        </VBtn>

        <slot name="nav-left" />

        <slot />

        <VSpacer />

        <slot name="nav-right" />

        <VBtn
            v-show="!isAuth && !route.fullPath.includes('login')"
            prepend-icon="$login"
            variant="tonal"
            color="primary"
            class="mx-1"
            @click="router.push(routerLinkI18n(loginContinueTo(route.fullPath)))"
        >
            {{ t('navigation.label-login') }}
        </VBtn>

        <VBtn
            v-show="!isAuth && !route.fullPath.includes('signup')"
            prepend-icon="$accountPlus"
            variant="tonal"
            color="secondary"
            class="mx-1"
            @click="router.push(routerLinkI18n({ name: 'Signup' }))"
        >
            {{ t('navigation.label-signup') }}
        </VBtn>

        <VBtn
            v-show="isAuth"
            prepend-icon="$logout"
            variant="tonal"
            class="mx-1"
            @click="router.push(routerLinkI18n({ name: 'Logout' }))"
        >
            {{ t('navigation.label-logout') }}
        </VBtn>

        <AppLanguageSwitcher class="mx-2" />
    </VAppBar>
</template>

<style lang="scss">
.page-header {
    .logo {
        display: block;
        max-height: 40px;
        padding: 0 1em;
    }
}
</style>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { VAppBar, VBtn, VSpacer } from 'vuetify/components';
import AppLanguageSwitcher from '@/components/organisms/AppLanguageSwitcher.vue';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { loginContinueTo } from '@/utils/navigation.ts';
import { PUBLIC_PATH } from '@/utils/constants';
import { useProfileStore } from '@/stores/profile.ts';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();

const { isAuth, isAdmin } = storeToRefs(useProfileStore());
</script>
