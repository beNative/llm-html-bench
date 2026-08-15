import React from 'react';
import { Tooltip } from './Tooltip';

interface ScoreBadgeProps {
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
  isManual?: boolean;
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, size = 'md', isManual }) => {
  if (score === null || score === undefined || isNaN(score)) {
    return (
      <Tooltip content="No Evaluation Recorded" description="Run has not been rated yet">
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: size === 'sm' ? '1px 5px' : size === 'lg' ? '4px 10px' : '2px 7px',
            fontSize: size === 'sm' ? '10px' : size === 'lg' ? '14px' : '11px',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          —
        </span>
      </Tooltip>
    );
  }

  const num = Math.round(score * 10) / 10;
  let bg = 'rgba(100, 116, 139, 0.15)';
  let color = 'var(--text-muted)';
  let borderColor = 'rgba(100, 116, 139, 0.3)';

  if (num >= 8.5) {
    bg = 'var(--accent-success-light)';
    color = 'var(--accent-success)';
    borderColor = 'rgba(16, 185, 129, 0.4)';
  } else if (num >= 7.0) {
    bg = 'var(--accent-primary-light)';
    color = 'var(--accent-primary)';
    borderColor = 'rgba(59, 130, 246, 0.4)';
  } else if (num >= 5.0) {
    bg = 'var(--accent-warning-light)';
    color = 'var(--accent-warning)';
    borderColor = 'rgba(245, 158, 11, 0.4)';
  } else {
    bg = 'var(--accent-danger-light)';
    color = 'var(--accent-danger)';
    borderColor = 'rgba(239, 68, 68, 0.4)';
  }

  return (
    <Tooltip
      content={`Benchmark Rating: ${num.toFixed(1)} / 10`}
      description={isManual ? 'Manually assigned overall evaluation score' : 'Calculated weighted average rating'}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: size === 'sm' ? '1px 5px' : size === 'lg' ? '4px 10px' : '2px 7px',
          fontSize: size === 'sm' ? '11px' : size === 'lg' ? '14px' : '12px',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: bg,
          color: color,
          border: `1px solid ${borderColor}`,
        }}
      >
        {num.toFixed(1)}
        {isManual && <span style={{ fontSize: '9px', opacity: 0.8 }}>✎</span>}
      </span>
    </Tooltip>
  );
};
