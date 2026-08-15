/**
 * Robust HTML extraction utility for LLM responses.
 * Extracts the most likely renderable HTML from raw LLM outputs (markdown fenced blocks, raw HTML, or fragments)
 * while keeping extraction safe and non-destructive.
 */
export function extractHtml(rawResponse: string): string {
  if (!rawResponse || typeof rawResponse !== 'string') {
    return '';
  }

  const trimmed = rawResponse.trim();

  // 1. Check if the entire raw text is already a complete HTML document
  if (
    trimmed.startsWith('<!DOCTYPE html>') ||
    trimmed.startsWith('<!doctype html>') ||
    trimmed.startsWith('<html')
  ) {
    return trimmed;
  }

  // 2. Search for fenced code blocks (```...```)
  const codeBlockRegex = /```(?:[a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(rawResponse)) !== null) {
    const code = match[1].trim();
    if (code.length > 0) {
      blocks.push(code);
    }
  }

  if (blocks.length > 0) {
    // Look for a block with <!DOCTYPE html> or <html> tag
    const fullDocBlock = blocks.find(
      (b) =>
        b.toLowerCase().includes('<!doctype html') ||
        b.toLowerCase().includes('<html') ||
        (b.toLowerCase().includes('<head') && b.toLowerCase().includes('<body'))
    );
    if (fullDocBlock) {
      return fullDocBlock;
    }

    // Look for blocks containing typical HTML elements
    const htmlLikeBlock = blocks.find(
      (b) =>
        b.includes('<div') ||
        b.includes('<script') ||
        b.includes('<style') ||
        b.includes('<canvas') ||
        b.includes('<svg')
    );
    if (htmlLikeBlock) {
      return htmlLikeBlock;
    }

    // Fallback: return the largest block
    blocks.sort((a, b) => b.length - a.length);
    return blocks[0];
  }

  // 3. Search for inline <html>...</html> or <!DOCTYPE html>...</html>
  const docMatch = rawResponse.match(/(?:<!DOCTYPE\s+html[^>]*>)?\s*<html[\s\S]*?<\/html>/i);
  if (docMatch) {
    return docMatch[0].trim();
  }

  // 4. Search for inline <body>...</body> or <div>...</div> if extensive
  const bodyMatch = rawResponse.match(/<body[\s\S]*?<\/body>/i);
  if (bodyMatch) {
    return `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n</head>\n${bodyMatch[0]}\n</html>`;
  }

  // 5. If it contains HTML tags, return trimmed
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }

  // Fallback: return raw output
  return trimmed;
}
