/**
 * This view's frame stream, typed by the contract it reads.
 *
 * The contract and range come from manifest.json — the same file the build reads to name and index
 * this view — so the view cannot claim one range to the app and check another at runtime.
 */
import type { Values } from '@contracts/sea-of-stars';
import { createStream } from '../../src/scry/stream';
import manifest from './manifest.json';

export type { Values };

export const stream = createStream<Values>(manifest.contract);
export const { values, previous, pulses, meta } = stream;
