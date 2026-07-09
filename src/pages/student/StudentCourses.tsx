import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { subscribeToAllCourses } from '../../services';
import { Course, Student } from '../../types';
import PageWrapper from '../../components/ui/PageWrapper';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import { BookOpen, CheckSquare, Square, ChevronDown, ChevronUp, Trophy } from 'lucide-react';

export const StudentCourses: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);

  // Stateful LMS completed lessons tracker
  const [completedLessons, setCompletedLessons] = useState<Record<string, boolean>>(() => {
    if (!user?.studentId) return {};
    const key = `sta_completed_lessons_${user.studentId}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    if (!user?.studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Subscribe to student's own doc to get enrolledCourseIds in real-time
    const studentDocRef = doc(db, 'students', user.studentId);
    const unsubscribeStudent = onSnapshot(
      studentDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const studentData = docSnap.data() as Student;
          const enrolledIds = studentData.courseIds || studentData.enrolledCourses || [];
          setEnrolledCourseIds(enrolledIds);
        }
      },
      (error) => {
        console.error('[StudentCourses] Error subscribing to student profile:', error);
      }
    );

    // 2. Subscribe to all courses in real-time
    const unsubscribeCourses = subscribeToAllCourses((coursesData) => {
      setAllCourses(coursesData);
      setLoading(false);
    });

    return () => {
      unsubscribeStudent();
      unsubscribeCourses();
    };
  }, [user]);

  useEffect(() => {
    const enrolled = allCourses.filter(c => enrolledCourseIds.includes(c.id));
    setCourses(enrolled);
    if (enrolled.length > 0 && !expandedCourse) {
      setExpandedCourse(enrolled[0].id);
    }
  }, [allCourses, enrolledCourseIds]);

  const toggleCourse = (courseId: string) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  const handleToggleLesson = (courseId: string, lessonIdx: number) => {
    if (!user?.studentId) return;
    const lessonKey = `${courseId}-${lessonIdx}`;
    
    setCompletedLessons(prev => {
      const next = { ...prev, [lessonKey]: !prev[lessonKey] };
      const storageKey = `sta_completed_lessons_${user.studentId}`;
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const getCompletedCount = (course: Course) => {
    return course.syllabus.filter((_, idx) => completedLessons[`${course.id}-${idx}`]).length;
  };

  const getProgressPercent = (course: Course) => {
    const total = course.syllabus.length;
    if (total === 0) return 0;
    const completed = getCompletedCount(course);
    return Math.round((completed / total) * 100);
  };

  if (loading) {
    return (
      <PageWrapper className="flex flex-col gap-6">
        <Skeleton variant="card" count={2} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="flex-1 flex flex-col gap-6">
      <PageHeader
        title="My Courses"
        subtitle="Track your enrolled syllabus, mark completed lecture modules and monitor overall progress."
        icon={BookOpen}
        iconColor="text-emerald-400"
        breadcrumbRoot="Student Portal"
        breadcrumbRootPath="/student"
      />
      {courses.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center p-16 text-center text-slate-400">
          <BookOpen className="h-12 w-12 text-slate-600 mb-4" />
          <p className="text-base font-semibold text-slate-300">You are not enrolled in any courses</p>
          <p className="text-xs text-slate-500 mt-1">Please contact the administrator to get enrolled in a cohort</p>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-6">
          {courses.map(course => {
            const isExpanded = expandedCourse === course.id;
            const progress = getProgressPercent(course);
            const completedCount = getCompletedCount(course);
            
            return (
              <GlassCard
                key={course.id}
                hoverable={false}
                className="bg-slate-950/40 border border-white/5 p-6 flex flex-col gap-4 overflow-hidden relative"
              >
                {/* Course top banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gold uppercase tracking-wider font-bold font-display">
                      {course.code} &bull; Enrolled Category
                    </span>
                    <h3 className="text-lg md:text-xl font-display font-extrabold text-white mt-1">
                      {course.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleCourse(course.id)}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white"
                    >
                      {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-2 border-t border-white/5 pt-4 mt-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-display font-semibold">Syllabus Progress</span>
                    <span className="text-gold font-bold">{progress}% Completed ({completedCount}/{course.syllabus.length})</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-gold to-gold-dark rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Mini LMS lecture browser checklist */}
                {isExpanded && (
                  <div className="border-t border-white/5 pt-5 mt-2 animate-fade-in flex flex-col gap-4">
                    <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <CheckSquare className="h-4 w-4 text-gold" /> Lecture Modules Syllabus Checklist
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                      {course.syllabus.map((lesson, idx) => {
                        const isDone = !!completedLessons[`${course.id}-${idx}`];
                        return (
                          <div
                            key={idx}
                            onClick={() => handleToggleLesson(course.id, idx)}
                            className={`flex items-start gap-3.5 p-4 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 cursor-pointer select-none transition-all ${
                              isDone ? 'border-gold/30 bg-gold/3 shadow-[0_0_15px_rgba(212,175,55,0.02)]' : ''
                            }`}
                          >
                            <button
                              type="button"
                              className={`shrink-0 mt-0.5 rounded text-gold transition-colors`}
                            >
                              {isDone ? (
                                <CheckSquare className="h-4.5 w-4.5 text-gold" />
                              ) : (
                                <Square className="h-4.5 w-4.5 text-slate-500 hover:text-slate-300" />
                              )}
                            </button>

                            <div className="flex flex-col">
                              <span className={`text-xs font-semibold leading-snug transition-colors ${
                                isDone ? 'text-slate-200 line-through decoration-slate-600' : 'text-slate-300'
                              }`}>
                                {lesson}
                              </span>
                              <span className="text-[9px] text-slate-500 mt-1 uppercase font-bold tracking-wider">
                                Week {idx + 1} module
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {progress === 100 && (
                      <div className="p-4 rounded-xl bg-gold/5 border border-gold/20 flex items-center gap-3 mt-4 text-gold text-xs font-medium animate-bounce">
                        <Trophy className="h-5 w-5 animate-pulse text-gold" />
                        <span>Syllabus completed! You can now view and download your verified gold-seal completion certificate.</span>
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

export default StudentCourses;
