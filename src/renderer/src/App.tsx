import React from 'react';
import { useApp } from './context/AppContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { DashboardPage } from './pages/DashboardPage';
import { PromptsPage } from './pages/PromptsPage';
import { ComparePage } from './pages/ComparePage';
import { ModelsPage } from './pages/ModelsPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { RunsPage } from './pages/RunsPage';
import { SettingsPage } from './pages/SettingsPage';
import { InfoPage } from './pages/InfoPage';
import { NewPromptModal } from './components/modals/NewPromptModal';
import { AddOutputModal } from './components/modals/AddOutputModal';
import { NewModelModal } from './components/modals/NewModelModal';
import { RunBenchmarkModal } from './components/modals/RunBenchmarkModal';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const MainApp: React.FC = () => {
  const { currentTab, toasts, dismissToast } = useApp();
  useKeyboardShortcuts();

  const renderActivePage = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'prompts':
        return <PromptsPage />;
      case 'compare':
        return <ComparePage />;
      case 'models':
        return <ModelsPage />;
      case 'collections':
        return <CollectionsPage />;
      case 'runs':
        return <RunsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'info':
        return <InfoPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <Header />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {renderActivePage()}
        </main>
      </div>

      <StatusBar />

      {/* Global Modals */}
      <NewPromptModal />
      <AddOutputModal />
      <NewModelModal />
      <RunBenchmarkModal />

      {/* Toast Notifications */}
      <div
        style={{
          position: 'fixed',
          bottom: '36px',
          right: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 10000,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          let icon = <CheckCircle2 size={15} color="var(--accent-success)" />;
          let borderColor = 'var(--accent-success)';
          if (t.type === 'error') {
            icon = <AlertCircle size={15} color="var(--accent-danger)" />;
            borderColor = 'var(--accent-danger)';
          } else if (t.type === 'info') {
            icon = <Info size={15} color="var(--accent-primary)" />;
            borderColor = 'var(--accent-primary)';
          }

          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                backgroundColor: 'var(--bg-secondary)',
                border: `1px solid ${borderColor}`,
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                fontSize: '12px',
                color: 'var(--text-primary)',
                animation: 'fadeIn 0.2s ease',
              }}
            >
              {icon}
              <span>{t.message}</span>
              <button
                onClick={() => dismissToast(t.id)}
                style={{
                  color: 'var(--text-muted)',
                  marginLeft: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
