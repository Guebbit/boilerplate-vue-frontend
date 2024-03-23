<template>
  <div>
    <h1>UTENTE TARGET |{{params.id}}|</h1>
    TODO: tipica pagina che carica un singolo utente (fare pinia, TTL, etc)
    + info utente
    + sanitizzazione
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';

const { params } = useRoute();
</script>