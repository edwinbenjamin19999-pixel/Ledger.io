import { toast } from "sonner";
import { isIframeEnvironment, safariDebugError } from "@/lib/safe-browser";

export interface RetryConfig {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  onRetry: () => {},
};
// Safari-safe UUID generator (crypto.randomUUID requires Safari 15.4+ / secure context)
function generateUUID(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback för older Safari / non-secure contexts
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// Session-based error tracking
let sessionId = generateUUID();
let errorCountThisSession = 0;
const MAX_ERRORS_BEFORE_ALERT = 5;

async function getSupabaseClient() {
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
}

/**
 * Track error to backend för admin monitoring
 */
async function trackError(errorType: string, errorMessage: string, errorStack?: string, pageUrl?: string): Promise<void> {
  try {
    if (isIframeEnvironment()) {
      safariDebugError("Error tracking skipped in iframe preview", new Error(errorMessage), {
        errorType,
        pageUrl,
      });
      return;
    }

    const supabase = await getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return; // Only track för logged-in users
    
    errorCountThisSession++;
    
    // Send to backend
    await supabase.functions.invoke('track-error', {
      body: {
        errorType,
        errorMessage,
        errorStack,
        pageUrl: pageUrl || (typeof window !== 'undefined' ? window.location.href : undefined),
        sessionId,
      },
    });
    
    // If too many errors, show help message
    if (errorCountThisSession >= MAX_ERRORS_BEFORE_ALERT) {
      toast.info('Har du problem? Kontakta support@northledger.se så hjälper vi dig!', {
        duration: 10000,
        action: {
          label: 'Kontakta support',
          onClick: () => {
            if (typeof window !== 'undefined') {
              window.open('mailto:support@northledger.se', '_blank');
            }
          },
        },
      });
      errorCountThisSession = 0; // Reset to avoid spam
    }
  } catch (e) {
    safariDebugError('Error tracking failed', e);
    // Silently fail - don't cause more errors
    console.debug('Error tracking failed:', e);
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxAttempts,
    delayMs,
    backoffMultiplier,
    onRetry,
  } = { ...DEFAULT_RETRY_CONFIG, ...config };

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxAttempts) {
        const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error);
        onRetry(attempt, lastError);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Handle API errors with user-friendly messages and tracking
 */
export function handleApiError(error: unknown, context?: string): void {
  console.error(`API Error${context ? ` (${context})` : ''}:`, error);

  let message = 'Ett oväntat fel uppstod';
  let errorType = 'unknown';
  
  if (error instanceof Error) {
    errorType = error.name || 'Error';
    
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      message = 'Nätverksfel. Kontrollera din internetanslutning.';
      errorType = 'network';
    }
    // Timeout errors
    else if (error.message.includes('timeout')) {
      message = 'Begäran tog för lång tid. Försök igen.';
      errorType = 'timeout';
    }
    // Database errors
    else if (error.message.includes('database') || error.message.includes('postgres')) {
      message = 'Databasfel. Försöker återansluta...';
      errorType = 'database';
    }
    // Auth errors
    else if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      message = 'Du behöver logga in igen.';
      errorType = 'auth';
    }
    // RLS errors
    else if (error.message.includes('row-level security') || error.message.includes('RLS')) {
      message = 'Behörighetsfel. Kontakta support om problemet kvarstår.';
      errorType = 'permission';
    }
    // Use the actual error message if it's user-friendly
    else if (error.message && error.message.length < 100) {
      message = error.message;
    }
    
    // Track the error
    trackError(errorType, error.message, error.stack, context);
  }

  toast.error(message);
}

/**
 * Wrapper för Supabase queries with automatic retry and error handling
 */
export async function safeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  config?: RetryConfig & { context?: string }
): Promise<T | null> {
  try {
    const result = await withRetry(async () => {
      const { data, error } = await queryFn();
      
      if (error) {
        // Don't retry on auth errors
        if (error.message?.includes('JWT') || error.message?.includes('auth')) {
          throw new Error('AUTH_ERROR');
        }
        throw error;
      }
      
      return data;
    }, config);
    
    return result;
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH_ERROR') {
      toast.error('Du behöver logga in igen');
      return null;
    }
    
    handleApiError(error, config?.context);
    return null;
  }
}

/**
 * Global error handler för unhandled errors
 */
export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    safariDebugError('Unhandled promise rejection', event.reason);
    event.preventDefault();
    
    const error = event.reason;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    trackError('unhandled_rejection', errorMessage, errorStack);
    handleApiError(event.reason, 'Unhandled Promise');
  });

  // Handle general errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    safariDebugError('Global error event', event.error ?? event.message);
    
    // Don't show toast för script loading errors
    if (event.message?.includes('Script error')) {
      return;
    }
    
    const error = event.error;
    const errorMessage = error instanceof Error ? error.message : event.message;
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    trackError('global_error', errorMessage, errorStack, event.filename);
    handleApiError(event.error, 'Global Error');
  });
}

/**
 * Check if the application is online
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

/**
 * Setup online/offline listeners
 */
export function setupConnectivityListeners(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('online', () => {
    toast.success('Anslutning återupprättad');
  });

  window.addEventListener('offline', () => {
    toast.error('Internetanslutningen förlorades');
  });
}

/**
 * Health check - verify system is working
 */
export async function performHealthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`);
    if (!response.ok) {
      console.error('Health check failed:', response.status);
      return false;
    }
    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    console.error('Health check error:', error);
    return false;
  }
}

/**
 * Auto-recovery: Try to recover from common issues
 */
export async function attemptAutoRecovery(): Promise<boolean> {
  console.log('Attempting auto-recovery...');
  
  // 1. Check connectivity
  if (!isOnline()) {
    toast.error('Ingen internetanslutning. Väntar på anslutning...');
    return false;
  }
  
  // 2. Verify session
  try {
    const supabase = await getSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      toast.info('Din session har gått ut. Logga in igen.');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
      return false;
    }
  } catch (e) {
    console.error('Session check failed:', e);
  }
  
  // 3. Perform health check
  const isHealthy = await performHealthCheck();
  if (!isHealthy) {
    toast.warning('Systemet har tillfälliga problem. Vi arbetar på att lösa det.');
    return false;
  }
  
  toast.success('Systemet fungerar nu korrekt');
  return true;
}
