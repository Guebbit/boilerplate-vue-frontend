<template>
    <header class="page-header">
        <img alt="logo" class="logo" :src="PUBLIC_PATH + '/images/guebbit-logo-colored.png'" />

        <nav>
            <RouterLink
                :to="routerLinkI18n({
                    name: 'Home',
                })"
            >
                {{ t('navigation.home-label') }}
            </RouterLink>
            <RouterLink
                :to="routerLinkI18n({
                    name: 'Restricted',
                })"
            >
                {{ t('navigation.admin-label') }}
            </RouterLink>
            <RouterLink
                :to="routerLinkI18n({
                    name: 'UserList',
                })"
            >
                {{ t('navigation.user-list-label', 2) }}
            </RouterLink>
        </nav>

        <slot />

        <button
            v-show="!isAuth"
            class="theme-button"
            @click="router.push(routerLinkI18n({
                name: 'Login',
                query: {
                    continue: route.fullPath,
                }
            }))"
        >
            {{ t('navigation.login-label') }}
        </button>
        <button
            v-show="isAuth"
            class="theme-button"
            @click="router.push(routerLinkI18n({ name: 'Logout' }))"
        >
            {{ t('navigation.logout-label') }}
        </button>

        <LanguageSwitcher />
    </header>
</template>

<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/atoms/LanguageSwitcher.vue'
import { routerLinkI18n } from '@/plugins/i18n'
import { PUBLIC_PATH } from '@/utils/constants'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profile.ts'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const {
    isAuth
} = storeToRefs(useProfileStore())
</script>

<style lang="scss">
@use "@/assets/styles/functions" as fn;

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
        text-align: center;

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
