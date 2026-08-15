import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Determine target version
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
let targetVersion = process.env.GITHUB_REF_NAME || process.env.RELEASE_TAG || packageJson.version;
if (targetVersion.startsWith('v')) {
  targetVersion = targetVersion.slice(1);
}

console.log(`[RELEASE NOTES] Generating release notes for version ${targetVersion}...`);

// 2. Read CHANGELOG.md
const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
let changelogContent = '';
if (fs.existsSync(changelogPath)) {
  changelogContent = fs.readFileSync(changelogPath, 'utf-8');
}

// 3. Extract the section for target version
function extractVersionSection(changelog, version) {
  const lines = changelog.split('\n');
  let capturing = false;
  const sectionLines = [];

  const versionRegex = new RegExp(`^##\\s*\\[?v?${version.replace(/\./g, '\\.')}\\]?`, 'i');

  for (const line of lines) {
    if (versionRegex.test(line)) {
      capturing = true;
      continue;
    }
    if (capturing && /^##\s+\[?v?\d+\.\d+\.\d+/.test(line)) {
      break; // Reached next version
    }
    if (capturing) {
      sectionLines.push(line);
    }
  }

  let result = sectionLines.join('\n').trim();
  if (!result) {
    result = `### 🚀 Release v${version}\n\nAutomated multi-platform production release for **LLM HTML Bench**.`;
  }
  return result;
}

const extractedSection = extractVersionSection(changelogContent, targetVersion);

// 4. Compose complete release body
const releaseBody = `# LLM HTML Bench v${targetVersion} 🚀

Desktop benchmark database and inspection laboratory for LLM-generated HTML applications.

---

## 📦 Downloads & Platform Binaries

| Platform | Package | Architecture | Description |
| :--- | :--- | :--- | :--- |
| **Windows** | \`LLM HTML Bench-Setup-${targetVersion}.exe\` | x64 | Standard Windows NSIS Installer |
| **Windows** | \`LLM HTML Bench-${targetVersion}-win.zip\` | x64 | Portable Standalone Archive |
| **macOS** | \`LLM HTML Bench-${targetVersion}-arm64.dmg\` | Apple Silicon | Apple Silicon Disk Image (M1/M2/M3/M4) |
| **macOS** | \`LLM HTML Bench-${targetVersion}-x64.dmg\` | Intel | Intel Mac Disk Image |
| **Linux** | \`LLM HTML Bench-${targetVersion}-x64.AppImage\` | x64 | Standalone Universal AppImage |
| **Linux** | \`LLM HTML Bench-${targetVersion}-x64.tar.gz\` | x64 | Tarball Archive |

> 🔒 **Verification**: Download \`SHA256SUMS.txt\` to verify the integrity and checksum of all release binaries.

---

## 📝 What's New in v${targetVersion}

${extractedSection}

---

## 🛠️ Verification & Checksums

To verify the integrity of any downloaded binary on your system:

\`\`\`bash
# Linux / macOS
sha256sum -c SHA256SUMS.txt

# Windows (PowerShell)
Get-FileHash -Algorithm SHA256 .\\LLM\\ HTML\\ Bench-Setup-${targetVersion}.exe
\`\`\`

---
*Built with GitHub Actions CI/CD pipeline.*
`;

// 5. Output to dist-package/release-notes.md and stdout
const outDir = path.join(projectRoot, 'dist-package');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'release-notes.md');
fs.writeFileSync(outPath, releaseBody, 'utf-8');

console.log(`[RELEASE NOTES] Generated release notes at: ${outPath}`);
process.stdout.write(releaseBody);
