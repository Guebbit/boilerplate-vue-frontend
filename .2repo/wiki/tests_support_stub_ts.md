# tests/support/stub.ts

## Purpose

A single sanctioned cast helper for hand-built test stubs. Because test doubles can never structurally satisfy the full framework type they stand in for, some cast is unavoidable; this file consolidates that cast into one named function so that the raw `as unknown as T` double-cast is never written inline in test suites.

## Key elements

- **`asStub<T extends object>(value: unknown): T`** — The sole export. Accepts any value and returns it typed as `T`, letting the caller declare the intended type at the call site (e.g. `asStub<AxiosError>(stub)`). A generic parameter is used deliberately so the target type is visible at each usage rather than hidden in a local annotation.

## Relationships

Imported by every test file that builds hand-crafted stubs where a full object literal is impractical:

- `src/modules/demo/tests/guards.spec.ts`
- `src/modules/products/tests/store.spec.ts`
- `src/modules/users/tests/store.spec.ts`
- `tests/unit/app/guards/authentications.spec.ts`
- `tests/unit/app/guards/locale-choice.spec.ts`
- `tests/unit/infrastructure/http/http-request.spec.ts`
- `tests/unit/infrastructure/http/response-schema-map.spec.ts`
- `tests/unit/ui/form-image-upload.spec.ts`

The file is leaf-level: it imports nothing and is depended on only by test code.

## Notes

- An ESLint `no-restricted-syntax` rule bans the inline `as unknown as T` pattern across the repo; `asStub` is the one allowed exception.
- The `eslint-disable-next-line` on the generic parameter suppresses `@typescript-eslint/no-unnecessary-type-parameters` because the type parameter *is* the call-site's declaration.
- A paired `tests/support/stub.ts` exists in the backend project carrying the identical helper; keep them in sync if the signature ever changes.
