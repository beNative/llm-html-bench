import React, { useState } from 'react';
import { ModelRun, HeadToHeadComparison } from '@shared/types/entities';
import { Trophy, Check } from 'lucide-react';

interface HeadToHeadSelectorProps {
  leftRun: ModelRun;
  rightRun: ModelRun;
  promptVersionId: string;
  onDecisionSaved?: (comparison: HeadToHeadComparison) => void;
}

const REASONS = [
  'Visual Design',
  'Functionality',
  'Prompt Adherence',
  'Performance',
  'Code Quality',
  'Overall Preference',
] as const;

export const HeadToHeadSelector: React.FC<HeadToHeadSelectorProps> = ({
  leftRun,
  rightRun,
  promptVersionId,
  onDecisionSaved,
}) => {
  const [winner, setWinner] = useState<'left' | 'right' | 'tie' | null>(null);
  const [reason, setReason] = useState<(typeof REASONS)[number]>('Visual Design');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const leftName = leftRun.model_display_name || leftRun.model_name;
  const rightName = rightRun.model_display_name || rightRun.model_name;

  const handleSaveDecision = async (selectedWinner: 'left' | 'right' | 'tie') => {
    setWinner(selectedWinner);
    setIsSaving(true);
    try {
      if (window.electronAPI) {
        const saved = await window.electronAPI.saveHeadToHeadComparison({
          promptVersionId,
          leftRunId: leftRun.id,
          rightRunId: rightRun.id,
          winner: selectedWinner,
          dimensionReason: reason,
          notes: notes.trim() || undefined,
        });

        setIsSaved(true);
        if (onDecisionSaved) onDecisionSaved(saved);
        setTimeout(() => setIsSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save head-to-head decision:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        padding: '10px 16px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Trophy size={16} color="var(--accent-warning)" />
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          Head-to-Head Benchmark Decision:
        </span>
      </div>

      {/* Decision Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => handleSaveDecision('left')}
          disabled={isSaving}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: winner === 'left' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
            color: winner === 'left' ? '#ffffff' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {winner === 'left' && <Check size={12} />}
          👈 {leftName} Wins
        </button>

        <button
          onClick={() => handleSaveDecision('tie')}
          disabled={isSaving}
          style={{
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: winner === 'tie' ? 'var(--bg-active)' : 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          🤝 Tie
        </button>

        <button
          onClick={() => handleSaveDecision('right')}
          disabled={isSaving}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: winner === 'right' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
            color: winner === 'right' ? '#ffffff' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {winner === 'right' && <Check size={12} />}
          👉 {rightName} Wins
        </button>
      </div>

      {/* Reason selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Decisive Factor:</span>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}
          style={{
            padding: '3px 8px',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
          }}
        >
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Optional notes on decision..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{
            padding: '3px 6px',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            width: '180px',
          }}
        />

        {isSaved && (
          <span style={{ fontSize: '11px', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '2px' }}>
            <Check size={12} /> Recorded
          </span>
        )}
      </div>
    </div>
  );
};
