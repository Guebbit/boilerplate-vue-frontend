import { useLivenessProbe } from '@guebbit/vue-toolkit';
import { getHealth } from '@api';

/**
 * Watches whether the API answers its public liveness ping, `GET /`.
 *
 * The mechanism — probe once, again on every browser `online` event, then retry slowly and ONLY
 * while down, on exactly one chain — is the toolkit's `useLivenessProbe`. What belongs here is
 * WHICH endpoint is the ping, and the ping's own contract names this consumer: "a client that has
 * just failed to reach the API is exactly who needs it".
 *
 * Infrastructure rather than any module's, because reachability is a property of the transport
 * every domain shares — the same reason the axios client and the SSE wrapper live down here. It
 * is also what keeps `AppHealthBanner` free of an API import: a component wires, it does not call.
 *
 * @returns `down` — true while the last probe failed — plus the toolkit's `check` and `stop`.
 */
export const useApiHealth = () => useLivenessProbe(() => getHealth());
