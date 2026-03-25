const { createCanvas } = (() => {
  try { return require("canvas"); } catch { return { createCanvas: null }; }
})();

const fs = require("fs");
const path = require("path");

const sizes = [16, 48, 128];
const dir = path.join(__dirname, "public", "icons");

// Generate simple SVG-based PNG-like placeholders
// Since canvas may not be available, create minimal valid PNGs
sizes.forEach(size => {
  // Minimal 1x1 purple PNG, scaled conceptually — for dev use, 
  // we'll create an SVG and note that real icons should be added
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed"/>
      <stop offset="100%" style="stop-color:#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#g)"/>
  <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial" font-weight="bold" font-size="${size * 0.45}">VS</text>
</svg>`;
  fs.writeFileSync(path.join(dir, `icon${size}.svg`), svg);
  console.log(`Created icon${size}.svg`);
});
