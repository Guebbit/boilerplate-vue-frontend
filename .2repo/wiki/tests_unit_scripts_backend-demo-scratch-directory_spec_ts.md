# tests/unit/scripts/backend-demo-scratch-directory.spec.ts

## Purpose

Vitest unit tests for the demo-scratch-directory helpers. Verifies that the per-process directory a spawned demo backend uses for its Mongo data lives under the user cache (not the system tmpdir), fits within Unix-socket path limits, can be removed along with orphaned contents, and that creation of a new directory selectively sweeps only the scratch of *dead* sibling processes.

## Key elements

- **`deadPid()`** — Spawns a trivial `node -e ''` child via `spawnSync`; because `spawnSync` blocks until the child is reaped, the returned PID is guaranteed to be dead (not a zombie). Used to simulate an abandoned run's directory name.
- **Test: "creates a short, per-process directory under the user cache"** — Asserts the path exists, starts with `~/.cache`, does *not* start with `os.tmpdir()`, is shorter than 70 characters, and its basename equals `process.pid`.
- **Test: "removes the directory with whatever a killed mongod left in it"** — Seeds a fake `mongo-mem-*` subdir with a `WiredTiger.lock` file, then confirms `removeDemoScratchDirectory` deletes the whole tree.
- **Test: "tolerates a directory that is already gone"** — Calls `removeDemoScratchDirectory` on a non-existent path and asserts no throw.
- **Test: "sweeps the scratch of a run that is no longer running, and keeps a live one"** — Creates a sibling dir named after a dead PID (with nested mongod data) and a sibling named `not-a-pid`. After calling `createDemoScratchDirectory` again, asserts the dead-PID dir is gone while both the live dir and the foreign-named dir remain.

## Relationships

- **`scripts/backend-demo-scratch-directory.ts`** — The sole production module under test. The spec imports `createDemoScratchDirectory` and `removeDemoScratchDirectory` from it; no other files are touched.

## Notes

- The 70-character length assertion is a proxy for the real constraint: `tsx` opens a Unix socket under `TMPDIR`, and Linux caps socket paths at 108 bytes. Keeping the directory path short leaves room for the socket filename.
- The sweeping test deliberately places a directory named `not-a-pid` as a sibling to confirm the cleanup logic keys on PID-like names and does not blindly wipe the parent.
- `deadPid()` relies on `spawnSync`'s synchronous wait; an async spawn would risk the PID still being alive when the test reads it.
- Cleanup in each test is done via `finally` blocks calling `removeDemoScratchDirectory`, so a failed assertion does not leak directories into `~/.cache`.
