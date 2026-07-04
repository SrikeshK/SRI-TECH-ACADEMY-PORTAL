import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Search, Filter } from 'lucide-react';
import { Course, Student } from '../../types';
import { courseService, studentService, courseProgressService, subscribeToAllCourses } from '../../services';
import PageWrapper from '../../components/ui/PageWrapper';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import CourseCard from '../../components/admin/courses/CourseCard';
import CourseDetails from '../../components/admin/courses/CourseDetails';

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courseAnalytics, setCourseAnalytics] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [initialTab, setInitialTab] = useState<'overview' | 'syllabus' | 'students'>('overview');

  // Fetch analytics for a list of courses (called when realtime snapshot arrives)
  const fetchAnalytics = useCallback(async (allCourses: Course[]) => {
    const analyticsMap: Record<string, any> = {};
    for (const course of allCourses) {
      try {
        const stats = await courseProgressService.getCourseAnalytics(course.id);
        analyticsMap[course.id] = stats;
      } catch {
        analyticsMap[course.id] = { averageCompletion: 0 };
      }
    }
    setCourseAnalytics(analyticsMap);
  }, []);

  // Fetch students once (they don't need realtime here)
  const fetchStudents = useCallback(async () => {
    try {
      const allStudents = await studentService.getAll();
      setStudents(allStudents);
    } catch (err) {
      console.error('[AdminCourses] Error fetching students:', err);
    }
  }, []);

  useEffect(() => {
    fetchStudents();

    // ── Realtime subscription to Firestore `courses` collection ──
    const unsubscribe = subscribeToAllCourses((updatedCourses) => {
      setCourses(updatedCourses);
      setLoading(false);
      // Refresh analytics whenever course list changes
      fetchAnalytics(updatedCourses);

      // If viewing a course detail, keep it in sync too
      setSelectedCourse((prev) => {
        if (!prev) return null;
        const refreshed = updatedCourses.find((c) => c.id === prev.id);
        return refreshed ?? null;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [fetchStudents, fetchAnalytics]);

  const handleUpdateCourse = async (updatedCourse: Course) => {
    try {
      const result = await courseService.update(updatedCourse.id, updatedCourse);
      // onSnapshot will automatically update the courses list
      setSelectedCourse(result);

      // Update analytics for this course
      const stats = await courseProgressService.getCourseAnalytics(result.id);
      setCourseAnalytics((prev) => ({ ...prev, [result.id]: stats }));
    } catch (err) {
      console.error('[AdminCourses] Error updating course:', err);
    }
  };

  const filteredCourses = courses.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.category ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedCourse) {
    return (
      <PageWrapper className="flex-1">
        <CourseDetails
          course={selectedCourse}
          initialTab={initialTab}
          onBack={() => setSelectedCourse(null)}
          onUpdateCourse={handleUpdateCourse}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="flex-1 flex flex-col gap-6">
      <PageHeader
        title="Course Management"
        subtitle="Manage academy syllabus, modules, and track student completion progress."
        icon={BookOpen}
        iconColor="text-gold"
        breadcrumbRoot="Admin"
        breadcrumbRootPath="/admin"
        actions={
          <Button
            variant="gold"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            className="font-semibold shadow-lg shadow-gold/20"
          >
            Create New Course
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search courses by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/5 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold/50 text-sm transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="glass" size="sm" leftIcon={<Filter className="h-4 w-4" />}>
            Filter
          </Button>
          <span className="text-xs text-slate-500 font-medium ml-2">
            Showing {filteredCourses.length} Courses
          </span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses found"
          description={searchQuery ? `No courses matching "${searchQuery}"` : 'Start by creating your first academy course.'}
          action={
            searchQuery ? undefined : (
              <Button variant="gold" size="sm" onClick={() => {}}>
                Create Course
              </Button>
            )
          }
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredCourses.map((course) => {
            const count = students.filter(
              (s) => s.enrolledCourses?.includes(course.id) || s.courseIds?.includes(course.id)
            ).length;
            return (
              <CourseCard
                key={course.id}
                course={course}
                studentCount={count}
                averageProgress={courseAnalytics[course.id]?.averageCompletion || 0}
                onClick={() => {
                  setInitialTab('overview');
                  setSelectedCourse(course);
                }}
                onViewSyllabus={(e) => {
                  e.stopPropagation();
                  setInitialTab('syllabus');
                  setSelectedCourse(course);
                }}
                onViewProgress={(e) => {
                  e.stopPropagation();
                  setInitialTab('students');
                  setSelectedCourse(course);
                }}
              />
            );
          })}
        </motion.div>
      )}
    </PageWrapper>
  );
};

export default AdminCourses;
