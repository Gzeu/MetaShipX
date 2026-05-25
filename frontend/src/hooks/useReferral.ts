/**
 * useReferral — Referral system hook
 * Reads ?ref=<address> from URL on first visit and persists to localStorage.
 * Pass referralAddress to createGame() / mintShip() service calls.
 */
import { useState, useEffect } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';

const STORAGE_KEY = 'metashipx_referral';
const COOKIE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function useReferral() {
  const { address } = useGetAccountInfo();
  const [referralAddress, setReferralAddress] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check URL param
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');
    if (refParam && refParam.startsWith('erd1') && refParam !== address) {
      const stored = { address: refParam, ts: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      setReferralAddress(refParam);
      // Clean URL without reload
      params.delete('ref');
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
      return;
    }

    // 2. Check stored referral
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { address: storedAddr, ts } = JSON.parse(stored);
        if (Date.now() - ts < COOKIE_TTL_MS && storedAddr !== address) {
          setReferralAddress(storedAddr);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [address]);

  const getReferralLink = (baseUrl: string) => {
    if (!address) return '';
    return `${baseUrl}?ref=${address}`;
  };

  const clearReferral = () => {
    localStorage.removeItem(STORAGE_KEY);
    setReferralAddress(null);
  };

  return { referralAddress, getReferralLink, clearReferral };
}
