<script setup lang="ts">
/**
 * @module
 * A shipping method's display name, from the method's stable id (`standard` → "Standard"). The
 * id is what an order freezes, so anything showing one to a person goes through here rather than
 * printing it. A method this deployment has no wording for falls back to its id, never a raw key.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

/**
 * The method's id, as the order carries it.
 */
const { id } = defineProps<{
    id: string;
}>();

/**
 * Translation function and key check.
 */
const i18n = useI18n();

/**
 * The translated name, or the id itself when no wording exists.
 */
const name = computed(() => {
    const key = `shipping-selector.method-${id}`;
    return i18n.te(key) ? i18n.t(key) : id;
});
</script>

<template>
    <span data-test="shipping-method-name">{{ name }}</span>
</template>
