---
source: tests/unit/docker/security-txt-entrypoint.spec.ts
sha256: db8b252fb5e6c087778a5828a06124954009901db390c5a9ac023e373d11e269
signature: 18016c4196bee24074d708a21b779a67ed153aef17e04d0c7b56fde35f2f7fdc
generated_at: 2026-11-10T07:53:03.963682+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/docker/security-txt-entrypoint.spec.ts

## Purpose

Unit tests for the Docker entrypoint script `41-generate-security-txt.sh`, verifying that a RFC 9116 `security.txt` file is written to the web root only when both required fields (Contact and Expires) are supplied, that a stale file is cleaned up when configuration is withdrawn, and that a newline in a value cannot inject a spurious header line.

## Key elements

- **`run(environment)`** – Spawns the entrypoint script via `sh` with `NGINX_HTML_ROOT` pointed at a per-test scratch directory and the given `VITE_SECURITY_*` variables; asserts exit code 0.
- **`target()`** – Returns the expected `security.txt` path (`<root>/.well-known/security.txt`).
- **`beforeEach` / `afterEach`** – Creates a unique `mkdtempSync` directory per test case and removes it after, isolating each case from filesystem state.
- **Test cases (5)** – Cover: (1) no config → no file, (2) Contact without Expires → no file, (3) both set → exact file contents including `Preferred-Languages: en`, and `Policy:` appended only when `VITE_SECURITY_POLICY_URL` is present, (4) config then withdrawn → file removed, (5) newline in `VITE_SECURITY_CONTACT` → no extra `Expires` line appears (header-injection guard).

## Relationships

- **tests/cross-cutting/published-language.spec.ts** – This spec's expected output hard-codes `Preferred-Languages: en`; the cross-cutting spec asserts that the same language value appears consistently across all published artifacts. A change to the default language constant would surface a failure in both files.
- **tests/unit/scripts/pairing/spec-identity.spec.ts** – Enforces naming and structural identity conventions for spec files. This file's path, filename suffix (`.spec.ts`), and describe-block naming must conform to whatever rules that spec validates.

## Notes

- The script is **off by default**: no `security.txt` is emitted unless both `VITE_SECURITY_CONTACT` and `VITE_SECURITY_EXPIRES` are non-empty. Partial configuration is treated as "unconfigured."
- The test invokes the script with `spawnSync('sh', …)` rather than `bash`; the script must remain POSIX-compatible.
- The newline-injection test is a security regression guard: it ensures the shell script sanitises (or at least doesn't split on) newlines inside variable values before writing the file.
