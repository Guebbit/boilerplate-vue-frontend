/**
 * The demo webhook sink's TLS material: a test CA, and a leaf for `127.0.0.1` signed by it.
 *
 * Every webhook URL is `https://`, so a receiver on loopback needs a certificate the backend
 * trusts. The backend trusts the CA through `NODE_EXTRA_CA_CERTS` (its `demo` and `e2e:serve`
 * scripts set it); the sink here serves the leaf; the live profile's `webhook-tester` is reached
 * through a proxy that serves the same leaf.
 *
 * The three files are the backend's, copied by its `sync:frontend` and compared by
 * `check:spec-identity`. Never edit them here: the backend remakes them (`npm run scenario:tls`).
 * The private key is public on purpose, and only good for loopback.
 *
 * Alone in its file so the code that serves (`./webhook-sink.ts`) and the code that reads
 * (`./webhook-tester.ts`) share one reading of the files.
 */
import { readFileSync } from 'node:fs';

/** Where the synced copies live. */
const TLS_DIRECTORY = `${import.meta.dirname}/tls`;

/**
 * One PEM file, read as bytes.
 *
 * @param name - the file in {@link TLS_DIRECTORY}
 */
const readPem = (name: string): Buffer => readFileSync(`${TLS_DIRECTORY}/${name}`);

/** The CA certificate, the leaf certificate and the leaf's key, as `node:https` options take them. */
export const WEBHOOK_SINK_TLS = {
    ca: readPem('webhook-sink-ca.pem'),
    cert: readPem('webhook-sink-cert.pem'),
    key: readPem('webhook-sink-key.pem')
} as const;
