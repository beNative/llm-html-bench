import React from 'react';

interface RatingInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  description?: string;
}

export const RatingInput: React.FC<RatingInputProps> = ({
  label,
  value,
  onChange,
  description,
}) => {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
          {value !== null ? `${value} / 10` : '—'}
        </span>
      </div>

      {description && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          {description}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
          const isSelected = value === num;
          const isFilled = value !== null && num <= value;
          return (
            <button
              key={num}
              type="button"
              onClick={() => onChange(value === num ? null : num)}
              style={{
                flex: 1,
                height: '22px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isSelected
                  ? 'var(--accent-primary)'
                  : isFilled
                  ? 'var(--accent-primary-light)'
                  : 'var(--bg-tertiary)',
                color: isSelected ? '#ffffff' : isFilled ? 'var(--accent-primary)' : 'var(--text-muted)',
                border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                fontWeight: isSelected ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.1s ease',
              }}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
};
