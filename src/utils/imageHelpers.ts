/**
 * Utilities for capturing/uploading product photos (Mobile Camera & Desktop File Upload)
 * and generating default SVG product previews.
 */

export function createSvgProductPreviewDataUrl(
  label: string,
  accentHex = '#1D63FF',
  secondaryHex = '#0D0F14'
): string {
  const safeLabel = (label || '3D').slice(0, 12).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" fill="none">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="240" y2="240" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${accentHex}" />
        <stop offset="100%" stop-color="${secondaryHex}" />
      </linearGradient>
    </defs>
    <rect width="240" height="240" rx="40" fill="url(#bg)" />
    <path d="M120 48L182 84V156L120 192L58 156V84L120 48Z" stroke="#FFFFFF" stroke-width="8" stroke-linejoin="round" fill="rgba(255,255,255,0.10)" />
    <path d="M58 84L120 120L182 84" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.75" />
    <path d="M120 120V192" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-opacity="0.75" />
    <rect x="44" y="182" width="152" height="30" rx="15" fill="rgba(13,15,20,0.68)" />
    <text x="120" y="202" text-anchor="middle" fill="#FFFFFF" font-family="monospace" font-weight="700" font-size="14">${safeLabel}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Reads an image File (from mobile camera capture or gallery/file picker)
 * and compresses/crops it into a square JPEG data URL (~320x320) suitable for fast preview and storage.
 */
export function compressImageFileToDataUrl(
  file: File,
  maxSize = 360,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo de imagem.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          const targetDim = Math.min(maxSize, size || maxSize);
          canvas.width = targetDim;
          canvas.height = targetDim;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, sx, sy, size, size, 0, 0, targetDim, targetDim);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
