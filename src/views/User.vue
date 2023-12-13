<template>
  <div>
    <h1>UTENTE TARGET</h1>
    TODO: tipica pagina che carica un singolo utente (fare pinia, TTL, etc)
    + info utente
    + sanitizzazione
  </div>
</template>

<script setup lang="ts">
defineProps({
  id: {
    type: String,
    required: true
  },
});
</script>