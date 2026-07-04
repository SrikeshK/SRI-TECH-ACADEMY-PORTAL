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
import { Course, Student, StudentProgress as StudentProgressType, Certificate } from '../../types';
import PageWrapper from '../../components/ui/PageWrapper';
import GlassCard from '../../components/ui/GlassCard';
import Skeleton from '../../components/ui/Skeleton';
import Badge from '../../components/ui/Badge';
import { Sparkles, CalendarDays, BookOpen, Award, CheckCircle2, Circle } from 'lucide-react';

// CountUp Animation Component for premium SaaS feel
const CountUp: React.FC<{ end: number; duration?: number; suffix?: string }> = ({ end, duration = 800, suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (end === 0) {
      setCount(0);
      return;
    }
    let start = 0;
    const stepTime = Math.max(Math.floor(duration / end), 16);
    const timer = setInterval(() => {
      start += 1;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [end, duration]);

  return <span>{count}{suffix}</span>;
};

// Course styling helper matching requested theme (Gold, Blue, Emerald, Slate)
const getCourseTheme = (courseName: string, index: number) => {
  const themes = [
    { color: 'text-gold bg-gold/10 border-gold/20', bar: 'bg-gold' },
    { color: 'text-sky-400 bg-sky-950/30 border-sky-500/20', bar: 'bg-sky-500' },
    { color: 'text-emerald-400 bg-emerald-950/30 border-emerald-500/20', bar: 'bg-emerald-500' },
    { color: 'text-slate-400 bg-slate-900 border-slate-700/50', bar: 'bg-slate-500' },
  ];
  
  const nameLower = courseName.toLowerCase();
  if (nameLower.includes('python')) return themes[2]; // Emerald
  if (nameLower.includes('java')) return themes[1]; // Blue
  if (nameLower.includes('c++') || nameLower.includes('tally')) return themes[0]; // Gold
  if (nameLower.includes('c') || nameLower === 'c') return themes[3]; // Slate
  return themes[index % themes.length];
};

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentCourses, setStudentCourses] = useState<Course[]>([]);
  const [attendancePercent, setAttendancePercent] = useState(100);
  const [certificatesEarned, setCertificatesEarned] = useState(0);
  const [completedModules, setCompletedModules] = useState(0);
  const [pendingModules, setPendingModules] = useState(0);
  const [overallCompletion, setOverallCompletion] = useState(0);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [progressList, setProgressList] = useState<StudentProgressType[]>([]);

  // Derive enrolled courses whenever allCourses or enrolledCourseIds change
  useEffect(() => {
    const enrolled = allCourses.filter(c => enrolledCourseIds.includes(c.id));
    setStudentCourses(enrolled);
  }, [allCourses, enrolledCourseIds]);

  // Derive module stats whenever enrolled courses or progress change
  useEffect(() => {
    let completedModCount = 0;
    let pendingModCount = 0;
    let totalModCount = 0;

    studentCourses.forEach(course => {
      const activeModules = course.modules?.filter(m => m.isActive) || [];
      const progressRecord = progressList.find(p => p.courseId === course.id);
      const completedIds = progressRecord?.completedModuleIds || [];
      const completedCount = activeModules.filter(m => completedIds.includes(m.id)).length;
      const totalCount = activeModules.length;
      completedModCount += completedCount;
      pendingModCount += (totalCount - completedCount);
      totalModCount += totalCount;
    });

    setCompletedModules(completedModCount);
    setPendingModules(pendingModCount);
    const overallPct = totalModCount > 0 ? Math.round((completedModCount / totalModCount) * 100) : 0;
    setOverallCompletion(overallPct);
  }, [studentCourses, progressList]);

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

    // 1. Student profile → enrolled course IDs + batch
    const studentDocRef = doc(db, 'students', user.studentId);
    const unsubStudent = onSnapshot(studentDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Student;
        setEnrolledCourseIds(data.courseIds || data.enrolledCourses || []);
      }
    });

    // 2. All courses (realtime)
    const unsubCourses = subscribeToAllCourses((courses) => {
      setAllCourses(courses);
      readyFlags.courses = true;
      checkAllReady();
    });

    // 3. Attendance (realtime)
    const unsubAttendance = subscribeToStudentAttendance(user.studentId, (records) => {
      const totalClasses = records.length;
      const attended = records.filter(r => r.status === 'Present' || r.status === 'Late').length;
      setAttendancePercent(totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 100);
      readyFlags.attendance = true;
      checkAllReady();
    });

    // 4. Certificates (realtime)
    const unsubCerts = subscribeToStudentCertificates(user.studentId, (certs) => {
      const earned = certs.filter(c => c.status === 'Approved' || c.status === 'Issued').length;
      setCertificatesEarned(earned);
      readyFlags.certs = true;
      checkAllReady();
    });

    // 5. Course progress (realtime)
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

  if (loading) {
    return (
      <PageWrapper className="flex flex-col gap-6">
        <Skeleton variant="rectangular" className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton variant="card" count={4} />
        </div>
        <Skeleton variant="rectangular" className="h-64 w-full rounded-2xl" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="flex flex-col gap-6 lg:gap-8">
      {/* ─── WELCOME HERO SECTION ─── */}
      <GlassCard hoverable={false} className="bg-gradient-to-r from-deep-blue/40 via-black/40 to-slate-950/40 p-6 md:p-8 border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl">
        {/* Glowing aura */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-gold/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col text-center md:text-left z-10">
          <div className="flex items-center justify-center md:justify-start gap-2 text-gold text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span>Sri Tech Academic Hub</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight leading-none">
            Welcome back, {user?.name}
          </h2>
          <p className="text-xs text-slate-400 mt-2 font-sans max-w-md">
            Monitor your cohort syllabus completion, review module checklist statuses, and earn your verified credentials.
          </p>
        </div>

        <div className="flex flex-row items-center gap-6 z-10">
          <div className="flex flex-col text-center md:text-right">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Enrolled Courses</span>
            <span className="text-sm font-semibold text-slate-200 mt-0.5">{studentCourses.length} Courses</span>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div className="flex flex-col text-center md:text-right">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Overall Completion</span>
            <span className="text-sm font-semibold text-gold mt-0.5">
              <CountUp end={overallCompletion} suffix="%" />
            </span>
          </div>
        </div>
      </GlassCard>

      {/* ─── STATISTICS CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Attendance Rate */}
        <GlassCard className="bg-slate-950/40 p-6 flex items-center gap-5 border border-white/5 rounded-2xl hover:border-sky-500/30 transition-all duration-300">
          <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/20 text-sky-400">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Attendance Rate</span>
            <span className="text-2xl font-display font-extrabold text-white mt-0.5">
              <CountUp end={attendancePercent} suffix="%" />
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5">Classroom check-ins</span>
          </div>
        </GlassCard>

        {/* Completed Modules */}
        <GlassCard className="bg-slate-950/40 p-6 flex items-center gap-5 border border-white/5 rounded-2xl hover:border-emerald-500/30 transition-all duration-300">
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Completed Modules</span>
            <span className="text-2xl font-display font-extrabold text-white mt-0.5">
              <CountUp end={completedModules} />
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5">Approved by instructor</span>
          </div>
        </GlassCard>

        {/* Pending Modules */}
        <GlassCard className="bg-slate-950/40 p-6 flex items-center gap-5 border border-white/5 rounded-2xl hover:border-slate-500/30 transition-all duration-300">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/50 text-slate-400">
            <Circle className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Pending Modules</span>
            <span className="text-2xl font-display font-extrabold text-white mt-0.5">
              <CountUp end={pendingModules} />
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5">Syllabus modules left</span>
          </div>
        </GlassCard>

        {/* Certificates Earned */}
        <GlassCard className="bg-slate-950/40 p-6 flex items-center gap-5 border border-white/5 rounded-2xl hover:border-gold/30 transition-all duration-300">
          <div className="p-3 rounded-xl bg-gold/10 border border-gold/20 text-gold">
            <Award className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Certificates Earned</span>
            <span className="text-2xl font-display font-extrabold text-white mt-0.5">
              <CountUp end={certificatesEarned} />
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5">Verified completions</span>
          </div>
        </GlassCard>
      </div>

      {/* ─── ENROLLED COURSES SECTION ─── */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-display font-bold uppercase tracking-wider text-slate-400 px-1">
          Enrolled Cohort Courses
        </h3>

        {studentCourses.length === 0 ? (
          <GlassCard className="flex flex-col items-center justify-center p-16 text-center text-slate-400 border border-white/5 rounded-2xl">
            <BookOpen className="h-12 w-12 text-slate-600 mb-4" />
            <p className="text-base font-semibold text-slate-300">No active course enrollment found.</p>
            <p className="text-xs text-slate-500 mt-1">Please contact your administrator to register for a course cohort.</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {studentCourses.map((course, idx) => {
              const activeModules = course.modules?.filter(m => m.isActive) || [];
              const progressRecord = progressList.find(p => p.courseId === course.id);
              const completedCount = activeModules.filter(m => progressRecord?.completedModuleIds.includes(m.id)).length;
              const totalCount = activeModules.length;
              const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
              const theme = getCourseTheme(course.name, idx);

              // Status check
              let statusLabel = 'In Progress';
              let badgeColor: 'success' | 'gold' | 'info' | 'default' = 'info';
              if (totalCount === 0) {
                statusLabel = 'Not Started';
                badgeColor = 'default';
              } else if (completedCount === 0) {
                statusLabel = 'Not Started';
                badgeColor = 'default';
              } else if (completedCount === totalCount) {
                statusLabel = 'Completed';
                badgeColor = 'success';
              } else {
                statusLabel = 'In Progress';
                badgeColor = 'gold';
              }

              return (
                <GlassCard key={course.id} className="bg-slate-950/40 border border-white/5 p-6 rounded-2xl flex flex-col justify-between hover:border-white/10 transition-all duration-300 relative group overflow-hidden">
                  <div className="flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold font-display">
                          {course.code || 'STA-COHORT'}
                        </span>
                        <h4 className="text-lg font-display font-extrabold text-white tracking-wide mt-0.5">
                          {course.name}
                        </h4>
                      </div>
                      <Badge color={badgeColor} className="text-[9px] uppercase tracking-wider font-semibold">
                        {statusLabel}
                      </Badge>
                    </div>

                    {/* Instructor / Duration details */}
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 font-sans">
                      <div>
                        <span className="text-slate-500">Instructor:</span> <span className="text-slate-300 font-semibold">{course.instructor || 'Academy Faculty'}</span>
                      </div>
                      <div className="h-3 w-px bg-white/10" />
                      <div>
                        <span className="text-slate-500">Duration:</span> <span className="text-slate-300 font-semibold">{course.duration || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Progress details */}
                    <div className="flex flex-col gap-1.5 mt-2">
                      <div className="flex justify-between items-center text-xs">
                        {totalCount === 0 ? (
                          <span className="text-[11px] text-slate-500 italic">No modules published</span>
                        ) : (
                          <span className="text-slate-400 font-sans font-medium">
                            {completedCount} / {totalCount} Modules Completed
                          </span>
                        )}
                        <span className="font-display font-bold text-slate-200">
                          {pct}%
                        </span>
                      </div>

                      {/* Visual enterprise progress bar */}
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${theme.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {totalCount === 0 && (
                    <div className="mt-4 p-3 rounded-xl bg-white/2 border border-white/5 text-[10px] text-slate-500 italic text-center font-sans">
                      Modules will appear once your instructor publishes the syllabus.
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default StudentDashboard;
