/**
 * UnlockPage — auth options without WalletConnect.
 * Supports:
 *   1. xPortal App  — QR code deeplink (ExtensionLoginButton with xPortal variant)
 *   2. Web Wallet   — redirect to wallet.multiversx.com
 *   3. DeFi Wallet  — browser extension
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ExtensionLoginButton,
  WebWalletLoginButton,
  XaliasLoginButton,
} from '@multiversx/sdk-dapp/UI';
import './unlock-page.css';

const CALLBACK_ROUTE = '/lobby';

export const UnlockPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="unlock">
      <div className="unlock__card">
        <div className="unlock__logo">⚓</div>
        <h1 className="unlock__title">Connect Wallet</h1>
        <p className="unlock__subtitle">
          Choose how you want to connect to MetaShipX
        </p>

        <div className="unlock__options">
          {/* ── DeFi Wallet Extension ── */}
          <div className="unlock__option">
            <ExtensionLoginButton
              callbackRoute={CALLBACK_ROUTE}
              loginButtonText="DeFi Wallet Extension"
              className="unlock__btn"
            />
            <span className="unlock__hint">Browser extension</span>
          </div>

          {/* ── xPortal App (QR) ── */}
          <div className="unlock__option">
            <XaliasLoginButton
              callbackRoute={CALLBACK_ROUTE}
              loginButtonText="xPortal App"
              className="unlock__btn"
            />
            <span className="unlock__hint">Scan QR with xPortal mobile app</span>
          </div>

          {/* ── Web Wallet ── */}
          <div className="unlock__option">
            <WebWalletLoginButton
              callbackRoute={CALLBACK_ROUTE}
              loginButtonText="Web Wallet"
              className="unlock__btn"
            />
            <span className="unlock__hint">wallet.multiversx.com</span>
          </div>
        </div>

        <button className="unlock__back" onClick={() => navigate('/')}>
          ← Back to home
        </button>
      </div>
    </div>
  );
};

export default UnlockPage;
