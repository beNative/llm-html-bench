import React from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useTheme } from '../../context/ThemeContext';

interface MonacoDiffViewerProps {
  original: string;
  modified: string;
  originalTitle?: string;
  modifiedTitle?: string;
  height?: string;
}

export const MonacoDiffViewer: React.FC<MonacoDiffViewerProps> = ({
  original,
  modified,
  originalTitle = 'Left Output',
  modifiedTitle = 'Right Output',
  height = '100%',
}) => {
  const { theme } = useTheme();

  return (
    <div style={{ width: '100%', height: height, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          padding: '6px 14px',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
        }}
      >
        <div>{originalTitle}</div>
        <div>{modifiedTitle}</div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DiffEditor
          height="100%"
          original={original}
          modified={modified}
          language="html"
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
            renderSideBySide: true,
          }}
        />
      </div>
    </div>
  );
};
