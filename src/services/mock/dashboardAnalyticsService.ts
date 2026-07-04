// ============================================================
// SRI TECH ACADEMY PORTAL – Dashboard Analytics Service
// Computes all academy-focused metrics from the unified mockDb.
// All functions are Firebase-ready: swap mockDb calls with
// Firestore queries when USE_FIREBASE = true.
// ============================================================

import { mockDb } from '../../firebase/mockDb';
import { studentService as mockStudentService } from './studentService';
import { studentService as firebaseStudentService } from '../firebase/studentService';
import { USE_FIREBASE } from '../config';

const studentService = USE_FIREBASE ? firebaseStudentService : mockStudentService;

// ────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────

export interface DashboardStatistics {
  totalStudents: number;
  activeStudents: number;
  totalCourses: number;
  certificatesIssued: number;
  certificatesPending: number;
}

export interface CourseDistributionItem {
  courseId: string;
  courseName: string;
  studentCount: number;
  color: string;
  bgColor: string;
}

export interface CourseCombinationItem {
  combination: string;
  courseIds: string[];
  studentCount: number;
  percentage: number;
}

export interface CertificateStatistics {
  issued: number;
  pending: number;
  total: number;
  issuedPercentage: number;
  pendingPercentage: number;
}

export interface AcademyProgressData {
  averagePercentage: number;
  completedModules: number;
  totalModules: number;
  studentProgressList: { studentId: string; studentName: string; percentage: number }[];
}

export interface DashboardInsights {
  mostPopularCourse: string;
  mostPopularCourseStudents: number;
  mostPopularCombination: string;
  mostPopularCombinationStudents: number;
  certificatesPending: number;
  activeStudents: number;
  averageProgress: number;
  topPerformingStudent: string;
}

// ────────────────────────────────────────────────────────────
// COURSE COLORS (per course – fixed palette)
// ────────────────────────────────────────────────────────────

const COURSE_COLORS: Record<string, { color: string; bgColor: string }> = {
  c1: { color: '#60a5fa', bgColor: 'rgba(96,165,250,0.15)' },   // C – blue
  c2: { color: '#a78bfa', bgColor: 'rgba(167,139,250,0.15)' },  // C++ – purple
  c3: { color: '#34d399', bgColor: 'rgba(52,211,153,0.15)' },   // Python – emerald
  c4: { color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)' },   // Java – amber
  c5: { color: '#f472b6', bgColor: 'rgba(244,114,182,0.15)' },  // DMO – pink
  c6: { color: '#fb923c', bgColor: 'rgba(251,146,60,0.15)' },   // Tally – orange
  c7: { color: '#38bdf8', bgColor: 'rgba(56,189,248,0.15)' },   // HTML CSS JS – sky
};

const DEFAULT_COLOR = { color: '#D4AF37', bgColor: 'rgba(212,175,55,0.15)' };

// ────────────────────────────────────────────────────────────
// SERVICE CLASS
// ────────────────────────────────────────────────────────────

class DashboardAnalyticsService {

  /**
   * Section 1 – Hero Statistics
   * Returns total/active students, courses, and certificate counts.
   */
  async getDashboardStatistics(): Promise<DashboardStatistics> {
    const [students, courses, certificates] = await Promise.all([
      studentService.getAll(),
      Promise.resolve(mockDb.getCourses()),
      Promise.resolve(mockDb.getCertificates()),
    ]);

    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'Active').length;
    const totalCourses = courses.length;
    const certificatesIssued = certificates.filter(
      c => c.status === 'Issued' || c.status === 'Approved'
    ).length;
    const certificatesPending = certificates.filter(
      c => c.status === 'Pending'
    ).length;

