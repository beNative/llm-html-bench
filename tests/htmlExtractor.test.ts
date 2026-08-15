import { describe, it, expect } from 'vitest';
import { extractHtml } from '../src/shared/utils/htmlExtractor';

describe('HTML Extractor', () => {
  it('extracts html from markdown code fences', () => {
    const raw = `
Certainly! Here is your interactive web application:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Test App</title>
</head>
<body>
  <div id="app">Hello World</div>
</body>
</html>
\`\`\`

Hope this helps! Let me know if you need changes.
`;

    const extracted = extractHtml(raw);
    expect(extracted).toContain('<title>Test App</title>');
    expect(extracted).toContain('<div id="app">Hello World</div>');
    expect(extracted).not.toContain('Certainly!');
    expect(extracted).not.toContain('Hope this helps!');
  });

  it('handles raw HTML without code fences', () => {
    const raw = '<!DOCTYPE html><html><body><h1>Raw HTML</h1></body></html>';
    const extracted = extractHtml(raw);
    expect(extracted).toBe(raw);
  });

  it('picks full html document when multiple code blocks are present', () => {
    const raw = `
First, install dependencies:
\`\`\`bash
npm install three
\`\`\`

Then run this HTML:
\`\`\`html
<!DOCTYPE html>
<html>
<head><title>3D</title></head>
<body><canvas id="c"></canvas></body>
</html>
\`\`\`
`;

    const extracted = extractHtml(raw);
    expect(extracted).toContain('<canvas id="c"></canvas>');
    expect(extracted).not.toContain('npm install');
  });

  it('handles partial body HTML fragments gracefully', () => {
    const raw = '<body><div class="card">Card Content</div></body>';
    const extracted = extractHtml(raw);
    expect(extracted).toContain('Card Content');
    expect(extracted).toContain('<!DOCTYPE html>');
  });

  it('returns empty string for empty input', () => {
    expect(extractHtml('')).toBe('');
  });
});
