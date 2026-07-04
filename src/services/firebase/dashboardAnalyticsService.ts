// ============================================================
// SRI TECH ACADEMY PORTAL – Firestore Dashboard Analytics Engine
// Computes all academy-focused metrics dynamically from Firestore.
// ============================================================

import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

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
  highestAttendanceCourse?: string;
  lowestAttendanceCourse?: string;
  highestPerformingCourse?: string;
  highestRevenueCourse?: string;
  studentsAwaitingPaymentCount?: number;
}

export interface DashboardData {
  statistics: DashboardStatistics;
  courseDistribution: CourseDistributionItem[];
  combinations: CourseCombinationItem[];
  certificateStats: CertificateStatistics;
  academyProgress: AcademyProgressData;
  insights: DashboardInsights;
}

// ────────────────────────────────────────────────────────────
// SERVICE CLASS
// ────────────────────────────────────────────────────────────

class FirebaseDashboardAnalyticsService {
  private students: any[] = [];
  private courses: any[] = [];
  private attendance: any[] = [];
  private marks: any[] = [];
  private materials: any[] = [];
  private fees: any[] = [];
  private certificates: any[] = [];

  private isLoaded = false;
  private listeners: Set<(data: DashboardData) => void> = new Set();
  private unsubscribes: (() => void)[] = [];

  /**
   * One-time load of all data in parallel.
   */
  async loadAll(): Promise<DashboardData> {
    const [
      studentsSnap,
      coursesSnap,
      attendanceSnap,
      marksSnap,
      materialsSnap,
      feesSnap,
      certificatesSnap
    ] = await Promise.all([
      getDocs(collection(db, 'students')),
      getDocs(collection(db, 'courses')),
      getDocs(collection(db, 'attendance')),
      getDocs(collection(db, 'marks')),
      getDocs(collection(db, 'materials')),
      getDocs(collection(db, 'fees')),
      getDocs(collection(db, 'certificates')).catch(() => ({ docs: [] }) as any)
    ]);

    this.students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    this.courses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    this.attendance = attendanceSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    this.marks = marksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    this.materials = materialsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    this.fees = feesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    this.certificates = certificatesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    this.isLoaded = true;

    return this.calculateAll();
  }

