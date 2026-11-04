import sharp from "sharp";

const PALETTE = ["#0f766e", "#115e59", "#0e7490", "#334155", "#475569", "#1d4e4b"];

/** A flat-color JPEG with a centered label, so seeded photos are unmistakably placeholders. */
export async function createPlaceholderImage(
  label: string,
  width: number,
  height: number,
  paletteIndex: number,
): Promise<Buffer> {
  const color = PALETTE[paletteIndex % PALETTE.length];
  const fontSize = Math.round(width / 16);
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}" />
      <text x="50%" y="50%" font-family="sans-serif" font-size="${fontSize}" fill="#ffffff"
        text-anchor="middle" dominant-baseline="middle">${label}</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}
