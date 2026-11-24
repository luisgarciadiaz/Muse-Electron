import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const assetsDir = path.resolve(process.cwd(), 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

// Precompute CRC32 table for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type 0
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function clamp(v, min = 0, max = 1) {
  return v < min ? min : v > max ? max : v;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const lenSq = vx * vx + vy * vy;
  const t = lenSq === 0 ? 0 : clamp((wx * vx + wy * vy) / lenSq);
  const cx = ax + t * vx;
  const cy = ay + t * vy;
  return Math.hypot(px - cx, py - cy);
}

function roundedBoxSdf(x, y, halfW, halfH, radius) {
  const dx = Math.abs(x) - halfW + radius;
  const dy = Math.abs(y) - halfH + radius;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - radius;
}

function renderMuseIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const aa = 1.6 / size;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Normalized coordinates in [-1, 1]
      const x = ((px + 0.5) / size) * 2 - 1;
      const y = ((py + 0.5) / size) * 2 - 1;

      // Outer rounded square badge
      const sdf = roundedBoxSdf(x, y, 0.86, 0.86, 0.36);
      const badgeAlpha = 1 - smoothstep(-aa, aa, sdf);
      if (badgeAlpha <= 0.001) {
        continue;
      }

      // Rich dark-indigo to blue-violet gradient background
      const gT = clamp((x * 0.45 + y * 0.55 + 1) * 0.5);
      let r = 18 + gT * 26;
      let g = 24 + gT * 32;
      let b = 58 + gT * 92;

      // Subtle glowing aura near top-right spark
      const glowDist = Math.hypot(x - 0.38, y + 0.38);
      const glow = Math.exp(-glowDist * glowDist * 4.5) * 0.55;
      r += glow * 72;
      g += glow * 130;
      b += glow * 210;

      // Crisp inner rim highlight
      const rim = smoothstep(-0.08, 0.0, sdf) * (1 - smoothstep(-0.01, 0.02, sdf));
      r += rim * 70;
      g += rim * 100;
      b += rim * 170;

      // Stylized "M" ribbon paths
      const stroke = 0.115;
      const d1 = distToSegment(x, y, -0.44, 0.40, -0.44, -0.34);
      const d2 = distToSegment(x, y, -0.44, -0.34, 0.0, 0.16);
      const d3 = distToSegment(x, y, 0.0, 0.16, 0.44, -0.34);
      const d4 = distToSegment(x, y, 0.44, -0.34, 0.44, 0.40);
      const mDist = Math.min(d1, d2, d3, d4) - stroke;
      const mAlpha = 1 - smoothstep(-aa, aa, mDist);

      // 4-point AI spark accent at top-right above M
      const sx = x - 0.42;
      const sy = y + 0.48;
      const sparkDist = (Math.abs(sx) * 0.7 + Math.abs(sy) * 0.7) - 0.13 + Math.min(Math.abs(sx), Math.abs(sy)) * 1.1;
      const sparkAlpha = 1 - smoothstep(-aa, aa, sparkDist);

      // Blend stylized M (bright cyan-white gradient)
      if (mAlpha > 0) {
        const mGrad = clamp((x + 0.5) * 0.9);
        const mr = 140 + mGrad * 95;
        const mg = 215 + mGrad * 35;
        const mb = 255;
        r = r * (1 - mAlpha) + mr * mAlpha;
        g = g * (1 - mAlpha) + mg * mAlpha;
        b = b * (1 - mAlpha) + mb * mAlpha;
      }

      // Blend spark accent
      if (sparkAlpha > 0) {
        r = r * (1 - sparkAlpha) + 255 * sparkAlpha;
        g = g * (1 - sparkAlpha) + 245 * sparkAlpha;
        b = b * (1 - sparkAlpha) + 210 * sparkAlpha;
      }

      const idx = (py * size + px) * 4;
      rgba[idx] = Math.round(clamp(r, 0, 255));
      rgba[idx + 1] = Math.round(clamp(g, 0, 255));
      rgba[idx + 2] = Math.round(clamp(b, 0, 255));
      rgba[idx + 3] = Math.round(badgeAlpha * 255);
    }
  }

  return rgba;
}

function buildIcoFromPngs(entries) {
  // ICONDIR (6 bytes) + N * ICONDIRENTRY (16 bytes) + PNG payloads
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + entries.length * 16;
  const dirEntries = [];
  const payloads = [];

  for (const { size, png } of entries) {
    const dir = Buffer.alloc(16);
    dir[0] = size >= 256 ? 0 : size;
    dir[1] = size >= 256 ? 0 : size;
    dir[2] = 0; // palette
    dir[3] = 0; // reserved
    dir.writeUInt16LE(1, 4); // color planes
    dir.writeUInt16LE(32, 6); // bpp
    dir.writeUInt32LE(png.length, 8);
    dir.writeUInt32LE(offset, 12);
    dirEntries.push(dir);
    payloads.push(png);
    offset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...payloads]);
}

const png256 = encodePng(256, 256, renderMuseIcon(256));
const png32 = encodePng(32, 32, renderMuseIcon(32));
const ico = buildIcoFromPngs([
  { size: 32, png: png32 },
  { size: 256, png: png256 },
]);

fs.writeFileSync(path.join(assetsDir, 'icon.png'), png256);
fs.writeFileSync(path.join(assetsDir, 'tray.png'), png32);
fs.writeFileSync(path.join(assetsDir, 'icon.ico'), ico);
console.log('Generated assets/icon.png, assets/tray.png, and assets/icon.ico');
