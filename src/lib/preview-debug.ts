export type PreviewStorageMode = "memory" | "localStorage" | "sessionStorage" | "unknown";
export type PreviewAuthMode = "skipped" | "active";

export interface PreviewDebugState {
  iframeMode: boolean;
  storageMode: PreviewStorageMode;
  authMode: PreviewAuthMode;
  renderStep: string;
  firstComponent: string;
}

type PreviewDebugListener = (state: PreviewDebugState) => void;

let previewDebugState: PreviewDebugState = {
  iframeMode: false,
  storageMode: "unknown",
  authMode: "active",
  renderStep: "init",
  firstComponent: "",
};

const listeners = new Set<PreviewDebugListener>();

function emitPreviewDebugState() {
  for (const listener of listeners) {
    listener(previewDebugState);
  }
}

function updatePreviewDebugState(patch: Partial<PreviewDebugState>) {
  previewDebugState = {
    ...previewDebugState,
    ...patch,
  };
  emitPreviewDebugState();
}

export function getPreviewDebugState(): PreviewDebugState {
  return previewDebugState;
}

export function subscribePreviewDebugState(listener: PreviewDebugListener) {
  listeners.add(listener);
  listener(previewDebugState);

  return () => {
    listeners.delete(listener);
  };
}

export function setPreviewIframeMode(iframeMode: boolean) {
  updatePreviewDebugState({ iframeMode });
  console.log(`iframe detected = ${iframeMode}`);
}

export function setPreviewStorageMode(storageMode: PreviewStorageMode) {
  updatePreviewDebugState({ storageMode });
  console.log(`safe storage selected = ${storageMode}`);
}

export function setPreviewAuthSkipped(skipped: boolean) {
  updatePreviewDebugState({ authMode: skipped ? "skipped" : "active" });
  console.log(`auth skipped = ${skipped}`);
}

export function setPreviewRenderStep(renderStep: string) {
  updatePreviewDebugState({ renderStep });
}

export function setFirstRenderedComponent(componentName: string) {
  if (previewDebugState.firstComponent) {
    return;
  }

  updatePreviewDebugState({ firstComponent: componentName });
  console.log(`first component that renders = ${componentName}`);
}