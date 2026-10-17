---
source: tests/unit/docker/security-txt-entrypoint.spec.ts
sha256: 8cc898557b941b1d50bd7d1be894a6f677e1e360f6f59d6adaeb380db0a3902c
generated_at: 2026-10-17T02:33:34.095119+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/docker/security-txt-entrypoint.spec.ts

## Purpose
Unit tests for the Docker entrypoint hook `41-generate-security-txt.sh`, verifying that the RFC 9116 `security.txt` file is published only when both required fields (`Contact` and `Expires`) are configured, and that it is removed when the configuration is withdrawn.

## Key elements
- **`run(environment)`** – Spawns the shell script via `spawnSync('sh', …)` with a controlled `env` (only `PATH` and `SECURITY_TXT_ROOT` are always present) and asserts exit status 0.
- **`target()`** – Returns the expected output path `<root>/.well-known/security.txt`.
- **`beforeEach` / `afterEach`** – Creates a unique temp directory (`mkdtempSync`) per test and removes it afterwards, so each case gets an isolated web root.
- **Test cases** (five `it` blocks):
  - No config → file is absent.
  - Contact set but no Expires → file is absent (RFC 9116 gating).
  - Both required fields set → file contains `Contact`, `Expires`, and `Preferred-Languages: en`; adding `VITE_SECURITY_POLICY_URL` appends a `Policy:` line.
  - Config present then withdrawn (second `run({})`) → stale file is deleted.
  - Newline injection: a `Contact` value containing `\nExpires: …` must not produce a second `Expires` line in the output.

## Relationships
No direct imports from either graph neighbor are present in this file. The `Preferred-Languages: en` assertion in the "writes Contact, Expires and language" case overlaps with the concern covered by `tests/cross-cutting/published-language.spec.ts` (language publication across the codebase). No visible interaction with `tests/unit/scripts/pairing/spec-identity.spec.ts`.

## Notes
- The script is invoked with `sh`, not `bash`; tests must not rely on bashisms.
- `Preferred-Languages: en` is hardcoded in the expected output, implying the script always emits that line when the file is published (it is not gated by a separate env var).
- The header-injection test specifically checks that a crafted `Contact` value cannot smuggle an extra `Expires` header into the output—treat any future refactoring of the script's string handling as sensitive to this case.
