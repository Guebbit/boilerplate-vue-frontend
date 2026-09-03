# src/modules/feedback/tests/store.spec.ts

## Purpose

Vitest spec for the feedback Pinia store. It mocks the HTTP transport layer (`orvalMutator`) as a `METHOD /url` router so the store under test and the generated API client remain real. The tests pin two invariants: the inbox is always replaced wholesale by the API response (never a local guess), and status-update / delete operations trigger a follow-up `GET /feedback` reload.

## Key elements

- **`TICKET`** — a single fixture ticket object used in every mock response.
- **`responses`** — mutable `Record<string, unknown>` keyed by `"METHOD /url"`; reset in `beforeEach`. The mock `orvalMutator` looks up this table to decide what to resolve.
- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a `vi.fn` that reads `responses[key]` and returns `Promise.resolve(…)`.
- **`requestedUrls()`** — extracts the `.url` field from each recorded `orvalMutator` call, preserving call order.
- **`beforeEach`** — creates a fresh Pinia instance, clears all mocks, and populates `responses` with default POST/GET/PUT/DELETE entries.
- **`describe('submitContact')`** — verifies the form is POSTed to `/feedback/contact` and that the honeypot `website` field is passed through untouched.
- **`describe('fetchRequests')`** — asserts `store.requests` is replaced with the API's item list.
- **`describe('updateStatus')`** — asserts the call sequence is `GET → PUT → GET` (reload after mutation).
- **`describe('deleteRequest')`** — same `GET → DELETE → GET` reload assertion.

## Relationships

- **`src/infrastructure/http/index.ts`** — the module mocked here. Its `orvalMutator` export is the single HTTP entry point the store's generated client calls; the mock intercepts it to serve canned responses and record URLs.
- **`@/modules/feedback/store.ts`** — the module under test; its `useFeedbackStore` is instantiated per-test via a fresh Pinia.

## Notes

- The store is expected to pass the honeypot `website` field verbatim to the API; client-side validation of that field is explicitly *not* the store's responsibility (test name says so).
- The `responses` table is a plain mutable variable captured in the mock closure, not a `vi.fn().mockResolvedValue` per call. Tests that need a different response shape override `responses[key]` before invoking the store action.
- The reload-after-mutation pattern (`updateStatus`, `deleteRequest` both ending with a second `GET /feedback`) is the behavior being pinned — not the local state mutation.
