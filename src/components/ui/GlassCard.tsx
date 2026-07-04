import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  glowOnHover?: boolean;
  variant?: 'default' | 'gold' | 'dark';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  hoverable = true,
  glowOnHover = false,
  variant = 'default',
  children,
  className = '',
  ...props
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'gold':
        return 'glass-gold';
      case 'dark':
        return 'bg-black/60 border border-white/5';
      default:
        return 'glass-card';
    }
  };

  const hasPadding = className.split(' ').some(c => c.startsWith('p-') || c.startsWith('px-') || c.startsWith('py-'));

  return (
    <div
      className={`${getVariantClass()} rounded-2xl ${hasPadding ? '' : 'p-6'} ${
        hoverable ? 'glass-card-hover transform hover:-translate-y-0.5 transition-all duration-300' : ''
      } ${
        glowOnHover ? 'hover:shadow-[0_0_30px_rgba(212,175,55,0.1)]' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
