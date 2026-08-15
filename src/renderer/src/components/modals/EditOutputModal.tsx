import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ModelRun } from '@shared/types/entities';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { MonacoCodeEditor } from '../editor/MonacoCodeEditor';
import { IsolatedFrame } from '../preview/IsolatedFrame';
import { Save, Code2, Eye, FileText } from 'lucide-react';

interface EditOutputModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelRun: ModelRun | null;
  onUpdated: (updatedRun: ModelRun) => void;
}

export const EditOutputModal: React.FC<EditOutputModalProps> = ({
  isOpen,
  onClose,
  modelRun,
  onUpdated,
}) => {
  const { showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'html' | 'preview' | 'raw'>('html');
  const [html, setHtml] = useState('');
  const [rawOutput, setRawOutput] = useState('');
  const [notes, setNotes] = useState('');
  const [saveAsModified, setSaveAsModified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (modelRun && isOpen) {
      setHtml(modelRun.output?.html || '');
      setRawOutput(modelRun.output?.raw_output || '');
      setNotes(modelRun.notes || '');
      setSaveAsModified(false);
    }
  }, [modelRun, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelRun) return;

    setIsSubmitting(true);
    try {
      if (window.electronAPI) {
        if (saveAsModified && modelRun.output) {
          // Create new modified output record
          await window.electronAPI.saveModifiedOutput({
            modelRunId: modelRun.id,
            originalOutputId: modelRun.output.id,
            html: html.trim(),
          });
        } else if (modelRun.output) {
          // Update output in place
          await window.electronAPI.updateOutput(modelRun.output.id, html.trim(), rawOutput);
        }

        // Update run notes
        const updatedRun = await window.electronAPI.updateModelRun(modelRun.id, {
          notes: notes.trim() || undefined,
        });

        showToast('Output and run updated successfully!', 'success');
        onUpdated(updatedRun);
        onClose();
      }
    } catch (err: unknown) {
      showToast(`Failed to update output: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!modelRun) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Output: ${modelRun.model_display_name || modelRun.model_name}`}
      subtitle={`${modelRun.prompt_name} (v${modelRun.prompt_version}) • Run #${modelRun.run_number}`}
      maxWidth="900px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Sub-Tabs: HTML Editor, Live Preview, Raw Markdown */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('html')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: activeTab === 'html' ? 'var(--accent-primary-light)' : 'transparent',
                color: activeTab === 'html' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'html' ? 600 : 500,
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Code2 size={13} /> HTML Source Code
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: activeTab === 'preview' ? 'var(--accent-primary-light)' : 'transparent',
                color: activeTab === 'preview' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'preview' ? 600 : 500,
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Eye size={13} /> Live Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: activeTab === 'raw' ? 'var(--accent-primary-light)' : 'transparent',
                color: activeTab === 'raw' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'raw' ? 600 : 500,
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <FileText size={13} /> Raw Response
            </button>
          </div>

          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {html.length} chars • {html.split('\n').length} lines
          </span>
        </div>

        {/* Tab Body */}
        {activeTab === 'html' && (
          <div style={{ height: '360px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <MonacoCodeEditor
              value={html}
              onChange={(newHtml) => setHtml(newHtml)}
              language="html"
            />
          </div>
        )}

        {activeTab === 'preview' && (
          <div style={{ height: '360px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <IsolatedFrame html={html} />
          </div>
        )}

        {activeTab === 'raw' && (
          <div style={{ height: '360px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <MonacoCodeEditor
              value={rawOutput}
              onChange={(newRaw) => setRawOutput(newRaw)}
              language="markdown"
            />
          </div>
        )}

        {/* Run Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Run Notes & Observations
          </label>
          <input
            type="text"
            placeholder="e.g. Fixed missing SVG tags, updated color palette manually..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
            }}
          />
        </div>

        {/* Options */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={saveAsModified}
              onChange={(e) => setSaveAsModified(e.target.checked)}
            />
            <span>Preserve original output and record as a Modified Output iteration</span>
          </label>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon={<Save size={13} />} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Output'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
