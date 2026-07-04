import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  addDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { StudentProgress, Student } from '../../types';
import { studentService } from './studentService';
import { courseService } from './courseService';

const COLLECTION = 'studentProgress';

class FirebaseCourseProgressService {
  async getStudentProgress(studentId: string, courseId: string): Promise<StudentProgress | null> {
    const colRef = collection(db, COLLECTION);
    const q = query(colRef, where('studentId', '==', studentId), where('courseId', '==', courseId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return {
      ...(docSnap.data() as Omit<StudentProgress, 'id'>),
      id: docSnap.id
    } as StudentProgress;
  }

  async getAllStudentProgressForCourse(courseId: string): Promise<StudentProgress[]> {
    const colRef = collection(db, COLLECTION);
    const q = query(colRef, where('courseId', '==', courseId));
    const snap = await getDocs(q);
    return snap.docs.map(docSnap => ({
      ...(docSnap.data() as Omit<StudentProgress, 'id'>),
      id: docSnap.id
    } as StudentProgress));
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
    const colRef = collection(db, COLLECTION);
    const q = query(colRef, where('studentId', '==', studentId), where('courseId', '==', courseId));
    const snap = await getDocs(q);
    
    let studentProgress: StudentProgress;
    let docRef;

    if (snap.empty) {
      const payload = {
        studentId,
        courseId,
        completedModuleIds: completed ? [moduleId] : []
      };
      docRef = await addDoc(colRef, payload);
      await updateDoc(docRef, { id: docRef.id });
      studentProgress = { ...payload, id: docRef.id };
    } else {
      const docSnap = snap.docs[0];
      docRef = docSnap.ref;
      const currentData = docSnap.data() as Omit<StudentProgress, 'id'>;
      let completedModuleIds = [...(currentData.completedModuleIds || [])];
      
      if (completed) {
        if (!completedModuleIds.includes(moduleId)) {
          completedModuleIds.push(moduleId);
        }
      } else {
        completedModuleIds = completedModuleIds.filter(id => id !== moduleId);
      }

      await updateDoc(docRef, { completedModuleIds });
      studentProgress = {
        ...currentData,
        id: docSnap.id,
        completedModuleIds
      };
    }

    return studentProgress;
  }

  calculateProgressPercentage(completedCount: number, totalCount: number): number {
    if (totalCount === 0) return 0;
    const percentage = (completedCount / totalCount) * 100;
    return Math.round(percentage * 10) / 10;
  }

  async getCourseAnalytics(courseId: string) {
    const course = await courseService.getById(courseId);
    if (!course) return null;

    const progressList = await this.getAllStudentProgressForCourse(courseId);
    const courseStudents = await this.getCourseStudents(courseId);
    const totalStudents = courseStudents.length;
    
    const activeModules = course.modules?.filter(m => m.isActive) || [];
    const totalModules = activeModules.length;

    let totalCompletionPercentage = 0;
    let completedStudents = 0;
    
    const distribution = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
      expert: 0
    };

    courseStudents.forEach(student => {
      const sp = progressList.find(p => p.studentId === student.id);
      const completedCount = sp?.completedModuleIds?.filter(id => 
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

  subscribeToStudentProgress(
    studentId: string,
    courseId: string,
    callback: (progress: StudentProgress | null) => void
  ): () => void {
    const colRef = collection(db, COLLECTION);
    const q = query(colRef, where('studentId', '==', studentId), where('courseId', '==', courseId));
    return onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        callback(null);
      } else {
        const docSnap = snapshot.docs[0];
        callback({
          ...(docSnap.data() as Omit<StudentProgress, 'id'>),
          id: docSnap.id
        } as StudentProgress);
      }
    }, (error) => {
      console.error('[courseProgressService] subscribeToStudentProgress error:', error);
    });
  }

  subscribeToAllStudentProgress(
    studentId: string,
    callback: (progressList: StudentProgress[]) => void
  ): () => void {
    const colRef = collection(db, COLLECTION);
    const q = query(colRef, where('studentId', '==', studentId));
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(docSnap => ({
        ...(docSnap.data() as Omit<StudentProgress, 'id'>),
        id: docSnap.id
      } as StudentProgress));
      callback(list);
    }, (error) => {
      console.error('[courseProgressService] subscribeToAllStudentProgress error:', error);
    });
  }

  async seedStudentProgressToFirestore(): Promise<void> {
    const colRef = collection(db, COLLECTION);
    const existing = await getDocs(colRef);
    if (!existing.empty) {
      console.log('[seedStudentProgressToFirestore] Progress already exists. Skipping.');
      return;
    }

    const { mockDb } = await import('../../firebase/mockDb');
    const mockProgress = mockDb.getStudentProgress();

    for (const sp of mockProgress) {
      const { id: _id, ...rest } = sp;
      const docRef = await addDoc(colRef, rest);
      await updateDoc(docRef, { id: docRef.id });
    }
    console.log(`[seedStudentProgressToFirestore] Seeded ${mockProgress.length} progress records.`);
  }
}

export const courseProgressService = new FirebaseCourseProgressService();
