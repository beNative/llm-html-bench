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

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const Sidebar: React.FC = () => {
  const { currentTab, setCurrentTab, compareRunIds } = useApp();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'prompts', label: 'Prompt Library', icon: <FileCode2 size={16} /> },
    {
      id: 'compare',
      label: 'Compare Lab',
      icon: <Columns size={16} />,
      badge: compareRunIds.length > 0 ? compareRunIds.length : undefined,
    },
    { id: 'models', label: 'Models', icon: <Cpu size={16} /> },
    { id: 'collections', label: 'Collections', icon: <FolderKanban size={16} /> },
    { id: 'runs', label: 'Run History', icon: <History size={16} /> },
    { id: 'settings', label: 'Settings & DB', icon: <Settings size={16} /> },
    { id: 'info', label: 'Documentation & Info', icon: <BookOpen size={16} /> },
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
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
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
