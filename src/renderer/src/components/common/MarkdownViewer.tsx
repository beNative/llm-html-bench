import React, { useMemo, useEffect, useRef } from 'react';
import { marked } from 'marked';

interface MarkdownViewerProps {
  content: string;
  searchQuery?: string;
  className?: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  searchQuery = '',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Configure marked for GitHub Flavored Markdown
  const html = useMemo(() => {
    if (!content) return '';

    // Create a custom renderer for marked
    const renderer = new marked.Renderer();

    // 1. Headings with custom IDs matching Table of Contents
    renderer.heading = function ({ text, depth }) {
      const rawText = text.replace(/<[^>]*>/g, '').replace(/[#*`_~]/g, '').trim();
      const id = rawText.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return `<h${depth} id="${id}" class="h${depth}">${text}</h${depth}>`;
    };

    // 2. Tables wrapped in responsive scroll container
    renderer.table = function ({ header, rows }) {
      return `<div class="markdown-table-wrap"><table><thead>${header}</thead><tbody>${rows}</tbody></table></div>`;
    };

    // 3. Blockquotes & GitHub Callouts / Alerts (> [!NOTE], etc.)
    renderer.blockquote = function ({ text }) {
      const trimmed = text.trim();
      const calloutMatch = trimmed.match(/^<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s*<br\s*\/?>)?([\s\S]*?)<\/p>$/i);
      
      if (calloutMatch) {
        const type = calloutMatch[1].toUpperCase();
        const calloutText = calloutMatch[2].trim();
        let className = 'markdown-callout-note';
        let title = 'Note';
        
        if (type === 'TIP') {
          className = 'markdown-callout-tip';
          title = 'Tip';
        } else if (type === 'IMPORTANT') {
          className = 'markdown-callout-important';
          title = 'Important';
        } else if (type === 'WARNING') {
          className = 'markdown-callout-warning';
          title = 'Warning';
        } else if (type === 'CAUTION') {
          className = 'markdown-callout-caution';
          title = 'Caution';
        }

        return `
          <div class="markdown-callout ${className}">
            <div class="markdown-callout-header">
              <span>${title}</span>
            </div>
            <div class="markdown-callout-body">
              ${calloutText}
            </div>
          </div>
        `;
      }

      return `<blockquote>${text}</blockquote>`;
    };

    // 4. Code Blocks with Language and Copy Button Support
    renderer.code = function ({ text, lang }) {
      const language = lang || 'text';
      const escapedCode = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      return `
        <div class="markdown-code-block-container" data-code="${encodeURIComponent(text)}">
          <div class="markdown-code-block-header">
            <span>${language}</span>
            <button type="button" class="markdown-code-block-copy-btn" data-action="copy">
              <span>Copy</span>
            </button>
          </div>
          <pre><code class="language-${language}">${escapedCode}</code></pre>
        </div>
      `;
    };

    // 5. Links
    renderer.link = function ({ href, title, text }) {
      const isAnchor = href.startsWith('#');
      const titleAttr = title ? ` title="${title}"` : '';
      if (isAnchor) {
        return `<a href="${href}"${titleAttr} class="markdown-anchor-link">${text}</a>`;
      }
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer" class="markdown-external-link">${text}</a>`;
    };

    // Parse markdown into HTML string
    let parsed = marked.parse(content, {
      gfm: true,
      breaks: false,
      renderer,
    }) as string;

    // 6. Highlight Search Query if present
    if (searchQuery.trim().length >= 2) {
      const q = searchQuery.trim();
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?![^<]*>)(${escaped})`, 'gi');
      parsed = parsed.replace(regex, '<mark class="markdown-search-highlight">$1</mark>');
    }

    return parsed;
  }, [content, searchQuery]);

  // Event Delegation for Copy Buttons and Anchor Navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Handle Code Block Copy Button
      const copyBtn = target.closest('.markdown-code-block-copy-btn') as HTMLElement | null;
      if (copyBtn) {
        e.preventDefault();
        e.stopPropagation();
        const codeContainer = copyBtn.closest('.markdown-code-block-container') as HTMLElement | null;
        if (codeContainer) {
          const rawCode = decodeURIComponent(codeContainer.getAttribute('data-code') || '');
          if (rawCode) {
            navigator.clipboard.writeText(rawCode);
            const span = copyBtn.querySelector('span');
            if (span) span.textContent = 'Copied!';
            copyBtn.style.color = 'var(--accent-success)';
            copyBtn.style.borderColor = 'var(--accent-success)';
            setTimeout(() => {
              if (span) span.textContent = 'Copy';
              copyBtn.style.color = '';
              copyBtn.style.borderColor = '';
            }, 2000);
          }
        }
        return;
      }

      // Handle Anchor Links (#section)
      const link = target.closest('a') as HTMLAnchorElement | null;
      if (link) {
        const href = link.getAttribute('href') || '';
        if (href.startsWith('#')) {
          e.preventDefault();
          const targetId = href.slice(1);
          const targetEl = container.querySelector(`#${targetId}`);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else if (href.startsWith('http://') || href.startsWith('https://')) {
          e.preventDefault();
          if (window.electronAPI) {
            window.electronAPI.openDocsFolder(); // or window.open(href, '_blank')
          } else {
            window.open(href, '_blank');
          }
        }
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
