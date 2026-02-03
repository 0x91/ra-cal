import sharp from "sharp";
import { mkdir } from "fs/promises";

const sizes = [192, 512];
const publicDir = "./public";

// Create a simple calendar icon SVG
function createIconSvg(size) {
  const padding = size * 0.15;
  const innerSize = size - padding * 2;
  const cornerRadius = size * 0.15;
  const textSize = size * 0.35;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#09090b"/>
    <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" rx="${cornerRadius}" fill="#18181b" stroke="#3f3f46" stroke-width="${size * 0.02}"/>
    <text x="${size / 2}" y="${size * 0.62}" font-family="system-ui, -apple-system, sans-serif" font-size="${textSize}" font-weight="700" fill="#fafafa" text-anchor="middle">RA</text>
  </svg>`;
}

async function generateIcons() {
  await mkdir(publicDir, { recursive: true });

  for (const size of sizes) {
    const svg = createIconSvg(size);
    const buffer = Buffer.from(svg);

    await sharp(buffer).png().toFile(`${publicDir}/pwa-${size}x${size}.png`);

    console.log(`Generated pwa-${size}x${size}.png`);
  }

  // Generate apple touch icon (180x180)
  const appleSvg = createIconSvg(180);
  await sharp(Buffer.from(appleSvg))
    .png()
    .toFile(`${publicDir}/apple-touch-icon.png`);
  console.log("Generated apple-touch-icon.png");
}

generateIcons().catch(console.error);
