import React from 'react';
import { Menu, Shield, GraduationCap } from 'lucide-react';
import Breadcrumb from '../ui/Breadcrumb';

interface DashboardHeaderProps {
  title: string;
  role: 'admin' | 'student';
  onOpenSidebar: () => void;
  breadcrumbRoot: string;
  breadcrumbRootPath: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  role,
  onOpenSidebar,
  breadcrumbRoot,
  breadcrumbRootPath,
}) => {
  return (
    <header className="h-16 border-b border-white/5 px-5 lg:px-8 flex items-center justify-between backdrop-blur-md bg-[#030712]/50 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-base lg:text-lg font-display font-bold text-white tracking-wide leading-none">
            {title}
          </h1>
          <div className="hidden sm:block mt-0.5">
            <Breadcrumb rootLabel={breadcrumbRoot} rootPath={breadcrumbRootPath} />
          </div>
        </div>
      </div>

      {/* Header right: status + role badge */}
      <div className="flex items-center gap-3">
        {/* Live indicator / Mode pill */}
        {role === 'admin' && (
          <div className="hidden sm:flex items-center gap-2 py-1 px-3 rounded-full bg-white/4 border border-white/5">
            <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-emerald-500" />
            <span className="text-[10px] font-display font-medium text-slate-400 uppercase tracking-wider">
              Live
            </span>
          </div>
        )}

        {/* Role badge */}
        {role === 'admin' ? (
          <div className="hidden md:flex items-center gap-1.5 py-1 px-3 rounded-full bg-gold/8 border border-gold/20">
            <Shield className="h-3 w-3 text-gold" />
            <span className="text-[10px] font-display font-bold text-gold uppercase tracking-wider">
              Admin
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 py-1 px-3 rounded-full bg-gold/8 border border-gold/20">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse mr-0.5" />
            <span className="text-[10px] font-display font-bold text-gold uppercase tracking-wider">
              STUDENT
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default DashboardHeader;