    return { totalStudents, activeStudents, totalCourses, certificatesIssued, certificatesPending };
  }

  /**
   * Section 2 – Course Enrollment Distribution
   * Returns how many students are enrolled in each course.
   */
  async getCourseDistribution(): Promise<CourseDistributionItem[]> {
    const [students, courses] = await Promise.all([
      studentService.getAll(),
      Promise.resolve(mockDb.getCourses()),
    ]);

    return courses
      .map(course => {
        const studentCount = students.filter(
          s => s.courseIds?.includes(course.id) || s.enrolledCourses?.includes(course.id)
        ).length;
        const palette = COURSE_COLORS[course.id] ?? DEFAULT_COLOR;
        return {
          courseId: course.id,
          courseName: course.name,
          studentCount,
          color: palette.color,
          bgColor: palette.bgColor,
        };
      })
      .sort((a, b) => b.studentCount - a.studentCount); // Highest first
  }

  /**
   * Section 3 – Course Combination Analytics
   * Analyzes multi-course enrollments and returns the top combinations.
   */
  async getCourseCombinationAnalytics(): Promise<CourseCombinationItem[]> {
    const [students, courses] = await Promise.all([
      studentService.getAll(),
      Promise.resolve(mockDb.getCourses()),
    ]);

    const courseNameMap: Record<string, string> = {};
    courses.forEach(c => { courseNameMap[c.id] = c.name; });

    // Count combinations
    const comboMap: Map<string, { courseIds: string[]; count: number }> = new Map();

    students.forEach(student => {
      const enrolled = (student.courseIds ?? student.enrolledCourses ?? []).sort();
      if (enrolled.length < 2) return; // Only multi-course students

      // Generate all pairs
      for (let i = 0; i < enrolled.length; i++) {
        for (let j = i + 1; j < enrolled.length; j++) {
          const key = `${enrolled[i]}+${enrolled[j]}`;
          if (comboMap.has(key)) {
            comboMap.get(key)!.count++;
          } else {
            comboMap.set(key, { courseIds: [enrolled[i], enrolled[j]], count: 1 });
          }
        }
        // Also track full combination if 3+ courses
        if (enrolled.length >= 3 && i === 0) {
          const fullKey = enrolled.join('+');
          const label = enrolled.map(id => courseNameMap[id] ?? id).join(' + ');
          if (!comboMap.has(fullKey)) {
            comboMap.set(fullKey, { courseIds: enrolled, count: 0 });
          }
          comboMap.get(fullKey)!.count++;
        }
      }
    });

    // Convert to array and sort
    const total = students.length || 1;
    const results: CourseCombinationItem[] = Array.from(comboMap.entries())
      .map(([_key, val]) => ({
        combination: val.courseIds.map(id => courseNameMap[id] ?? id).join(' + '),
        courseIds: val.courseIds,
        studentCount: val.count,
        percentage: Math.round((val.count / total) * 100),
      }))
      .filter(item => item.studentCount > 0)
      .sort((a, b) => b.studentCount - a.studentCount)
      .slice(0, 8); // Top 8 combinations

    return results;
  }

  /**
   * Section 4 – Certificate Statistics
   * Returns issued vs pending counts for the donut chart.
   */
  async getCertificateStatistics(): Promise<CertificateStatistics> {
    const certificates = mockDb.getCertificates();
    const issued = certificates.filter(c => c.status === 'Issued' || c.status === 'Approved').length;
    const pending = certificates.filter(c => c.status === 'Pending').length;
    const total = issued + pending;
    return {
      issued,
      pending,
      total,
      issuedPercentage: total > 0 ? Math.round((issued / total) * 100) : 0,
      pendingPercentage: total > 0 ? Math.round((pending / total) * 100) : 0,
    };
  }

  /**
   * Section 5 – Academy Progress
   * Computes average syllabus completion percentage across all students and courses.
   */
  async getAcademyProgress(): Promise<AcademyProgressData> {
    const [students, courses] = await Promise.all([
      studentService.getAll(),
      Promise.resolve(mockDb.getCourses()),
    ]);
    const progressList = mockDb.getStudentProgress();

    const courseModuleMap: Record<string, number> = {};
    courses.forEach(c => {
      courseModuleMap[c.id] = c.modules?.filter(m => m.isActive).length ?? 0;
    });

    let totalWeightedPercent = 0;
    let totalEnrollments = 0;
    let completedModules = 0;
    let totalModules = 0;

    const studentProgressList: { studentId: string; studentName: string; percentage: number }[] = [];

    students.forEach(student => {
      const enrolled = student.courseIds ?? student.enrolledCourses ?? [];
      if (enrolled.length === 0) return;

      let studentTotalPercent = 0;
      let studentEnrollments = 0;

      enrolled.forEach(courseId => {
        const totalMods = courseModuleMap[courseId] ?? 0;
        if (totalMods === 0) return;

        const sp = progressList.find(
          p => p.studentId === student.id && p.courseId === courseId
        );
        const completedCount = sp?.completedModuleIds?.filter(
          mId => courses.find(c => c.id === courseId)?.modules?.some(m => m.id === mId && m.isActive)
        ).length ?? 0;

        const pct = Math.round((completedCount / totalMods) * 100);
        studentTotalPercent += pct;
        studentEnrollments++;
        totalEnrollments++;
        totalWeightedPercent += pct;
        completedModules += completedCount;
        totalModules += totalMods;
      });

      if (studentEnrollments > 0) {
        studentProgressList.push({
          studentId: student.id,
          studentName: student.name,
          percentage: Math.round(studentTotalPercent / studentEnrollments),
        });
      }
    });

    const averagePercentage =
      totalEnrollments > 0 ? Math.round(totalWeightedPercent / totalEnrollments) : 0;

    return { averagePercentage, completedModules, totalModules, studentProgressList };
  }

  /**
   * Section 6 – Smart Insights Panel
   * Returns aggregated insight data for quick display.
   */
  async getDashboardInsights(): Promise<DashboardInsights> {
    const [stats, distribution, combos, progress] = await Promise.all([
      this.getDashboardStatistics(),
      this.getCourseDistribution(),
      this.getCourseCombinationAnalytics(),
      this.getAcademyProgress(),
    ]);

    const mostPopularCourse = distribution[0]?.courseName ?? 'N/A';
    const mostPopularCourseStudents = distribution[0]?.studentCount ?? 0;
    const mostPopularCombination = combos[0]?.combination ?? 'N/A';
    const mostPopularCombinationStudents = combos[0]?.studentCount ?? 0;

    const sorted = [...progress.studentProgressList].sort((a, b) => b.percentage - a.percentage);
    const topPerformingStudent = sorted[0]?.studentName ?? 'N/A';

    return {
      mostPopularCourse,
      mostPopularCourseStudents,
      mostPopularCombination,
      mostPopularCombinationStudents,
      certificatesPending: stats.certificatesPending,
      activeStudents: stats.activeStudents,
      averageProgress: progress.averagePercentage,
      topPerformingStudent,
    };
  }

  /**
   * Load ALL dashboard data in a single parallel call.
   * Used by the dashboard page to minimize re-renders.
   */
  async loadAll() {
    const [statistics, courseDistribution, combinations, certificateStats, academyProgress, insights] =
      await Promise.all([
        this.getDashboardStatistics(),
        this.getCourseDistribution(),
        this.getCourseCombinationAnalytics(),
        this.getCertificateStatistics(),
        this.getAcademyProgress(),
        this.getDashboardInsights(),
      ]);

    return { statistics, courseDistribution, combinations, certificateStats, academyProgress, insights };
  }
}

export const dashboardAnalyticsService = new DashboardAnalyticsService();
