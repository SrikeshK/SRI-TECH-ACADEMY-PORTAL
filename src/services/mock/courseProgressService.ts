import { StudentProgress, Student } from '../../types';
import { mockDb } from '../../firebase/mockDb';
import { studentService as mockStudentService } from './studentService';
import { studentService as firebaseStudentService } from '../firebase/studentService';
import { USE_FIREBASE } from '../config';

const studentService = USE_FIREBASE ? firebaseStudentService : mockStudentService;

class MockCourseProgressService {
  async getStudentProgress(studentId: string, courseId: string): Promise<StudentProgress | null> {
    const progressList = mockDb.getStudentProgress();
    return progressList.find(p => p.studentId === studentId && p.courseId === courseId) || null;
  }

  async getAllStudentProgressForCourse(courseId: string): Promise<StudentProgress[]> {
    const progressList = mockDb.getStudentProgress();
    return progressList.filter(p => p.courseId === courseId);
  }

  async getCourseStudents(courseId: string): Promise<Student[]> {
    const students = await studentService.getAll();
    return students.filter(s => s.courseIds?.includes(courseId) || s.enrolledCourses?.includes(courseId));
  }

  async updateModuleCompletion(
    studentId: string,
    courseId: string,
    moduleId: string,
    completed: boolean
  ): Promise<StudentProgress> {
    const progressList = mockDb.getStudentProgress();
    let studentProgress = progressList.find(
      p => p.studentId === studentId && p.courseId === courseId
    );

    if (!studentProgress) {
      studentProgress = {
        id: `sp_${studentId}_${courseId}`,
        studentId,
        courseId,
        completedModuleIds: []
      };
    } else {
      studentProgress = {
        ...studentProgress,
        completedModuleIds: [...studentProgress.completedModuleIds]
      };
    }

    if (completed) {
      if (!studentProgress.completedModuleIds.includes(moduleId)) {
        studentProgress.completedModuleIds.push(moduleId);
      }
    } else {
      studentProgress.completedModuleIds = studentProgress.completedModuleIds.filter(
        id => id !== moduleId
      );
    }

    return mockDb.saveStudentProgress(studentProgress);
  }

  calculateProgressPercentage(completedCount: number, totalCount: number): number {
    if (totalCount === 0) return 0;
    const percentage = (completedCount / totalCount) * 100;
    return Math.round(percentage * 10) / 10; // Round to 1 decimal place (e.g. 66.7)
  }

  async getCourseAnalytics(courseId: string) {
    const course = mockDb.getCourse(courseId);
    if (!course) return null;

    const progressList = mockDb.getStudentProgress();
    const courseProgress = progressList.filter(p => p.courseId === courseId);
    
    const courseStudents = await this.getCourseStudents(courseId);
    const totalStudents = courseStudents.length;
    
    const activeModules = course.modules?.filter(m => m.isActive) || [];
    const totalModules = activeModules.length;

    let totalCompletionPercentage = 0;
    let completedStudents = 0;
    
    const distribution = {
      beginner: 0,     // 0-25%
      intermediate: 0, // 26-50%
      advanced: 0,     // 51-75%
      expert: 0        // 76-100%
    };

    courseStudents.forEach(student => {
      const sp = courseProgress.find(p => p.studentId === student.id);
      const completedCount = sp?.completedModuleIds.filter(id => 
        activeModules.some(m => m.id === id)
      ).length || 0;
      
      const progress = this.calculateProgressPercentage(completedCount, totalModules);
      totalCompletionPercentage += progress;
      if (progress === 100 && totalModules > 0) {
        completedStudents++;
      }

      if (progress <= 25) {
        distribution.beginner++;
      } else if (progress <= 50) {
        distribution.intermediate++;
      } else if (progress <= 75) {
        distribution.advanced++;
      } else {
        distribution.expert++;
      }
    });

    const averageCompletion =
      totalStudents > 0 ? Math.round((totalCompletionPercentage / totalStudents) * 10) / 10 : 0;

    return {
      totalStudents,
      averageCompletion,
      completedStudents,
      studentsInProgress: totalStudents - completedStudents,
      distribution
    };
  }

  // Sync subscription shim – returns current mock data immediately and never updates
  subscribeToStudentProgress(
    studentId: string,
    courseId: string,
    callback: (progress: StudentProgress | null) => void
  ): () => void {
    const progressList = mockDb.getStudentProgress();
    const record = progressList.find(p => p.studentId === studentId && p.courseId === courseId) || null;
    callback(record);
    return () => {};
  }

  subscribeToAllStudentProgress(
    studentId: string,
    callback: (progressList: StudentProgress[]) => void
  ): () => void {
    const progressList = mockDb.getStudentProgress().filter(p => p.studentId === studentId);
    callback(progressList);
    return () => {};
  }
}

export const courseProgressService = new MockCourseProgressService();
