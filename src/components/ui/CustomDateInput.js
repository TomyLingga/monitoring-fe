import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

export default function CustomDateInput({ value, onChange, className = '', min, max, placeholder = 'DD/MM/YYYY' }) {
  const inputRef = useRef(null);

  // Parse YYYY-MM-DD to DD/MM/YYYY for display
  const getDisplayValue = () => {
    if (!value) return placeholder;
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return value;
  };

  const handleClick = () => {
    if (inputRef.current && typeof inputRef.current.showPicker === 'function') {
      try {
        inputRef.current.showPicker();
      } catch (e) {
        // Fallback or ignore
      }
    }
  };

  return (
    <div className={`relative flex items-center ${className}`} onClick={handleClick}>
      {/* Hidden native input */}
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      
      {/* Visible styled surface */}
      <div className="w-full flex justify-between items-center px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-semibold pointer-events-none">
        <span className={!value ? 'text-slate-500' : 'text-slate-200'}>{getDisplayValue()}</span>
        <Calendar className="h-3.5 w-3.5 text-slate-400" />
      </div>
    </div>
  );
}
