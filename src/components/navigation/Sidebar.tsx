import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, LogOut } from 'lucide-react';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import StudentAvatar from '../ui/StudentAvatar';

export interface MenuItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

interface SidebarProps {
  items: MenuItem[];
  portalName: string;
  portalAbbr: string;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const sidebarVariants = {
  open: { x: 0, opacity: 1, transition: { type: 'spring' as const, damping: 28, stiffness: 280 } },
  closed: { x: '-100%', opacity: 0, transition: { type: 'spring' as const, damping: 28, stiffness: 280 } },
};

const backdropVariants = {
  open: { opacity: 1, pointerEvents: 'auto' as const },
  closed: { opacity: 0, pointerEvents: 'none' as const },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] as any },
  }),
};

const Sidebar: React.FC<SidebarProps> = ({
  items,
  portalName,
  portalAbbr,
  isOpen,
  onClose,
  onLogout,
}) => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/admin' || path === '/student') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Logo */}
      <div className="h-20 px-6 border-b border-white/5 flex items-center gap-3 shrink-0">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center font-display font-extrabold text-black text-sm shadow-[0_0_15px_rgba(212,175,55,0.3)]">
          {portalAbbr}
        </div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-sm tracking-widest text-white uppercase">SRI TECH</span>
          <span className="font-sans font-medium text-[9px] tracking-wider text-gold uppercase">{portalName}</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-5 flex flex-col gap-1 overflow-y-auto no-scrollbar">
        <span className="px-3 pb-2 text-[9px] font-display font-bold uppercase tracking-widest text-slate-600">
          Navigation
        </span>
        {items.map((item, i) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <motion.div
              key={item.name}
              custom={i}
              variants={navItemVariants}
              initial="hidden"
              animate="visible"
            >
              <Link
                to={item.path}
                onClick={onClose}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-display text-sm font-medium tracking-wide transition-all duration-200 group ${
                  active
                    ? 'bg-gradient-to-r from-gold/15 to-gold/5 text-gold border border-gold/20 shadow-[0_0_12px_rgba(212,175,55,0.08)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-gold/15' : 'bg-white/5 group-hover:bg-white/10'}`}>
                    <Icon className={`h-3.5 w-3.5 ${active ? 'text-gold' : 'text-slate-400 group-hover:text-white'}`} />
                  </div>
                  <span>{item.name}</span>
                </div>
                {active && <ChevronRight className="h-3.5 w-3.5 text-gold" />}
                {item.badge && !active && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gold/10 text-gold border border-gold/20">
                    {item.badge}
                  </span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* User Card & Sign Out */}
      <div className="p-4 border-t border-white/5 bg-slate-950/40 shrink-0">
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/3 border border-white/5">
          {user?.name ? (
            <StudentAvatar
              name={user.name}
              size="sm"
              variant="circle"
              noHover
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gold/20 to-gold-dark/10 border border-gold/20 flex items-center justify-center shrink-0">
              <StudentAvatar name="?" size="sm" variant="circle" noHover />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-display font-semibold text-white truncate leading-snug">{user?.name ?? 'User'}</span>
            <span className="text-[10px] text-slate-400 truncate leading-none">
              {user?.role === 'admin' ? user?.email : `ID: ${user?.studentId ?? '—'}`}
            </span>
          </div>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={onLogout}
          className="w-full text-xs font-semibold py-2"
          leftIcon={<LogOut className="h-3.5 w-3.5 mr-1" />}
        >
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-950/80 border-r border-white/5 backdrop-blur-xl shrink-0 z-20 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              variants={backdropVariants}
              initial="closed"
              animate="open"
              exit="closed"
              transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Drawer */}
            <motion.aside
              key="drawer"
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="absolute top-0 left-0 bottom-0 w-64 bg-slate-950 border-r border-white/5 flex flex-col z-10 shadow-2xl"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-5 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all z-20"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
