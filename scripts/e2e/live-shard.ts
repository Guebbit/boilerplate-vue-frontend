/**
 * The nightly live run's split: which specs one CI matrix job runs.
 *
 * Live cannot share a database between shards, so each matrix job has its own services and runs
 * its slice sequentially; this only decides the slices. Same balancing as the demo shards
 * (`shard-balancer.ts`), so the slices finish at about the same time.
 */
import { balanceShards, weighSpecs } from './shard-balancer';

/**
 * Every slice of the matrix, computed from one set of inputs.
 *
 * Deterministic for one input, so every matrix job computes the same partition and the slices
 * cover the suite exactly once between them. Callers that want several slices take them from one
 * call, so a `durations` file that grows between two calls cannot make the partitions disagree.
 *
 * @param files - every functional spec, as repo-relative posix paths
 * @param durations - measured seconds per spec path; a spec missing here is weighed at the mean
 * @param total - how many slices the matrix has
 * @returns one sorted list of spec paths per slice; trailing slices are empty when `total` exceeds the spec count
 * @throws {RangeError} when `total` is not a positive integer
 */
export const liveShardSlices = (
    files: string[],
    durations: Record<string, number>,
    total: number
): string[][] => {
    if (!Number.isInteger(total) || total < 1)
        throw new RangeError(`live shard count ${String(total)} is not a valid slice count`);
    const specs = files.toSorted().map((file) => ({ file, key: file }));
    // Weighing needs at least one known duration for its mean; with none, every spec weighs the same.
    const known = specs.some(({ key }) => key in durations);
    const weighted = weighSpecs(
        specs,
        known ? durations : Object.fromEntries(specs.map(({ key }) => [key, 1]))
    );
    return balanceShards(weighted, total).map(({ files: slice }) => slice.toSorted());
};

/**
 * The spec files slice `index` of `total` runs.
 *
 * @param files - every functional spec, as repo-relative posix paths
 * @param durations - measured seconds per spec path; a spec missing here is weighed at the mean
 * @param index - this job's slice, 1-based
 * @param total - how many slices the matrix has
 * @returns this slice's spec paths, sorted; empty when `total` exceeds the spec count
 * @throws {RangeError} when `index` or `total` is not a positive integer, or `index` exceeds `total`
 */
export const liveShardFiles = (
    files: string[],
    durations: Record<string, number>,
    index: number,
    total: number
): string[] => {
    if (!Number.isInteger(index) || !Number.isInteger(total) || index < 1 || index > total)
        throw new RangeError(`live shard ${String(index)}/${String(total)} is not a valid slice`);
    return liveShardSlices(files, durations, total)[index - 1];
};
