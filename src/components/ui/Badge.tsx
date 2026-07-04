import React from 'react';

type BadgeColor = 'success' | 'warning' | 'error' | 'info' | 'gold' | 'default';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
  variant?: 'solid' | 'outline' | 'glass';
}

export const Badge: React.FC<BadgeProps> = ({
  color = 'default',
  variant = 'glass',
  children,
  className = '',
  ...props
}) => {
  const getColorStyles = () => {
    if (variant === 'glass') {
      switch (color) {
        case 'success':
          return 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20';
        case 'warning':
          return 'bg-amber-950/40 text-amber-400 border border-amber-500/20';
        case 'error':
          return 'bg-rose-950/40 text-rose-400 border border-rose-500/20';
        case 'info':
          return 'bg-sky-950/40 text-sky-400 border border-sky-500/20';
        case 'gold':
          return 'bg-gold/10 text-gold border border-gold/30';
        default:
          return 'bg-slate-800/40 text-slate-400 border border-slate-700/30';
      }
    } else if (variant === 'outline') {
      switch (color) {
        case 'success':
          return 'border border-emerald-500 text-emerald-400 bg-transparent';
        case 'warning':
          return 'border border-amber-500 text-amber-400 bg-transparent';
        case 'error':
          return 'border border-rose-500 text-rose-400 bg-transparent';
        case 'info':
          return 'border border-sky-500 text-sky-400 bg-transparent';
        case 'gold':
          return 'border border-gold text-gold bg-transparent';
        default:
          return 'border border-slate-600 text-slate-400 bg-transparent';
      }
    } else { // solid
      switch (color) {
        case 'success':
          return 'bg-emerald-600 text-black font-medium';
        case 'warning':
          return 'bg-amber-500 text-black font-medium';
        case 'error':
          return 'bg-rose-600 text-white font-medium';
        case 'info':
          return 'bg-sky-600 text-black font-medium';
        case 'gold':
          return 'bg-gold text-black font-semibold';
        default:
          return 'bg-slate-700 text-slate-200';
      }
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-display font-medium leading-4 select-none ${getColorStyles()} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
