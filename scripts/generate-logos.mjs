// Renders the logo pack from the SVG masters in public/brand/.
// Usage: npm run generate-logos
import { copyFile, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const brand = (file) => readFile(`public/brand/${file}`)
const icon = await brand('icon.svg')
const maskable = await brand('icon-maskable.svg')
// Full-bleed square (no rounded corners): Apple rounds the icon itself
const square = Buffer.from(icon.toString().replace(' rx="116"', ''))

const png = (svg, width, height = width) =>
  sharp(svg, { density: 384 }).resize(width, height).png().toBuffer()

async function write(path, buffer) {
  await writeFile(path, buffer)
  console.log(`  ${path}`)
}

// PWA / manifest icons
for (const size of [48, 64, 128, 144, 192, 256, 512]) {
  await write(`public/logo/${size}x${size}.png`, await png(icon, size))
}
await write('public/logo/512x512-maskable.png', await png(maskable, 512))
await write('public/android-chrome-192x192.png', await png(icon, 192))
await write('public/android-chrome-512x512.png', await png(icon, 512))

// Browser and Apple icons (Next.js picks these up from src/app/)
await copyFile('public/brand/icon.svg', 'src/app/icon.svg')
console.log('  src/app/icon.svg')
await write('src/app/apple-icon.png', await png(square, 180))

// favicon.ico: 16, 32 and 48 px PNG images in an ICO container
const icoSizes = [16, 32, 48]
const images = await Promise.all(icoSizes.map((size) => png(icon, size)))
const header = Buffer.alloc(6 + 16 * images.length)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(images.length, 4)
let offset = header.length
images.forEach((image, i) => {
  const entry = 6 + 16 * i
  header.writeUInt8(icoSizes[i], entry) // width
  header.writeUInt8(icoSizes[i], entry + 1) // height
  header.writeUInt16LE(1, entry + 4) // color planes
  header.writeUInt16LE(32, entry + 6) // bits per pixel
  header.writeUInt32LE(image.length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += image.length
})
await write('src/app/favicon.ico', Buffer.concat([header, ...images]))

// Wordmark (iOS splash screen) and social share banner
await write(
  'public/logo-with-text.png',
  await png(await brand('wordmark.svg'), 1200, 400),
)
await write(
  'public/banner.png',
  await png(await brand('banner.svg'), 1200, 630),
)
