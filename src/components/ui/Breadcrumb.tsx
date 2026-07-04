import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbSegment {
  label: string;
  path: string;
}

interface BreadcrumbProps {
  /** Optional custom override for the root label (e.g. 'Admin Portal' | 'Student Portal') */
  rootLabel?: string;
  rootPath?: string;
  /** Optional custom segments – if not provided, they are auto-generated from pathname */
  segments?: BreadcrumbSegment[];
}

const AUTO_LABELS: Record<string, string> = {
  admin: 'Admin Portal',
  student: 'Student Portal',
  dashboard: 'Dashboard',
  students: 'Students',
  courses: 'Courses',
  materials: 'Materials',
  attendance: 'Attendance',
  marks: 'Marks',
  certificates: 'Certificates',
  fees: 'Fees',
  settings: 'Settings',
  progress: 'Progress',
  results: 'Results',
  profile: 'Profile',
};

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  rootLabel = 'Home',
  rootPath = '/',
  segments,
}) => {
  const location = useLocation();

  const crumbs: BreadcrumbSegment[] = segments ?? (() => {
    const parts = location.pathname.split('/').filter(Boolean);
    return parts
      .map((part, index) => ({
        label: AUTO_LABELS[part] ?? part.charAt(0).toUpperCase() + part.slice(1),
        path: '/' + parts.slice(0, index + 1).join('/'),
      }))
      .filter(crumb => {
        const normCrumbPath = crumb.path.replace(/\/$/, '');
        const normRootPath = rootPath.replace(/\/$/, '');
        return normCrumbPath !== normRootPath;
      });
  })();

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs select-none">
      {/* Home / Root crumb */}
      <motion.div
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          to={rootPath}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors font-display"
        >
          <Home className="h-3 w-3" />
          <span className="hidden sm:inline">{rootLabel}</span>
        </Link>
      </motion.div>

      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <React.Fragment key={crumb.path}>
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: (index + 1) * 0.06 }}
              className="flex items-center gap-1.5"
            >
              <ChevronRight className="h-3 w-3 text-slate-600 shrink-0" />
              {isLast ? (
                <span className="font-display font-semibold text-gold tracking-wide">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="font-display text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </motion.div>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
