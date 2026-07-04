import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  iconColor = 'text-gold',
  iconBg = 'bg-gold/8',
  compact = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-12 px-6' : 'py-24 px-8'}`}
    >
      {/* Glowing icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-gold/10 blur-2xl scale-150 opacity-60" />
        <div className={`relative h-16 w-16 rounded-2xl ${iconBg} border border-white/8 flex items-center justify-center`}>
          <Icon className={`h-7 w-7 ${iconColor}`} />
        </div>
      </div>

      <h3 className="text-base font-display font-bold text-white tracking-wide mb-2">
        {title}
      </h3>
      <p className="text-xs text-slate-500 font-sans leading-relaxed max-w-xs">
        {description}
      </p>

      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </motion.div>
  );
};

export default EmptyState;
