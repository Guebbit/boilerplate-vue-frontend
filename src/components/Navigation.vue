<template>
  <header class="page-header">
    <img alt="logo" class="logo" src="@/assets/images/guebbit-logo-colored.svg" />

    <nav>
      <RouterLink
        :to="RouterLinkI18n({
          name: 'Home',
        })"
      >
        {{ t('navigation.home-label') }}
      </RouterLink>
      <RouterLink
        :to="RouterLinkI18n({
          name: 'Restricted',
        })"
      >
        {{ t('navigation.restricted-label') }}
      </RouterLink>
      <RouterLink
        :to="RouterLinkI18n({
          name: 'UserList',
        })"
      >
        {{ t('navigation.user-list-label') }}
      </RouterLink>
    </nav>

    <LanguageSwitcher />
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";
import { RouterLinkI18n } from "@/plugins/i18n";

const { t } = useI18n();
</script>

<style lang="scss">
@import "@styles/global";

.page-header{
  line-height: 1.5;
  height: var(--nav-height);

  .logo {
    display: block;
    max-height: 100%;
    padding: 0.5em 1em;
  }

  nav {
    width: 100%;
    height: 100%;
    text-align: center;

    & > a{
      height: 100%;
      display: inline-flex;
      align-items: center;
      padding: 0 1em;
      border-left: 1px solid var(--color-border);

      &:hover,
      &.router-link-exact-active{
        color: var(--anchor-text-active-color);
        background: var(--anchor-background-active-color);
      }
    }
  }

  @media (min-width: $g-media-query-desktop) {
    display: flex;
    place-items: center;

    nav {
      text-align: left;
    }
  }
}
</style>
