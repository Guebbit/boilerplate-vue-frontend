---
source: src/infrastructure/http/passive.ts
sha256: 5b102679c07ba6284d992ebb4712f274d9200fbb092000810daf323c92e7b758
signature: e1e1aaf2d0e1c01fc18ba3cc1eb978d2e2611f476ec80bd50e6ba16954449521
generated_at: 2026-11-10T03:05:16.128843+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/passive.ts

## Purpose

Provides a small helper for tagging outgoing HTTP requests as *passive*—i.e. initiated by the app itself rather than by the human in the tab. The paired backend's session guard treats any request lacking this marker as staff activity, which would reset the idle timer; passive calls (token refresh, abilities re-read, notifications sync) must carry it so an unattended tab can actually idle out.

## Key elements

- **`SESSION_PASSIVE_HEADER`** (`'Session-Passive'`) — the exact header name the backend's session guard (`kernel/middlewares/authorizations.ts`) inspects.
- **`asPassive(options?)`** — returns a shallow copy of the given `AxiosRequestConfig` with `headers['Session-Passive']` set to `'true'`. Existing headers on `options` are preserved; the function never mutates the argument. Intended to be used as a per-call config override in axios requests.

## Relationships

No graph neighbors. The file is a leaf module; the only coupling is the string contract with the backend middleware noted above.

## Notes

- The spread over `options?.headers` is deliberately object-level (not an `AxiosHeaders` instance merge). The eslint-disable comment documents that AxiosHeaders' enumerable entries behave like a plain object here, and that `orvalMutator` merges headers the same way. If you switch to a typed `AxiosHeaders` object, this line will need revisiting.
- The value is always the literal string `'true'`; the backend only checks for header *presence*, but the literal is part of the contract.
- See `docs/theory/sessions.md` for the full idle-clock rationale.
