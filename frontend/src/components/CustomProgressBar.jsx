import React from 'react';

export default function CustomProgressBar({ value = 0, color = 'blue' }) {
  const safeValue = Math.max(0, Math.min(100, Number(value)));

  const colorClass = {
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    green: 'bg-green-500',
    gray: 'bg-gray-400',
    yellow: 'bg-yellow-500',
  }[color] || 'bg-blue-500';

  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div
        className={`h-full ${colorClass} transition-all duration-300 rounded-full`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}