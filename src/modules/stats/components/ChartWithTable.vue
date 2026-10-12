<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ChartWithTable'
};
</script>

<script setup lang="ts">
/**
 * @module
 * One chart block: the Mermaid picture, a "show as table" toggle and a client-side CSV of the
 * same data. The table is the accessible alternative to a drawn chart and the source of the file,
 * so the picture, the table and the CSV all come from one {@link ChartModel}.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Download, Table2, ChartColumn } from 'lucide-vue-next';
import { downloadBlob } from '@guebbit/js-toolkit';
import { vFocusableScroll } from '@/ui/directives/focusable-scroll';
import { chartTable, pieChartSource, toCsv, xyChartSource } from '../domain';
import type { ChartModel } from '../domain';
import MermaidChart from './MermaidChart.vue';

/**
 * What to draw and what to name the CSV.
 */
const props = defineProps<{
    /** The data. */
    chart: ChartModel;
    /** `xy` for bars and lines over labels, `pie` for shares of a whole. */
    kind: 'xy' | 'pie';
    /** The first table column's title: what the labels are (a day, a method). */
    labelTitle: string;
    /** File name of the download, without extension. */
    fileName: string;
}>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Whether the table replaces the picture.
 */
const asTable = ref(false);

/**
 * The Mermaid source for the picture.
 */
const definition = computed(() =>
    props.kind === 'pie' ? pieChartSource(props.chart) : xyChartSource(props.chart)
);

/**
 * The same data as header and rows.
 */
const table = computed(() => chartTable(props.chart, props.labelTitle));

/**
 * Whether there is anything to draw: a chart of no labels is an empty state, not a blank frame.
 */
const hasData = computed(() => props.chart.labels.length > 0);

/**
 * Saves the table as a CSV file. Built in the browser from the rows on screen — an aggregate has no
 * personal data, so it needs no server route.
 */
const downloadCsv = () => {
    // js-toolkit `downloadBlob(data, filename, type)`: wraps the text in a Blob and clicks a link.
    downloadBlob(toCsv(table.value.header, table.value.rows), `${props.fileName}.csv`, 'text/csv');
};
</script>

<template>
    <section class="mb-6" :aria-label="chart.title" data-test="chart-block">
        <div class="mb-2 flex flex-wrap items-center gap-2">
            <h3 class="text-base font-semibold">{{ chart.title }}</h3>
            <v-spacer />
            <v-btn
                v-if="hasData"
                size="small"
                variant="tonal"
                data-test="chart-toggle"
                :aria-pressed="asTable"
                @click="asTable = !asTable"
            >
                <component
                    :is="asTable ? ChartColumn : Table2"
                    :size="16"
                    class="mr-1"
                    aria-hidden="true"
                />
                {{ asTable ? t('stats-page.show-chart') : t('stats-page.show-table') }}
            </v-btn>
            <v-btn
                v-if="hasData"
                size="small"
                variant="tonal"
                data-test="chart-csv"
                @click="downloadCsv"
            >
                <Download :size="16" class="mr-1" aria-hidden="true" />
                {{ t('stats-page.download-csv') }}
            </v-btn>
        </div>

        <p v-if="!hasData" class="opacity-75" data-test="chart-empty">
            {{ t('stats-page.no-data') }}
        </p>

        <v-table
            v-else-if="asTable"
            v-focusable-scroll="chart.title"
            density="compact"
            data-test="chart-table"
        >
            <caption class="sr-only">
                {{
                    chart.title
                }}
            </caption>
            <thead>
                <tr>
                    <th v-for="title in table.header" :key="title" scope="col">{{ title }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(row, index) in table.rows" :key="index">
                    <th scope="row">{{ row[0] }}</th>
                    <td v-for="(cell, cellIndex) in row.slice(1)" :key="cellIndex">{{ cell }}</td>
                </tr>
            </tbody>
        </v-table>

        <MermaidChart v-else :definition="definition" :label="chart.title" />
    </section>
</template>
