<template>
    <!-- Desktop / tablet app bar -->
    <VAppBar class="page-header" density="comfortable" elevation="2">
        <template #prepend>
            <RouterLink :to="routerLinkI18n({ name: 'Home' })" class="logo-link">
                <img
                    alt="Guebbit logo"
                    class="logo"
                    :src="PUBLIC_PATH + 'images/guebbit-logo-colored.png'"
                />
            </RouterLink>
        </template>

        <!-- Mobile menu toggle (hidden on md+) -->
        <VBtn class="d-flex d-md-none" icon="$menu" @click="drawer = !drawer" />

        <!-- Desktop navigation (hidden on small screens) -->
        <div class="d-none d-md-flex align-center">
            <VBtn :to="routerLinkI18n({ name: 'Home' })" prepend-icon="$home" exact>
                {{ t('navigation.label-home') }}
            </VBtn>
            <!-- Portfolio anchor links (only visible on home page) -->
            <VBtn v-if="isHomePage" @click="scrollTo('home-about')">
                {{ t('navigation.label-about') }}
            </VBtn>
            <VBtn v-if="isHomePage" @click="scrollTo('home-services')">
                {{ t('navigation.label-services') }}
            </VBtn>
            <VBtn v-if="isHomePage" @click="scrollTo('home-contact')">
                {{ t('navigation.label-contact') }}
            </VBtn>
            <VBtn :to="routerLinkI18n({ name: 'Playground' })">
                {{ t('navigation.label-playground') }}
            </VBtn>
            <VBtn :to="routerLinkI18n({ name: 'ProductsList' })" prepend-icon="$package">
                {{ t('navigation.label-products-list', 2) }}
            </VBtn>
            <VBtn v-show="isAuth" :to="routerLinkI18n({ name: 'Cart' })" prepend-icon="$cart">
                {{ t('navigation.label-cart') }}
            </VBtn>
            <VBtn v-show="isAuth" :to="routerLinkI18n({ name: 'OrdersList' })">
                {{ t('navigation.label-orders') }}
            </VBtn>
            <VBtn v-show="isAdmin" :to="routerLinkI18n({ name: 'Admin' })" prepend-icon="$admin">
                {{ t('navigation.label-admin') }}
            </VBtn>
            <VBtn
                v-show="isAdmin"
                :to="routerLinkI18n({ name: 'UsersList' })"
                prepend-icon="$account"
            >
                {{ t('navigation.label-users-list', 2) }}
            </VBtn>
            <VBtn v-show="isAuth" :to="routerLinkI18n({ name: 'Profile' })">
                {{ t('navigation.label-profile', 2) }}
            </VBtn>
        </div>

        <slot name="nav-left" />
        <slot />

        <VSpacer />

        <slot name="nav-right" />

        <VBtn
            v-show="!isAuth && !route.fullPath.includes('login')"
            class="d-none d-sm-flex mx-1"
            prepend-icon="$login"
            variant="tonal"
            color="primary"
            @click="router.push(routerLinkI18n(loginContinueTo(route.fullPath)))"
        >
            {{ t('navigation.label-login') }}
        </VBtn>

        <VBtn
            v-show="!isAuth && !route.fullPath.includes('signup')"
            class="d-none d-sm-flex mx-1"
            prepend-icon="$accountPlus"
            variant="tonal"
            color="secondary"
            @click="router.push(routerLinkI18n({ name: 'Signup' }))"
        >
            {{ t('navigation.label-signup') }}
        </VBtn>

        <VBtn
            v-show="isAuth"
            class="d-none d-sm-flex mx-1"
            prepend-icon="$logout"
            variant="tonal"
            @click="router.push(routerLinkI18n({ name: 'Logout' }))"
        >
            {{ t('navigation.label-logout') }}
        </VBtn>

        <AppLanguageSwitcher class="mx-2" />
    </VAppBar>

    <!-- Mobile navigation drawer -->
    <VNavigationDrawer v-model="drawer" temporary location="left">
        <VList nav>
            <VListItem
                :to="routerLinkI18n({ name: 'Home' })"
                prepend-icon="$home"
                :title="t('navigation.label-home')"
                @click="drawer = false"
            />
            <template v-if="isHomePage">
                <VListItem
                    prepend-icon="$account"
                    :title="t('navigation.label-about')"
                    @click="
                        scrollTo('home-about');
                        drawer = false;
                    "
                />
                <VListItem
                    prepend-icon="$briefcase"
                    :title="t('navigation.label-services')"
                    @click="
                        scrollTo('home-services');
                        drawer = false;
                    "
                />
                <VListItem
                    prepend-icon="$email"
                    :title="t('navigation.label-contact')"
                    @click="
                        scrollTo('home-contact');
                        drawer = false;
                    "
                />
            </template>
            <VDivider class="my-2" />
            <VListItem
                :to="routerLinkI18n({ name: 'Playground' })"
                :title="t('navigation.label-playground')"
                @click="drawer = false"
            />
            <VListItem
                :to="routerLinkI18n({ name: 'ProductsList' })"
                prepend-icon="$package"
                :title="t('navigation.label-products-list', 2)"
                @click="drawer = false"
            />
            <template v-if="isAuth">
                <VListItem
                    :to="routerLinkI18n({ name: 'Cart' })"
                    prepend-icon="$cart"
                    :title="t('navigation.label-cart')"
                    @click="drawer = false"
                />
                <VListItem
                    :to="routerLinkI18n({ name: 'OrdersList' })"
                    :title="t('navigation.label-orders')"
                    @click="drawer = false"
                />
                <VListItem
                    :to="routerLinkI18n({ name: 'Profile' })"
                    prepend-icon="$account"
                    :title="t('navigation.label-profile', 2)"
                    @click="drawer = false"
                />
            </template>
            <template v-if="isAdmin">
                <VDivider class="my-2" />
                <VListItem
                    :to="routerLinkI18n({ name: 'Admin' })"
                    prepend-icon="$admin"
                    :title="t('navigation.label-admin')"
                    @click="drawer = false"
                />
                <VListItem
                    :to="routerLinkI18n({ name: 'UsersList' })"
                    prepend-icon="$account"
                    :title="t('navigation.label-users-list', 2)"
                    @click="drawer = false"
                />
            </template>
            <VDivider class="my-2" />
            <VListItem
                v-if="!isAuth"
                prepend-icon="$login"
                :title="t('navigation.label-login')"
                @click="
                    router.push(routerLinkI18n(loginContinueTo(route.fullPath)));
                    drawer = false;
                "
            />
            <VListItem
                v-if="!isAuth"
                prepend-icon="$accountPlus"
                :title="t('navigation.label-signup')"
                @click="
                    router.push(routerLinkI18n({ name: 'Signup' }));
                    drawer = false;
                "
            />
            <VListItem
                v-if="isAuth"
                prepend-icon="$logout"
                :title="t('navigation.label-logout')"
                @click="
                    router.push(routerLinkI18n({ name: 'Logout' }));
                    drawer = false;
                "
            />
        </VList>
    </VNavigationDrawer>
</template>

<style lang="scss">
.page-header {
    .logo {
        display: block;
        max-height: 40px;
        padding: 0 0.75em;
    }

    .logo-link {
        display: flex;
        align-items: center;
        text-decoration: none;
    }
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import {
    VAppBar,
    VBtn,
    VDivider,
    VList,
    VListItem,
    VNavigationDrawer,
    VSpacer
} from 'vuetify/components';
import AppLanguageSwitcher from '@/components/organisms/AppLanguageSwitcher.vue';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { loginContinueTo, scrollToSection as scrollTo } from '@/utils/navigation.ts';
import { PUBLIC_PATH } from '@/utils/constants';
import { useProfileStore } from '@/stores/profile.ts';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();

const { isAuth, isAdmin } = storeToRefs(useProfileStore());

/* Mobile drawer state */
const drawer = ref(false);

/*
 * True when the user is on the home route — shows anchor nav items.
 */
const isHomePage = computed(() => route.name === 'Home');
</script>
