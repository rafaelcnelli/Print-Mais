import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// CRC32 implementation
function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}
const crcTable = makeCrcTable();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const toCrc = Buffer.alloc(4 + len);
  toCrc.write(type, 0, 4, 'ascii');
  data.copy(toCrc, 4);
  chunk.writeUInt32BE(crc32(toCrc), 8 + len);
  return chunk;
}

function makePng(width, height, getRgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // deflate
  ihdrData.writeUInt8(0, 11); // filter 0
  ihdrData.writeUInt8(0, 12); // non-interlaced
  const ihdr = createChunk('IHDR', ihdrData);

  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawScanlines.writeUInt8(0, offset++);
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getRgba(x, y, width, height);
      rawScanlines.writeUInt8(r, offset++);
      rawScanlines.writeUInt8(g, offset++);
      rawScanlines.writeUInt8(b, offset++);
      rawScanlines.writeUInt8(a, offset++);
    }
  }

  const compressed = zlib.deflateSync(rawScanlines, { level: 9 });
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// 7x9 Font Bitmaps for bold clean typography
// 1 = solid pixel, 0 = empty
const GLYPHS = {
  P: [
    "1111100",
    "1000010",
    "1000010",
    "1111100",
    "1000000",
    "1000000",
    "1000000",
    "1000000",
    "1000000"
  ],
  R: [
    "1111100",
    "1000010",
    "1000010",
    "1111100",
    "1000100",
    "1000010",
    "1000010",
    "1000010",
    "1000010"
  ],
  I: [
    "1111111",
    "0001000",
    "0001000",
    "0001000",
    "0001000",
    "0001000",
    "0001000",
    "0001000",
    "1111111"
  ],
  N: [
    "1000001",
    "1100001",
    "1010001",
    "1001001",
    "1000101",
    "1000011",
    "1000001",
    "1000001",
    "1000001"
  ],
  T: [
    "1111111",
    "0001000",
    "0001000",
    "0001000",
    "0001000",
    "0001000",
    "0001000",
    "0001000",
    "0001000"
  ],
  M: [
    "1000001",
    "1100011",
    "1010101",
    "1001001",
    "1000001",
    "1000001",
    "1000001",
    "1000001",
    "1000001"
  ],
  A: [
    "0011100",
    "0100010",
    "1000001",
    "1000001",
    "1111111",
    "1000001",
    "1000001",
    "1000001",
    "1000001"
  ],
  S: [
    "0111110",
    "1000001",
    "1000000",
    "0111110",
    "0000001",
    "0000001",
    "1000001",
    "0111110",
    "0000000"
  ]
};

function renderTextToCanvas(matrix, text, startX, startY, scale, color, strokeWidth = 2) {
  let curX = startX;
  const chars = text.toUpperCase().split('');
  for (const ch of chars) {
    const glyph = GLYPHS[ch] || GLYPHS['I'];
    for (let r = 0; r < glyph.length; r++) {
      for (let c = 0; c < glyph[r].length; c++) {
        if (glyph[r][c] === '1') {
          // Fill scaled block with small border expansion for bold look
          const px0 = Math.floor(curX + c * scale);
          const py0 = Math.floor(startY + r * scale);
          const px1 = Math.floor(px0 + scale + strokeWidth);
          const py1 = Math.floor(py0 + scale + strokeWidth);
          for (let y = py0; y < py1; y++) {
            for (let x = px0; x < px1; x++) {
              if (y >= 0 && y < matrix.height && x >= 0 && x < matrix.width) {
                matrix.setPixel(x, y, color);
              }
            }
          }
        }
      }
    }
    curX += (glyph[0].length + 2) * scale; // character spacing
  }
}

