/**
 * ReferralBanner — Shows user their referral link and copy button.
 * Place in Profile page or as a dismissable banner post-first-win.
 */
import { useState } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { useReferral } from '../hooks/useReferral';

const BASE_URL = import.meta.env.VITE_FRONTEND_URL ?? window.location.origin;

export function ReferralBanner() {
  const { address } = useGetAccountInfo();
  const { getReferralLink } = useReferral();
  const [copied, setCopied] = useState(false);

  if (!address) return null;

  const link = getReferralLink(BASE_URL);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a2a4a, #1a3a5a)',
      border: '1px solid #00d4ff44',
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: 15 }}>
        ⚓ Invite friends — earn 5% of their first wager
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          readOnly
          value={link}
          style={{
            flex: 1,
            background: '#0a0e1a',
            border: '1px solid #00d4ff44',
            borderRadius: 8,
            color: '#aaa',
            padding: '8px 12px',
            fontSize: 13,
            fontFamily: 'monospace',
            minWidth: 0,
          }}
        />
        <button
          onClick={copy}
          style={{
            background: copied ? '#00b347' : '#00d4ff',
            color: '#000',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {copied ? '✓ Copied!' : 'Copy Link'}
        </button>
      </div>
      <div style={{ color: '#666', fontSize: 12 }}>
        When they create their first game, you automatically receive 5% of the wager.
      </div>
    </div>
  );
}
