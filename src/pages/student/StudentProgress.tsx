import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  subscribeToAllCourses,
  subscribeToStudentMarks,
  courseProgressService
} from '../../services';
import { Course, Student, StudentProgress as StudentProgressType, Mark } from '../../types';
import {
  sortEnrolledCoursesByPriority,
  computeStudentAcademicProgression
} from '../../utils/courseProgression';
import PageWrapper from '../../components/ui/PageWrapper';
import GlassCard from '../../components/ui/GlassCard';
import Skeleton from '../../components/ui/Skeleton';
import Badge from '../../components/ui/Badge';
import CourseProgressionBar from '../../components/ui/CourseProgressionBar';
import { Sparkles, CheckCircle2, Circle, ChevronDown, ChevronUp, BookOpen, Clock, Award } from 'lucide-react';

// Enterprise style helper matching requested colors (Gold, Blue, Emerald, Slate)
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

export const StudentProgress: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [progressList, setProgressList] = useState<StudentProgressType[]>([]);
  const [studentMarks, setStudentMarks] = useState<Mark[]>([]);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let ready = { student: false, courses: false, marks: false, progress: false };
    const checkReady = () => {
      if (Object.values(ready).every(Boolean)) setLoading(false);
    };

    // 1. Subscribe to student profile doc in real-time
    const studentDocRef = doc(db, 'students', user.studentId);
    const unsubscribeStudent = onSnapshot(
      studentDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Student;
          setStudentData(data);
        }
        ready.student = true;
        checkReady();
      },
      (error) => {
        console.error('[StudentProgress] Error subscribing to student profile:', error);
      }
    );

    // 2. Subscribe to all courses in real-time
    const unsubscribeCourses = subscribeToAllCourses((coursesData) => {
      setAllCourses(coursesData);
      ready.courses = true;
      checkReady();
    });

    // 3. Subscribe to marks in real-time to track course completions
    const unsubscribeMarks = subscribeToStudentMarks(user.studentId, (marksData) => {
      setStudentMarks(marksData);
      ready.marks = true;
      checkReady();
    });

    // 4. Subscribe to module progress records in real-time
    const unsubscribeProgress = courseProgressService.subscribeToAllStudentProgress(user.studentId, (list) => {
      setProgressList(list);
      ready.progress = true;
      checkReady();
    });

    return () => {
      unsubscribeStudent();
      unsubscribeCourses();
      unsubscribeMarks();
      unsubscribeProgress();
    };
  }, [user]);

  // Compute academic progression according to fixed course priority (C -> C++ -> Python -> Java)
  const progression = useMemo(() => {
    if (!studentData) return null;
    return computeStudentAcademicProgression(studentData, allCourses, studentMarks);
  }, [studentData, allCourses, studentMarks]);

  // Enrolled courses sorted strictly by academy progression priority
  const enrolledSortedCourses = useMemo(() => {
    if (!studentData) return [];
    const enrolledIds = studentData.courseIds?.length
      ? studentData.courseIds
      : (studentData.enrolledCourses ?? []);
    const matching = allCourses.filter(c => enrolledIds.includes(c.id));
    return sortEnrolledCoursesByPriority(matching);
  }, [studentData, allCourses]);

  // Set default expanded course
  useEffect(() => {
    if (enrolledSortedCourses.length > 0 && !expandedCourse) {
      // Default expand current course if available, or first course
      const current = progression?.currentCourse;
      if (current) {
        setExpandedCourse(current.courseId);
      } else {
        setExpandedCourse(enrolledSortedCourses[0].id);
      }
    }
  }, [enrolledSortedCourses, progression, expandedCourse]);

  const toggleCourse = (courseId: string) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  if (loading) {
    return (
      <PageWrapper className="flex flex-col gap-6">
        <Skeleton variant="rectangular" className="h-28 w-full rounded-2xl" />
        <Skeleton variant="card" count={2} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="flex-1 flex flex-col gap-6 lg:gap-8">
      {/* ─── Hero Progression Header Card ─── */}
      <GlassCard hoverable={false} className="bg-gradient-to-r from-deep-blue/40 via-black/40 to-slate-950/40 p-6 md:p-8 border border-white/5 relative overflow-hidden flex flex-col gap-5 rounded-2xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-gold/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-gold text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span>Academic Progression Hub</span>
            </div>
            <h2 className="text-xl md:text-2xl font-display font-extrabold text-white tracking-tight leading-none">
              Course Progress & Progression Path
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-1 max-w-xl">
              Follow your prescribed academic path (C &rarr; C++ &rarr; Python &rarr; Java). Complete module assessments and marks to advance to your next subject.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {progression && (
              <Badge
                color={progression.overallStatus === 'COMPLETED' ? 'success' : 'gold'}
                className="text-xs uppercase font-bold tracking-wider px-3 py-1.5"
              >
                {progression.overallStatus === 'COMPLETED' ? '✓ STATUS: COMPLETED' : '● STATUS: CURRENT'}
              </Badge>
            )}
          </div>
        </div>

        {/* Horizontal Progression Bar */}
        {progression && progression.enrolledCourses.length > 0 && (
          <div className="flex flex-col gap-2 z-10 border-t border-white/10 pt-4 mt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-[10px] font-display font-bold uppercase tracking-widest text-slate-400">
                Your Enrolled Subject Progression Path
              </span>
              {progression.currentCourse ? (
                <span className="text-xs font-semibold text-gold bg-gold/10 px-2.5 py-0.5 rounded border border-gold/20">
                  Current Focus: {progression.currentCourse.courseName}
                </span>
              ) : (
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                  All Enrolled Courses Completed
                </span>
              )}
            </div>

            <CourseProgressionBar items={progression.enrolledCourses} />
          </div>
        )}
      </GlassCard>

      {/* ─── Detailed Courses List ─── */}
      {enrolledSortedCourses.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center p-16 text-center text-slate-400 border border-white/5 rounded-2xl">
          <BookOpen className="h-12 w-12 text-slate-600 mb-4" />
          <p className="text-base font-semibold text-slate-300">No active course enrollment found.</p>
          <p className="text-xs text-slate-500 mt-1">Syllabus modules and progression will appear once you are enrolled in a cohort.</p>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-6">
          {enrolledSortedCourses.map((course, idx) => {
            const isExpanded = expandedCourse === course.id;
            const activeModules = course.modules?.filter(m => m.isActive) || [];
            const progressRecord = progressList.find(p => p.courseId === course.id);
            const completedCount = activeModules.filter(m => progressRecord?.completedModuleIds.includes(m.id)).length;
            
            const totalCount = activeModules.length;
            const remainingCount = totalCount - completedCount;
            const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const theme = getCourseTheme(course.name, idx);

            // Match progression status for this course
            const progItem = progression?.enrolledCourses.find(p => p.courseId === course.id);
            const courseStatus = progItem?.status || 'UPCOMING';

            return (
              <GlassCard
                key={course.id}
                hoverable={false}
                className="bg-slate-950/40 border border-white/5 p-6 flex flex-col gap-4 overflow-hidden rounded-2xl relative transition-all duration-300"
              >
                {/* Course Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold font-display">
                      {course.code || 'STA-COHORT'} &bull; Step {idx + 1}
                    </span>
                    <h3 className="text-lg md:text-xl font-display font-extrabold text-white mt-1 flex items-center gap-3">
                      {course.name}
                      {/* Course Progression Status Badge */}
                      {courseStatus === 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed {progItem?.averageMarks !== undefined ? `(${progItem.averageMarks}%)` : ''}
                        </span>
                      )}
                      {courseStatus === 'CURRENT' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold/15 border border-gold/30 text-gold font-mono animate-pulse">
                          ● Current Focus
                        </span>
                      )}
                      {courseStatus === 'UPCOMING' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-white/10 text-slate-400">
                          ○ Upcoming
                        </span>
                      )}
                    </h3>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleCourse(course.id)}
                      className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                      aria-label={isExpanded ? "Collapse checklist" : "Expand checklist"}
                    >
                      {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Progress bar and details */}
                <div className="flex flex-col gap-2 border-t border-white/5 pt-4 mt-1">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs gap-2">
                    <div className="flex flex-wrap gap-4 text-slate-400">
                      <div>
                        Total Modules: <span className="font-semibold text-slate-200">{totalCount}</span>
                      </div>
                      <div className="h-3 w-px bg-white/10 self-center hidden sm:block" />
                      <div>
                        Completed: <span className="font-semibold text-emerald-400">{completedCount}</span>
                      </div>
                      <div className="h-3 w-px bg-white/10 self-center hidden sm:block" />
                      <div>
                        Remaining: <span className="font-semibold text-slate-300">{remainingCount}</span>
                      </div>
                    </div>
                    <span className="text-slate-200 font-display font-bold self-end sm:self-auto">
                      {pct}% Completed
                    </span>
                  </div>

                  <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${theme.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Detailed Module Syllabus Checklist */}
                {isExpanded && (
                  <div className="border-t border-white/5 pt-5 mt-2 animate-fade-in flex flex-col gap-4">
                    <h4 className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-500">
                      Syllabus Module Details
                    </h4>
                    
                    {activeModules.length === 0 ? (
                      <div className="p-4 rounded-xl bg-white/2 border border-white/5 text-xs text-slate-500 italic text-center font-sans">
                        Modules will appear once the syllabus is published.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activeModules.map((mod, index) => {
                          const isDone = progressRecord?.completedModuleIds.includes(mod.id);
                          return (
                            <div
                              key={mod.id}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border border-white/5 bg-[#030712]/30 select-none transition-all ${
                                isDone ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : ''
                              }`}
                            >
                              <div className="shrink-0 mt-0.5">
                                {isDone ? (
                                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                                ) : (
                                  <Circle className="h-4.5 w-4.5 text-slate-600" />
                                )}
                              </div>

                              <div className="flex flex-col min-w-0">
                                <span className={`text-xs font-semibold leading-snug truncate ${
                                  isDone ? 'text-slate-200' : 'text-slate-400'
                                }`}>
                                  {mod.title}
                                </span>
                                <span className="text-[8px] text-slate-500 mt-1 uppercase font-bold tracking-wider">
                                  Module {index + 1}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
};

export default StudentProgress;
