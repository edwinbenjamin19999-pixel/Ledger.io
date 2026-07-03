const buildClipboardImageName = (mimeType: string) => {
  const extension = mimeType.split("/")[1]?.replace(/[^a-z0-9]+/gi, "-") || "png";
  return `screenshot-${Date.now()}.${extension}`;
};

const dataUrlToFile = (dataUrl: string) => {
  const normalized = dataUrl.replace(/\s+/g, "").trim();
  const match = normalized.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return null;

  try {
    const mimeType = match[1];
    const base64 = match[2];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new File([bytes], buildClipboardImageName(mimeType), { type: mimeType });
  } catch {
    return null;
  }
};

export const extractImageFilesFromClipboardData = (clipboardData?: DataTransfer | null) => {
  const clipboardFiles = Array.from(clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"));
  if (clipboardFiles.length > 0) return clipboardFiles;

  const itemFiles = Array.from(clipboardData?.items ?? [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
  if (itemFiles.length > 0) return itemFiles;

  const html = clipboardData?.getData("text/html") ?? "";
  const plainText = clipboardData?.getData("text/plain")?.trim() ?? "";
  const embeddedDataUrl =
    html.match(/src=["'](data:image\/[a-z0-9.+-]+;base64,[^"']+)["']/i)?.[1] ||
    html.match(/url\((data:image\/[a-z0-9.+-]+;base64,[^)]+)\)/i)?.[1] ||
    (/^data:image\/[a-z0-9.+-]+;base64,/i.test(plainText) ? plainText : "");

  const file = embeddedDataUrl ? dataUrlToFile(embeddedDataUrl) : null;
  return file ? [file] : [];
};

export const hasClipboardImageData = (clipboardData?: DataTransfer | null) => {
  return extractImageFilesFromClipboardData(clipboardData).length > 0;
};

export const readClipboardImageFiles = async (): Promise<File[]> => {
  if (typeof navigator === "undefined" || !navigator.clipboard?.read) {
    throw new Error("Clipboard API unavailable");
  }

  const items = await navigator.clipboard.read();
  const files: File[] = [];

  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith("image/"));
    if (!imageType) continue;

    const blob = await item.getType(imageType);
    files.push(new File([blob], buildClipboardImageName(imageType), { type: imageType }));
  }

  return files;
};