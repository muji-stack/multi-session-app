/**
 * Icon Generator Script
 *
 * This script generates app icons for different platforms.
 * Run with: node scripts/generate-icons.js
 *
 * Prerequisites:
 * npm install sharp png-to-ico --save-dev
 */

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
const createSvgIcon = () => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#bg)"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="280" font-weight="bold" fill="white" text-anchor="middle">M</text>
</svg>`;
};

const resourcesDir = path.join(__dirname, '..', 'resources');

// Ensure resources directory exists
if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
}

// Save SVG
const svgPath = path.join(resourcesDir, 'icon.svg');
fs.writeFileSync(svgPath, createSvgIcon());
console.log('Created: icon.svg');

console.log(`
Icon files created in: ${resourcesDir}

To generate PNG and ICO files, you have two options:

Option 1: Use online tools
  1. Upload icon.svg to https://cloudconvert.com
  2. Convert to PNG (512x512) and save as icon.png
  3. Convert to ICO (256x256) and save as icon.ico
  4. For macOS, use https://iconverticons.com to create icon.icns

Option 2: Install dependencies and regenerate
  npm install sharp png-to-ico --save-dev
  node scripts/generate-icons-full.js

For now, electron-builder will work without icons (will use default Electron icon).
`);
