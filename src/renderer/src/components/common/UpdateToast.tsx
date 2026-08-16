import React, { useState, useEffect } from 'react';
import { UpdateState } from '@shared/types/ipc';
import { DownloadCloud, CheckCircle2, RotateCw, X, AlertCircle } from 'lucide-react';

export const UpdateToast: React.FC = () => {
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' });
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStateChange) return;

    const cleanup = window.electronAPI.onUpdateStateChange((state: UpdateState) => {
      setUpdateState(state);

      if (state.status === 'available' || state.status === 'downloading' || state.status === 'downloaded') {
        setIsVisible(true);
        setIsDismissed(false);
      } else if (state.status === 'error') {
        setIsVisible(true);
        // Auto-dismiss error notice after 4 seconds
        setTimeout(() => setIsVisible(false), 4000);
      } else if (state.status === 'not-available') {
        setIsVisible(true);
        // Auto-dismiss up-to-date notice after 3.5 seconds
        setTimeout(() => setIsVisible(false), 3500);
      } else if (state.status === 'idle') {
        setIsVisible(false);
      }
    });

    return cleanup;
  }, []);

  const handleRestartNow = () => {
    if (window.electronAPI?.quitAndInstallUpdate) {
      window.electronAPI.quitAndInstallUpdate();
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  // Helper to format bytes
  const formatBytes = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  };

  // Helper to format speed
  const formatSpeed = (bytesPerSec?: number): string => {
    if (!bytesPerSec || bytesPerSec === 0) return '';
    const mbPerSec = bytesPerSec / (1024 * 1024);
    if (mbPerSec >= 1) return `${mbPerSec.toFixed(1)} MB/s`;
    const kbPerSec = bytesPerSec / 1024;
    return `${kbPerSec.toFixed(0)} KB/s`;
  };

  if (!isVisible || isDismissed || updateState.status === 'idle') {
    return null;
  }

  const { status, info, progress, error } = updateState;
  const version = info?.version || '';
  const percent = progress?.percent || 0;

  return (
    <div className="update-toast-container">
      {/* Toast Header */}
      <div className="update-toast-header">
        <div className="update-toast-title-wrap">
          {status === 'downloaded' ? (
            <div className="update-toast-icon-pulse update-toast-icon-success">
              <CheckCircle2 size={16} />
            </div>
          ) : status === 'error' ? (
            <div className="update-toast-icon-pulse" style={{ background: 'var(--accent-danger-light)', color: 'var(--accent-danger)' }}>
              <AlertCircle size={16} />
            </div>
          ) : (
            <div className="update-toast-icon-pulse">
              <DownloadCloud size={16} />
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="update-toast-title">
                {status === 'downloaded'
                  ? 'Update Ready to Install'
                  : status === 'downloading' || status === 'available'
                  ? 'Downloading Update'
                  : status === 'checking'
                  ? 'Checking for Updates'
                  : status === 'error'
                  ? 'Update Check Notice'
                  : 'Software Update'}
              </span>
              {version && (
                <span className={`update-toast-badge ${status === 'downloaded' ? 'update-toast-badge-success' : ''}`}>
                  v{version}
                </span>
              )}
            </div>
          </div>
        </div>

        <button className="update-toast-close" onClick={handleDismiss} title="Dismiss">
          <X size={14} />
        </button>
      </div>

      {/* Toast Body */}
      <div className="update-toast-body">
        {/* Downloading Phase */}
        {(status === 'downloading' || status === 'available') && (
          <div>
            <div className="update-toast-desc">
              A new version of LLM HTML Bench is downloading silently in the background.
            </div>

            {/* Real-Time Progress Bar */}
            <div className="update-progress-bar-bg">
              <div
                className="update-progress-bar-fill"
                style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
              />
            </div>

            {/* Metrics */}
            <div className="update-progress-metrics">
              <span className="update-progress-percent">{percent.toFixed(1)}%</span>
              <span>
                {formatBytes(progress?.transferred)} / {formatBytes(progress?.total)}
                {progress?.bytesPerSecond ? ` • ${formatSpeed(progress.bytesPerSecond)}` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Downloaded & Ready Phase */}
        {status === 'downloaded' && (
          <div>
            <div className="update-toast-desc">
              Version <strong>{version}</strong> is downloaded and verified. Restart now to apply updates seamlessly with zero installer prompts.
            </div>

            <div className="update-toast-actions">
              <button className="update-btn-dismiss" onClick={handleDismiss}>
                Later (on exit)
              </button>
              <button className="update-btn-restart" onClick={handleRestartNow}>
                <RotateCw size={13} />
                <span>Restart & Update</span>
              </button>
            </div>
          </div>
        )}

        {/* Checking Phase */}
        {status === 'checking' && (
          <div className="update-toast-desc" style={{ marginBottom: 0 }}>
            Connecting to GitHub Releases to check for updates...
          </div>
        )}

        {/* Up-to-date Phase */}
        {status === 'not-available' && (
          <div className="update-toast-desc" style={{ marginBottom: 0, color: 'var(--accent-success)' }}>
            ✓ You are already using the latest version of LLM HTML Bench!
          </div>
        )}

        {/* Error Notice */}
        {status === 'error' && (
          <div className="update-toast-desc" style={{ marginBottom: 0, color: 'var(--text-secondary)', fontSize: '11px' }}>
            {(() => {
              if (!error) return 'Unable to reach update server at this time.';
              if (error.includes('404') || error.includes('releases.atom')) return 'No published updates found on the repository yet.';
              // Strip any multiline HTTP headers or JSON dumps
              const clean = error.split('\n')[0].replace(/Headers:.*/i, '').trim();
              return clean.length > 90 ? `${clean.slice(0, 90)}...` : clean;
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
