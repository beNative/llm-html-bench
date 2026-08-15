import React from 'react';
import { useApp, NavTab } from '../../context/AppContext';
import {
  LayoutDashboard,
  FileCode2,
  Columns,
  Cpu,
  FolderKanban,
  History,
  Settings,
  BookOpen,
} from 'lucide-react';
import { Tooltip } from '../common/Tooltip';

interface NavItem {
  id: NavTab;
  label: string;
  description: string;
  icon: React.ReactNode;
  badge?: number;
  shortcut?: string;
}

export const Sidebar: React.FC = () => {
  const { currentTab, setCurrentTab, compareRunIds } = useApp();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', description: 'Leaderboards, Elo win-rates, and category overview', icon: <LayoutDashboard size={16} /> },
    { id: 'prompts', label: 'Prompt Library', description: 'Manage benchmark challenges and versioned prompts', icon: <FileCode2 size={16} />, shortcut: 'Ctrl+N' },
    {
      id: 'compare',
      label: 'Compare Lab',
      description: 'Side-by-side execution sandbox and visual diffing',
      icon: <Columns size={16} />,
      badge: compareRunIds.length > 0 ? compareRunIds.length : undefined,
      shortcut: 'Ctrl+Shift+C',
    },
    { id: 'models', label: 'Models', description: 'Catalog of AI models, providers, parameters, and weights', icon: <Cpu size={16} /> },
    { id: 'collections', label: 'Collections', description: 'Curated test suites and themed evaluation challenges', icon: <FolderKanban size={16} /> },
    { id: 'runs', label: 'Run History', description: 'Complete chronological audit log of all model generations', icon: <History size={16} /> },
    { id: 'settings', label: 'Settings & DB', description: 'API keys, database backups, vacuum, and preferences', icon: <Settings size={16} /> },
    { id: 'info', label: 'Documentation & Info', description: 'Built-in functional and technical architecture manuals', icon: <BookOpen size={16} /> },
  ];

  return (
    <nav
      style={{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '12px 8px',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ padding: '4px 10px', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <Tooltip
              key={item.id}
              content={item.label}
              description={item.description}
              shortcut={item.shortcut}
              position="right"
            >
              <button
                onClick={() => setCurrentTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive ? 'var(--accent-primary-light)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${isActive ? 'rgba(59, 130, 246, 0.25)' : 'transparent'}`,
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '12px',
                  transition: 'all 0.1s ease',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                    {item.icon}
                  </span>
                  {item.label}
                </div>

                {item.badge !== undefined && (
                  <span
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 700,
                      borderRadius: '10px',
                      padding: '1px 6px',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* Benchmark System Info box at bottom of sidebar */}
      <div
        style={{
          padding: '10px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
          Benchmark Laboratory
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Local SQLite repository for persistent LLM HTML evaluation.
        </div>
      </div>
    </nav>
  );
};
