<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'MermaidChart'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Draws Mermaid source as an inline SVG. The library is a dynamic `import()` made only when a chart
 * mounts, so it ships in the stats route's own chunks and never in the entry bundle. The SVG is
 * parsed and attached as a DOM node rather than set as `innerHTML`, and Mermaid runs at
 * `securityLevel: 'strict'`: no clickable nodes, no raw HTML in labels.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTheme } from 'vuetify';

/**
 * The diagram and what to call it.
 */
const props = defineProps<{
    /** Mermaid source, from `domain/mermaid.ts` — never raw user text. */
    definition: string;
    /** The chart's accessible name; its data is in the "show as table" view. */
    label: string;
}>();

/**
 * Translation function for the failure line.
 */
const { t } = useI18n();

/**
 * Vuetify's active theme, so the diagram follows light and dark.
 */
const theme = useTheme();

/**
 * The element the SVG is attached to.
 */
const host = ref<HTMLElement>();

/**
 * Whether the last render failed; the table view still holds the numbers.
 */
const failed = ref(false);

/**
 * Counts renders so a slow earlier one never overwrites a newer one, and gives every render a
 * unique element id (Mermaid inserts a temporary node under that id).
 */
let renderCounter = 0;

/**
 * Whether the component is gone, so a late render stops touching the DOM.
 */
let unmounted = false;

/**
 * Renders the current definition into the host element.
 *
 * @returns A promise settling once the SVG is attached or the failure is recorded.
 */
const render = (): Promise<void> => {
    renderCounter += 1;
    const current = renderCounter;
    return import('mermaid')
        .then(({ default: mermaid }) => {
            // Mermaid initialize: `startOnLoad: false` (we render on demand), `securityLevel` strict
            // (labels never become HTML), `suppressErrorRendering` (a syntax error throws instead
            // of drawing a bomb icon into the page). Theme names are Mermaid's own.
            // https://mermaid.js.org/config/schema-docs/config.html
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'strict',
                suppressErrorRendering: true,
                theme: theme.current.value.dark ? 'dark' : 'default'
            });
            return mermaid.render(`stats-chart-${current}`, props.definition);
        })
        .then(({ svg }) => {
            if (unmounted || current !== renderCounter || !host.value) return;
            const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
            host.value.replaceChildren(parsed.documentElement);
            failed.value = false;
        })
        .catch(() => {
            if (unmounted || current !== renderCounter) return;
            failed.value = true;
        });
};

watch(
    () => [props.definition, theme.current.value.dark],
    () => void render()
);

onMounted(() => {
    void render();
});

onBeforeUnmount(() => {
    unmounted = true;
});
</script>

<template>
    <div class="w-full overflow-x-auto" data-test="stats-chart">
        <div ref="host" role="img" :aria-label="label" class="min-h-32" />
        <p v-if="failed" class="text-sm opacity-75" role="status" data-test="stats-chart-failed">
            {{ t('stats-page.chart-failed') }}
        </p>
    </div>
</template>
