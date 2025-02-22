<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import LanguageSwitcher from '@/components/atoms/LanguageSwitcher.vue'
import { routerLinkI18n } from '@/plugins/i18n'
import { loginContinueTo } from '@/utils/helperNavigation.ts'
import { PUBLIC_PATH } from '@/utils/constants'
import { useProfileStore } from '@/stores/profile.ts'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const {
    isAuth,
    isAdmin
} = storeToRefs(useProfileStore())
</script>

<template>
    <header class="page-header">
        <img alt="logo" class="logo" :src="PUBLIC_PATH + '/images/guebbit-logo-colored.png'" />

        <nav>
            <RouterLink
                :to="
                    routerLinkI18n({
                        name: 'Home'
                    })
                "
            >
                {{ t('navigation.label-home') }}
            </RouterLink>
            <RouterLink
                v-show="isAdmin"
                :to="
                    routerLinkI18n({
                        name: 'Admin'
                    })
                "
            >
                {{ t('navigation.label-admin') }}
            </RouterLink>
            <RouterLink
                v-show="isAdmin"
                :to="
                    routerLinkI18n({
                        name: 'UserList'
                    })
                "
            >
                {{ t('navigation.label-user-list', 2) }}
            </RouterLink>
            <RouterLink
                v-show="isAuth"
                :to="
                    routerLinkI18n({
                        name: 'Profile'
                    })
                "
            >
                {{ t('navigation.label-profile', 2) }}
            </RouterLink>
        </nav>

        <slot />

        <button
            v-show="!isAuth && !route.fullPath.includes('login')"
            class="theme-button"
            @click="router.push(routerLinkI18n(loginContinueTo(route.fullPath)))"
        >
            {{ t('navigation.label-login') }}
        </button>
        <button
            v-show="isAuth"
            class="theme-button"
            @click="router.push(routerLinkI18n({ name: 'Logout' }))"
        >
            {{ t('navigation.label-logout') }}
        </button>

        <LanguageSwitcher />
    </header>
</template>

<style lang="scss">
@use '@/assets/styles/functions' as fn;

.page-header {
    line-height: 1.5;
    height: var(--nav-height);
    display: flex;
    justify-content: center;
    align-items: center;

    .logo {
        display: block;
        max-height: 100%;
        padding: 0.5em 1em;
    }

    nav {
        width: 100%;
        height: 100%;

        & > a {
            height: 100%;
            display: inline-flex;
            align-items: center;
            padding: 0 1em;
            border-left: 1px solid var(--color-border);
            text-shadow: 1px -1px 1em #000;

            &:hover,
            &.router-link-exact-active {
                color: var(--anchor-text-active-color);
                background: var(--anchor-background-active-color);
            }
        }
    }

    @include fn.for-desktop() {
        nav {
            text-align: left;
        }
    }
}
</style>
