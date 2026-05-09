import { useState, useCallback } from 'react';
import './TxButton.css';

export type TxStatus = 'idle' | 'signing' | 'pending' | 'success' | 'error';

interface TxButtonProps {
  label: string;
  onTx: () => Promise<void>;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'ghost';
  className?: string;
}

const STATUS_CONFIG: Record<TxStatus, { text: string; icon: string }> = {
  idle:    { text: '',       icon: '' },
  signing: { text: 'Semnează în xPortal…', icon: '🔐' },
  pending: { text: 'Confirmare blockchain…', icon: '' },
  success: { text: 'Confirmat!', icon: '✅' },
  error:   { text: 'Eroare – încearcă din nou', icon: '⚠️' },
};

export function TxButton({ label, onTx, disabled, variant = 'primary', className = '' }: TxButtonProps) {
  const [status, setStatus] = useState<TxStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleClick = useCallback(async () => {
    if (status !== 'idle') return;
    setStatus('signing');
    setErrorMsg('');
    try {
      await onTx();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e: unknown) {
      const msg = (() => {
        if (e instanceof Error) {
          if (e.message.toLowerCase().includes('cancel') || e.message.toLowerCase().includes('denied'))
            return 'Tranzacție anulată.';
          return e.message;
        }
        return 'Eroare necunoscută';
      })();
      setErrorMsg(msg);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  }, [status, onTx]);

  const isDisabled = disabled || (status !== 'idle' && status !== 'error');
  const cfg = STATUS_CONFIG[status];
  const displayText = status === 'idle' ? label : cfg.text;

  return (
    <div className="tx-button-wrapper">
      <button
        className={`tx-btn tx-btn--${variant} tx-btn--${status} ${className}`}
        onClick={handleClick}
        disabled={isDisabled}
        aria-busy={status === 'signing' || status === 'pending'}
      >
        {(status === 'signing' || status === 'pending') && (
          <span className="tx-btn__spinner" aria-hidden="true"/>
        )}
        {cfg.icon && status !== 'idle' && (
          <span className="tx-btn__icon" aria-hidden="true">{cfg.icon}</span>
        )}
        <span className="tx-btn__text">{displayText}</span>
      </button>
      {status === 'error' && errorMsg && (
        <p className="tx-btn__error" role="alert">{errorMsg}</p>
      )}
    </div>
  );
}
