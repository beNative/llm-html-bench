import React from 'react';
import { VIEWPORT_PRESETS } from '@shared/constants/defaults';
import { RotateCw, Terminal, ZoomIn, ZoomOut, Camera } from 'lucide-react';
import { Button } from '../common/Button';
import { Tooltip } from '../common/Tooltip';

interface ViewportControlsProps {
  selectedPreset: string;
  onPresetChange: (presetName: string, width: string, height: string) => void;
  customWidth: string;
  customHeight: string;
  onCustomDimensionsChange: (w: string, h: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onReload: () => void;
  isConsoleOpen: boolean;
  onToggleConsole: () => void;
  errorCount?: number;
  onCaptureScreenshot?: () => void;
  syncControls?: {
    isSyncViewport: boolean;
    onToggleSyncViewport: () => void;
    isSyncScroll: boolean;
    onToggleSyncScroll: () => void;
  };
}

export const ViewportControls: React.FC<ViewportControlsProps> = ({
  selectedPreset,
  onPresetChange,
  customWidth,
  customHeight,
  onCustomDimensionsChange,
  zoom,
  onZoomChange,
  onReload,
  isConsoleOpen,
  onToggleConsole,
  errorCount = 0,
  onCaptureScreenshot,
  syncControls,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        fontSize: '12px',
        gap: '8px',
        flexWrap: 'wrap',
      }}
    >
      {/* Left: Viewport Presets & Dimensions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <select
          value={selectedPreset}
          onChange={(e) => {
            const found = VIEWPORT_PRESETS.find((p) => p.name === e.target.value);
            if (found) {
              onPresetChange(found.name, found.width, found.height);
            } else if (e.target.value === 'Custom') {
              onPresetChange('Custom', customWidth, customHeight);
            }
          }}
          style={{
            padding: '3px 8px',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
          }}
        >
          {VIEWPORT_PRESETS.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
          <option value="Custom">Custom Size...</option>
        </select>

        {selectedPreset === 'Custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="text"
              value={customWidth}
              placeholder="Width (e.g. 800px)"
              onChange={(e) => onCustomDimensionsChange(e.target.value, customHeight)}
              style={{
                width: '75px',
                padding: '2px 6px',
                fontSize: '11px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
              }}
            />
            <span style={{ color: 'var(--text-muted)' }}>×</span>
            <input
              type="text"
              value={customHeight}
              placeholder="Height (e.g. 600px)"
              onChange={(e) => onCustomDimensionsChange(customWidth, e.target.value)}
              style={{
                width: '75px',
                padding: '2px 6px',
                fontSize: '11px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
              }}
            />
          </div>
        )}

        {/* Sync Controls if in comparison mode */}
        {syncControls && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px', borderLeft: '1px solid var(--border-color)', paddingLeft: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={syncControls.isSyncViewport}
                onChange={syncControls.onToggleSyncViewport}
              />
              Sync Viewport
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={syncControls.isSyncScroll}
                onChange={syncControls.onToggleSyncScroll}
              />
              Sync Scroll
            </label>
          </div>
        )}
      </div>

      {/* Right: Actions (Reload, Zoom, Screenshot, Console) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <Tooltip content="Zoom Out" position="bottom">
            <button
              onClick={() => onZoomChange(Math.max(0.25, zoom - 0.25))}
              style={{
                padding: '4px',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
              }}
            >
              <ZoomOut size={14} />
            </button>
          </Tooltip>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', minWidth: '35px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {Math.round(zoom * 100)}%
          </span>
          <Tooltip content="Zoom In" position="bottom">
            <button
              onClick={() => onZoomChange(Math.min(2.0, zoom + 0.25))}
              style={{
                padding: '4px',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
              }}
            >
              <ZoomIn size={14} />
            </button>
          </Tooltip>
          {zoom !== 1 && (
            <Tooltip content="Reset Zoom to 100%" position="bottom">
              <button
                onClick={() => onZoomChange(1)}
                style={{
                  padding: '2px 4px',
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  marginLeft: '2px',
                }}
              >
                100%
              </button>
            </Tooltip>
          )}
        </div>

        {/* Reload */}
        <Tooltip content="Reload HTML Sandbox" shortcut="F5" position="bottom">
          <Button
            size="sm"
            variant="ghost"
            icon={<RotateCw size={13} />}
            onClick={onReload}
          >
            Reload
          </Button>
        </Tooltip>

        {/* Capture Screenshot */}
        {onCaptureScreenshot && (
          <Tooltip content="Capture High-Res Viewport Screenshot" position="bottom">
            <Button
              size="sm"
              variant="ghost"
              icon={<Camera size={13} />}
              onClick={onCaptureScreenshot}
            >
              Screenshot
            </Button>
          </Tooltip>
        )}

        {/* Console / Log toggle */}
        <Tooltip content="Toggle JavaScript Console & Errors" position="bottom">
          <button
            onClick={onToggleConsole}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              fontSize: '11px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: isConsoleOpen ? 'var(--bg-active)' : 'var(--bg-tertiary)',
              color: errorCount > 0 ? 'var(--accent-danger)' : isConsoleOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: `1px solid ${errorCount > 0 ? 'var(--accent-danger)' : 'var(--border-subtle)'}`,
            }}
          >
            <Terminal size={12} />
            Console
            {errorCount > 0 && (
              <span
                style={{
                  backgroundColor: 'var(--accent-danger)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '0 4px',
                  fontSize: '9px',
                  fontWeight: 700,
                }}
              >
                {errorCount}
              </span>
            )}
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

