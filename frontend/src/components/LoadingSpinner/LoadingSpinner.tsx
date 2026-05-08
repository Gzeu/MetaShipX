import React from 'react';
import './LoadingSpinner.css';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  fullPage?: boolean;
}

export function LoadingSpinner({ size = 'md', label, fullPage = false }: Props) {
  const spinner = (
    <div className={`spinner spinner--${size}`} role="status" aria-label={label ?? 'Loading'}>
      <div className="spinner-ring" />
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );

  if (fullPage) {
    return <div className="spinner-overlay">{spinner}</div>;
  }
  return spinner;
}
