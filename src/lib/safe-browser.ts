import { setPreviewIframeMode, setPreviewStorageMode } from "@/lib/preview-debug";

type SafeStorageType = "localStorage" | "sessionStorage";

const storageCache: Partial<Record<SafeStorageType, Storage>> = {};

function createMemoryStorage(label: SafeStorageType): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  } as Storage;
}

function getWindow() {
  return typeof window !== "undefined" ? window : undefined;
}

export function isIframeEnvironment(): boolean {
  const win = getWindow();

  if (!win) {
    return false;
  }

  try {
    return win.self !== win.top;
  } catch {
    return true;
  }
}

export function isSafariBrowser(): boolean {
  const win = getWindow();
  const userAgent = win?.navigator?.userAgent ?? "";
  return /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Firefox|Edg|Android/i.test(userAgent);
}

export function isSafariDebugMode(): boolean {
  const win = getWindow();

  if (!win) {
    return false;
  }

  try {
    const params = new URLSearchParams(win.location.search);
    if (params.get("safariDebug") === "1") {
      return true;
    }
  } catch (error) {
    console.error("[SafariDebug] Failed to read query params", error);
  }

  return isSafariBrowser();
}

export function safariDebugLog(step: string, details?: unknown): void {
  if (!isSafariDebugMode()) {
    return;
  }

  if (typeof details === "undefined") {
    console.log(`[SafariDebug] ${step}`);
    return;
  }

  console.log(`[SafariDebug] ${step}`, details);
}

export function safariDebugError(step: string, error: unknown, details?: unknown): void {
  if (typeof details === "undefined") {
    console.error(`[SafariDebug] ${step}`, error);
    return;
  }

  console.error(`[SafariDebug] ${step}`, error, details);
}

function installStorageShim(type: SafeStorageType): Storage {
  const win = getWindow();
  const shim = createMemoryStorage(type);

  storageCache[type] = shim;

  if (!win) {
    return shim;
  }

  try {
    Object.defineProperty(win, type, {
      configurable: true,
      enumerable: true,
      get: () => shim,
      set: () => undefined,
    });
    safariDebugLog(`installed ${type} shim`, {
      iframePreview: isIframeEnvironment(),
      label: type,
    });
  } catch (error) {
    safariDebugError(`failed to install ${type} shim`, error);

    try {
      (win as unknown as Record<string, unknown>)[type] = shim;
      safariDebugLog(`assigned ${type} shim`, { label: type });
    } catch (assignmentError) {
      safariDebugError(`failed to assign ${type} shim`, assignmentError);
    }
  }

  return shim;
}

function getUsableStorage(type: SafeStorageType): Storage | undefined {
  const win = getWindow();

  if (!win) {
    return undefined;
  }

  try {
    const storage = win[type];

    // Safari may return null/undefined even without throwing
    if (!storage) {
      safariDebugLog(`${type} returned falsy`, { value: storage });
      return undefined;
    }

    const probeKey = `__northledger_probe_${type}`;

    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);

    storageCache[type] = storage;
    return storage;
  } catch (error) {
    safariDebugError(`${type} unavailable during startup`, error);
    return undefined;
  }
}

export function ensureSafeBrowserApis(): void {
  const iframePreview = isIframeEnvironment();

  setPreviewIframeMode(iframePreview);

  safariDebugLog("browser api guard start", {
    forceMemoryStorage: iframePreview,
    iframePreview,
  });

  if (iframePreview) {
    // In iframe preview, always force memory shims
    storageCache.localStorage = storageCache.localStorage ?? installStorageShim("localStorage");
    storageCache.sessionStorage = storageCache.sessionStorage ?? installStorageShim("sessionStorage");
    setPreviewStorageMode("memory");
    return;
  }

  // Outside iframe: try native storage, fall back to memory shim if broken
  // This covers Safari with "Prevent cross-site tracking" enabled
  const usableLocalStorage = getUsableStorage("localStorage");
  const usableSessionStorage = getUsableStorage("sessionStorage");

  if (!usableLocalStorage) {
    // Native localStorage is broken – install shim on window so all code
    // (including Supabase client) gets the memory fallback automatically
    installStorageShim("localStorage");
  }
  if (!usableSessionStorage) {
    installStorageShim("sessionStorage");
  }

  storageCache.localStorage = usableLocalStorage ?? storageCache.localStorage ?? installStorageShim("localStorage");
  storageCache.sessionStorage = usableSessionStorage ?? storageCache.sessionStorage ?? installStorageShim("sessionStorage");

  setPreviewStorageMode(usableLocalStorage ? "localStorage" : "memory");
}

export function getSafeStorage(type: SafeStorageType): Storage {
  if (isIframeEnvironment()) {
    return storageCache[type] ?? installStorageShim(type);
  }

  return storageCache[type] ?? getUsableStorage(type) ?? installStorageShim(type);
}

let fetchWrapped = false;

export function installSafariFetchDebugging(): void {
  const win = getWindow();

  if (!win || fetchWrapped || !isSafariDebugMode() || typeof win.fetch !== "function") {
    return;
  }

  const originalFetch = win.fetch.bind(win);

  win.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    safariDebugLog("4. API/config loading", { phase: "fetch:start", method, url: requestUrl });

    try {
      const response = await originalFetch(input, init);
      safariDebugLog("4. API/config loading", {
        phase: "fetch:complete",
        method,
        status: response.status,
        url: requestUrl,
      });
      return response;
    } catch (error) {
      safariDebugError("4. API/config loading", error, { phase: "fetch:error", method, url: requestUrl });
      throw error;
    }
  };

  fetchWrapped = true;
}