  /**
   * Subscribe to real-time dashboard analytics.
   * Attaches Firestore onSnapshot listeners to all relevant collections.
   */
  subscribe(callback: (data: DashboardData) => void): () => void {
    this.listeners.add(callback);

    if (this.listeners.size === 1) {
      this.setupRealtimeListeners();
    } else if (this.isLoaded) {
      callback(this.calculateAll());
    }

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.cleanupListeners();
      }
    };
  }

  private setupRealtimeListeners() {
    this.cleanupListeners();

    const onCollectionUpdate = (key: string, docs: any[]) => {
      (this as any)[key] = docs;
      this.isLoaded = true;
      if (this.listeners.size > 0) {
        const computed = this.calculateAll();
        this.listeners.forEach(cb => cb(computed));
      }
    };

    const collections = ['students', 'courses', 'attendance', 'marks', 'materials', 'fees', 'certificates'];

    collections.forEach(colName => {
      const unsub = onSnapshot(
        collection(db, colName),
        (snap) => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          onCollectionUpdate(colName, docs);
        },
        (err) => {
          console.warn(`[dashboardAnalyticsService] Error listening to ${colName}:`, err);
        }
      );
      this.unsubscribes.push(unsub);
    });
  }

  private cleanupListeners() {
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
  }

  /**
   * Recalculates all dashboard metrics.
   */
  private calculateAll(): DashboardData {
    return {
      statistics: this.getDashboardStatistics(),
      courseDistribution: this.getCourseDistribution(),
      combinations: this.getCourseCombinationAnalytics(),
      certificateStats: this.getCertificateStatistics(),
      academyProgress: this.getAcademyProgressData(),
      insights: this.getAcademyInsights()
    };
  }

  // ─── Section 1: Hero Statistics ───
  getDashboardStatistics(): DashboardStatistics {
    const totalStudents = this.students.length;
    const activeStudents = this.students.filter(s => s.status === 'Active').length;
    const totalCourses = this.courses.length;
    const certificatesIssued = this.certificates.filter(
      c => c.status === 'Issued' || c.status === 'Approved'
    ).length;
    const certificatesPending = this.certificates.filter(
      c => c.status === 'Pending'
    ).length;

    return {
      totalStudents,
      activeStudents,
      totalCourses,
      certificatesIssued,
      certificatesPending
    };
  }

  // ─── Section 2: Course Enrollment Distribution ───
  getEnrollmentAnalytics() {
    return {
      courseDistribution: this.getCourseDistribution(),
      combinations: this.getCourseCombinationAnalytics()
    };
  }

  private getCourseDistribution(): CourseDistributionItem[] {
    const COURSE_COLOR_MAP: Record<string, { color: string; bgColor: string }> = {
      'c': { color: '#60a5fa', bgColor: 'rgba(96,165,250,0.15)' },
      'c++': { color: '#a78bfa', bgColor: 'rgba(167,139,250,0.15)' },
      'python': { color: '#34d399', bgColor: 'rgba(52,211,153,0.15)' },
      'java': { color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)' },
      'dmo': { color: '#f472b6', bgColor: 'rgba(244,114,182,0.15)' },
      'tally': { color: '#fb923c', bgColor: 'rgba(251,146,60,0.15)' },
      'html css js': { color: '#38bdf8', bgColor: 'rgba(56,189,248,0.15)' },
    };
    const DEFAULT_COLOR = { color: '#D4AF37', bgColor: 'rgba(212,175,55,0.15)' };

    return this.courses
      .map(course => {
        const studentCount = this.students.filter(
          s => s.courseIds?.includes(course.id) || s.enrolledCourses?.includes(course.id)
        ).length;
        const normalized = course.name.trim().toLowerCase();
        const palette = COURSE_COLOR_MAP[normalized] ?? DEFAULT_COLOR;
        return {
          courseId: course.id,
          courseName: course.name,
          studentCount,
          color: palette.color,
          bgColor: palette.bgColor,
        };
      })
      .sort((a, b) => b.studentCount - a.studentCount);
  }

  // ─── Section 3: Course Combination Analytics ───
  private getCourseCombinationAnalytics(): CourseCombinationItem[] {
    const courseNameMap: Record<string, string> = {};
    this.courses.forEach(c => { courseNameMap[c.id] = c.name; });

    const comboMap: Map<string, { courseIds: string[]; count: number }> = new Map();

    this.students.forEach(student => {
      const enrolled = (student.courseIds ?? student.enrolledCourses ?? []).slice().sort();
      if (enrolled.length < 2) return;

      for (let i = 0; i < enrolled.length; i++) {
        for (let j = i + 1; j < enrolled.length; j++) {
          const key = `${enrolled[i]}+${enrolled[j]}`;
          if (comboMap.has(key)) {
            comboMap.get(key)!.count++;
          } else {
            comboMap.set(key, { courseIds: [enrolled[i], enrolled[j]], count: 1 });
          }
        }
        if (enrolled.length >= 3 && i === 0) {
          const fullKey = enrolled.join('+');
          if (!comboMap.has(fullKey)) {
            comboMap.set(fullKey, { courseIds: enrolled, count: 0 });
          }
          comboMap.get(fullKey)!.count++;
        }
      }
    });

    const total = this.students.length || 1;
    return Array.from(comboMap.entries())
      .map(([_key, val]) => ({
        combination: val.courseIds.map(id => courseNameMap[id] ?? id).join(' + '),
        courseIds: val.courseIds,
        studentCount: val.count,
        percentage: Math.round((val.count / total) * 100),
      }))
      .filter(item => item.studentCount > 0)
      .sort((a, b) => b.studentCount - a.studentCount)
      .slice(0, 8);
  }

  // ─── Section 4: Attendance Analytics ───
  getAttendanceAnalytics() {
    const totalRecords = this.attendance.length;
    const presentCount = this.attendance.filter(r => r.status === 'Present').length;
    const lateCount = this.attendance.filter(r => r.status === 'Late').length;
    const absentCount = this.attendance.filter(r => r.status === 'Absent').length;
    const leaveCount = this.attendance.filter(r => r.status === 'Leave').length;

    const overallAttendancePercentage = totalRecords > 0
      ? Math.round(((presentCount + lateCount) / totalRecords) * 100)
      : 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecords = this.attendance.filter(r => r.date === todayStr);

    const presentToday = todayRecords.filter(r => r.status === 'Present').length;
    const absentToday = todayRecords.filter(r => r.status === 'Absent').length;
    const lateToday = todayRecords.filter(r => r.status === 'Late').length;
    const leaveToday = todayRecords.filter(r => r.status === 'Leave').length;

    return {
      overallAttendancePercentage,
      presentToday,
      absentToday,
      lateToday,
      leaveToday,
      presentCount,
      lateCount,
      absentCount,
      leaveCount,
      totalRecords
    };
  }

  // ─── Section 5: Academic Performance (Marks) ───
  getMarksAnalytics() {
    const marksByStudent: Record<string, any[]> = {};
    this.marks.forEach(m => {
      if (!m.studentId) return;
      if (!marksByStudent[m.studentId]) {
        marksByStudent[m.studentId] = [];
      }
      marksByStudent[m.studentId].push(m);
    });

    const studentAverages: number[] = [];
    const studentProgressList: { studentId: string; studentName: string; percentage: number }[] = [];

    const studentNameMap: Record<string, string> = {};
    this.students.forEach(s => { studentNameMap[s.id] = s.name; });

    Object.entries(marksByStudent).forEach(([studentId, studentMarks]) => {
      let sum = 0;
      studentMarks.forEach(m => {
        const theory = Number(m.theoryMarks) || 0;
        const practical = Number(m.practicalMarks) || 0;
        sum += (theory + practical) / 2;
      });
      const overallAvg = Math.round((sum / studentMarks.length) * 10) / 10;
      studentAverages.push(overallAvg);
      studentProgressList.push({
        studentId,
        studentName: studentNameMap[studentId] || studentMarks[0]?.studentName || 'Unknown Student',
        percentage: Math.round(overallAvg)
      });
    });

    const totalStudentsWithMarks = studentAverages.length;
    const highestOverallAverage = totalStudentsWithMarks > 0 ? Math.max(...studentAverages) : 0;
    const lowestOverallAverage = totalStudentsWithMarks > 0 ? Math.min(...studentAverages) : 0;
    const academyAverage = totalStudentsWithMarks > 0
      ? Math.round((studentAverages.reduce((sum, val) => sum + val, 0) / totalStudentsWithMarks) * 10) / 10
      : 0;

    const passCount = studentAverages.filter(avg => avg >= 50).length;
    const failCount = totalStudentsWithMarks - passCount;
    const passPercentage = totalStudentsWithMarks > 0 ? Math.round((passCount / totalStudentsWithMarks) * 100) : 0;
    const failPercentage = totalStudentsWithMarks > 0 ? Math.round((failCount / totalStudentsWithMarks) * 100) : 0;

    let completedModules = 0;
    this.marks.forEach(m => {
      const avg = ((Number(m.theoryMarks) || 0) + (Number(m.practicalMarks) || 0)) / 2;
      if (avg >= 50) completedModules++;
    });
    const totalModules = this.marks.length;

    return {
      highestOverallAverage,
      lowestOverallAverage,
      academyAverage,
      passPercentage,
      failPercentage,
      studentProgressList,
      completedModules,
      totalModules
    };
  }

  // ─── Section 6: Financial Analytics (Fees) ───
  getFeeAnalytics() {
    let expectedRevenue = 0;
    let collectedRevenue = 0;
    let pendingRevenue = 0;

    this.fees.forEach(f => {
      expectedRevenue += Number(f.finalFee || f.finalPayableAmount) || 0;
      collectedRevenue += Number(f.paidAmount) || 0;
      pendingRevenue += Number(f.remainingAmount) || 0;
    });

    const collectionPercentage = expectedRevenue > 0
      ? Math.round((collectedRevenue / expectedRevenue) * 100)
      : 0;

    return {
      expectedRevenue,
      collectedRevenue,
      pendingRevenue,
      collectionPercentage
    };
  }

  // ─── Section 7: Materials Analytics ───
  getMaterialAnalytics() {
    const totalMaterials = this.materials.length;

    const courseNameMap: Record<string, string> = {};
    this.courses.forEach(c => { courseNameMap[c.id] = c.name; });

    const materialsPerCourseMap: Record<string, number> = {};
    this.materials.forEach(m => {
      const name = courseNameMap[m.courseId] || m.courseName || m.courseId || 'Unassigned';
      materialsPerCourseMap[name] = (materialsPerCourseMap[name] || 0) + 1;
    });

    const materialsPerCourse = Object.entries(materialsPerCourseMap).map(([courseName, count]) => ({
      courseName,
      count
    }));

    const recentlyUploaded = this.materials
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.uploadedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.uploadedAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);

    return {
      totalMaterials,
      materialsPerCourse,
      recentlyUploaded
    };
  }

  // ─── Section 8: Academy Insights ───
  getAcademyInsights(): DashboardInsights {
    const stats = this.getDashboardStatistics();
    const distribution = this.getCourseDistribution();
    const combos = this.getCourseCombinationAnalytics();
    const progress = this.getAcademyProgressData();

    const mostPopularCourse = distribution[0]?.courseName ?? 'N/A';
    const mostPopularCourseStudents = distribution[0]?.studentCount ?? 0;
    const mostPopularCombination = combos[0]?.combination ?? 'N/A';
    const mostPopularCombinationStudents = combos[0]?.studentCount ?? 0;

    // Highest/Lowest Attendance Course
    const attByCourse: Record<string, { total: number; present: number }> = {};
    this.attendance.forEach(r => {
      if (!r.courseId) return;
      if (!attByCourse[r.courseId]) {
        attByCourse[r.courseId] = { total: 0, present: 0 };
      }
      attByCourse[r.courseId].total++;
      if (r.status === 'Present' || r.status === 'Late') {
        attByCourse[r.courseId].present++;
      }
    });

    const courseNameMap: Record<string, string> = {};
    this.courses.forEach(c => { courseNameMap[c.id] = c.name; });

    let highestAttendanceCourse = 'N/A';
    let highestAttendancePct = -1;
    let lowestAttendanceCourse = 'N/A';
    let lowestAttendancePct = 101;

    Object.entries(attByCourse).forEach(([courseId, counts]) => {
      const pct = (counts.present / counts.total) * 100;
      const name = courseNameMap[courseId] || courseId;
      if (pct > highestAttendancePct) {
        highestAttendancePct = pct;
        highestAttendanceCourse = name;
      }
      if (pct < lowestAttendancePct) {
        lowestAttendancePct = pct;
        lowestAttendanceCourse = name;
      }
    });

    // Highest Performing Course (by average marks)
    const marksByCourse: Record<string, { sum: number; count: number }> = {};
    this.marks.forEach(m => {
      if (!m.courseId) return;
      if (!marksByCourse[m.courseId]) {
        marksByCourse[m.courseId] = { sum: 0, count: 0 };
      }
      const theory = Number(m.theoryMarks) || 0;
      const practical = Number(m.practicalMarks) || 0;
      marksByCourse[m.courseId].sum += (theory + practical) / 2;
      marksByCourse[m.courseId].count++;
    });

    let highestPerformingCourse = 'N/A';
    let highestScore = -1;
    Object.entries(marksByCourse).forEach(([courseId, data]) => {
      const avg = data.sum / data.count;
      const name = courseNameMap[courseId] || courseId;
      if (avg > highestScore) {
        highestScore = avg;
        highestPerformingCourse = name;
      }
    });

    // Highest Revenue Course
    const revenueByCourse: Record<string, number> = {};
    this.fees.forEach(f => {
      const studentEnrolledIds = f.courseIds || [];
      if (studentEnrolledIds.length === 0) return;
      const paid = Number(f.paidAmount) || 0;
      const share = paid / studentEnrolledIds.length;
      studentEnrolledIds.forEach((cId: string) => {
        revenueByCourse[cId] = (revenueByCourse[cId] || 0) + share;
      });
    });

    let highestRevenueCourse = 'N/A';
    let highestRev = -1;
    Object.entries(revenueByCourse).forEach(([courseId, rev]) => {
      const name = courseNameMap[courseId] || courseId;
      if (rev > highestRev) {
        highestRev = rev;
        highestRevenueCourse = name;
      }
    });

    const studentsAwaitingPaymentCount = this.fees.filter(
      f => Number(f.remainingAmount || 0) > 0
    ).length;

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
      highestAttendanceCourse,
      lowestAttendanceCourse,
      highestPerformingCourse,
      highestRevenueCourse,
      studentsAwaitingPaymentCount
    };
  }

  // ─── Certificate Donut breakdown ───
  private getCertificateStatistics(): CertificateStatistics {
    const issued = this.certificates.filter(
      c => c.status === 'Issued' || c.status === 'Approved'
    ).length;
    const pending = this.certificates.filter(c => c.status === 'Pending').length;
    const total = issued + pending;
    return {
      issued,
      pending,
      total,
      issuedPercentage: total > 0 ? Math.round((issued / total) * 100) : 0,
      pendingPercentage: total > 0 ? Math.round((pending / total) * 100) : 0,
    };
  }

  private getAcademyProgressData(): AcademyProgressData {
    return this.getMarksAnalytics() as unknown as AcademyProgressData;
  }
}

export const dashboardAnalyticsService = new FirebaseDashboardAnalyticsService();
