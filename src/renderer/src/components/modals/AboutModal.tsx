import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import {
  Layers,
  ExternalLink,
  HardDrive,
  BookOpen,
  RotateCw,
  FolderOpen,
  Cpu,
  Database,
} from 'lucide-react';
import { DatabaseInfo } from '@shared/types/ipc';

export const AboutModal: React.FC = () => {
  const {
    isAboutModalOpen,
    setIsAboutModalOpen,
    appVersion,
    backupDatabase,
    openDatabaseFolder,
    setCurrentTab,
    showToast,
  } = useApp();

  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);

  useEffect(() => {
    if (isAboutModalOpen && window.electronAPI) {
      window.electronAPI.getDatabaseInfo().then((info) => setDbInfo(info)).catch(() => {});
    }
  }, [isAboutModalOpen]);

  const repoUrl = 'https://github.com/beNative/llm-html-bench';

  const handleOpenGitHub = () => {
    if (window.electronAPI?.openExternalUrl) {
      window.electronAPI.openExternalUrl(repoUrl);
    } else {
      window.open(repoUrl, '_blank');
    }
  };

  const handleCheckUpdates = async () => {
    if (window.electronAPI?.checkForUpdates) {
      showToast('Checking for updates...', 'info');
      const res = await window.electronAPI.checkForUpdates();
      if (res?.message) {
        showToast(res.message, 'info');
      }
    }
  };

  return (
    <Modal
      isOpen={isAboutModalOpen}
      onClose={() => setIsAboutModalOpen(false)}
      title="About LLM HTML Bench"
      maxWidth="580px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
        {/* App Hero Branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '12px',
              backgroundColor: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 16px rgba(59, 130, 246, 0.4)',
              flexShrink: 0,
            }}
          >
            <Layers size={28} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                LLM HTML Bench
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--accent-primary-light)',
                  color: 'var(--accent-primary)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}
              >
                v{appVersion}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
              Desktop benchmark database and inspection laboratory for LLM-generated HTML applications.
            </p>
          </div>
        </div>

        {/* GitHub Repository Link Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                GitHub Repository
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                beNative/llm-html-bench
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="primary"
            icon={<ExternalLink size={13} />}
            onClick={handleOpenGitHub}
          >
            Open on GitHub
          </Button>
        </div>

        {/* Technical Architecture & Database Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            fontSize: '11px',
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ color: 'var(--text-muted)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Database size={11} color="var(--accent-primary)" />
              <span>Database Storage</span>
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              SQLite {dbInfo ? `${(dbInfo.sizeBytes / 1024).toFixed(0)} KB (Schema v${dbInfo.version})` : 'Ready'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {dbInfo ? `${dbInfo.counts.prompts} prompts • ${dbInfo.counts.runs} runs recorded` : 'Local WAL Database'}
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ color: 'var(--text-muted)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Cpu size={11} color="var(--accent-purple)" />
              <span>Runtime Engine</span>
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Electron + React + Monaco
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Isolated Iframe Sandbox • SafeStorage
            </div>
          </div>
        </div>

        {/* Quick System Actions */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
          <Button
            size="sm"
            variant="secondary"
            icon={<FolderOpen size={12} />}
            onClick={openDatabaseFolder}
          >
            Open DB Folder
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={<HardDrive size={12} />}
            onClick={backupDatabase}
          >
            Backup DB
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={<BookOpen size={12} />}
            onClick={() => {
              setIsAboutModalOpen(false);
              setCurrentTab('info');
            }}
          >
            User Manuals
          </Button>

          <Button
            size="sm"
            variant="ghost"
            icon={<RotateCw size={12} />}
            onClick={handleCheckUpdates}
          >
            Check Updates
          </Button>
        </div>

        {/* Copyright & License */}
        <div
          style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <span>Created by Tim Sinaeve (tim.sinaeve@gmail.com)</span>
          <span>MIT License</span>
        </div>
      </div>
    </Modal>
  );
};
