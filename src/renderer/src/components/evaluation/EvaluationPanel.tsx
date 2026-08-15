import React, { useState, useEffect } from 'react';
import { Evaluation } from '@shared/types/entities';
import { RatingInput } from '../common/RatingInput';
import { ScoreBadge } from '../common/ScoreBadge';
import { calculateOverallScore } from '@shared/utils/scoreCalculator';
import { Star, Check } from 'lucide-react';
import { Button } from '../common/Button';

interface EvaluationPanelProps {
  modelRunId: string;
  initialEvaluation?: Evaluation | null;
  onSaved?: (evaluation: Evaluation) => void;
  compact?: boolean;
}

export const EvaluationPanel: React.FC<EvaluationPanelProps> = ({
  modelRunId,
  initialEvaluation,
  onSaved,
  compact = false,
}) => {
  const [visualScore, setVisualScore] = useState<number | null>(initialEvaluation?.visual_score ?? null);
  const [promptAdherenceScore, setPromptAdherenceScore] = useState<number | null>(
    initialEvaluation?.prompt_adherence_score ?? null
  );
  const [functionalityScore, setFunctionalityScore] = useState<number | null>(
    initialEvaluation?.functionality_score ?? null
  );
  const [codeQualityScore, setCodeQualityScore] = useState<number | null>(
    initialEvaluation?.code_quality_score ?? null
  );
  const [creativityScore, setCreativityScore] = useState<number | null>(
    initialEvaluation?.creativity_score ?? null
  );

  const [manualOverallScore, setManualOverallScore] = useState<string>(
    initialEvaluation?.is_manual_overall ? String(initialEvaluation.overall_score) : ''
  );
  const [isManualOverall, setIsManualOverall] = useState<boolean>(
    initialEvaluation?.is_manual_overall === 1
  );

  const [favorite, setFavorite] = useState<boolean>(initialEvaluation?.favorite === 1);
  const [notes, setNotes] = useState<string>(initialEvaluation?.notes ?? '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    if (initialEvaluation) {
      setVisualScore(initialEvaluation.visual_score ?? null);
      setPromptAdherenceScore(initialEvaluation.prompt_adherence_score ?? null);
      setFunctionalityScore(initialEvaluation.functionality_score ?? null);
      setCodeQualityScore(initialEvaluation.code_quality_score ?? null);
      setCreativityScore(initialEvaluation.creativity_score ?? null);
      setFavorite(initialEvaluation.favorite === 1);
      setNotes(initialEvaluation.notes ?? '');
      setIsManualOverall(initialEvaluation.is_manual_overall === 1);
      if (initialEvaluation.is_manual_overall) {
        setManualOverallScore(String(initialEvaluation.overall_score));
      }
    }
  }, [initialEvaluation]);

  const computedOverall = calculateOverallScore({
    visualScore,
    promptAdherenceScore,
    functionalityScore,
    codeQualityScore,
    creativityScore,
  });

  const effectiveOverall = isManualOverall
    ? parseFloat(manualOverallScore) || computedOverall
    : computedOverall;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (window.electronAPI) {
        const saved = await window.electronAPI.saveEvaluation({
          modelRunId,
          visualScore,
          promptAdherenceScore,
          functionalityScore,
          codeQualityScore,
          creativityScore,
          overallScore: effectiveOverall,
          isManualOverall,
          favorite,
          notes: notes.trim() || null,
        });

        setIsSaved(true);
        if (onSaved) onSaved(saved);
        setTimeout(() => setIsSaved(false), 2500);
      }
    } catch (err) {
      console.error('Failed to save evaluation:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        padding: compact ? '10px 12px' : '16px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: compact ? '0' : 'var(--radius-md)',
        border: compact ? 'none' : '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '8px' : '12px',
        fontSize: '12px',
      }}
    >
      {/* Header with Overall Score & Favorite */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Score & Evaluation</span>
          <ScoreBadge score={effectiveOverall} size="md" isManual={isManualOverall} />
        </div>

        <button
          type="button"
          onClick={() => setFavorite(!favorite)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: favorite ? 'var(--accent-warning-light)' : 'var(--bg-tertiary)',
            color: favorite ? 'var(--accent-warning)' : 'var(--text-muted)',
            border: `1px solid ${favorite ? 'var(--accent-warning)' : 'var(--border-subtle)'}`,
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          <Star size={12} fill={favorite ? 'currentColor' : 'none'} />
          {favorite ? 'Favorite' : 'Mark Favorite'}
        </button>
      </div>

      {/* 5 Dimensional Ratings */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : '1fr 1fr',
          gap: compact ? '6px' : '10px',
        }}
      >
        <RatingInput
          label="Visual Quality & Polish"
          value={visualScore}
          onChange={setVisualScore}
        />
        <RatingInput
          label="Prompt & Constraint Adherence"
          value={promptAdherenceScore}
          onChange={setPromptAdherenceScore}
        />
        <RatingInput
          label="Functionality & Interactivity"
          value={functionalityScore}
          onChange={setFunctionalityScore}
        />
        <RatingInput
          label="Code Quality & Structure"
          value={codeQualityScore}
          onChange={setCodeQualityScore}
        />
        <RatingInput
          label="Creativity & Innovation"
          value={creativityScore}
          onChange={setCreativityScore}
        />

        {/* Manual Override Control */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            padding: '6px 8px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Manual Override Overall
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isManualOverall}
                onChange={(e) => setIsManualOverall(e.target.checked)}
              />
              Override
            </label>
          </div>

          {isManualOverall ? (
            <input
              type="number"
              step="0.1"
              min="1"
              max="10"
              placeholder="e.g. 8.5"
              value={manualOverallScore}
              onChange={(e) => setManualOverallScore(e.target.value)}
              style={{
                padding: '2px 6px',
                fontSize: '11px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--accent-primary)',
                borderRadius: 'var(--radius-sm)',
              }}
            />
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Auto mean: {computedOverall !== null ? computedOverall.toFixed(1) : '—'}
            </span>
          )}
        </div>
      </div>

      {/* Notes Input */}
      <div>
        <textarea
          placeholder="Evaluation notes, strengths, bugs, prompt omissions, console errors observed..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={compact ? 2 : 3}
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
        <Button
          size="sm"
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          icon={isSaved ? <Check size={13} /> : undefined}
        >
          {isSaving ? 'Saving...' : isSaved ? 'Saved in DB' : 'Save Scores'}
        </Button>
      </div>
    </div>
  );
};
