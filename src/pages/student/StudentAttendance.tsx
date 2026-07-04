import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Attendance, Course, Student } from '../../types';
import {
  subscribeToStudentAttendance,
  calculateAttendanceStats,
  calculateMonthlyAttendance,
  courseService,
  studentService,
} from '../../services';
import PageWrapper from '../../components/ui/PageWrapper';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import { Calendar, CheckCircle, Clock, XCircle, TrendingUp, BookOpen } from 'lucide-react';

export const StudentAttendance: React.FC = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  /* ─── Realtime subscription to student attendance & metadata ─── */
  useEffect(() => {
    if (!user?.studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let readyFlags = { attendance: false, meta: false };
    const checkAllReady = () => {
      if (readyFlags.attendance && readyFlags.meta) setLoading(false);
    };

    // Load courses + student details once
    const loadMetadata = async () => {
      try {
        const [coursesData, studentData] = await Promise.all([
          courseService.getAll(),
          studentService.getById(user.studentId!)
        ]);
        setCourses(coursesData);
        setStudent(studentData);
      } catch (err) {
        console.error('Error loading metadata:', err);
      } finally {
        readyFlags.meta = true;
        checkAllReady();
      }
    };
    loadMetadata();

    const unsub = subscribeToStudentAttendance(user.studentId, (records) => {
      // Sort newest first for display
      const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
      setAttendance(sorted);
      readyFlags.attendance = true;
      checkAllReady();
    });

    return () => unsub();
  }, [user?.studentId]);

  // Find which courses the student is enrolled in or has records for
  const studentCourses = useMemo(() => {
    const enrolledCourseIds = student?.courseIds || student?.enrolledCourses || [];
    return courses.filter(c => 
      enrolledCourseIds.includes(c.id) || 
      attendance.some(a => a.courseId === c.id)
    );
  }, [courses, student, attendance]);

  // Filter attendance logs by selected course
  const filteredAttendance = useMemo(() => {
    return attendance.filter(a => 
      selectedCourseId === 'all' ? true : a.courseId === selectedCourseId
    );
  }, [attendance, selectedCourseId]);

  /* ─── Statistics (calculated on filtered records) ─── */
  const stats = useMemo(() => calculateAttendanceStats(filteredAttendance), [filteredAttendance]);
  const monthly = useMemo(() => calculateMonthlyAttendance(filteredAttendance), [filteredAttendance]);

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'Present':
        return { color: 'success' as const, icon: <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" /> };
      case 'Late':
        return { color: 'warning' as const, icon: <Clock className="h-4 w-4 text-amber-400 shrink-0" /> };
      case 'Leave':
        return { color: 'info' as const, icon: <Clock className="h-4 w-4 text-sky-400 shrink-0" /> };
      default:
        return { color: 'error' as const, icon: <XCircle className="h-4 w-4 text-rose-400 shrink-0" /> };
    }
  };

  return (
    <PageWrapper className="flex-1 flex flex-col gap-6">
      {loading ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Skeleton variant="card" count={4} />
          </div>
          <Skeleton variant="rectangular" className="h-64 w-full" />
        </div>
      ) : (
        <>
          {/* ── Filter Bar ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-950/20 border border-white/5 p-4 rounded-2xl">
            <div>
              <h2 className="text-lg font-display font-extrabold text-white">Attendance Analytics</h2>
              <p className="text-xs text-slate-500 mt-0.5">Filter by course to track your subject-specific attendance details.</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="course-filter" className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Course:</label>
              <select
                id="course-filter"
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className="glass-input px-3.5 py-2 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-gold/50 cursor-pointer min-w-[160px]"
              >
                <option value="all">All Enrolled Courses</option>
                {studentCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Course-wise Summary Grid ── */}
          {studentCourses.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentCourses.map(course => {
                const courseAttendance = attendance.filter(a => a.courseId === course.id);
                const courseStats = calculateAttendanceStats(courseAttendance);
                return (
                  <GlassCard
                    key={course.id}
                    hoverable={true}
                    glowOnHover={true}
                    onClick={() => setSelectedCourseId(course.id)}
                    className={`p-4 border transition-all cursor-pointer ${
                      selectedCourseId === course.id
                        ? 'border-gold/45 bg-slate-950/60 shadow-lg shadow-gold/5 scale-[1.01]'
                        : 'border-white/5 bg-slate-950/40 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 max-w-[70%]">
                        <div className="p-1.5 rounded-lg bg-sky-500/10 shrink-0">
                          <BookOpen className="h-3.5 w-3.5 text-sky-400" />
                        </div>
                        <span className="text-xs font-semibold text-slate-200 truncate">{course.name}</span>
                      </div>
                      <Badge
                        color={courseStats.attendancePercentage >= 75 ? 'success' : courseStats.attendancePercentage >= 50 ? 'warning' : 'error'}
                        className="text-[10px] font-bold"
                      >
                        {courseStats.attendancePercentage}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center mt-3.5 text-[10px]">
                      <span className="text-slate-500 uppercase font-bold tracking-wider">Attended / Total</span>
                      <span className="text-slate-300 font-mono">
                        <strong className="text-white font-bold">{courseStats.classesAttended}</strong> / {courseStats.totalClasses} classes
                      </span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          courseStats.attendancePercentage >= 75 ? 'bg-emerald-500' :
                          courseStats.attendancePercentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${courseStats.attendancePercentage}%` }}
                      />
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}

          {/* ── Summary Statistics Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard hoverable={false} className="bg-slate-950/40 p-4 border border-white/5 flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Attendance Rate</span>
              <span className="text-2xl font-display font-extrabold text-white mt-2">
                {stats.attendancePercentage}%
              </span>
              <span className="text-[10px] text-slate-600 mt-1">Present ÷ Total × 100</span>
            </GlassCard>

            <GlassCard hoverable={false} className="bg-slate-950/40 p-4 border border-white/5 flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Classes Conducted</span>
              <span className="text-2xl font-display font-extrabold text-sky-400 mt-2">
                {stats.totalClasses} Days
              </span>
            </GlassCard>

            <GlassCard hoverable={false} className="bg-slate-950/40 p-4 border border-white/5 flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Present Days</span>
              <span className="text-2xl font-display font-extrabold text-emerald-400 mt-2">
                {stats.presentCount} Days
              </span>
            </GlassCard>

            <GlassCard hoverable={false} className="bg-slate-950/40 p-4 border border-white/5 flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Absent Days</span>
              <span className="text-2xl font-display font-extrabold text-rose-400 mt-2">
                {stats.absentCount} Days
              </span>
            </GlassCard>
          </div>

          {/* ── Secondary Stats Row ── */}
          <div className="grid grid-cols-3 gap-4">
            <GlassCard hoverable={false} className="bg-slate-950/40 p-3 border border-white/5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-400/10 shrink-0">
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <div className="text-base font-bold text-amber-400">{stats.lateCount}</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Late Arrivals</div>
              </div>
            </GlassCard>

            <GlassCard hoverable={false} className="bg-slate-950/40 p-3 border border-white/5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-400/10 shrink-0">
                <Calendar className="h-4 w-4 text-sky-400" />
              </div>
              <div>
                <div className="text-base font-bold text-sky-400">{stats.leaveCount}</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Leave Days</div>
              </div>
            </GlassCard>

            <GlassCard hoverable={false} className="bg-slate-950/40 p-3 border border-white/5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-400/10 shrink-0">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-base font-bold text-emerald-400">{stats.attendedPercentage}%</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Classes Attended</div>
              </div>
            </GlassCard>
          </div>

          {/* ── Monthly Breakdown ── */}
          {monthly.length > 0 && (
            <GlassCard hoverable={false} className="bg-slate-950/40 border border-white/5 p-4">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-3">Monthly Attendance</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {monthly.map((m) => (
                  <div
                    key={m.month}
                    className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/3 border border-white/5"
                  >
                    <span className="text-[10px] font-bold text-slate-400">{m.monthLabel}</span>
                    <div className="flex items-end justify-between">
                      <span className={`text-xl font-display font-extrabold ${
                        m.percentage >= 75 ? 'text-emerald-400' :
                        m.percentage >= 50 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {m.percentage}%
                      </span>
                      <span className="text-[10px] text-slate-600">{m.present}/{m.total}</span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          m.percentage >= 75 ? 'bg-emerald-500' :
                          m.percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${m.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* ── Full Attendance Log Table ── */}
          <GlassCard hoverable={false} className="bg-slate-950/40 border border-white/5 p-0 overflow-hidden flex-grow">
            {filteredAttendance.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 text-center text-slate-400">
                <Calendar className="h-12 w-12 text-slate-600 mb-4" />
                <p className="text-base font-semibold text-slate-300">No attendance registered</p>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedCourseId === 'all'
                    ? 'There are no check-in logs registered yet for your student profile.'
                    : `There are no check-in logs registered yet for ${courses.find(c => c.id === selectedCourseId)?.name || 'this course'}.`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/2">
                      <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">
                        Class Lecture Date
                      </th>
                      <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">
                        Course
                      </th>
                      <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">
                        Status Check-in
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.map(log => {
                      const { color, icon } = getStatusDetails(log.status);
                      return (
                        <tr key={log.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-slate-300">{log.date}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-slate-300">
                              {courses.find(c => c.id === log.courseId)?.name || log.courseId || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {icon}
                              <Badge color={color}>{log.status}</Badge>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </>
      )}
    </PageWrapper>
  );
};

export default StudentAttendance;
