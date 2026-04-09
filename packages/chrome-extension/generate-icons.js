#!/usr/bin/env node
// Generates simple PNG icons for the Chrome extension using raw PNG byte construction.
// Run once: node generate-icons.js
// Requires no external dependencies.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Generates a solid square PNG with an accent-colored "{ }" symbol
function generateIcon(size) {
  const bg = [14, 15, 19];       // #0e0f13
  const fg = [91, 110, 245];     // #5b6ef5 (accent)
  const pixels = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Simple dot in the center as a stand-in icon
      const cx = size / 2, cy = size / 2, r = size * 0.28;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= r) {
        pixels.push(...fg, 255);
      } else {
        pixels.push(...bg, 255);
      }
    }
  }

  return encodePng(size, size, pixels);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB (we'll use RGB, strip alpha for simplicity)
  // Actually use RGBA (color type 6)
  ihdr[9] = 6;

  const ihdrChunk = makeChunk("IHDR", ihdr);

  // IDAT chunk — raw image data
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    rawRows.push(0); // filter type: None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      rawRows.push(rgba[i], rgba[i+1], rgba[i+2], rgba[i+3]);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(rawRows));
  const idatChunk = makeChunk("IDAT", compressed);

  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBytes = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([len, typeBytes, data, crc]);
}

function crc32(buf) {
  const table = makeCrcTable();
  let crc = 0xffffffff;
  for (const byte of buf) crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
}

const iconsDir = path.join(__dirname, "icons");
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = generateIcon(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`Generated icons/icon${size}.png`);
}
