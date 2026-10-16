import React from 'react';

/**
 * Official Microsoft 365 Excel brand icon component.
 * Renders the authentic green workbook & elevated "X" tile vector.
 */
export default function MicrosoftExcelIcon({ className = 'h-4 w-4', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Right side sheet cells grid */}
      <rect width="16" height="9" x="26" y="11" fill="#185c37" />
      <polygon fill="#107c41" points="26,20 26,11 17,11 17,20" />
      <rect width="16" height="9" x="26" y="20" fill="#21a366" />
      <polygon fill="#185c37" points="26,29 26,20 17,20 17,29" />
      <rect width="16" height="9" x="26" y="29" fill="#107c41" />
      <polygon fill="#0b4828" points="26,38 26,29 17,29 17,38" />
      <path fill="#21a366" d="M26,38H41c1.105,0,2-0.895,2-2V12c0-1.105-0.895-2-2-2H26V38z" />

      {/* Subtle depth shadow under front tile */}
      <path fill="#0b4828" d="M17,11H9c-1.105,0-2,0.895-2,2v22c0,1.105,0.895,2,2,2h8V11z" opacity="0.18" />

      {/* Left elevated dark green tile */}
      <path
        fill="#107c41"
        d="M25,8H9C7.895,8,7,8.895,7,10v28c0,1.105,0.895,2,2,2h16c1.105,0,2-0.895,2-2V10C27,8.895,26.105,8,25,8z"
      />

      {/* Crisp white 'X' symbol */}
      <path
        fill="#ffffff"
        d="M19.46,31.75l-3.32-5.46l-3.37,5.46h-3.41l5.06-7.8l-4.78-7.7h3.44l3.06,5.3l3.12-5.3h3.36l-4.81,7.67l5.17,7.83H19.46z"
      />
    </svg>
  );
}

export { MicrosoftExcelIcon };
