/**
 * The one sanctioned cast for hand-built test stubs.
 *
 * A stub can never structurally satisfy the framework type it stands in for — a
 * `RouteLocationNormalized` or an `AxiosError` carries far more than a test cares to build — so
 * SOME cast is unavoidable. What is avoidable is `as unknown as T` scattered through every
 * suite: a spelling that erases the type system's objection instead of answering it, and gives
 * a reviewer nothing to search for. This helper is that answer, once, behind a name that says
 * what the value is. `no-restricted-syntax` bans the inline double cast everywhere else; the
 * paired backend carries the identical seam in its own tests/support/stub.ts.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the type parameter IS the call site's declaration: asStub<AxiosError>(stub)
export const asStub = <T extends object>(value: unknown): T => value as T;
