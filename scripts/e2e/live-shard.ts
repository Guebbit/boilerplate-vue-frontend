/**
 * The nightly live run's split: which specs one CI matrix job runs.
 *
 * Live cannot share a database between shards, so each matrix job has its own services and runs
 * its slice sequentially; this only decides the slices. Same balancing as the demo shards
 * (`shard-balancer.ts`), so the slices finish at about the same time.
 */
import { balanceShards, weighSpecs } from './shard-balancer';

/**
 * The spec files slice `index` of `total` runs.
 *
 * Deterministic for one input, so every matrix job computes the same partition and the slices
 * cover the suite exactly once between them.
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
    const specs = files.toSorted().map((file) => ({ file, key: file }));
    // Weighing needs at least one known duration for its mean; with none, every spec weighs the same.
    const known = specs.some(({ key }) => key in durations);
    const weighted = weighSpecs(
        specs,
        known ? durations : Object.fromEntries(specs.map(({ key }) => [key, 1]))
    );
    return balanceShards(weighted, total)[index - 1].files.toSorted();
};
