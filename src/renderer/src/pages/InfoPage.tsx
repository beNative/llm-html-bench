import React, { useState, useEffect, useMemo } from 'react';
import { DocumentationDocs } from '@shared/types/ipc';
import { Button } from '../components/common/Button';
import {
  BookOpen,
  FileText,
  Cpu,
  History,
  FolderOpen,
  Search,
  CheckCircle2,
  Copy,
  Layers,
} from 'lucide-react';

type DocKey = 'functionalManual' | 'technicalManual' | 'readme' | 'versionLog';

interface DocMeta {
  key: DocKey;
  title: string;
  filename: string;
  icon: React.ReactNode;
  badge: string;
  description: string;
}

const DOCS_LIST: DocMeta[] = [
  {
    key: 'functionalManual',
    title: 'Functional Manual',
    filename: 'MANUAL_FUNCTIONAL.md',
    icon: <BookOpen size={16} />,
    badge: 'User Guide',
    description: 'Workflows, prompt versioning, evaluation dimensions, comparison mode, and backup guides.',
  },
  {
    key: 'technicalManual',
    title: 'Technical Architecture',
    filename: 'MANUAL_TECHNICAL.md',
    icon: <Cpu size={16} />,
    badge: 'Architecture',
    description: 'Multi-process Electron model, SQLite schema, sandboxed iframe isolation, and asset build pipeline.',
  },
  {
    key: 'readme',
    title: 'Project Overview & Readme',
    filename: 'README.md',
    icon: <FileText size={16} />,
    badge: 'Overview',
    description: 'Quickstart, installation, tech stack summary, security model, and keyboard shortcuts.',
  },
  {
    key: 'versionLog',
    title: 'Version History & Log',
    filename: 'CHANGELOG.md',
    icon: <History size={16} />,
    badge: 'Changelog',
    description: 'Complete chronological history of features, architectural milestones, and resolved fixes.',
  },
];

