import React from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../../context/ThemeContext';

interface MonacoCodeEditorProps {
  value: string;
  onChange?: (val: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
  minHeight?: string;
}

export const MonacoCodeEditor: React.FC<MonacoCodeEditorProps> = ({
  value,
  onChange,
  language = 'html',
  readOnly = false,
  height = '100%',
}) => {
  const { theme } = useTheme();

  return (
    <div style={{ width: '100%', height: height, overflow: 'hidden' }}>
      <Editor
        height="100%"
        language={language}
        value={value}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        onChange={(val) => onChange && onChange(val || '')}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 12,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
          tabSize: 2,
        }}
      />
    </div>
  );
};
