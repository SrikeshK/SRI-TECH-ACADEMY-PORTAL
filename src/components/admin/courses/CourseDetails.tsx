import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  Layers,
  BookOpen,
  TrendingUp,
  Calendar,
  Search,
  LayoutDashboard,
  ClipboardList
} from 'lucide-react';
import { Course, Student, StudentProgress } from '../../../types';
import { studentService, courseProgressService } from '../../../services';
import Button from '../../ui/Button';
import GlassCard from '../../ui/GlassCard';
import Badge from '../../ui/Badge';
import ModuleManager from './ModuleManager';
import StudentProgressTable from './StudentProgressTable';
import CourseAnalytics from './CourseAnalytics';

interface CourseDetailsProps {
  course: Course;
  initialTab?: 'overview' | 'syllabus' | 'students';
  onBack: () => void;
  onUpdateCourse: (updatedCourse: Course) => void;
}

const CourseDetails: React.FC<CourseDetailsProps> = ({ course, initialTab = 'overview', onBack, onUpdateCourse }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'syllabus' | 'students'>(initialTab);
  const [students, setStudents] = useState<Student[]>([]);
  const [progressData, setProgressData] = useState<StudentProgress[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, course.id]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const allStudents = await studentService.getAll();
        const enrolledStudents = allStudents.filter(s => s.enrolledCourses?.includes(course.id) || s.courseIds?.includes(course.id));
        setStudents(enrolledStudents);

        const progress = await courseProgressService.getAllStudentProgressForCourse(course.id);
        setProgressData(progress);

        const stats = await courseProgressService.getCourseAnalytics(course.id);
        setAnalytics(stats);
      } catch (err) {
        console.error('Error fetching course details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [course.id]);

  const handleToggleModule = async (studentId: string, moduleId: string, completed: boolean) => {
    try {
      const updatedProgress = await courseProgressService.updateModuleCompletion(studentId, course.id, moduleId, completed);
      setProgressData(prev => {
        const index = prev.findIndex(p => p.studentId === studentId && p.courseId === course.id);
        if (index > -1) {
          const newProgress = [...prev];
          newProgress[index] = updatedProgress;
          return newProgress;
        }
        return [...prev, updatedProgress];
      });

      // Refresh analytics
      const stats = await courseProgressService.getCourseAnalytics(course.id);
      setAnalytics(stats);
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'syllabus', label: 'Syllabus', icon: ClipboardList },
    { id: 'students', label: 'Student Progress', icon: Users },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-gold/30 text-slate-400 hover:text-gold transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge color="gold" className="text-[10px] uppercase font-bold">{course.category}</Badge>
            <span className="text-slate-500 text-xs">ID: {course.id}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-white">{course.name}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl w-fit border border-white/5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gold text-slate-950 shadow-lg shadow-gold/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'overview' && analytics && (
          <div className="flex flex-col gap-6">
            <CourseAnalytics analytics={analytics} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <GlassCard className="lg:col-span-2 p-6">
                <h3 className="text-lg font-display font-bold text-white mb-4">Course Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Modules Count</span>
                    <span className="text-lg font-semibold text-slate-200">{course.modules.length} Active Modules</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Materials</span>
                    <span className="text-lg font-semibold text-slate-200">{course.materials.length} Resources</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Enrolled Students</span>
                    <span className="text-lg font-semibold text-slate-200">{students.length} Students</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Category</span>
                    <span className="text-lg font-semibold text-slate-200">{course.category}</span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h3 className="text-lg font-display font-bold text-white mb-4">Quick Actions</h3>
                <div className="flex flex-col gap-3">
                  <Button variant="glass" className="justify-start text-xs">Download Enrollment Report</Button>
                  <Button variant="glass" className="justify-start text-xs text-rose-400 border-rose-500/10 hover:bg-rose-500/5">Archive Course</Button>
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {activeTab === 'syllabus' && (
          <GlassCard className="p-6">
            <ModuleManager
              modules={course.modules}
              onUpdate={(modules) => onUpdateCourse({ ...course, modules })}
            />
          </GlassCard>
        )}

        {activeTab === 'students' && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-display font-bold text-white">Enrollment Progress</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search student..."
                  className="w-full bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-gold/30"
                />
              </div>
            </div>

            <StudentProgressTable
              students={students}
              modules={course.modules}
              progressData={progressData}
              onToggleModule={handleToggleModule}
              calculateProgress={courseProgressService.calculateProgressPercentage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetails;
