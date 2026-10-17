---
source: tests/unit/infrastructure/utils/uploads.spec.ts
sha256: 2b000dfc47a3d011579c7aa18d3e91c43a5854998b3875f45a2538bcd65e2220
generated_at: 2026-10-17T02:39:59.935263+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/uploads.spec.ts

## Purpose

Unit tests that pin the client-side upload rules (accepted MIME types, 5 MB size boundary, and the Zod validation schema) to their backend counterparts in `storage.ts`. Because the client values are a hand-maintained copy of the backend's, this file guards against silent drift in what the browser rejects versus what the API accepts. It deliberately does **not** assert security properties — the backend gates every upload independently.

## Key elements

- **`fileOfSize(bytes, type?)`** – Helper that constructs a real `File` of exact byte length without an actual image; the client rules only inspect `type` and `size`.
- **`messagesOf(value)`** – Runs `imageUploadSchema.safeParse` and extracts the Zod issue messages for assertion.
- **`setLocale(locale)`** – Switches the active i18n locale and awaits a Vue render tick so schema messages update.
- **`describe('accepted types')`** – Iterates `ACCEPTED_IMAGE_TYPES` to confirm each is accepted, verifies a fixed list of non-image types is rejected, confirms the non-canonical `image/jpg` alias is handled, and checks that `ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE` stays in sync with the type list.
- **`describe('size limit')`** – Asserts `MAX_UPLOAD_BYTES` equals 5 MB, verifies the inclusive boundary (exactly 5 MB passes, 5 MB + 1 byte fails), and confirms an empty file is allowed.
- **`describe('imageUploadSchema')`** – Exercises the full Zod schema: valid image passes, `undefined` (untouched picker) passes, wrong type and oversized file produce the correct i18n message strings, a non-File value is rejected, and the same schema object follows locale switches without rebuilding.

## Relationships

No graph neighbors recorded. The file imports its subject under test (`@/infrastructure/utils/uploads.ts`) and i18n locale JSON fixtures (`@/locales/en.json`, `@/locales/it.json`), but no reverse dependency edges are tracked.

## Notes

- **Boundary is inclusive.** Multer's `limits.fileSize` rejects only what *exceeds* the limit, so a file of exactly 5 MB is legal. An off-by-one in the client check would wrongly block a file the API accepts — the test explicitly pins both sides of the boundary.
- **`image/jpg` is non-canonical.** Browsers emit it and the backend's allow-list includes it; dropping it client-side would reject files the API would accept.
- **Schema is optional by design.** `undefined` must pass so that forms saved without touching the picker don't fail validation.
- **Locale contract.** The schema is a single module-scope object whose messages re-resolve on each `safeParse` call based on the active locale; the test confirms switching `en → it` changes output without any rebuild (same pattern as `@/modules/users/schemas.ts`).
