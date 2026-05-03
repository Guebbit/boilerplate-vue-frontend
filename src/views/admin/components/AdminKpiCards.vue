<template>
    <div class="admin-kpi-cards">
        <MaterialStatCard
            v-for="kpi in props.kpis"
            :key="kpi.label"
            :title="kpi.label"
            :value="kpi.value"
            :subtitle="kpi.subtitle"
            :accent="kpi.accent"
        />
    </div>
</template>

<script setup lang="ts">
import type { IAdminKpi } from '@/types/admin';
import MaterialStatCard from '@/components/molecules/MaterialStatCard.vue';

const props = defineProps<{
    kpis: IAdminKpi[];
}>();
</script>
