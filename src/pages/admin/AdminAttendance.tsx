import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Search,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  UserCheck,
  UserX,
  BookOpen,
  Hash,
  Filter
} from 'lucide-react';
import { Student, Course, Attendance } from '../../types';
import { studentService, courseService, attendanceService, subscribeToAttendance } from '../../services';
import PageWrapper from '../../components/ui/PageWrapper';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';

type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave';

const STATUS_CONFIG: Record<AttendanceStatus | 'Not Marked', { label: string; color: string; bg: string; badge: 'success' | 'error' | 'warning' | 'info' | 'default' }> = {
  Present: { label: 'Present', color: 'text-emerald-400', bg: 'bg-emerald-500', badge: 'success' },
  Absent:  { label: 'Absent',  color: 'text-rose-400',    bg: 'bg-rose-600',    badge: 'error'   },
  Late:    { label: 'Late',    color: 'text-amber-400',   bg: 'bg-amber-500',   badge: 'warning' },
  Leave:   { label: 'Leave',   color: 'text-sky-400',     bg: 'bg-sky-600',     badge: 'info'    },
  'Not Marked': { label: 'Not Marked', color: 'text-slate-400', bg: 'bg-slate-700', badge: 'default' },
};

const AdminAttendance: React.FC = () => {
  // Core data
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses]   = useState<Course[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'mark' | 'view'>('mark');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | AttendanceStatus | 'Not Marked'>('All');

  /* ─── Load students + courses once ─────────────────────────── */
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [studentsData, coursesData] = await Promise.all([
          studentService.getAll(),
          courseService.getAll(),
        ]);
        setStudents(studentsData);
        setCourses(coursesData);
        if (coursesData.length > 0) {
          setSelectedCourseId(coursesData[0].id);
        }
      } catch (err) {
        console.error('Error loading meta data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMeta();
  }, []);

  /* ─── Realtime attendance subscription ─────────────────────── */
  useEffect(() => {
    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const unsub = subscribeToAttendance((records) => {
      setAttendanceRecords(records);
    }, { date: selectedDate });
    unsubscribeRef.current = unsub;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [selectedDate]);


  /* ─── Derived student list (active, filtered by course) ───── */
  const courseFilteredStudents = useMemo(() => {
    const active = students.filter(s => s.status === 'Active');
    if (!selectedCourseId) return [];
    if (selectedCourseId === 'all') return active;
    return active.filter(
      s => s.enrolledCourses?.includes(selectedCourseId) || s.courseIds?.includes(selectedCourseId)
    );
  }, [students, selectedCourseId]);

  const visibleStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return courseFilteredStudents.filter(s => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.registerNumber || '').toLowerCase().includes(q) ||
        (s.rollNo || '').toLowerCase().includes(q);

      const status = getStudentStatus(s.id);
      const matchesStatus = statusFilter === 'All' || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [courseFilteredStudents, searchQuery, statusFilter, attendanceRecords, selectedDate, selectedCourseId, activeTab]);

  /* ─── Attendance helpers ──────────────────────────────────── */
  function getStudentStatus(studentId: string): AttendanceStatus | 'Not Marked' {
    if (!selectedCourseId || selectedCourseId === 'all') return 'Not Marked';
    const match = attendanceRecords.find(
      a => a.studentId === studentId && a.date === selectedDate && a.courseId === selectedCourseId
    );
    if (!match) {
      return activeTab === 'mark' ? 'Present' : 'Not Marked';
    }
    return match.status as AttendanceStatus;
  }

  const handleStatusChange = (student: Student, newStatus: AttendanceStatus) => {
    if (!selectedCourseId || selectedCourseId === 'all') return;
    setSaveSuccess(false);
    const existingIndex = attendanceRecords.findIndex(
      a => a.studentId === student.id && a.date === selectedDate && a.courseId === selectedCourseId
    );
    const newRecord: Attendance = {
      id: existingIndex >= 0 
        ? attendanceRecords[existingIndex].id 
        : `att_${student.id}_${selectedDate}_${selectedCourseId}`,
      studentId: student.id,
      studentName: student.name,
      courseId: selectedCourseId,
      date: selectedDate,
      status: newStatus,
      batch: student.batch,
    };
    setAttendanceRecords(prev => {
      const updated = [...prev];
      if (existingIndex >= 0) {
        updated[existingIndex] = newRecord;
      } else {
        updated.push(newRecord);
      }
      return updated;
    });
  };

  const markAll = (status: AttendanceStatus) => {
    setSaveSuccess(false);
    courseFilteredStudents.forEach(s => handleStatusChange(s, status));
  };

  const handleSaveAll = async () => {
    if (!selectedCourseId || selectedCourseId === 'all') {
      alert("Please select a specific course before saving attendance.");
      return;
    }
    setSaving(true);
    try {
      const courseId = selectedCourseId;
      const recordsToSave: Attendance[] = courseFilteredStudents.map(student => {
        const existing = attendanceRecords.find(
          a => a.studentId === student.id && a.date === selectedDate && a.courseId === courseId
        );
        return existing ?? {
          id: `att_${student.id}_${selectedDate}_${courseId}`,
          studentId: student.id,
          studentName: student.name,
          courseId,
          date: selectedDate,
          status: 'Present' as const,
          batch: student.batch,
        };
      });
      await attendanceService.saveMultiple(recordsToSave);
      // onSnapshot will auto-update attendanceRecords
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Error saving attendance:', err);
    } finally {
      setSaving(false);
    }
  };


  /* ─── Summary stats ───────────────────────────────────────── */
  const stats = useMemo(() => {
    const total   = courseFilteredStudents.length;
    const present = courseFilteredStudents.filter(s => getStudentStatus(s.id) === 'Present').length;
    const absent  = courseFilteredStudents.filter(s => getStudentStatus(s.id) === 'Absent').length;
    const late    = courseFilteredStudents.filter(s => getStudentStatus(s.id) === 'Late').length;
    const leave   = courseFilteredStudents.filter(s => getStudentStatus(s.id) === 'Leave').length;
    const unmarked = courseFilteredStudents.filter(s => getStudentStatus(s.id) === 'Not Marked').length;
    
    const markedCount = total - unmarked;
    const pct     = markedCount > 0 ? Math.round((present / markedCount) * 100) : 0;
    
    return { total, present, absent, late, leave, unmarked, pct };
  }, [courseFilteredStudents, attendanceRecords, selectedDate, selectedCourseId, activeTab]);

  /* ─── Course name helper ─────────────────────────────────── */
  const getCourseNames = (student: Student) => {
    const ids = student.enrolledCourses?.length ? student.enrolledCourses : student.courseIds ?? [];
    return ids
      .map(id => courses.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  /* ─── UI ──────────────────────────────────────────────────── */
  return (
    <PageWrapper className="flex-1 flex flex-col gap-5">
      <PageHeader
        title="Attendance"
        subtitle="Mark daily attendance by course. All data is sourced live from Student Management."
        icon={CalendarDays}
        iconColor="text-sky-400"
        breadcrumbRoot="Admin"
        breadcrumbRootPath="/admin"
        actions={
          activeTab === 'mark' ? (
            <Button
              variant="gold"
              size="sm"
              onClick={handleSaveAll}
              isLoading={saving}
              disabled={courseFilteredStudents.length === 0 || !selectedCourseId}
              leftIcon={<Save className="h-4 w-4" />}
              className="font-semibold shadow-lg shadow-gold/20"
            >
              {!selectedCourseId ? 'Select a Course' : 'Save Attendance'}
            </Button>
          ) : null
        }
      />

      {/* ── Tabs Navigation ── */}
      <div className="flex border-b border-white/5 gap-6">
        <button
          onClick={() => {
            setActiveTab('mark');
            setSelectedDate(new Date().toISOString().split('T')[0]);
            setSaveSuccess(false);
            setStatusFilter('All');
          }}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${
            activeTab === 'mark'
              ? 'border-gold text-gold font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Mark Today's Attendance
        </button>
        <button
          onClick={() => {
            setActiveTab('view');
            setSaveSuccess(false);
            setStatusFilter('All');
          }}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${
            activeTab === 'view'
              ? 'border-gold text-gold font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          View Past Attendance
        </button>
      </div>

      {/* ── Controls Bar ─────────────────────────────────────── */}
      <GlassCard hoverable={false} className="bg-slate-950/40 border-white/5 p-4">
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${activeTab === 'mark' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 items-end`}>
          {/* Date picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" /> {activeTab === 'mark' ? "Attendance Date (Today)" : "Select Past Date"}
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                disabled={activeTab === 'mark'}
                onChange={e => { setSelectedDate(e.target.value); setSaveSuccess(false); }}
                className={`glass-input pl-3 pr-3 py-2 rounded-xl text-xs w-full ${
                  activeTab === 'mark' ? 'text-slate-500 cursor-not-allowed bg-slate-950/20' : 'text-slate-100 cursor-pointer'
                }`}
              />
            </div>
          </div>

          {/* Course selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <BookOpen className="h-3 w-3" /> Course
            </label>
            <select
              value={selectedCourseId}
              onChange={e => { setSelectedCourseId(e.target.value); setSaveSuccess(false); }}
              className="glass-input px-3 py-2 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-gold/50 cursor-pointer"
            >
              <option value="" disabled>Select Course...</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <Search className="h-3 w-3" /> Search Student
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Name or register number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="glass-input pl-9 pr-3 py-2 rounded-xl text-slate-300 text-xs w-full"
              />
            </div>
          </div>

          {/* Status filter + quick mark */}
          {activeTab === 'mark' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                <Filter className="h-3 w-3" /> Quick Actions
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => markAll('Present')}
                  disabled={courseFilteredStudents.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/15 transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  <UserCheck className="h-3.5 w-3.5" /> All Present
                </button>
                <button
                  onClick={() => markAll('Absent')}
                  disabled={courseFilteredStudents.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-[10px] font-bold uppercase tracking-wider hover:bg-rose-500/15 transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  <UserX className="h-3.5 w-3.5" /> All Absent
                </button>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* ── Success Banner ───────────────────────────────────── */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-950/50 border border-emerald-500/25 text-emerald-300 text-xs"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Attendance saved successfully for <strong>{selectedDate}</strong>.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Summary Stats ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total',    value: stats.total,   icon: Users,         color: 'text-sky-400',     bg: 'bg-sky-400/10' },
          { label: 'Present',  value: stats.present, icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { label: 'Absent',   value: stats.absent,  icon: XCircle,       color: 'text-rose-400',    bg: 'bg-rose-400/10' },
          { label: 'Late',     value: stats.late,    icon: Clock,         color: 'text-amber-400',   bg: 'bg-amber-400/10' },
          { label: 'Present %',value: `${stats.pct}%`, icon: UserCheck,   color: 'text-gold',        bg: 'bg-gold/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard hoverable={false} className="p-4 border-white/5 bg-slate-950/40 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bg} shrink-0`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <div className="text-lg font-display font-extrabold text-white leading-none">{stat.value}</div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">{stat.label}</div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* ── Status filter pills ──────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-1">Filter:</span>
        {(activeTab === 'mark'
          ? ['All', 'Present', 'Absent', 'Late', 'Leave']
          : ['All', 'Present', 'Absent', 'Late', 'Leave', 'Not Marked']
        ).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as any)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
              statusFilter === s
                ? s === 'All'
                  ? 'bg-white/10 border-white/20 text-white'
                  : s === 'Present' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : s === 'Absent'  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  : s === 'Late'    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : s === 'Leave'   ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                  : 'bg-slate-500/15 border-slate-500/40 text-slate-300'
                : 'border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/15'
            }`}
          >
            {s}
          </button>
        ))}
        {searchQuery && (
          <span className="text-[10px] text-slate-500 ml-auto">
            Showing {visibleStudents.length} of {courseFilteredStudents.length} students
          </span>
        )}
      </div>

      {/* ── Student Attendance Table ─────────────────────────── */}
      <GlassCard hoverable={false} className="bg-slate-950/40 border-white/5 p-0 overflow-hidden flex-1">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton variant="circular" className="h-10 w-10 shrink-0" />
                <div className="flex-1">
                  <Skeleton variant="text" className="h-4 w-48 mb-1.5" />
                  <Skeleton variant="text" className="h-3 w-32" />
                </div>
                <Skeleton variant="rectangular" className="h-8 w-64" />
              </div>
            ))}
          </div>
        ) : visibleStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <Users className="h-12 w-12 text-slate-700 mb-4" />
            <p className="text-base font-semibold text-slate-300">
              {!selectedCourseId ? "No Course Selected" : "No students found"}
            </p>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs">
              {!selectedCourseId
                ? "Please select a specific course from the Course dropdown to view and mark attendance."
                : `No active students are enrolled in ${courses.find(c => c.id === selectedCourseId)?.name ?? 'this course'}.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-white/5">
                <tr>
                  {(activeTab === 'mark'
                    ? ['Avatar', 'Name & Register No.', 'Enrolled Courses', 'Status Preview', 'Mark Attendance']
                    : ['Avatar', 'Name & Register No.', 'Enrolled Courses', 'Saved Attendance Status']
                  ).map(h => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-display font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {visibleStudents.map((student, idx) => {
                    const status = getStudentStatus(student.id);
                    const cfg = STATUS_CONFIG[status];
                    return (
                      <motion.tr
                        key={student.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-white/5 hover:bg-white/2 transition-colors group"
                      >
                        {/* Avatar */}
                        <td className="px-5 py-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-white/10 group-hover:border-gold/30 transition-colors flex items-center justify-center shrink-0">
                            <span className="text-gold font-bold font-display text-base">
                              {student.name.trim().charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </td>

                        {/* Name & Reg */}
                        <td className="px-5 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white group-hover:text-gold transition-colors leading-tight">
                              {student.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                              <Hash className="h-2.5 w-2.5" />
                              {student.registerNumber || student.rollNo || '—'}
                            </span>
                          </div>
                        </td>

                        {/* Enrolled Courses */}
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(student.enrolledCourses?.length ? student.enrolledCourses : student.courseIds ?? []).map(id => {
                              const name = courses.find(c => c.id === id)?.name;
                              return name ? (
                                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/5 border border-white/10 text-slate-400">
                                  <BookOpen className="h-2.5 w-2.5 text-sky-400" />
                                  {name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </td>

                        {/* Status badge */}
                        <td className="px-5 py-3">
                          <Badge color={cfg.badge} className="text-[10px] font-bold">
                            {cfg.label}
                          </Badge>
                        </td>

                        {/* Toggle buttons */}
                        {activeTab === 'mark' && (
                          <td className="px-5 py-3">
                            <div className="inline-flex rounded-xl bg-white/5 border border-white/5 p-0.5 gap-0.5">
                              {(['Present', 'Late', 'Absent', 'Leave'] as AttendanceStatus[]).map(s => {
                                const c = STATUS_CONFIG[s];
                                const active = status === s;
                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => handleStatusChange(student, s)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-display font-semibold transition-all whitespace-nowrap ${
                                      active
                                        ? `${c.bg} text-white shadow-sm scale-105`
                                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                                    }`}
                                  >
                                    {c.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ── Footer save shortcut ─────────────────────────────── */}
      {activeTab === 'mark' && !loading && courseFilteredStudents.length > 0 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-500">
            {courseFilteredStudents.length} active student{courseFilteredStudents.length !== 1 ? 's' : ''} · {selectedDate}
          </span>
          <Button
            variant="gold"
            size="sm"
            onClick={handleSaveAll}
            isLoading={saving}
            disabled={!selectedCourseId}
            leftIcon={<Save className="h-4 w-4" />}
            className="font-semibold shadow-lg shadow-gold/20"
          >
            Save Attendance
          </Button>
        </div>
      )}
    </PageWrapper>
  );
};

export default AdminAttendance;
