import React from 'react';

/**
 * Official Facebook brand vector icon component.
 * Renders the circular Facebook Blue (#1877F2) container with crisp white 'f' glyph.
 */
export default function FacebookIcon({ className = 'h-4 w-4', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Background circle */}
      <circle cx="12" cy="12" r="11" fill="#1877F2" />

      {/* Crisp white 'f' letter glyph */}
      <path
        fill="#ffffff"
        d="M15.12 12.35l.48-3.13h-3.01V7.19c0-.86.42-1.7 1.77-1.7h1.37V2.83s-1.24-.21-2.43-.21c-2.48 0-4.1 1.5-4.1 4.22v2.38H6.43v3.13h2.77V20.5a11.1 11.1 0 003.4 0v-8.15h2.52z"
      />
    </svg>
  );
}

export { FacebookIcon };
