/**
 * Section 12 — UI Feedback utilities.
 * Provides consistent toast messages and loading state helpers.
 */

import { toast } from 'sonner';

/**
 * Shows a success toast with a checkmark.
 */
export function toastSuccess(action: string) {
  toast.success(`✓ ${action} slutfördes`);
}

/**
 * Shows an error toast with a retry option.
 */
export function toastError(message: string, onRetry?: () => void) {
  toast.error('Fel', {
    description: message,
    action: onRetry
      ? { label: 'Försök igen', onClick: onRetry }
      : undefined,
  });
}

/**
 * Shows a warning toast.
 */
export function toastWarning(message: string) {
  toast.warning(message);
}

/**
 * Shows a loading toast that resolves with success or error.
 */
export function toastPromise<T>(
  promise: Promise<T>,
  messages: { loading: string; success: string; error: string }
) {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
}

/**
 * Wraps an async function with automatic toast feedback.
 */
export async function withFeedback<T>(
  fn: () => Promise<T>,
  actionName: string
): Promise<T | undefined> {
  try {
    const result = await fn();
    toastSuccess(actionName);
    return result;
  } catch (error: any) {
    toastError(error?.message || `Fel vid ${actionName.toLowerCase()}`);
    return undefined;
  }
}
