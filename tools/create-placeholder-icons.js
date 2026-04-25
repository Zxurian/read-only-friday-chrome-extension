// tools/create-placeholder-icons.js
// Creates minimal valid PNG files as placeholders.
// Run once: node tools/create-placeholder-icons.js
// Then replace with proper icons from tools/generate-icons.html
const fs = require('fs');
const zlib = require('zlib');

function createMinimalPNG(width, height, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crcBuf = Buffer.concat([typeBytes, data]);
    let crc = 0xFFFFFFFF;
    for (const byte of crcBuf) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
    const crcOut = Buffer.alloc(4);
    crcOut.writeUInt32BE((crc ^ 0xFFFFFFFF) >>> 0);
    return Buffer.concat([len, typeBytes, data, crcOut]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  // compression, filter, interlace = 0

  // Raw image data: filter byte (0) + RGB per row
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(height * rowSize, 0);
  for (let y = 0; y < height; y++) {
    const offset = y * rowSize;
    raw[offset] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      raw[offset + 1 + x * 3] = r;
      raw[offset + 1 + x * 3 + 1] = g;
      raw[offset + 1 + x * 3 + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw);
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, chunk('IHDR', ihdr), idat, iend]);
}

fs.mkdirSync('icons', { recursive: true });
[16, 48, 128].forEach(size => {
  const png = createMinimalPNG(size, size, 26, 26, 46); // #1a1a2e
  fs.writeFileSync(`icons/icon-${size}.png`, png);
  console.log(`Created icons/icon-${size}.png (${size}x${size} placeholder)`);
});
console.log('Done. Replace with proper icons from tools/generate-icons.html');
