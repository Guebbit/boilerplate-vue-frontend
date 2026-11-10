---
source: tests/unit/infrastructure/http/download.spec.ts
sha256: dc0936e9bdaebd80fe621d5dc2e40251d099a603ea6bb8ce465aa2b95258fa01
signature: 66b931b7fc22b6b9b4e4da8a252be3f39d3c4bf7f7091db46f86e174c39c0c11
generated_at: 2026-11-10T07:55:48.123963+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/download.spec.ts

## Purpose

Unit tests for the two functions in `@/infrastructure/http/download.ts`: `onDownloadResponse` (an axios success interceptor that upgrades a named `Blob` to a `File`) and `saveDownload` (a guard that persists only `File` instances). The file exists to pin the naming, passthrough, and error-boundary behavior of the download pipeline so that a server-supplied filename is respected and un-named blobs can never be silently saved under an invented name.

## Key elements

- **`answered(data, disposition?)`** – Local helper that builds a stub `AxiosResponse` via `asStub`, attaching an optional `content-disposition` header.
- **`vi.mock('@guebbit/js-toolkit')`** – Replaces `downloadBlob` with a spy (the real implementation creates a throwaway `<a>` element that jsdom cannot exercise).
- **`describe('onDownloadResponse')`** – Five cases covering: named `Blob` → `File` (name, type, bytes preserved); RFC 8187 `filename*` preferred over plain `filename`; unnamed `Blob` returned as-is; malformed header returned as-is (no throw); non-`Blob` body (JSON) untouched even when the header is present.
- **`describe('saveDownload')`** – Two cases: a `File` is forwarded to `downloadBlob` with its own name; a plain `Blob` throws `TypeError` and `downloadBlob` is never called.
- **`beforeEach`** – Calls `vi.clearAllMocks()` to isolate each test.

## Relationships

- **`tests/support/stub.ts`** – Supplies `asStub<T>`, the generic helper used by `answered` to cast a plain object into a typed `AxiosResponse` stub without constructing a real axios response.

## Notes

- The `downloadBlob` mock is load-bearing: the real function triggers a browser download via a temporary link element, which is a no-op in jsdom. Tests therefore assert *what* is passed to `downloadBlob` rather than any filesystem side-effect.
- RFC 8187 `filename*=UTF-8''…` (percent-encoded) takes precedence over the legacy `filename="…"` fallback; the implementation under test must decode the UTF-8 sequence.
- Malformed `Content-Disposition` values (e.g. an unclosed quote) are treated as "no name" — the blob passes through unchanged. The contract is *never break a working download over a header parse failure*.
- The interceptor is body-type-aware: it only rewrites `response.data` when it is a `Blob` instance, so JSON/API responses that coincidentally carry the header are left untouched.
