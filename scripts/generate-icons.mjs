// Generates solid-color PNG icons for the PWA manifest.
// Run once: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// SalatTrack brand-red #C0272D
const BG_R = 0xC0, BG_G = 0x27, BG_B = 0x2D

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (const byte of buf) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length)
  const crcInput = Buffer.concat([typeBytes, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(crcInput))
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf])
}

function solidPNG(size, r, g, b) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)   // width
  ihdrData.writeUInt32BE(size, 4)   // height
  ihdrData.writeUInt8(8,   8)       // bit depth
  ihdrData.writeUInt8(2,   9)       // color type: RGB truecolor
  ihdrData.writeUInt8(0,  10)       // compression
  ihdrData.writeUInt8(0,  11)       // filter
  ihdrData.writeUInt8(0,  12)       // interlace

  // One scanline: filter byte 0 + width * 3 bytes RGB
  const row = Buffer.alloc(1 + size * 3)
  row[0] = 0 // filter None
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r
    row[2 + x * 3] = g
    row[3 + x * 3] = b
  }
  const raw = Buffer.concat(Array(size).fill(row))
  const compressed = deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync(join(outDir, 'icon-192.png'), solidPNG(192, BG_R, BG_G, BG_B))
writeFileSync(join(outDir, 'icon-512.png'), solidPNG(512, BG_R, BG_G, BG_B))
writeFileSync(join(outDir, 'badge-72.png'),  solidPNG(72,  BG_R, BG_G, BG_B))

console.log('Icons written to public/icons/')
