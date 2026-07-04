import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Layouts
import AdminLayout from '../layouts/AdminLayout';
import StudentLayout from '../layouts/StudentLayout';

// Auth pages
import LoginPage from '../pages/auth/LoginPage';

// Admin pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminStudents from '../pages/admin/AdminStudents';
import AdminCourses from '../pages/admin/AdminCourses';
import AdminMaterials from '../pages/admin/AdminMaterials';
import AdminAttendance from '../pages/admin/AdminAttendance';
import AdminMarks from '../pages/admin/AdminMarks';
import AdminCertificates from '../pages/admin/AdminCertificates';
import AdminFees from '../pages/admin/AdminFees';
import AdminSettings from '../pages/admin/AdminSettings';

// Student pages
import StudentDashboard from '../pages/student/StudentDashboard';
import StudentCourses from '../pages/student/StudentCourses';
import StudentProgress from '../pages/student/StudentProgress';
import StudentMaterials from '../pages/student/StudentMaterials';
import StudentAttendance from '../pages/student/StudentAttendance';
import StudentResults from '../pages/student/StudentResults';
import StudentCertificates from '../pages/student/StudentCertificates';
import StudentFees from '../pages/student/StudentFees';
import StudentProfile from '../pages/student/StudentProfile';

// Route guards
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole?: 'admin' | 'student' }> = ({
  children,
  allowedRole
}) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-t-2 border-b-2 border-gold rounded-full animate-spin" />
          <span className="text-sm font-display font-medium text-slate-400">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/student'} replace />;
  }

  return <>{children}</>;
};

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
  }
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Authentication (Guarded) */}
      <Route
        path="/login"
        element={
          <AuthGuard>
            <LoginPage />
          </AuthGuard>
        }
      />

      {/* Admin Dashboard Pages (Admin-Only Guarded) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<Navigate to="/admin" replace />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="courses" element={<AdminCourses />} />
        <Route path="materials" element={<AdminMaterials />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="marks" element={<AdminMarks />} />
        <Route path="certificates" element={<AdminCertificates />} />
        <Route path="fees" element={<AdminFees />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Student Dashboard Pages (Student-Only Guarded) */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="dashboard" element={<Navigate to="/student" replace />} />
        <Route path="courses" element={<Navigate to="/student" replace />} />
        <Route path="progress" element={<StudentProgress />} />
        <Route path="materials" element={<StudentMaterials />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="results" element={<StudentResults />} />
        <Route path="certificates" element={<StudentCertificates />} />
        <Route path="fees" element={<Navigate to="/student" replace />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>

      {/* Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
