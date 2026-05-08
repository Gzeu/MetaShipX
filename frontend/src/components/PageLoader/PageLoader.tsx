import React from 'react';
import './PageLoader.css';

export default function PageLoader() {
  return (
    <div className="pl-overlay" role="status" aria-label="Loading page">
      <div className="pl-ship">
        <svg viewBox="0 0 80 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="pl-svg">
          {/* Hull */}
          <path d="M8 32 Q40 20 72 32 L64 44 H16 Z" fill="#1e3a5f" stroke="#2563eb" strokeWidth="1.5"/>
          {/* Mast */}
          <line x1="40" y1="32" x2="40" y2="8" stroke="#7dd3fc" strokeWidth="1.5"/>
          {/* Sail */}
          <path d="M40 10 L58 24 L40 28 Z" fill="#2563eb" opacity="0.7"/>
          {/* Flag */}
          <path d="M40 8 L50 12 L40 16 Z" fill="#fbbf24"/>
          {/* Waves */}
          <path d="M4 40 Q12 36 20 40 Q28 44 36 40 Q44 36 52 40 Q60 44 68 40 Q76 36 80 40" stroke="#1e3a5f" strokeWidth="2" fill="none"/>
        </svg>
      </div>
      <div className="pl-dots">
        <span /><span /><span />
      </div>
    </div>
  );
}
