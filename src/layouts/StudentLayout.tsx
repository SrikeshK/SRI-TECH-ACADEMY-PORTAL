import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  CalendarDays,
  ClipboardList,
  Award,
  User,
} from 'lucide-react';
import Sidebar, { MenuItem } from '../components/navigation/Sidebar';
import DashboardHeader from '../components/layout/DashboardHeader';
import RouteTransition from '../components/ui/RouteTransition';

const menuItems: MenuItem[] = [
  { name: 'Dashboard', path: '/student', icon: LayoutDashboard },
  { name: 'Progress', path: '/student/progress', icon: TrendingUp },
  { name: 'Materials', path: '/student/materials', icon: FileText },
  { name: 'Attendance', path: '/student/attendance', icon: CalendarDays },
  { name: 'Results', path: '/student/results', icon: ClipboardList },
  { name: 'Certificates', path: '/student/certificates', icon: Award },
  { name: 'Profile', path: '/student/profile', icon: User },
];

export const StudentLayout: React.FC = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const exact = menuItems.find(item => item.path === location.pathname);
    if (exact) return exact.name;
    return 'Student Portal';
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-deep-blue/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gold/3 rounded-full blur-[120px] pointer-events-none" />

      <Sidebar
        items={menuItems}
        portalName="STUDENT PORTAL"
        portalAbbr="STA"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* ─── Main Content Pane ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar relative z-10">
        <DashboardHeader
          title={getPageTitle()}
          role="student"
          onOpenSidebar={() => setSidebarOpen(true)}
          breadcrumbRoot="Student Portal"
          breadcrumbRootPath="/student"
        />

        {/* Animated Page Content */}
        <main className="p-5 lg:p-8 flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            <RouteTransition routeKey={location.pathname}>
              <Outlet />
            </RouteTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
