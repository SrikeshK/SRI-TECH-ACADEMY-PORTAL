// ============================================================
// SRI TECH ACADEMY PORTAL – StudentAvatar Component
// Global reusable text-based avatar for all student representations.
// Replaces all student photo/image dependencies across the portal.
// Features:
//   – Deterministic color from name (same name → same color always)
//   – Initials extraction (single & multi-word names)
//   – Glassmorphism design
//   – Hover glow + scale animation
//   – Optional pulse for active students
//   – Multiple sizes & variants
// ============================================================

import React from 'react';

// ────────────────────────────────────────────────────────────
// COLOR PALETTE  (deterministic: same name → same color always)
// ────────────────────────────────────────────────────────────
const AVATAR_PALETTES = [
  // Gold
  {
    bg: 'linear-gradient(135deg, rgba(212,175,55,0.25) 0%, rgba(184,134,11,0.15) 100%)',
    border: 'rgba(212,175,55,0.35)',
    text: '#D4AF37',
    glow: 'rgba(212,175,55,0.4)',
  },
  // Purple
  {
    bg: 'linear-gradient(135deg, rgba(168,85,247,0.25) 0%, rgba(124,58,237,0.15) 100%)',
    border: 'rgba(168,85,247,0.35)',
    text: '#C084FC',
    glow: 'rgba(168,85,247,0.4)',
  },
  // Blue
  {
    bg: 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(37,99,235,0.15) 100%)',
    border: 'rgba(59,130,246,0.35)',
    text: '#60A5FA',
    glow: 'rgba(59,130,246,0.4)',
  },
  // Emerald
  {
    bg: 'linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(5,150,105,0.15) 100%)',
    border: 'rgba(16,185,129,0.35)',
    text: '#34D399',
    glow: 'rgba(16,185,129,0.4)',
  },
  // Orange
  {
    bg: 'linear-gradient(135deg, rgba(249,115,22,0.25) 0%, rgba(234,88,12,0.15) 100%)',
    border: 'rgba(249,115,22,0.35)',
    text: '#FB923C',
    glow: 'rgba(249,115,22,0.4)',
  },
  // Cyan
  {
    bg: 'linear-gradient(135deg, rgba(6,182,212,0.25) 0%, rgba(8,145,178,0.15) 100%)',
    border: 'rgba(6,182,212,0.35)',
    text: '#22D3EE',
    glow: 'rgba(6,182,212,0.4)',
  },
  // Rose
  {
    bg: 'linear-gradient(135deg, rgba(244,63,94,0.25) 0%, rgba(225,29,72,0.15) 100%)',
    border: 'rgba(244,63,94,0.35)',
    text: '#FB7185',
    glow: 'rgba(244,63,94,0.4)',
  },
  // Sky
  {
    bg: 'linear-gradient(135deg, rgba(14,165,233,0.25) 0%, rgba(2,132,199,0.15) 100%)',
    border: 'rgba(14,165,233,0.35)',
    text: '#38BDF8',
    glow: 'rgba(14,165,233,0.4)',
  },
];

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────

/** Deterministic hash: same string → same number (stable across renders) */
function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/** Extract initials: "Sri Karan" → "SK", "Prabu" → "P", "" → "?" */
export function getInitials(name?: string): string {
  if (!name || !name.trim()) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/** Get deterministic palette index for a name */
export function getPalette(name?: string) {
  if (!name || !name.trim()) return AVATAR_PALETTES[0];
  const idx = hashName(name.trim()) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
}

// ────────────────────────────────────────────────────────────
// SIZE MAP
// ────────────────────────────────────────────────────────────
const SIZE_MAP = {
  xs:   { px: 28,  fs: '9px',  br: '8px',  bw: 1   },
  sm:   { px: 36,  fs: '12px', br: '10px', bw: 1.5 },
  md:   { px: 44,  fs: '14px', br: '12px', bw: 1.5 },
  lg:   { px: 56,  fs: '18px', br: '14px', bw: 2   },
  xl:   { px: 72,  fs: '24px', br: '18px', bw: 2   },
  '2xl':{ px: 96,  fs: '32px', br: '22px', bw: 2   },
} as const;

// ────────────────────────────────────────────────────────────
// PROP TYPES
// ────────────────────────────────────────────────────────────
export interface StudentAvatarProps {
  /** Student's full name — used to derive initials and color */
  name?: string;
  /** Avatar size preset */
  size?: keyof typeof SIZE_MAP;
  /** 'Active' triggers a subtle pulse ring */
  status?: string;
  /** 'circle' = fully round, 'rounded' = rounded rectangle (default) */
  variant?: 'circle' | 'rounded';
  /** Additional CSS class names on the outer wrapper */
  className?: string;
  /** Tooltip / accessible label override */
  title?: string;
  /** Disable hover glow animation */
  noHover?: boolean;
}

// ────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────
const StudentAvatar: React.FC<StudentAvatarProps> = ({
  name,
  size = 'md',
  status,
  variant = 'rounded',
  className = '',
  title,
  noHover = false,
}) => {
  const initials = getInitials(name);
  const palette  = getPalette(name);
  const conf     = SIZE_MAP[size];
  const isActive = status === 'Active';
  const circleR  = '50%';
  const squareR  = conf.br;
  const br       = variant === 'circle' ? circleR : squareR;

  // Unique class suffix to scope the hover/animation styles
  const uid = `sa-${(name || '?').replace(/\s+/g, '').slice(0, 6)}`;

  return (
    <div
      className={`sa-root ${className}`}
      style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
      title={title ?? name ?? 'Student'}
    >
      {/* Active pulse ring */}
      {isActive && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: -3,
            borderRadius: variant === 'circle' ? circleR : `calc(${squareR} + 3px)`,
            border: `1.5px solid ${palette.border}`,
            animation: 'saAvatarPulse 2.4s ease-in-out infinite',
            opacity: 0.6,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Avatar body */}
      <div
        className={`sa-body ${noHover ? '' : `sa-hover ${uid}`}`}
        style={{
          width:          conf.px,
          height:         conf.px,
          borderRadius:   br,
          background:     palette.bg,
          border:         `${conf.bw}px solid ${palette.border}`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: `0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`,
          transition:     'transform 0.2s ease, box-shadow 0.2s ease',
          cursor:         'default',
          userSelect:     'none',
          position:       'relative',
          overflow:       'hidden',
        }}
      >
        {/* Sheen overlay */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '50%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Initials */}
        <span
          style={{
            fontSize:    conf.fs,
            fontWeight:  800,
            letterSpacing: '0.04em',
            color:       palette.text,
            fontFamily:  '"Inter","Outfit",system-ui,sans-serif',
            lineHeight:  1,
            position:    'relative',
            zIndex:      1,
          }}
        >
          {initials}
        </span>
      </div>

      {/* Scoped hover + pulse keyframes */}
      <style>{`
        .sa-hover.${uid}:hover {
          transform: scale(1.08) !important;
          box-shadow: 0 4px 20px ${palette.glow}, 0 2px 8px rgba(0,0,0,0.5),
                      inset 0 1px 0 rgba(255,255,255,0.08) !important;
        }
        @keyframes saAvatarPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 0.9; transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
};

export default StudentAvatar;
