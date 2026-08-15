import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontWeight: 500,
    borderRadius: 'var(--radius-md)',
    transition: 'all 0.15s ease',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
    border: '1px solid transparent',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '4px 8px', fontSize: '11px', height: '26px' },
    md: { padding: '6px 12px', fontSize: '12px', height: '32px' },
    lg: { padding: '8px 16px', fontSize: '14px', height: '38px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--accent-primary)',
      color: '#ffffff',
      borderColor: 'var(--accent-primary)',
    },
    secondary: {
      background: 'var(--bg-tertiary)',
      color: 'var(--text-primary)',
      borderColor: 'var(--border-color)',
    },
    danger: {
      background: 'var(--accent-danger)',
      color: '#ffffff',
      borderColor: 'var(--accent-danger)',
    },
    success: {
      background: 'var(--accent-success)',
      color: '#ffffff',
      borderColor: 'var(--accent-success)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      borderColor: 'transparent',
    },
  };

  return (
    <button
      style={{
        ...baseStyles,
        ...sizeStyles[size],
        ...variantStyles[variant],
      }}
      disabled={disabled}
      className={className}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};
