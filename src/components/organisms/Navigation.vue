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

            <slot name="nav-left" />
        </nav>

        <slot />

        <nav>
            <slot name="nav-right" />

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
        </nav>

    </header>
</template>

<style lang="scss">
@use '@/assets/styles/functions' as fn;

.page-header {
    .logo {
        display: block;
        max-height: 100%;
        padding: 0.5em 1em;
    }

    nav {
        display: flex;
        gap: 1em;

        & > a {
            height: 100%;
            display: inline-flex;
            align-items: center;
            padding: 0 1em;
            border-left: 1px solid var(--color-border);
            text-shadow: 1px -1px 1em #000;
            text-transform: capitalize;

            &:hover,
            &.router-link-exact-active {
                color: rgb(var(--on-secondary-600));
                background: rgb(var(--secondary-600));
            }
        }
    }

    @include fn.for-desktop() {
        nav {
            justify-content: flex-start;

            &:last-child{
                justify-content: flex-end;
            }
        }
    }
}
</style>
