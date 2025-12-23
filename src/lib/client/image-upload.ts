type PrepareUploadImageOptions = {
  maxBytes: number;
  maxDimension: number;
  outputMimeType?: "image/jpeg" | "image/webp";
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)}${units[exponent]}`;
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 읽지 못했습니다."));
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!canvas.toBlob) {
      reject(new Error("브라우저가 이미지 변환을 지원하지 않습니다."));
      return;
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("이미지를 변환하지 못했습니다."));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function pickOutputMimeType(file: File, preferred: PrepareUploadImageOptions["outputMimeType"]) {
  if (preferred) return preferred;
  // 투명도가 중요한 PNG를 무리하게 변환하지 않도록 기본은 JPEG로 둡니다.
  if (file.type === "image/png") return "image/png";
  return "image/jpeg";
}

export async function prepareUploadImage(
  file: File,
  { maxBytes, maxDimension, outputMimeType }: PrepareUploadImageOptions,
) {
  const needsProcessing =
    file.size > maxBytes ||
    !["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp"].includes(file.type);

  const image = await loadImageFromFile(file);
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;

  const longestSide = Math.max(naturalWidth, naturalHeight);
  const initialScale = longestSide > maxDimension ? maxDimension / longestSide : 1;

  // 타입/크기/해상도 모두 괜찮으면 그대로 사용.
  if (!needsProcessing && initialScale === 1) {
    return file;
  }

  let targetWidth = Math.max(1, Math.round(naturalWidth * initialScale));
  let targetHeight = Math.max(1, Math.round(naturalHeight * initialScale));
  const type = pickOutputMimeType(file, outputMimeType);

  const maxPasses = 8;
  let quality = type === "image/png" ? undefined : 0.86;

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      throw new Error("이미지 변환에 필요한 캔버스를 초기화하지 못했습니다.");
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await canvasToBlob(canvas, type, quality);
    if (blob.size <= maxBytes) {
      const extension = type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg";
      const baseName = file.name?.replace(/\.[^/.]+$/, "") || "image";
      return new File([blob], `${baseName}.${extension}`, { type, lastModified: Date.now() });
    }

    if (type !== "image/png" && typeof quality === "number" && quality > 0.62) {
      quality = Math.max(0.62, quality - 0.08);
      continue;
    }

    // 퀄리티로도 부족하면 해상도를 더 줄입니다.
    const nextScale = 0.85;
    targetWidth = Math.max(1, Math.round(targetWidth * nextScale));
    targetHeight = Math.max(1, Math.round(targetHeight * nextScale));
    quality = type === "image/png" ? undefined : 0.82;
  }

  throw new Error(
    `이미지 용량이 너무 커서 처리할 수 없습니다. (${formatBytes(file.size)} → 제한 ${formatBytes(
      maxBytes,
    )})`,
  );
}
