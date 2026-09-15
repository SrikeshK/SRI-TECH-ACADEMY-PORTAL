import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Search,
  Users,
  Calendar,
  Clock,
  BookOpen,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  UserPlus,
  CheckCircle2,
  Circle,
  ExternalLink,
  Layers,
  Sparkles,
  RotateCcw
} from 'lucide-react';

// Types & Services
import { Student, Course, Mark, ClassSchedule, StudentProgress } from '../../types';
import {
  studentService,
  courseProgressService,
  subscribeToStudents,
  subscribeToAllCourses,
  subscribeToMarks,
} from '../../services';
import { sortStudentsByRegisterNumber } from '../../utils/studentOrdering';
import {
  computeStudentAcademicProgression,
  sortEnrolledCoursesByPriority,
} from '../../utils/courseProgression';

// UI Components
import PageWrapper from '../../components/ui/PageWrapper';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import StudentAvatar from '../../components/ui/StudentAvatar';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { Toast, ToastType } from '../../components/ui/Toast';
import CourseProgressionBar from '../../components/ui/CourseProgressionBar';

export const AdminStudentProgress: React.FC = () => {
  const navigate = useNavigate();

  // Core Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [allProgressRecords, setAllProgressRecords] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'weekday' | 'weekend' | 'not_set'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'CURRENT' | 'COMPLETED'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  
  // Interactive UI State
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set());
  const [updatingScheduleId, setUpdatingScheduleId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type, visible: true });
  };

  // Realtime Subscriptions
  useEffect(() => {
    let ready = { students: false, courses: false, marks: false, progress: false };
    const checkReady = () => {
      if (ready.students && ready.courses && ready.marks && ready.progress) {
        setLoading(false);
      }
    };

    const unsubStudents = subscribeToStudents((data) => {
      setStudents(sortStudentsByRegisterNumber(data));
      ready.students = true;
      checkReady();
    });

    const unsubCourses = subscribeToAllCourses((data) => {
      setCourses(data);
      ready.courses = true;
      checkReady();
    });

    const unsubMarks = subscribeToMarks((data) => {
      setMarks(data);
      ready.marks = true;
      checkReady();
    });

    const unsubProgress = courseProgressService.subscribeToAllProgress((data) => {
      setAllProgressRecords(data);
      ready.progress = true;
      checkReady();
    });

    return () => {
      unsubStudents();
      unsubCourses();
      unsubMarks();
      unsubProgress();
    };
  }, []);

  // Compute Academic Progression for all students
  const allProgressions = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeStudentAcademicProgression>>();
    students.forEach((student) => {
      const prog = computeStudentAcademicProgression(student, courses, marks);
      map.set(student.id, prog);
    });
    return map;
  }, [students, courses, marks]);

  // Handle Class Schedule change directly in Firestore
  const handleScheduleChange = async (studentId: string, newSchedule: ClassSchedule) => {
    setUpdatingScheduleId(studentId);
    try {
      await studentService.update(studentId, {
        classSchedule: newSchedule
      });
      showToast('Class schedule updated successfully.', 'success');
    } catch (err: any) {
      console.error('[AdminStudentProgress] Schedule update error:', err);
      showToast('Failed to update class schedule. Please try again.', 'error');
    } finally {
      setUpdatingScheduleId(null);
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (studentId: string) => {
    setExpandedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Distinct Core Academy Courses in Priority Order: C -> C++ -> Python -> Java
  const prioritizedCourses = useMemo(() => {
    return sortEnrolledCoursesByPriority(courses);
  }, [courses]);

  // Course Enrollment Overview Statistics
  const courseOverviewStats = useMemo(() => {
    return prioritizedCourses.map((course) => {
      let totalEnrolled = 0;
      let currentlyStudying = 0;
      let completed = 0;

      students.forEach((student) => {
        const prog = allProgressions.get(student.id);
        const enrolledIds = student.courseIds?.length
          ? student.courseIds
          : (student.enrolledCourses ?? []);

        // Total Enrolled: student has course in enrolled IDs
        if (enrolledIds.includes(course.id)) {
          totalEnrolled++;
        }

        if (prog) {
          // Currently Studying: this course is the CURRENT course for the student
          if (prog.currentCourse?.courseId === course.id) {
            currentlyStudying++;
          }

          // Completed: course is COMPLETED according to progression items
          const isCourseComp = prog.enrolledCourses.some(
            (item) => item.courseId === course.id && item.status === 'COMPLETED'
          );
          if (isCourseComp) {
            completed++;
          }
        }
      });

      return {
        course,
        totalEnrolled,
        currentlyStudying,
        completed,
      };
    });
  }, [prioritizedCourses, students, allProgressions]);

  // Filter & Search Students
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const result = students.filter((student) => {
      const prog = allProgressions.get(student.id);
      if (!prog) return false;

      // Search match (name, register number, batch, email)
      const reg = (student.registerNumber || student.rollNo || '').toLowerCase();
      const batchStr = (student.batch || '').toLowerCase();
      const matchesSearch =
        !q ||
        student.name.toLowerCase().includes(q) ||
        reg.includes(q) ||
        batchStr.includes(q) ||
        student.email.toLowerCase().includes(q);

      // Schedule filter
      const matchesSchedule =
        scheduleFilter === 'all' || prog.classSchedule === scheduleFilter;

      // Status filter
      const matchesStatus =
        statusFilter === 'all' || prog.overallStatus === statusFilter;

      // Course filter
      const matchesCourse =
        courseFilter === 'all' ||
        prog.currentCourse?.courseId === courseFilter ||
        prog.enrolledCourses.some((c) => c.courseId === courseFilter);

      return matchesSearch && matchesSchedule && matchesStatus && matchesCourse;
    });

    return sortStudentsByRegisterNumber(result);
  }, [students, allProgressions, searchQuery, scheduleFilter, statusFilter, courseFilter]);

  return (
    <PageWrapper className="flex-1 flex flex-col gap-6 lg:gap-8 pb-12">
      {/* ─── Header ─── */}
      <PageHeader
        title="Student Progress & Enrollment"
        subtitle="Manage student course progression, view module milestones, and assign weekday/weekend schedules."
        icon={TrendingUp}
        iconColor="text-gold"
        breadcrumbRoot="Admin"
        breadcrumbRootPath="/admin"
      />

      {/* ─── Quick Actions Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-white/5 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold shrink-0" />
          <span className="text-xs font-display font-semibold uppercase tracking-wider text-slate-400">
            Quick Actions
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/admin/students')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-semibold transition-all hover:scale-102"
          >
            <UserPlus className="h-3.5 w-3.5" />
            + Add Student
          </button>
          <button
            onClick={() => navigate('/admin/courses')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition-all hover:scale-102"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Manage Courses
          </button>
          <button
            onClick={() => navigate('/admin/marks')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-xs font-semibold transition-all hover:scale-102"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Manage Marks
          </button>
          <button
            onClick={() => navigate('/admin/students')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs font-semibold transition-all hover:scale-102"
          >
            <Users className="h-3.5 w-3.5" />
            View Students
          </button>
        </div>
      </div>

      {/* ─── COURSE ENROLLMENT OVERVIEW ─── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-gold" />
            <h2 className="text-xs font-display font-bold uppercase tracking-wider text-slate-300">
              Course Enrollment Overview
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Fixed Priority: C → C++ → Python → Java
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="card" className="h-28 w-full rounded-xl" />
            ))
          ) : courseOverviewStats.length > 0 ? (
            courseOverviewStats.map(({ course, totalEnrolled, currentlyStudying, completed }) => (
              <GlassCard
                key={course.id}
                hoverable={true}
                className="p-4 border-white/5 bg-slate-950/40 relative overflow-hidden group flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-display font-bold text-white group-hover:text-gold transition-colors">
                      {course.name}
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                      {course.code || 'CORE'}
                    </span>
                  </div>
                  <div className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-right">
                    <span className="text-xs font-display font-extrabold text-white">
                      {totalEnrolled}
                    </span>
                    <span className="text-[9px] text-slate-400 ml-1 uppercase font-semibold">
                      Enrolled
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-medium">
                      Currently Studying
                    </span>
                    <span className="text-sm font-display font-extrabold text-amber-300">
                      {currentlyStudying}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] text-slate-500 font-medium">
                      Completed
                    </span>
                    <span className="text-sm font-display font-extrabold text-emerald-400">
                      {completed}
                    </span>
                  </div>
                </div>
              </GlassCard>
            ))
          ) : (
            <div className="col-span-4 p-6 text-center text-xs text-slate-500 border border-white/5 rounded-xl">
              No courses configured.
            </div>
          )}
        </div>
      </section>

      {/* ─── Controls Bar: Search & Filters ─── */}
      <section className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search student or register number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-white/5 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold/50 text-xs transition-all shadow-inner"
          />
        </div>

        {/* Filter Groups */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Schedule Filter Tabs */}
          <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-white/5">
            {(['all', 'weekday', 'weekend', 'not_set'] as const).map((sched) => (
              <button
                key={sched}
                onClick={() => setScheduleFilter(sched)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  scheduleFilter === sched
                    ? 'bg-gold text-slate-950 shadow-md shadow-gold/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {sched === 'all'
                  ? 'All Schedules'
                  : sched === 'not_set'
                  ? 'Not Set'
                  : sched}
              </button>
            ))}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-white/5">
            {(['all', 'CURRENT', 'COMPLETED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${
                  statusFilter === st
                    ? 'bg-deep-blue text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {st === 'all' ? 'All Status' : st}
              </button>
            ))}
          </div>

          {/* Optional Course Filter */}
          {courses.length > 0 && (
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="appearance-none text-xs font-semibold px-3 py-1.5 rounded-xl border border-white/10 bg-slate-950 text-slate-300 focus:outline-none focus:border-gold/50 cursor-pointer"
            >
              <option value="all">All Courses</option>
              {prioritizedCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {/* ─── MAIN STUDENT TABLE ─── */}
      <section>
        <GlassCard hoverable={false} className="p-0 border-white/5 bg-slate-950/50 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="card" className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={TrendingUp}
                title="No Student Progress Records"
                description={
                  searchQuery
                    ? `No students matching "${searchQuery}" under the selected filters.`
                    : 'No students found matching your selected schedule or status filter.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-display font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-3">Register No.</th>
                    <th className="py-3.5 px-3">Schedule</th>
                    <th className="py-3.5 px-3">Completed</th>
                    <th className="py-3.5 px-3">Current</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {filteredStudents.map((student) => {
                    const prog = allProgressions.get(student.id)!;
                    const isExpanded = expandedStudentIds.has(student.id);
                    const isUpdatingThis = updatingScheduleId === student.id;

                    const completedItems = prog.enrolledCourses.filter(
                      (item) => item.status === 'COMPLETED'
                    );

                    // Scoped Course Modules for the Current Course
                    const currentCourseRecord = prog.currentCourse
                      ? courses.find((c) => c.id === prog.currentCourse!.courseId)
                      : null;
                    const activeModules = (currentCourseRecord?.modules || [])
                      .filter((m) => m.isActive !== false)
                      .sort((a, b) => a.order - b.order);

                    // Progress Record for this specific student + current course
                    const currentProgressRecord = prog.currentCourse
                      ? allProgressRecords.find(
                          (sp) =>
                            sp.studentId === student.id &&
                            sp.courseId === prog.currentCourse!.courseId
                        )
                      : null;
                    const completedModuleIds = currentProgressRecord?.completedModuleIds || [];
                    const completedModulesCount = activeModules.filter((m) =>
                      completedModuleIds.includes(m.id)
                    ).length;
                    const totalModulesCount = activeModules.length;
                    const moduleProgressPct =
                      totalModulesCount > 0
                        ? Math.round((completedModulesCount / totalModulesCount) * 100)
                        : 0;

                    return (
                      <React.Fragment key={student.id}>
                        {/* ─── Main Row ─── */}
                        <tr
                          onClick={() => toggleRowExpansion(student.id)}
                          className={`group hover:bg-white/[0.03] transition-colors cursor-pointer ${
                            isExpanded ? 'bg-white/[0.02]' : ''
                          }`}
                        >
                          {/* Student Name & Avatar */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <StudentAvatar name={student.name} size="sm" variant="rounded" />
                              <div>
                                <span className="font-display font-semibold text-white group-hover:text-gold transition-colors">
                                  {student.name}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Register No. */}
                          <td className="py-3.5 px-3 font-mono text-slate-400">
                            <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5 text-[11px]">
                              {prog.registerNumber}
                            </span>
                          </td>

                          {/* Class Schedule Dropdown */}
                          <td
                            className="py-3.5 px-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="relative inline-block">
                              <select
                                value={prog.classSchedule}
                                disabled={isUpdatingThis}
                                onChange={(e) =>
                                  handleScheduleChange(
                                    student.id,
                                    e.target.value as ClassSchedule
                                  )
                                }
                                className={`appearance-none text-[11px] font-semibold px-2.5 py-1 pr-6 rounded-lg border transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-gold/50 ${
                                  prog.classSchedule === 'weekday'
                                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/30'
                                    : prog.classSchedule === 'weekend'
                                    ? 'bg-purple-950/30 border-purple-500/30 text-purple-300 hover:bg-purple-900/30'
                                    : 'bg-slate-900 border-white/10 text-slate-400 hover:bg-slate-800'
                                }`}
                              >
                                <option value="not_set" className="bg-slate-950 text-slate-400">
                                  Not Set
                                </option>
                                <option value="weekday" className="bg-slate-950 text-emerald-300">
                                  Weekday
                                </option>
                                <option value="weekend" className="bg-slate-950 text-purple-300">
                                  Weekend
                                </option>
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                            </div>
                          </td>

                          {/* Completed Courses */}
                          <td className="py-3.5 px-3">
                            {completedItems.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {completedItems.map((c) => (
                                  <span
                                    key={c.courseId}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  >
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    {c.courseName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* Current Course */}
                          <td className="py-3.5 px-3">
                            {prog.currentCourse ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                {prog.currentCourse.courseName}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* Overall Status */}
                          <td className="py-3.5 px-3">
                            <Badge
                              color={prog.overallStatus === 'COMPLETED' ? 'success' : 'gold'}
                              className="text-[10px] uppercase font-bold tracking-wider"
                            >
                              {prog.overallStatus === 'COMPLETED' ? 'COMPLETED' : 'CURRENT'}
                            </Badge>
                          </td>

                          {/* Details Button */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpansion(student.id);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-300 transition-colors"
                            >
                              {isExpanded ? 'Hide' : 'View'}
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* ─── Expandable Details Section ─── */}
                        <AnimatePresence>
                          {isExpanded && (
                            <tr className="bg-slate-950/60 border-b border-white/5">
                              <td colSpan={7} className="p-4 sm:p-6">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="flex flex-col gap-6"
                                >
                                  {/* Student Progress Header Details */}
                                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-slate-900/40">
                                    <div className="flex items-center gap-4">
                                      <StudentAvatar name={student.name} size="md" variant="rounded" />
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="text-sm font-display font-bold text-white">
                                            {student.name}
                                          </h4>
                                          <Badge
                                            color={prog.overallStatus === 'COMPLETED' ? 'success' : 'gold'}
                                            className="text-[9px] uppercase font-bold"
                                          >
                                            {prog.overallStatus === 'COMPLETED' ? '✓ COMPLETED' : '● CURRENT'}
                                          </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400 font-mono">
                                          <span>Reg: <strong className="text-slate-200">{prog.registerNumber}</strong></span>
                                          <span>•</span>
                                          <span>Schedule: <strong className="text-slate-200 capitalize">{prog.classSchedule === 'not_set' ? 'Not Set' : prog.classSchedule}</strong></span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-slate-400">Total Enrolled:</span>
                                      <span className="font-semibold text-white px-2 py-0.5 rounded bg-white/5">
                                        {prog.enrolledCourses.length} Courses
                                      </span>
                                    </div>
                                  </div>

                                  {/* Course Progression Visualization */}
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-display font-bold uppercase tracking-widest text-slate-400">
                                        Course Progression (Enrolled Courses Only)
                                      </span>
                                      {prog.currentCourse ? (
                                        <span className="text-[11px] text-amber-300 font-semibold">
                                          Current Focus: {prog.currentCourse.courseName}
                                        </span>
                                      ) : (
                                        <span className="text-[11px] text-emerald-400 font-semibold">
                                          All Enrolled Courses Completed
                                        </span>
                                      )}
                                    </div>
                                    <CourseProgressionBar items={prog.enrolledCourses} />
                                  </div>

                                  {/* Current Course Module Progress Scoped */}
                                  {prog.currentCourse ? (
                                    <div className="p-4 rounded-xl border border-white/5 bg-slate-900/40 flex flex-col gap-3">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-display font-bold uppercase tracking-widest text-gold">
                                              Current Course Module Progress
                                            </span>
                                            <span className="text-xs font-semibold text-white">
                                              — {prog.currentCourse.courseName}
                                            </span>
                                          </div>
                                          <span className="text-xs text-slate-400 mt-0.5 block">
                                            Completed Modules: {completedModulesCount} / {totalModulesCount}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                          <span className="text-sm font-display font-bold text-amber-300">
                                            {moduleProgressPct}%
                                          </span>
                                        </div>
                                      </div>

                                      {/* Visual Progress Bar */}
                                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                        <div
                                          className="bg-gradient-to-r from-amber-500 to-gold h-2 rounded-full transition-all duration-500"
                                          style={{ width: `${moduleProgressPct}%` }}
                                        />
                                      </div>

                                      {/* Module Checklist List */}
                                      {activeModules.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                                          {activeModules.map((mod, idx) => {
                                            const isModCompleted = completedModuleIds.includes(mod.id);
                                            return (
                                              <div
                                                key={mod.id}
                                                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs transition-colors ${
                                                  isModCompleted
                                                    ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                                                    : 'bg-slate-950/40 border-white/5 text-slate-400'
                                                }`}
                                              >
                                                {isModCompleted ? (
                                                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                                ) : (
                                                  <Circle className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                                                )}
                                                <div className="flex flex-col">
                                                  <span className="font-semibold leading-tight">
                                                    Module {idx + 1}: {mod.title}
                                                  </span>
                                                  {mod.description && (
                                                    <span className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                                      {mod.description}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-slate-500 italic">
                                          No modules defined for this course in Course Management.
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 flex items-center gap-3">
                                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                                      <p className="text-xs text-emerald-300">
                                        Student has successfully completed all enrolled courses with recorded marks.
                                      </p>
                                    </div>
                                  )}
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </section>

      {/* Toast Notification */}
      <Toast
        isVisible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, visible: false })}
      />
    </PageWrapper>
  );
};

export default AdminStudentProgress;
