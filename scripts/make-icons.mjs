// Genera los iconos PNG de la PWA sin dependencias (anillos concéntricos sobre fondo oscuro).
// Uso: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size, scale) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const c = size / 2;
  const unit = (size / 64) * scale;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) / unit;
      let [r, g, b] = [11, 18, 32];
      const ring = (radius, w, col) => {
        const edge = Math.abs(d - radius) - w / 2;
        if (edge < 1) {
          const a = Math.min(1, Math.max(0, 1 - edge));
          r = r + (col[0] - r) * a; g = g + (col[1] - g) * a; b = b + (col[2] - b) * a;
        }
      };
      ring(20, 4, [34, 211, 238]);
      ring(11, 4, [59, 130, 246]);
      if (d < 3.5) [r, g, b] = [224, 242, 254];
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icon-192.png', png(192, 1));
writeFileSync('public/icon-512.png', png(512, 1));
// Maskable: el contenido útil debe caber en el 80 % central.
writeFileSync('public/icon-maskable-512.png', png(512, 0.75));
writeFileSync('public/apple-touch-icon.png', png(180, 1));
console.log('Iconos generados en public/');
