import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  subscribeToAllCourses,
  subscribeToStudentAttendance,
  subscribeToStudentCertificates,
  courseProgressService,
} from '../../services';
import { Student, Course, StudentProgress as StudentProgressType } from '../../types';
import PageWrapper from '../../components/ui/PageWrapper';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import StudentAvatar from '../../components/ui/StudentAvatar';
import { motion } from 'framer-motion';
import {
  User,
  Phone,
  Mail,
  FileText,
  Lock,
  BookOpen,
  Award,
  CalendarCheck,
  Activity,
  CheckCircle,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

// Count-up animation component using requestAnimationFrame
const AnimatedCounter: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1000; // 1 second animation duration
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Easing out quadratic curve
      const easeProgress = progress * (2 - progress);
      setDisplayValue(Math.floor(easeProgress * value));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value]);

  return <span>{displayValue}{suffix}</span>;
};

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  suffix?: string;
  colorClass?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, suffix = '', colorClass = 'text-gold' }) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      className="h-full"
    >
      <GlassCard
        hoverable={true}
        glowOnHover={true}
        className="h-full flex flex-col justify-between p-5 border border-white/5 bg-slate-950/40 relative overflow-hidden group"
      >
        <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-gold/2 rounded-full blur-2xl group-hover:bg-gold/5 transition-all duration-500" />
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase font-display">{title}</span>
          <div className={`p-2 rounded-xl bg-white/3 border border-white/5 text-slate-300 ${colorClass} group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
        </div>
        <div>
          <span className="text-3xl font-extrabold font-display text-white tracking-tight">
            <AnimatedCounter value={value} suffix={suffix} />
          </span>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export const StudentProfile: React.FC = () => {
  const { user, updateProfile, updatePassword } = useAuth();
  const [studentDetails, setStudentDetails] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [formName, setFormName] = useState(user?.name || '');
  const [formPhone, setFormPhone] = useState(user?.phone || '');
  const [successMsg, setSuccessMsg] = useState(false);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  // Metrics states
  const [enrolledCoursesCount, setEnrolledCoursesCount] = useState(0);
  const [attendancePercent, setAttendancePercent] = useState(0);
  const [certificatesEarned, setCertificatesEarned] = useState(0);
  const [courseCompletionPercent, setCourseCompletionPercent] = useState(0);

  // Internal state for computation
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [progressList, setProgressList] = useState<StudentProgressType[]>([]);

  // Recompute course completion whenever courses or progress change
  useEffect(() => {
    const enrolled = allCourses.filter(c => enrolledCourseIds.includes(c.id));
    let completedModCount = 0;
    let totalModCount = 0;
    enrolled.forEach(course => {
      const activeModules = course.modules?.filter(m => m.isActive) || [];
      const progressRecord = progressList.find(p => p.courseId === course.id);
      const completedIds = progressRecord?.completedModuleIds || [];
      completedModCount += activeModules.filter(m => completedIds.includes(m.id)).length;
      totalModCount += activeModules.length;
    });
    setCourseCompletionPercent(totalModCount > 0 ? Math.round((completedModCount / totalModCount) * 100) : 0);
  }, [allCourses, enrolledCourseIds, progressList]);

  useEffect(() => {
    if (!user?.studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let readyFlags = { courses: false, attendance: false, certs: false, progress: false };
    const checkAllReady = () => {
      if (Object.values(readyFlags).every(Boolean)) setLoading(false);
    };

    // 1. Student profile doc in realtime
    const studentDocRef = doc(db, 'students', user.studentId);
    const unsubStudent = onSnapshot(studentDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Student;
        setStudentDetails(data);
        setFormName(data.name || user?.name || '');
        setFormPhone(data.phone || user?.phone || '');
        const ids = data.courseIds || data.enrolledCourses || [];
        setEnrolledCourseIds(ids);
        setEnrolledCoursesCount(ids.length);
      }
    });

    // 2. All courses realtime
    const unsubCourses = subscribeToAllCourses((courses) => {
      setAllCourses(courses);
      readyFlags.courses = true;
      checkAllReady();
    });

    // 3. Attendance realtime
    const unsubAttendance = subscribeToStudentAttendance(user.studentId, (records) => {
      const totalClasses = records.length;
      const attended = records.filter(r => r.status === 'Present' || r.status === 'Late').length;
      setAttendancePercent(totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 0);
      readyFlags.attendance = true;
      checkAllReady();
    });

    // 4. Certificates realtime
    const unsubCerts = subscribeToStudentCertificates(user.studentId, (certs) => {
      const earned = certs.filter(c => c.status === 'Approved' || c.status === 'Issued').length;
      setCertificatesEarned(earned);
      readyFlags.certs = true;
      checkAllReady();
    });

    // 5. Course progress realtime
    const unsubProgress = courseProgressService.subscribeToAllStudentProgress(user.studentId, (list) => {
      setProgressList(list);
      readyFlags.progress = true;
      checkAllReady();
    });

    return () => {
      unsubStudent();
      unsubCourses();
      unsubAttendance();
      unsubCerts();
      unsubProgress();
    };
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(false);

    try {
      await updateProfile({
        name: formName,
        phone: formPhone
      });
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err) {
      console.error('Failed to update student profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(false);

    if (!currentPassword) {
      setPwdError('Current password is required.');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    setPwdLoading(true);
    try {
      await updatePassword(currentPassword, newPassword);
      setPwdSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setPwdSuccess(false), 4000);
    } catch (err: any) {
      setPwdError(err?.message || 'Failed to change password. Please try again.');
    } finally {
      setPwdLoading(false);
    }
  };

  const pageContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemFadeUpVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' as const }
    }
  };

  return (
    <PageWrapper className="flex-1 flex flex-col gap-6 max-w-5xl mx-auto px-4 py-2">
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/25 text-emerald-300 text-xs shadow-[0_0_15px_rgba(16,185,129,0.05)]"
        >
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>Profile updated successfully! Full Name and Phone changes have been saved.</span>
        </motion.div>
      )}

      {loading ? (
        <div className="flex flex-col gap-6 w-full">
          <Skeleton variant="rectangular" className="h-36 w-full rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton variant="card" className="h-64 col-span-2 rounded-2xl animate-pulse" />
            <Skeleton variant="card" className="h-64 rounded-2xl animate-pulse" />
          </div>
        </div>
      ) : (
        <motion.div
          variants={pageContainerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6 w-full"
        >
          {/* PROFILE HEADER CARD */}
          <motion.div variants={itemFadeUpVariants} className="w-full">
            <GlassCard
              hoverable={false}
              className="bg-slate-950/45 border border-white/5 relative overflow-hidden p-6 md:p-8"
            >
              {/* Decorative soft glow backdrops */}
              <div className="absolute top-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-900/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 relative z-10">
                {/* Large Initial Avatar */}
                <div className="relative group flex-shrink-0">
                  {/* Subtle circular gold glow aura */}
                  <div className="absolute -inset-2 bg-gradient-to-tr from-gold/20 to-amber-500/10 rounded-full blur-xl opacity-35 group-hover:opacity-60 transition-all duration-700 pointer-events-none" />
                  
                  {/* Circular border container */}
                  <div className="relative rounded-full p-1 bg-gradient-to-b from-gold/25 via-white/5 to-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-all duration-300">
                    <StudentAvatar
                      name={formName || studentDetails?.name}
                      size="2xl"
                      variant="circle"
                      status="Active"
                      noHover={true}
                    />
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                  {/* Active Status Badge */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3.5 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_2px_8px_rgba(16,185,129,0.05)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active Student
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold/10 text-gold border border-gold/25 shadow-[0_2px_8px_rgba(212,175,55,0.05)] font-mono">
                      Reg No: {studentDetails?.registerNumber || studentDetails?.rollNo || 'STA-2026-001'}
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white text-glow mb-1.5">
                    Welcome, {formName || studentDetails?.name || 'Student'}
                  </h2>
                  
                  <p className="text-slate-400 text-xs md:text-sm font-medium max-w-lg mb-4">
                    Track your academic journey and manage your personal information.
                  </p>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-white/3 border border-white/5 px-3.5 py-1.5 rounded-xl">
                    <BookOpen className="h-4 w-4 text-gold" />
                    <span>{enrolledCoursesCount} {enrolledCoursesCount === 1 ? 'Course' : 'Courses'} Enrolled</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* TWO COLUMN GRID LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
            {/* COLUMN 1: PERSONAL INFORMATION */}
            <motion.div variants={itemFadeUpVariants} className="lg:col-span-7 w-full">
              <GlassCard hoverable={false} className="bg-slate-950/40 p-6 md:p-8 border border-white/5 h-full">
                <div className="flex items-center gap-2.5 mb-6 border-b border-white/5 pb-4">
                  <div className="p-2 rounded-lg bg-gold/10 border border-gold/20 text-gold">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                      Personal Details
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Maintain and update your profile parameters.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUpdate} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Editable: Full Name */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Full Name</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={formName}
                          onChange={e => setFormName(e.target.value)}
                          className="glass-input px-4 py-2.5 rounded-xl text-slate-100 text-xs w-full font-medium"
                          placeholder="e.g. Sri Karan"
                        />
                      </div>
                    </div>

                    {/* Editable: Phone Number */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Phone Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={formPhone}
                          onChange={e => setFormPhone(e.target.value)}
                          className="glass-input px-4 py-2.5 rounded-xl text-slate-100 text-xs w-full font-medium"
                          placeholder="e.g. +91 9876543210"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Read-only: Email */}
                    <div className="flex flex-col gap-1.5 opacity-80">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                        Email Address <Lock className="h-3 w-3 text-slate-500" />
                      </label>
                      <div className="relative">
                        <Mail className="absolute right-4 top-2.5 h-4 w-4 text-slate-500" />
                        <input
                          type="email"
                          readOnly
                          disabled
                          value={studentDetails?.email || user?.email || ''}
                          className="bg-white/2 border border-white/5 text-slate-400 px-4 py-2.5 rounded-xl text-xs w-full cursor-not-allowed font-medium focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Read-only: Register Number */}
                    <div className="flex flex-col gap-1.5 opacity-80">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                        Register Number <Lock className="h-3 w-3 text-slate-500" />
                      </label>
                      <div className="relative">
                        <FileText className="absolute right-4 top-2.5 h-4 w-4 text-slate-500" />
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={studentDetails?.registerNumber || studentDetails?.rollNo || 'STA-2026-001'}
                          className="bg-white/2 border border-white/5 text-slate-400 px-4 py-2.5 rounded-xl text-xs w-full cursor-not-allowed font-mono font-medium focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="gold"
                    size="sm"
                    isLoading={loading}
                    className="font-bold self-start px-6 mt-4 shadow-[0_4px_15px_rgba(212,175,55,0.15)] hover:shadow-[0_6px_20px_rgba(212,175,55,0.25)] transition-all duration-300"
                  >
                    Save Profile
                  </Button>
                </form>
              </GlassCard>
            </motion.div>

            {/* COLUMN 2: ACADEMIC SNAPSHOTS */}
            <motion.div variants={itemFadeUpVariants} className="lg:col-span-5 w-full flex flex-col gap-4">
              <div className="flex items-center gap-2 px-1 font-display">
                <div className="w-1.5 h-6 bg-gold rounded-full" />
                <h3 className="text-xs font-display font-extrabold uppercase tracking-widest text-slate-300">
                  Academic Snapshots
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full">
                {/* Enrolled Courses Card */}
                <StatCard
                  title="Courses Enrolled"
                  value={enrolledCoursesCount}
                  icon={<BookOpen className="h-4 w-4" />}
                  colorClass="text-gold"
                />

                {/* Attendance Rate */}
                <StatCard
                  title="Attendance"
                  value={attendancePercent}
                  suffix="%"
                  icon={<CalendarCheck className="h-4 w-4" />}
                  colorClass="text-emerald-400"
                />

                {/* Certificates Earned */}
                <StatCard
                  title="Certificates"
                  value={certificatesEarned}
                  icon={<Award className="h-4 w-4" />}
                  colorClass="text-yellow-500"
                />

                {/* Course Completion Rate */}
                <StatCard
                  title="Completion"
                  value={courseCompletionPercent}
                  suffix="%"
                  icon={<Activity className="h-4 w-4" />}
                  colorClass="text-sky-400"
                />
              </div>

              {/* ── CHANGE PASSWORD CARD ───────────────────────── */}
              <div className="flex items-center gap-2 px-1 font-display mt-2">
                <div className="w-1.5 h-6 bg-sky-500 rounded-full" />
                <h3 className="text-xs font-display font-extrabold uppercase tracking-widest text-slate-300">
                  Account Security
                </h3>
              </div>

              <GlassCard hoverable={false} className="bg-slate-950/40 p-5 border border-white/5">
                <div className="flex items-center gap-2.5 mb-4 border-b border-white/5 pb-3">
                  <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-display font-bold text-white">Change Password</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Update your login credentials securely.</p>
                  </div>
                </div>

                {/* Password change success */}
                {pwdSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/25 text-emerald-300 text-xs mb-4"
                  >
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Password changed successfully!</span>
                  </motion.div>
                )}

                {/* Password change error */}
                {pwdError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/25 text-rose-300 text-xs mb-4"
                  >
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    <span>{pwdError}</span>
                  </motion.div>
                )}

                <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
                  {/* Current Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPwd ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="glass-input px-4 pr-10 py-2.5 rounded-xl text-slate-100 text-xs w-full font-medium"
                        placeholder="Your current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showCurrentPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPwd ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="glass-input px-4 pr-10 py-2.5 rounded-xl text-slate-100 text-xs w-full font-medium"
                        placeholder="Min. 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showNewPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPwd ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={e => setConfirmNewPassword(e.target.value)}
                        className="glass-input px-4 pr-10 py-2.5 rounded-xl text-slate-100 text-xs w-full font-medium"
                        placeholder="Re-enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showConfirmPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {confirmNewPassword && newPassword && confirmNewPassword === newPassword && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Passwords match
                      </span>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="glass"
                    size="sm"
                    isLoading={pwdLoading}
                    className="self-start mt-1 border-sky-500/30 text-sky-300 hover:bg-sky-500/10 hover:border-sky-500/50 transition-all"
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                    Update Password
                  </Button>
                </form>
              </GlassCard>
            </motion.div>
          </div>

        </motion.div>
      )}
    </PageWrapper>
  );
};

export default StudentProfile;
