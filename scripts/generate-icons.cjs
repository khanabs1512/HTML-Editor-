const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPNG(width, height, isMaskable = false) {
  // Create an RGBA buffer
  const stride = width * 4;
  const rawData = Buffer.alloc((stride + 1) * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = isMaskable ? width * 0.48 : width * 0.45;
  const cornerR = isMaskable ? 0 : width * 0.22;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (stride + 1);
    rawData[rowOffset] = 0; // Filter byte 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Gradient background from dark slate (#0f172a) to indigo (#1e1b4b) to cyan (#0284c7)
      const t = (x + y) / (width + height);
      let r = Math.round(15 * (1 - t) + 2 * t);
      let g = Math.round(23 * (1 - t) + 132 * t);
      let b = Math.round(42 * (1 - t) + 199 * t);

      // Check rounded rect boundary if not maskable
      let alpha = 255;
      if (!isMaskable) {
        // Rounded rectangle calculation
        const dx = Math.max(0, Math.abs(x - cx) - (cx - cornerR));
        const dy = Math.max(0, Math.abs(y - cy) - (cy - cornerR));
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > cornerR) {
          alpha = 0;
        } else if (dist > cornerR - 1.5) {
          alpha = Math.round((cornerR - dist + 1.5) * 85);
          alpha = Math.max(0, Math.min(255, alpha));
        }
      }

      if (alpha > 0) {
        // Draw brackets & slash symbol in center safe zone
        const nx = (x - cx) / (width * 0.5); // -1 to 1
        const ny = (y - cy) / (height * 0.5); // -1 to 1

        // Left bracket: segments from (-0.45, -0.3) to (-0.65, 0) to (-0.45, 0.3)
        const inLeftBracketTop = distToSegment(nx, ny, -0.28, -0.32, -0.58, 0) < 0.09;
        const inLeftBracketBottom = distToSegment(nx, ny, -0.58, 0, -0.28, 0.32) < 0.09;
        
        // Right bracket: segments from (0.28, -0.32) to (0.58, 0) to (0.28, 0.32)
        const inRightBracketTop = distToSegment(nx, ny, 0.28, -0.32, 0.58, 0) < 0.09;
        const inRightBracketBottom = distToSegment(nx, ny, 0.58, 0, 0.28, 0.32) < 0.09;

        // Slash: from (0.15, -0.4) to (-0.15, 0.4)
        const inSlash = distToSegment(nx, ny, 0.12, -0.42, -0.12, 0.42) < 0.08;

        // Accent spark
        const inSpark = (nx - 0.45) * (nx - 0.45) + (ny - -0.38) * (ny - -0.38) < 0.003;

        if (inLeftBracketTop || inLeftBracketBottom || inRightBracketTop || inRightBracketBottom) {
          // Cyan-Sky Blue bracket
          r = 56;
          g = 189;
          b = 248;
        } else if (inSlash) {
          // White-Blue slash
          r = 240;
          g = 249;
          b = 255;
        } else if (inSpark) {
          r = 192;
          g = 132;
          b = 252;
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = alpha;
    }
  }

  return encodePNG(width, height, rawData);
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function encodePNG(width, height, rawData) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = crc32(crcData);
  chunk.writeUInt32BE(crc >>> 0, 8 + len);
  return chunk;
}

// CRC32 implementation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const pub = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(pub, 'pwa-192x192.png'), createPNG(192, 192, false));
fs.writeFileSync(path.join(pub, 'pwa-512x512.png'), createPNG(512, 512, false));
fs.writeFileSync(path.join(pub, 'pwa-maskable-512x512.png'), createPNG(512, 512, true));
fs.writeFileSync(path.join(pub, 'apple-touch-icon.png'), createPNG(180, 180, false));
fs.writeFileSync(path.join(pub, 'favicon.ico'), createPNG(64, 64, false));

console.log('PNG icons created successfully.');