function generateIconBuffer(size, isMaskable = false) {
  const pixels = new Uint8Array(size * size * 4);
  const matrix = {
    width: size,
    height: size,
    setPixel: (x, y, [r, g, b, a]) => {
      const idx = (y * size + x) * 4;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = a;
    }
  };

  const cornerRadius = isMaskable ? 0 : Math.floor(size * 0.22);

  // 1. Draw Background Gradient
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Rounded squircle check
      if (cornerRadius > 0) {
        const dx = Math.max(0, Math.max(cornerRadius - x, x - (size - cornerRadius - 1)));
        const dy = Math.max(0, Math.max(cornerRadius - y, y - (size - cornerRadius - 1)));
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) {
          matrix.setPixel(x, y, [0, 0, 0, 0]); // Transparent outside squircle
          continue;
        }
      }

      // Linear gradient: #1D63FF (top-left) to #0B3CC1 (bottom-right)
      const t = (x + y) / (size * 2);
      const r = Math.round(29 * (1 - t) + 11 * t);
      const g = Math.round(99 * (1 - t) + 60 * t);
      const b = Math.round(255 * (1 - t) + 193 * t);

      matrix.setPixel(x, y, [r, g, b, 255]);
    }
  }

  // 2. Draw subtle 3D print grid lines
  const gridStep = Math.floor(size / 6);
  for (let i = 1; i < 6; i++) {
    const gy = i * gridStep;
    const gx = i * gridStep;
    for (let c = 0; c < size; c++) {
      // Blend 8% white
      blendPixel(matrix, c, gy, [255, 255, 255, 18]);
      blendPixel(matrix, gx, c, [255, 255, 255, 18]);
    }
  }

  // 3. Render "PRINT" (Top) and "MAIS" (Bottom)
  // PRINT: 5 chars * 9 units = 45 units width
  const scale = isMaskable ? Math.max(2, Math.floor(size / 48)) : Math.max(2, Math.floor(size / 40));
  const printWidth = (5 * 7 + 4 * 2) * scale;
  const printStartX = Math.floor((size - printWidth) / 2);
  const printStartY = isMaskable ? Math.floor(size * 0.24) : Math.floor(size * 0.20);
  renderTextToCanvas(matrix, "PRINT", printStartX, printStartY, scale, [255, 255, 255, 255], Math.max(1, Math.floor(scale * 0.4)));

  // 4. Divider bar: 3D Filament Layer Line (Cyan #38BDF8)
  const barY = Math.floor(size * 0.50);
  const barHeight = Math.max(3, Math.floor(size * 0.018));
  const barWidth = Math.floor(size * 0.45);
  const barX0 = Math.floor((size - barWidth) / 2);
  for (let y = barY; y < barY + barHeight; y++) {
    for (let x = barX0; x < barX0 + barWidth; x++) {
      matrix.setPixel(x, y, [56, 189, 248, 240]);
    }
  }
  // Center filament nozzle dot
  const dotRadius = Math.max(3, Math.floor(barHeight * 1.3));
  const cx = Math.floor(size / 2);
  const cy = Math.floor(barY + barHeight / 2);
  for (let dy = -dotRadius; dy <= dotRadius; dy++) {
    for (let dx = -dotRadius; dx <= dotRadius; dx++) {
      if (dx * dx + dy * dy <= dotRadius * dotRadius) {
        matrix.setPixel(cx + dx, cy + dy, [255, 255, 255, 255]);
      }
    }
  }

  // 5. Render "MAIS" (Bottom) (Cyan/Emerald accent: #38BDF8)
  // MAIS: 4 chars * 9 units = 34 units width
  const maisScale = Math.floor(scale * 1.15);
  const maisWidth = (4 * 7 + 3 * 2) * maisScale;
  const maisStartX = Math.floor((size - maisWidth) / 2);
  const maisStartY = isMaskable ? Math.floor(size * 0.58) : Math.floor(size * 0.56);
  renderTextToCanvas(matrix, "MAIS", maisStartX, maisStartY, maisScale, [56, 189, 248, 255], Math.max(1, Math.floor(maisScale * 0.4)));

  return makePng(size, size, (x, y) => {
    const idx = (y * size + x) * 4;
    return [pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]];
  });
}

function blendPixel(matrix, x, y, [r, g, b, a]) {
  if (x < 0 || x >= matrix.width || y < 0 || y >= matrix.height) return;
  // Alpha blend over current pixel
  const alpha = a / 255;
  // Sample roughly
  matrix.setPixel(x, y, [
    Math.round(29 * (1 - alpha) + r * alpha),
    Math.round(99 * (1 - alpha) + g * alpha),
    Math.round(255 * (1 - alpha) + b * alpha),
    255
  ]);
}

// Generate all target PNG files
console.log('Generating PNG icons for PWA compliance...');
const pwa512 = generateIconBuffer(512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);

const pwa192 = generateIconBuffer(192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

const appleIcon = generateIconBuffer(180, false);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

const maskable512 = generateIconBuffer(512, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), maskable512);

console.log('Done! All PWA PNG assets created cleanly.');
