/**
 * @module
 * Chart data to Mermaid diagram text (`xychart-beta`, `pie`). Mermaid reads a mini-language, so
 * every label that reaches it is a string a shop owner may have typed (a product or category
 * title): {@link safeLabel} reduces each to a plain allow-list before it is placed in quotes, so
 * no label can close the quote, open a directive or smuggle markup. Mermaid itself runs at
 * `securityLevel: 'strict'` as the second line.
 */
import type { ChartModel } from './chart.ts';

/**
 * Longest label kept; Mermaid does not wrap axis text and a long one squeezes the plot.
 */
const MAX_LABEL_LENGTH = 32;

/**
 * Makes text safe to place between quotes in Mermaid source.
 *
 * Letters and numbers of any script, spaces and a few plain marks survive; every other character
 * (quotes, backslash, `#` and `;` which form entities, brackets, `%` directives, line breaks,
 * control characters) becomes a space. Runs of spaces collapse, and the result is cut to a
 * readable length.
 *
 * @param text - The raw label.
 * @returns The sanitised label, never containing a quote or a line break.
 */
export const safeLabel = (text: string): string => {
    const cleaned = text
        .replaceAll(/[^\p{L}\p{N} .,:/&+()'·-]/gu, ' ')
        .replaceAll(/\s+/g, ' ')
        .trim();
    return cleaned.length > MAX_LABEL_LENGTH
        ? `${cleaned.slice(0, MAX_LABEL_LENGTH - 1)}…`
        : cleaned;
};

/**
 * Rounds a figure for the diagram, which only needs what a reader can tell apart.
 *
 * @param value - Any number.
 * @returns At most two decimals; `0` for a value that is not finite.
 */
const plotted = (value: number): number => (Number.isFinite(value) ? Number(value.toFixed(2)) : 0);

/**
 * Mermaid source for a bar and/or line chart.
 *
 * @param chart - The data; its series draw in order, bars and lines mixed as declared.
 * @returns `xychart-beta` source.
 */
export const xyChartSource = (chart: ChartModel): string =>
    [
        'xychart-beta',
        `    title "${safeLabel(chart.title)}"`,
        `    x-axis [${chart.labels.map((label) => `"${safeLabel(label)}"`).join(', ')}]`,
        `    y-axis "${safeLabel(chart.yTitle ?? '')}"`,
        ...chart.series.map(
            ({ kind, values }) =>
                `    ${kind} [${values.map((value) => plotted(value)).join(', ')}]`
        )
    ].join('\n');

/**
 * Mermaid source for a pie of the chart's first series. Slices that are not positive are dropped:
 * Mermaid refuses them, and a zero slice draws nothing anyway.
 *
 * @param chart - The data; only its first series is read.
 * @returns `pie` source.
 */
export const pieChartSource = (chart: ChartModel): string => {
    const values = chart.series[0]?.values ?? [];
    return [
        `pie showData title ${safeLabel(chart.title)}`,
        ...chart.labels.flatMap((label, index) =>
            values[index] > 0 ? [`    "${safeLabel(label)}" : ${plotted(values[index])}`] : []
        )
    ].join('\n');
};
