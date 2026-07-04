import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import Breadcrumb from './Breadcrumb';

interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'gold' | 'glass' | 'outline';
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  badge?: string;
  badgeColor?: string;
  actions?: React.ReactNode;
  breadcrumbRoot?: string;
  breadcrumbRootPath?: string;
  showBreadcrumb?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-gold',
  badge,
  badgeColor = 'bg-gold/10 text-gold border-gold/20',
  actions,
  breadcrumbRoot,
  breadcrumbRootPath,
  showBreadcrumb = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-3 mb-6 lg:mb-8"
    >
      {/* Breadcrumb */}
      {showBreadcrumb && (
        <Breadcrumb
          rootLabel={breadcrumbRoot}
          rootPath={breadcrumbRootPath}
        />
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 shrink-0">
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl lg:text-2xl font-display font-extrabold text-white tracking-tight leading-none">
                {title}
              </h2>
              {badge && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider border ${badgeColor}`}
                >
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-1.5 font-sans leading-relaxed max-w-xl">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Actions slot */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Decorative separator */}
      <motion.div
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="h-px bg-gradient-to-r from-gold/30 via-white/5 to-transparent"
      />
    </motion.div>
  );
};

export default PageHeader;
