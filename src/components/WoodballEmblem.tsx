export function WoodballEmblem({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer heritage walnut shield & brass ring */}
      <circle cx="48" cy="48" r="44" fill="#1e1711" stroke="#d4a34a" strokeWidth="2.5" />
      <circle cx="48" cy="48" r="38" fill="#1b432a" stroke="#b98636" strokeWidth="1" strokeDasharray="3 3" />

      {/* Crossed Woodball mallets behind gate */}
      <g stroke="#291608" strokeWidth="1.4" strokeLinecap="round">
        {/* Left-to-right mallet shaft */}
        <line x1="25" y1="70" x2="67" y2="24" stroke="#d4a66a" strokeWidth="4" />
        <line x1="25" y1="70" x2="67" y2="24" stroke="#472810" strokeWidth="1.2" />
        {/* Right-to-left mallet shaft */}
        <line x1="71" y1="70" x2="29" y2="24" stroke="#d4a66a" strokeWidth="4" />
        <line x1="71" y1="70" x2="29" y2="24" stroke="#472810" strokeWidth="1.2" />
      </g>

      {/* Iconic Woodball Gate: Two turned bottle-shaped posts + crossbar + red cup */}
      {/* Crossbar */}
      <rect x="24" y="31" width="48" height="6" rx="3" fill="#c98b44" stroke="#3c200b" strokeWidth="1.5" />
      {/* Left bottle post */}
      <path
        d="M27 34 L33 34 L35 45 L35 66 C35 68 33 69 30 69 C27 69 25 68 25 66 L25 45 Z"
        fill="#dba35d"
        stroke="#3c200b"
        strokeWidth="1.6"
      />
      {/* Right bottle post */}
      <path
        d="M63 34 L69 34 L71 45 L71 66 C71 68 69 69 66 69 C63 69 61 68 61 66 L61 45 Z"
        fill="#dba35d"
        stroke="#3c200b"
        strokeWidth="1.6"
      />
      {/* Suspended red-lacquered wooden cup */}
      <line x1="48" y1="36" x2="48" y2="43" stroke="#f0c869" strokeWidth="2.2" />
      <path
        d="M41 43 C41 41 55 41 55 43 L53 54 C52 57 44 57 43 54 Z"
        fill="#cc3b2a"
        stroke="#4f120b"
        strokeWidth="1.6"
      />
      <line x1="43" y1="47" x2="53" y2="47" stroke="#f5d172" strokeWidth="1.5" />

      {/* Wooden Ball rolling cleanly under the cup */}
      <circle cx="48" cy="66" r="8.5" fill="#e5b370" stroke="#3f210b" strokeWidth="1.6" />
      <path d="M42 63 Q48 67 54 63" stroke="#8a4d1e" strokeWidth="1.4" fill="none" />
      <circle cx="45" cy="63" r="2" fill="#fff4d6" opacity="0.7" />
    </svg>
  );
}

export function IconOverview({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 7.5L9 5L15 7.5L21 5V16.5L15 19L9 16.5L3 19V7.5Z"
        fill="#d4a34a"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 5V16.5M15 7.5V19" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function IconScorecard({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="4"
        y="3.5"
        width="16"
        height="17"
        rx="2.5"
        fill="#d4a34a"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 8.5H16M8 12.5H16M8 16.5H12.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconRestart({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.5 11.5A7.5 7.5 0 1 1 6.7 16.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4.5 6.5V11.8H9.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSound({ muted, className = 'w-5 h-5' }: { muted: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.5 9.5H8.5L13.5 5.5V18.5L8.5 14.5H4.5V9.5Z"
        fill="#d4a34a"
        fillOpacity="0.22"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {muted ? (
        <path d="M16.5 9.5L21 14M21 9.5L16.5 14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      ) : (
        <path
          d="M16.5 9A4.2 4.2 0 0 1 16.5 15M19 6.8A7.2 7.2 0 0 1 19 17.2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function IconPause({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
    </svg>
  );
}

export function IconGate({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 6.5H20" stroke="#e4b45e" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M6.5 6.5V19M17.5 6.5V19" stroke="#d69c54" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M9.5 10H14.5L13.7 15.2C13.5 16.1 10.5 16.1 10.3 15.2L9.5 10Z" fill="#d94632" stroke="#57150d" strokeWidth="1.1" />
    </svg>
  );
}
