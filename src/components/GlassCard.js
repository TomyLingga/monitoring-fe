import React from 'react';

export default function GlassCard({ children, className = '', hover = true }) {
  return (
    <div className={`glass-card rounded-2xl p-6 ${hover ? 'glass-card-hover' : ''} ${className}`}>
      {children}
    </div>
  );
}