export const InfoPage: React.FC = () => {
  const [activeDocKey, setActiveDocKey] = useState<DocKey>('functionalManual');
  const [docsData, setDocsData] = useState<DocumentationDocs | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI
        .getDocs()
        .then((res) => {
          setDocsData(res);
        })
        .catch((err) => {
          console.error('Failed to load documentation:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, []);

  const activeDocMeta = DOCS_LIST.find((d) => d.key === activeDocKey) || DOCS_LIST[0];
  const activeContent = docsData ? docsData[activeDocKey] : '';

  // Extract table of contents (headings) from active content
  const tableOfContents = useMemo(() => {
    if (!activeContent) return [];
    const lines = activeContent.split('\n');
    const headings: { level: number; text: string; id: string }[] = [];
    for (const line of lines) {
      const match = line.match(/^(#{1,3})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].replace(/[#*`]/g, '').trim();
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        headings.push({ level, text, id });
      }
    }
    return headings;
  }, [activeContent]);

  const handleCopyDoc = () => {
    if (!activeContent) return;
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenFolder = () => {
    if (window.electronAPI) {
      window.electronAPI.openDocsFolder();
    }
  };

  const renderMarkdown = (markdown: string) => {
    if (!markdown) return null;

    const lines = markdown.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = (key: number) => {
      if (tableRows.length === 0) return null;
      const headers = tableRows[0];
      const dataRows = tableRows.slice(1);
      const table = (
        <div key={`table-${key}`} style={{ overflowX: 'auto', margin: '14px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                {headers.map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
      return table;
    };

    lines.forEach((line, idx) => {
      // Code block start/end
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={`code-${idx}`}
              style={{
                backgroundColor: 'var(--bg-primary)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-primary)',
                overflowX: 'auto',
                margin: '12px 0',
                lineHeight: '1.5',
              }}
            >
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Markdown Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        if (line.includes('---')) {
          // Separator row, ignore
          return;
        }
        const cells = line.split('|').slice(1, -1);
        tableRows.push(cells);
        inTable = true;
        return;
      } else if (inTable) {
        elements.push(flushTable(idx));
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={idx} className="h1" style={{ margin: '20px 0 10px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            {line.replace(/^#\s+/, '')}
          </h1>
        );
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="h2" style={{ margin: '18px 0 8px 0', color: 'var(--accent-primary)' }}>
            {line.replace(/^##\s+/, '')}
          </h2>
        );
        return;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="h3" style={{ margin: '14px 0 6px 0' }}>
            {line.replace(/^###\s+/, '')}
          </h3>
        );
        return;
      }

      // Horizontal rules
      if (line.trim() === '---') {
        elements.push(<hr key={idx} style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />);
        return;
      }

      // Bullet lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const text = line.trim().replace(/^[-*]\s+/, '');
        elements.push(
          <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0', paddingLeft: '8px' }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>•</span>
            <div>{text}</div>
          </div>
        );
        return;
      }

      // Numbered lists
      if (/^\d+\.\s+/.test(line.trim())) {
        elements.push(
          <div key={idx} style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0', paddingLeft: '8px' }}>
            {line.trim()}
          </div>
        );
        return;
      }

      // Regular paragraphs
      if (line.trim().length > 0) {
        elements.push(
          <p key={idx} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '8px 0' }}>
            {line}
          </p>
        );
      }
    });

    if (inTable) {
      elements.push(flushTable(999999));
    }

    return elements;
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading documentation suite...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left Sub-Navigation */}
      <div
        style={{
          width: '300px',
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <BookOpen size={16} color="var(--accent-primary)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Documentation & Info
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Packaged alongside the executable in root directory
          </p>
        </div>

        {/* Document Switcher List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {DOCS_LIST.map((doc) => {
            const isSelected = activeDocKey === doc.key;
            return (
              <div
                key={doc.key}
                onClick={() => {
                  setActiveDocKey(doc.key);
                  setSearchQuery('');
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'var(--accent-primary-light)' : 'transparent',
                  border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                  marginBottom: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.1s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                      {doc.icon}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                      {doc.title}
                    </span>
                  </div>
                  <span className="badge" style={{ fontSize: '9px', padding: '1px 5px' }}>
                    {doc.badge}
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>
                  {doc.filename}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                  {doc.description}
                </div>
              </div>
            );
          })}
        </div>

        {/* Open Folder Action */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)' }}>
          <Button
            size="sm"
            variant="secondary"
            icon={<FolderOpen size={13} />}
            onClick={handleOpenFolder}
            style={{ width: '100%', justifyContent: 'center' }}
            title="Open the folder containing these markdown documents on disk"
          >
            Open Documents Folder
          </Button>
        </div>
      </div>

      {/* Right Document Viewer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Header Toolbar */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="h2">{activeDocMeta.title}</h2>
              <span className="badge badge-purple">{activeDocMeta.filename}</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Format: GitHub Flavored Markdown (GFM) • Encoded in UTF-8
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', top: '7px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Filter in document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '4px 8px 4px 26px',
                  fontSize: '11px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <Button
              size="sm"
              variant="secondary"
              icon={copied ? <CheckCircle2 size={13} color="var(--accent-success)" /> : <Copy size={13} />}
              onClick={handleCopyDoc}
              title="Copy Raw Markdown Content"
            >
              {copied ? 'Copied Markdown' : 'Copy Raw'}
            </Button>
          </div>
        </div>

        {/* Main Document Content with Table of Contents Drawer */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Document Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
            <div
              style={{
                maxWidth: '900px',
                margin: '0 auto',
                backgroundColor: 'var(--bg-card)',
                padding: '28px 36px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {renderMarkdown(
                searchQuery
                  ? activeContent
                      .split('\n')
                      .filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase()) || l.startsWith('#'))
                      .join('\n')
                  : activeContent
              )}
            </div>
          </div>

          {/* Quick Table of Contents Sidebar */}
          {tableOfContents.length > 0 && (
            <div
              style={{
                width: '220px',
                backgroundColor: 'var(--bg-secondary)',
                borderLeft: '1px solid var(--border-color)',
                padding: '14px',
                overflowY: 'auto',
                fontSize: '11px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
                <Layers size={13} color="var(--accent-primary)" />
                <span>On This Page</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {tableOfContents.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      paddingLeft: `${(h.level - 1) * 8}px`,
                      color: h.level === 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: h.level === 1 ? 600 : 400,
                      cursor: 'default',
                      lineHeight: '1.3',
                    }}
                  >
                    {h.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
