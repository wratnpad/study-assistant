interface GeminiStarIconProps {
  size?: number;
  className?: string;
}

export default function GeminiStarIcon({ size = 22, className = '' }: GeminiStarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
        fill="url(#gemini-monochrome-gradient)"
      />
      <defs>
        <linearGradient id="gemini-monochrome-gradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#8E918F" />
        </linearGradient>
      </defs>
    </svg>
  );
}
