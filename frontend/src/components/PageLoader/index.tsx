import React from 'react';
import './PageLoader.css';

export function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Loading page">
      <div className="page-loader__ship">
        <svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="8" y="20" width="48" height="12" rx="2" fill="currentColor" opacity="0.9" />
          <rect x="20" y="10" width="24" height="12" rx="2" fill="currentColor" opacity="0.7" />
          <rect x="28" y="4" width="8" height="8" rx="1" fill="currentColor" opacity="0.5" />
          <line x1="32" y1="0" x2="32" y2="4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="page-loader__waves">
        <span /><span /><span />
      </div>
      <p className="page-loader__label">Loading...</p>
    </div>
  );
}

export default PageLoader;
