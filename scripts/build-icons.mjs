import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Color helpers for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

// 1. Designated candidate paths for SVG icon source
const CANDIDATE_SVG_PATHS = [
  path.join(projectRoot, 'assets', 'icon.svg'),
  path.join(projectRoot, 'build', 'icon.svg'),
  path.join(projectRoot, 'resources', 'icon.svg'),
  path.join(projectRoot, 'src', 'renderer', 'src', 'assets', 'icon.svg'),
];

// 2. Default Fallback SVG Template
const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="108" fill="#0f172a" stroke="#38bdf8" stroke-width="8"/>
  <path d="M 192 260 L 148 296 L 192 332" fill="none" stroke="#38bdf8" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="240" y1="344" x2="272" y2="248" stroke="#94a3b8" stroke-width="12" stroke-linecap="round"/>
  <path d="M 320 260 L 364 296 L 320 332" fill="none" stroke="#c084fc" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="376" cy="120" r="16" fill="#818cf8"/>
</svg>`;

/**
 * Validate SVG contents
 */
function validateSvg(content) {
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return { valid: false, error: 'SVG file is empty' };
  }
  const trimmed = content.trim();
  if (!trimmed.includes('<svg') || !trimmed.includes('</svg>')) {
    return { valid: false, error: 'Missing <svg> or </svg> tags' };
  }
  if (!trimmed.includes('xmlns="http://www.w3.org/2000/svg"') && !trimmed.includes("xmlns='http://www.w3.org/2000/svg'")) {
    return { valid: false, error: 'Missing SVG XML namespace (xmlns)' };
  }
  return { valid: true };
}

/**
 * Detect or fallback to valid SVG
 */
function detectSvgSource() {
  log('[ICON BUILD] Scanning for application SVG icon asset...', colors.cyan);

  for (const candidate of CANDIDATE_SVG_PATHS) {
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, 'utf-8');
        const validation = validateSvg(raw);
        if (validation.valid) {
          log(`[ICON BUILD] Found and validated SVG icon at: ${path.relative(projectRoot, candidate)}`, colors.green);
          return { path: candidate, content: raw, isFallback: false };
        } else {
          log(`[ICON BUILD] Found SVG at ${candidate} but failed validation: ${validation.error}`, colors.yellow);
        }
      } catch (err) {
        log(`[ICON BUILD] Error reading ${candidate}: ${err.message}`, colors.yellow);
      }
    }
  }

  log('[ICON BUILD] WARNING: No valid source SVG found in assets directories. Creating default fallback SVG.', colors.yellow);
  const fallbackPath = path.join(projectRoot, 'assets', 'icon.svg');
  fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
  fs.writeFileSync(fallbackPath, FALLBACK_SVG, 'utf-8');
  return { path: fallbackPath, content: FALLBACK_SVG, isFallback: true };
}

/**
 * Pack an array of PNG buffers (multi-size) into a Windows ICO binary format
 */
function createIcoBuffer(pngBuffersWithSize) {
  const count = pngBuffersWithSize.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO type
  header.writeUInt16LE(count, 4); // Number of images

  const dirEntries = [];
  const imageBuffers = [];

  for (const { size, buffer } of pngBuffersWithSize) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width (0 for 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height (0 for 256)
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel (32-bit RGBA)
    entry.writeUInt32LE(buffer.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12); // Offset to image data

    dirEntries.push(entry);
    imageBuffers.push(buffer);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageBuffers]);
}

/**
 * Generate platform-specific icons using Electron offscreen rendering
 */
async function generateIcons() {
  const { app, BrowserWindow } = await import('electron');

  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-gpu');

  await app.whenReady();

  const svgSource = detectSvgSource();
  const buildDir = path.join(projectRoot, 'build');
  const distDir = path.join(projectRoot, 'dist');
  const publicDir = path.join(projectRoot, 'public');
  fs.mkdirSync(buildDir, { recursive: true });
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });

  // Save canonical SVG to build, dist, and public directories
  fs.writeFileSync(path.join(buildDir, 'icon.svg'), svgSource.content, 'utf-8');
  fs.writeFileSync(path.join(distDir, 'icon.svg'), svgSource.content, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgSource.content, 'utf-8');

  log('[ICON BUILD] Rasterizing multi-resolution icon assets (macOS, Windows, Linux)...', colors.cyan);

  const targetSizes = [16, 24, 32, 48, 64, 128, 256, 512];
  const pngBuffers = [];

  // Create an offscreen window to render the SVG cleanly via Chromium
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    webPreferences: {
      offscreen: true,
      contextIsolation: false,
    },
  });

  const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgSource.content)}`;

  for (const size of targetSizes) {
    win.setSize(size, size);
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; overflow: hidden; }
            html, body { width: 100vw; height: 100vh; background: transparent; }
            img { width: 100%; height: 100%; object-fit: contain; }
          </style>
        </head>
        <body>
          <img src="${svgDataUri}" />
        </body>
      </html>
    `)}`);

    // Allow Chromium layout engine to paint
    await new Promise((resolve) => setTimeout(resolve, 60));

    const image = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size });
    const pngBuffer = image.toPNG();

    // Write size-specific PNG (for Linux and web assets)
    fs.writeFileSync(path.join(buildDir, `icon-${size}.png`), pngBuffer);
    if (size === 512 || size === 256) {
      fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuffer);
      fs.writeFileSync(path.join(distDir, 'icon.png'), pngBuffer);
      fs.writeFileSync(path.join(publicDir, 'icon.png'), pngBuffer);
    }

    pngBuffers.push({ size, buffer: pngBuffer });
    log(`  ✓ Generated ${size}x${size} PNG`, colors.green);
  }

  win.close();

  // Create multi-layer Windows .ico file (16, 32, 48, 64, 128, 256)
  const icoSizes = pngBuffers.filter((p) => [16, 32, 48, 64, 128, 256].includes(p.size));
  const icoBuffer = createIcoBuffer(icoSizes);
  const icoPath = path.join(buildDir, 'icon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  fs.writeFileSync(path.join(distDir, 'icon.ico'), icoBuffer);
  fs.writeFileSync(path.join(publicDir, 'icon.ico'), icoBuffer);
  log(`  ✓ Generated multi-size Windows icon: ${path.relative(projectRoot, icoPath)} (${icoBuffer.length} bytes)`, colors.green);

  log('[ICON BUILD] All platform icon assets generated successfully from SVG!', colors.green);
  app.quit();
  process.exit(0);
}

