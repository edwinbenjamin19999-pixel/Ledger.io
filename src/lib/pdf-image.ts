export interface PdfImageAsset {
  dataUrl: string;
  format: "PNG";
  width: number;
  height: number;
}

const MAX_RASTER_EDGE = 1800;

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Kunde inte läsa bildfilen"));
    image.src = src;
  });

export async function loadPdfImageAsset(url?: string | null): Promise<PdfImageAsset | null> {
  if (!url || typeof window === "undefined") return null;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Kunde inte hämta bild (${response.status})`);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    try {
      const image = await loadImageElement(objectUrl);
      const naturalWidth = image.naturalWidth || image.width;
      const naturalHeight = image.naturalHeight || image.height;

      if (!naturalWidth || !naturalHeight) {
        throw new Error("Bilden saknar giltiga dimensioner");
      }

      const rasterScale = Math.min(MAX_RASTER_EDGE / naturalWidth, MAX_RASTER_EDGE / naturalHeight, 1);
      const canvasWidth = Math.max(Math.round(naturalWidth * rasterScale), 1);
      const canvasHeight = Math.max(Math.round(naturalHeight * rasterScale), 1);
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas kunde inte initialiseras");

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      context.drawImage(image, 0, 0, canvasWidth, canvasHeight);

      return {
        dataUrl: canvas.toDataURL("image/png"),
        format: "PNG",
        width: naturalWidth,
        height: naturalHeight,
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (error) {
    console.error("Invoice logo could not be prepared för PDF:", error);
    return null;
  }
}

export function fitPdfImageToBox(width: number, height: number, maxWidth: number, maxHeight: number) {
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight, 1);

  return {
    width: safeWidth * scale,
    height: safeHeight * scale,
  };
}