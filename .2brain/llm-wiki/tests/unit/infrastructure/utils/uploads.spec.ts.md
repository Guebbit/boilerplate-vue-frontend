---
source: tests/unit/infrastructure/utils/uploads.spec.ts
sha256: df92e2eba24582a58f2a8a07a0720a8fb8b509b317f066c02eb7deba1ec372ff
signature: 0ee1aa83d14f5aa60175ea1b22a92aa1117bf9f7bc59d391385febd84ce94d2e
generated_at: 2026-11-10T08:07:47.345414+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/uploads.spec.ts

## Purpose

Unit tests that pin the client-side upload rules (accepted MIME types, size boundary, and the Zod validation schema) against a hand-maintained copy of the backend's limits. They exist because nothing in the build pipeline will flag a silent drift between `@/infrastructure/utils/uploads.ts` and the backend's `storage.ts`, so the exact boundary conditions are asserted here.

## Key elements

- **`fileOfSize(bytes, type?)`** — Test helper that constructs a `File` with an exact byte length via `Uint8Array`, bypassing the need for real image data.
- **`messagesOf(value)`** — Runs `imageUploadSchema.safeParse` and returns the array of issue messages (empty if valid).
- **`setLocale(locale)`** — Calls `loadLocale` then `nextTick` so the rendered schema messages reflect the new locale before assertions.
- **`describe('accepted types')`** — Iterates `ACCEPTED_UPLOAD_TYPES` to confirm `isAcceptedImageType` passes; asserts rejection of `image/gif`, `image/svg+xml`, `application/pdf`, `text/plain`, empty string, and the non-canonical `image/jpg`. Verifies `ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE` is a comma-join of the same list.
- **`describe('size limit')`** — Boundary test: exactly `MAX_UPLOAD_BYTES` is accepted, `+1` byte is rejected; a 0-byte file is accepted.
- **`describe('imageUploadSchema')`** — Covers: valid file passes, `undefined` (untouched picker) passes, wrong type and oversized file produce the correct localized message, a non-File string is rejected, and the same schema object follows locale switches (en → it) without rebuilding.

## Relationships

No graph neighbors are registered for this file.

## Notes

- The size boundary is **inclusive**: the backend's multer `limits.fileSize` rejects only what *exceeds* the limit, so a file of exactly `MAX_UPLOAD_BYTES` is legal. An off-by-one in the client would incorrectly block a valid upload.
- `image/jpg` is deliberately **not** accepted — it is not an IANA media type and the contract omits it; browsers report `image/jpeg` for `.jpg` files.
- The schema's locale contract: one module-scope schema object, parsed in whichever locale is active at call time. Tests switch locale mid-suite to verify messages change without a schema rebuild (convention shared with `@/modules/users/schemas.ts`).
- The file explicitly does **not** assert that a rejected upload is *unsafe*; security is gated twice on the backend, and re-testing it client-side would mislead readers about where the guarantee lives.