/**
 * Main entry point: Fast-sync if prebuilt icons exist, otherwise generate via Electron
 */
async function main() {
  const force = process.argv.includes('--force');
  const buildDir = path.join(projectRoot, 'build');
  const distDir = path.join(projectRoot, 'dist');
  const publicDir = path.join(projectRoot, 'public');

  const requiredFiles = ['icon.ico', 'icon.png', 'icon.svg'];
  const allExist = requiredFiles.every((f) => fs.existsSync(path.join(buildDir, f)) && fs.statSync(path.join(buildDir, f)).size > 0);

  if (allExist && !force) {
    log('[ICON BUILD] Verified existing icon assets in build/ directory.', colors.cyan);
    fs.mkdirSync(distDir, { recursive: true });
    fs.mkdirSync(publicDir, { recursive: true });

    for (const f of requiredFiles) {
      fs.copyFileSync(path.join(buildDir, f), path.join(distDir, f));
      fs.copyFileSync(path.join(buildDir, f), path.join(publicDir, f));
    }
    log('[ICON BUILD] Synchronized icon assets to dist/ and public/ successfully (0ms).', colors.green);
    process.exit(0);
  }

  // If icons are missing or --force requested, generate using Electron with --no-sandbox
  await generateIcons();
}

main().catch((err) => {
  console.error('[ICON BUILD] Failed to build icon assets:', err);
  process.exit(1);
});
