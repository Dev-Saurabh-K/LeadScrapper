import React from 'react';

/**
 * Official Instagram gradient vector brand icon.
 * Renders the authentic rounded-square camera glyph with vibrant Instagram radial/linear gradients.
 */
export default function InstagramIcon({ className = 'h-4 w-4', ...props }) {
  const gradientId = React.useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <radialGradient id={`${gradientId}-ig-grad`} cx="20%" cy="105%" r="130%">
          <stop offset="0%" stopColor="#ffda77" />
          <stop offset="10%" stopColor="#fca84e" />
          <stop offset="35%" stopColor="#ee2a7b" />
          <stop offset="60%" stopColor="#d92d7b" />
          <stop offset="90%" stopColor="#9b36b7" />
          <stop offset="100%" stopColor="#4c63d2" />
        </radialGradient>
      </defs>

      {/* Background Rounded Squircle with Instagram Gradient */}
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5.5"
        fill={`url(#${gradientId}-ig-grad)`}
      />

      {/* Outer Camera Body Border */}
      <rect
        x="6"
        y="6"
        width="12"
        height="12"
        rx="3.2"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.6"
      />

      {/* Camera Lens Center Circle */}
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.6"
      />

      {/* Flash Dot */}
      <circle
        cx="15.5"
        cy="8.5"
        r="0.8"
        fill="#ffffff"
      />
    </svg>
  );
}

export { InstagramIcon };
