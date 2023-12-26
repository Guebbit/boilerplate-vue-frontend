<template>
  <main id="user-list-page" class="item-list-page">
    <h1 class="theme-page-title"><span>LISTA UTENTI</span></h1>
    <div>
      TODO: tipica pagina che carica la lista utenti (fare pinia, TTL, etc) + lista cliccabile
      TODO i colori da HEX a RGB così vai le variazioni di opacità
    </div>

    <ListPagination
        v-model="pageCurrent"
        :length="pageTotal"
    />

    <div class="user-list">
      <div
          v-for="user in pageItemList"
          :key="'user-card-' + user.id"
          class="theme-card animate-on-active animate-on-hover card-boxshadowless"
          :class="{
            'active': selectedIdentifier === user.id
          }"
          @click="selectedIdentifier = user.id"
      >
        <img
            class="card-image"
            :alt="user.name + ' photo'"
            :src="'https://placekitten.com/' + (Math.floor(user.id % 10) + 5) + '00/' + (Math.floor(user.id % 10) + 5) + '00'"
        />
        <div class="card-content">
          <h2 class="card-title"><b>{{ user.id }}</b> {{ user.name }}</h2>
          <p>{{ user.phone }} - {{ user.email }} - {{ user.website }}</p>
        </div>
      </div>
    </div>

    <ListPagination
        v-model="pageCurrent"
        :length="pageTotal"
    />
  </main>
</template>

<script setup lang="ts">
// TODO creare Composables per riutilizzare questo genere di pagina "lista X"
// TODO creare file SCSS per questa specifica pagina (tipo tema) e poi fare customizzazioni
// TODO Guardare vrmetacarpi pagine simili
// (fare anche per User.vue)

import { onBeforeMount, ref, computed } from "vue";
import { getUserList } from "@/api";
import useItemList from "@/composables/useItemList";
import ListPagination from "@/components/ListPagination.vue";
import type { UserType } from "@/types";

const {
  itemList,
  selectedIdentifier,
  selectedRecord,
  pageCurrent,
  pageSize,
  pageOffset,
  pageTotal,
  pageItemList,
  itemsFilteredLength,
} = useItemList<UserType>();

pageSize.value = 6;

onBeforeMount(() => {
  getUserList()
      .then((data) => itemList.value = data);
})
</script>

<style lang="scss">
@import "@/assets/styles/pages/itemList";

#user-list-page{
  .user-list{
    --list-margin: 16px;
    --list-border-radius: 24px;

    .theme-card{
      --border-radius: 0;
      --background: transparent;
      --text-color: rgb(var(--core-white));
      --background-active: rgb(var(--primary-500), 0.5);
      --text-color-active: rgb(var(--on-primary-500));
      width: 100%;
      flex-direction: row;
      border-bottom: 2px solid var(--primary-700);
      cursor: pointer;

      .card-image{
        width: 30%;
        max-height: 100px;
        margin: var(--list-margin);
        border-radius: var(--list-border-radius);
      }

      .card-title{
        margin: 0;
      }

      &:first-child{
        border-top-left-radius: var(--list-border-radius);
        border-top-right-radius: var(--list-border-radius);
      }

      &:last-child{
        border-bottom: none;
        border-bottom-left-radius: var(--list-border-radius);
        border-bottom-right-radius: var(--list-border-radius);
      }
    }
  }

  .list-pagination{
    margin: 24px auto;
  }
}
</style>