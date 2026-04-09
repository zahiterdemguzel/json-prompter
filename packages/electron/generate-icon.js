#!/usr/bin/env node
// Generates assets/icon.ico (Windows installer icon) from the shared logo PNG.
// Called automatically during prebuild, or run manually: node generate-icon.js

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Decode a PNG file (RGB, RGBA, or indexed) to a flat RGBA Uint8Array
function decodePng(filePath) {
  const buf = fs.readFileSync(filePath);
  let offset = 8;

  let width, height, colorType;
  const idatChunks = [];
  let palette = null;
  let trns = null;

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset); offset += 4;
    const type = buf.toString("ascii", offset, offset + 4); offset += 4;
    const data = buf.slice(offset, offset + length); offset += length;
    offset += 4;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === "PLTE") {
      palette = [];
      for (let i = 0; i < data.length; i += 3) palette.push([data[i], data[i+1], data[i+2]]);
    } else if (type === "tRNS") {
      trns = data;
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 3 ? 1
    : (() => { throw new Error(`Unsupported PNG color type: ${colorType}`); })();
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = channels;
  const stride = width * channels;
  const pixels = new Uint8Array(width * height * 4);
  const prevRow = new Uint8Array(stride);

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  }

  let rawOffset = 0;
  for (let y = 0; y < height; y++) {
    const filterType = raw[rawOffset++];
    const row = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const byte = raw[rawOffset++];
      const a = x >= bpp ? row[x - bpp] : 0;
      const b = prevRow[x];
      const c = x >= bpp ? prevRow[x - bpp] : 0;
      switch (filterType) {
        case 0: row[x] = byte; break;
        case 1: row[x] = (byte + a) & 0xff; break;
        case 2: row[x] = (byte + b) & 0xff; break;
        case 3: row[x] = (byte + Math.floor((a + b) / 2)) & 0xff; break;
        case 4: row[x] = (byte + paeth(a, b, c)) & 0xff; break;
      }
    }
    prevRow.set(row);
    for (let x = 0; x < width; x++) {
      const si = x * channels;
      const di = (y * width + x) * 4;
      if (colorType === 3) {
        const idx = row[si];
        const rgb = palette[idx];
        pixels[di] = rgb[0]; pixels[di+1] = rgb[1]; pixels[di+2] = rgb[2];
        pixels[di+3] = trns && idx < trns.length ? trns[idx] : 255;
      } else {
        pixels[di] = row[si]; pixels[di+1] = row[si+1]; pixels[di+2] = row[si+2];
        pixels[di+3] = channels === 4 ? row[si+3] : 255;
      }
    }
  }
  return { width, height, pixels };
}

// Bilinear scale
function scalePixels(src, srcW, srcH, dstW, dstH) {
  const dst = new Uint8Array(dstW * dstH * 4);
  const xScale = srcW / dstW, yScale = srcH / dstH;
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const sx = (x + 0.5) * xScale - 0.5, sy = (y + 0.5) * yScale - 0.5;
      const x0 = Math.max(0, Math.floor(sx)), x1 = Math.min(srcW - 1, x0 + 1);
      const y0 = Math.max(0, Math.floor(sy)), y1 = Math.min(srcH - 1, y0 + 1);
      const wx = sx - x0, wy = sy - y0;
      const di = (y * dstW + x) * 4;
      for (let c = 0; c < 4; c++) {
        dst[di+c] = Math.round(
          src[(y0 * srcW + x0) * 4 + c] * (1 - wx) * (1 - wy) +
          src[(y0 * srcW + x1) * 4 + c] * wx * (1 - wy) +
          src[(y1 * srcW + x0) * 4 + c] * (1 - wx) * wy +
          src[(y1 * srcW + x1) * 4 + c] * wx * wy
        );
      }
    }
  }
  return dst;
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(0);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      rows.push(rgba[i], rgba[i+1], rgba[i+2], rgba[i+3]);
    }
  }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(Buffer.from(rows))), chunk("IEND", Buffer.alloc(0))]);
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crcBuf = Buffer.concat([t, data]);
  let crc = 0xffffffff;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c; }
  for (const b of crcBuf) crc = (crc >>> 8) ^ table[(crc ^ b) & 0xff];
  const crcOut = Buffer.alloc(4); crcOut.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);
  return Buffer.concat([len, t, data, crcOut]);
}

// Build an .ico file with embedded PNG images (Vista+ format)
function buildIco(entries) {
  const count = entries.length;
  const dirSize = 6 + count * 16;
  let offset = dirSize;
  const dirs = [];
  const imgs = [];
  for (const { size, png } of entries) {
    const dir = Buffer.alloc(16);
    dir[0] = size >= 256 ? 0 : size;
    dir[1] = size >= 256 ? 0 : size;
    dir[2] = 0; dir[3] = 0;
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(png.length, 8);
    dir.writeUInt32LE(offset, 12);
    dirs.push(dir);
    imgs.push(png);
    offset += png.length;
  }
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  return Buffer.concat([header, ...dirs, ...imgs]);
}

const logoPath = path.resolve(__dirname, "../shared/resources/logo.png");
const { width: srcW, height: srcH, pixels: srcPixels } = decodePng(logoPath);

const sizes = [16, 32, 48, 256];
const entries = sizes.map(size => {
  const pixels = (size === srcW && size === srcH)
    ? srcPixels
    : scalePixels(srcPixels, srcW, srcH, size, size);
  return { size, png: encodePng(size, size, pixels) };
});

const assetsDir = path.join(__dirname, "assets");
fs.mkdirSync(assetsDir, { recursive: true });
fs.writeFileSync(path.join(assetsDir, "icon.ico"), buildIco(entries));
console.log("Generated assets/icon.ico (16, 32, 48, 256px)");
