import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DocumentationDocs } from '@shared/types/ipc';
import { useListKeyboardNav } from '../hooks/useListKeyboardNav';
import { Button } from '../components/common/Button';
import { Tooltip } from '../components/common/Tooltip';
import { MarkdownViewer } from '../components/common/MarkdownViewer';
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
  RotateCw,
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

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading documentation suite...
      </div>
    );
  }

  const listContainerRef = useRef<HTMLDivElement>(null);
  const selectedIndex = useMemo(() => {
    return DOCS_LIST.findIndex((d) => d.key === activeDocKey);
  }, [activeDocKey]);

  useListKeyboardNav({
    itemCount: DOCS_LIST.length,
    selectedIndex,
    onSelectIndex: (idx) => {
      if (DOCS_LIST[idx]) {
        setActiveDocKey(DOCS_LIST[idx].key);
        setSearchQuery('');
      }
    },
    containerRef: listContainerRef,
    pageSize: 4,
  });

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
        <div ref={listContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {DOCS_LIST.map((doc) => {
            const isSelected = activeDocKey === doc.key;
            return (
              <div
                key={doc.key}
                data-list-item="true"
                tabIndex={0}
                onClick={() => {
                  setActiveDocKey(doc.key);
                  setSearchQuery('');
                }}
                onFocus={() => {
                  setActiveDocKey(doc.key);
                  setSearchQuery('');
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'var(--accent-primary-light)' : 'transparent',
                  border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                  outline: isSelected ? '2px solid var(--accent-primary)' : 'none',
                  outlineOffset: '-1px',
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
          <Tooltip content="Open Documents Folder on Disk" description="Directly open the folder where Markdown manuals are stored" position="top">
            <Button
              size="sm"
              variant="secondary"
              icon={<FolderOpen size={13} />}
              onClick={handleOpenFolder}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Open Documents Folder
            </Button>
          </Tooltip>
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

            <Tooltip content="Copy Markdown Content" description="Copy full raw Markdown source to clipboard">
              <Button
                size="sm"
                variant="secondary"
                icon={copied ? <CheckCircle2 size={13} color="var(--accent-success)" /> : <Copy size={13} />}
                onClick={handleCopyDoc}
              >
                {copied ? 'Copied Markdown' : 'Copy Raw'}
              </Button>
            </Tooltip>

            <Tooltip content="Check for Software Updates" description="Check GitHub Releases for newer versions of LLM HTML Bench">
              <Button
                size="sm"
                variant="secondary"
                icon={<RotateCw size={13} color="var(--accent-primary)" />}
                onClick={() => {
                  if (window.electronAPI?.checkForUpdates) {
                    window.electronAPI.checkForUpdates();
                  }
                }}
              >
                Check Updates
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Main Document Content with Table of Contents Drawer */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Document Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }} id="doc-scroll-container">
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
              <MarkdownViewer
                content={activeContent}
                searchQuery={searchQuery}
              />
            </div>
          </div>

          {/* Quick Table of Contents Sidebar */}
          {tableOfContents.length > 0 && (
            <div
              style={{
                width: '230px',
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {tableOfContents.map((h, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      const el = document.getElementById(h.id);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    style={{
                      padding: '4px 6px',
                      paddingLeft: `${(h.level - 1) * 10 + 6}px`,
                      color: h.level === 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: h.level === 1 ? 600 : 400,
                      cursor: 'pointer',
                      lineHeight: '1.35',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'all 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      e.currentTarget.style.color = 'var(--accent-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = h.level === 1 ? 'var(--text-primary)' : 'var(--text-secondary)';
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
