/**
 * Lightweight predictive monitor — räknar repeated failures och flaggar tidigt.
 */
type Bucket = { count: number; firstAt: number };

const validationBuckets = new Map<string, Bucket>();
const requestBuckets = new Map<string, Bucket>();

const VALIDATION_WINDOW_MS = 60_000;
const VALIDATION_THRESHOLD = 3;

const REQUEST_WINDOW_MS = 30_000;
const REQUEST_THRESHOLD = 2;

type Listener = (ev: PredictiveEvent) => void;
const listeners = new Set<Listener>();

export type PredictiveEvent =
  | { kind: "repeated_validation"; formId: string; count: number }
  | { kind: "repeated_request"; signature: string; count: number };

export function onPredictive(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(ev: PredictiveEvent) {
  listeners.forEach((l) => {
    try {
      l(ev);
    } catch {
      /* noop */
    }
  });
}

function bump(map: Map<string, Bucket>, key: string, windowMs: number, threshold: number) {
  const now = Date.now();
  const cur = map.get(key);
  if (!cur || now - cur.firstAt > windowMs) {
    map.set(key, { count: 1, firstAt: now });
    return 0;
  }
  cur.count += 1;
  return cur.count >= threshold ? cur.count : 0;
}

export function reportValidationError(formId: string, fieldId?: string) {
  const key = fieldId ? `${formId}:${fieldId}` : formId;
  const triggered = bump(validationBuckets, key, VALIDATION_WINDOW_MS, VALIDATION_THRESHOLD);
  if (triggered) emit({ kind: "repeated_validation", formId: key, count: triggered });
}

export function reportFailedRequest(signature: string) {
  const triggered = bump(requestBuckets, signature, REQUEST_WINDOW_MS, REQUEST_THRESHOLD);
  if (triggered) emit({ kind: "repeated_request", signature, count: triggered });
}

export function clearValidation(formId: string, fieldId?: string) {
  const key = fieldId ? `${formId}:${fieldId}` : formId;
  validationBuckets.delete(key);
}
