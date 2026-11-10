---
source: src/infrastructure/http/download.ts
sha256: e00f8ed5cd0ada4db918a1ce10b85d4e0fd3cf6737a8ecb2d15335aac37e7c36
signature: 358d1d74568321cfcf5a2753c9149344250f6e05eae1c1e5d631eb141b813942
generated_at: 2026-11-10T03:02:58.500172+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/download.ts

## Purpose

Client-side download helper that turns a blob `AxiosResponse` carrying a `Content-Disposition` header (RFC 6266 / 8187) into a `File` object bearing the server-specified name. Call sites then save `file.name` without inventing one. It is a leaf of the HTTP tier: it imports only the `content-disposition` parser and `@guebbit/js-toolkit`.

## Key elements

- **`filenameOf(header)`** *(internal)* — Extracts `parameters.filename` via `content-disposition.parse`. Returns `undefined` on a malformed header instead of throwing, so a successful download is never lost to a server-side header slip.
- **`onDownloadResponse(response)`** — Axios response interceptor. If `response.data` is a `Blob` and the `content-disposition` header is a string with a valid filename, it replaces the body with `new File([blob], name)`. All other responses pass through untouched.
- **`saveDownload(file)`** — Saves a downloaded file to disk via `downloadBlob` from `@guebbit/js-toolkit`. Throws `TypeError` if the argument is not a `File` (i.e. the server never named it), rather than silently saving under an invented name.

## Relationships

- **`src/infrastructure/http/index.ts`** — Registers `onDownloadResponse` as a response interceptor on the shared axios instance.
- **`src/modules/orders/composables/use-order-documents.ts`** — Consumes `saveDownload` (and the resulting `File`) to persist order-document downloads in the browser.

## Notes

- `content-disposition.parse` is the only way to read the header; it throws on malformed input, so `filenameOf` wraps it in `try/catch` (the sole use of a restricted `catch` in this file, with an inline eslint-disable).
- `saveDownload` deliberately uses `instanceof File` rather than a cast. A plain `Blob` means the header was missing/malformed **or** the browser could not read it (CORS `exposedHeaders` not set). Throwing makes that condition visible instead of hiding it behind a guessed filename.
- The module is side-effect-free on import; all behaviour is activated only when `index.ts` wires the interceptor.
