/**
 * @module
 * The one shape every stats chart is drawn from and every "show as table" and CSV is built from,
 * so the picture, the table and the file can never disagree: a labelled set of numeric series.
 */
import type { CsvCell } from './csv.ts';

/**
 * One drawn series.
 */
export interface ChartSeries {
    /** Legend and column title. */
    name: string;
    /** One value per label, in order. */
    values: number[];
    /** Drawn as bars or as a line (xy charts only). */
    kind: 'bar' | 'line';
}

/**
 * A chart's data.
 */
export interface ChartModel {
    /** What the chart shows. */
    title: string;
    /** The x-axis, or the pie's slices. */
    labels: string[];
    /** The series; a pie reads only the first. */
    series: ChartSeries[];
    /** The y-axis title, xy charts only. */
    yTitle?: string;
}

/**
 * The table form of a chart.
 *
 * @param chart - The chart's data.
 * @param labelTitle - The first column's title.
 * @returns A header and rows, label first and one column per series.
 */
export const chartTable = (
    chart: ChartModel,
    labelTitle: string
): { header: string[]; rows: CsvCell[][] } => ({
    header: [labelTitle, ...chart.series.map(({ name }) => name)],
    rows: chart.labels.map((label, index) => [
        label,
        ...chart.series.map(({ values }) => values[index])
    ])
});
