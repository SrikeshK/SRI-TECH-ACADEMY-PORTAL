import { Mark } from '../../types';
import { IBaseService } from '../types';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { studentService } from './studentService';
import { courseService } from './courseService';

const COLLECTION = 'marks';

export interface ClassificationInfo {
  grade: string;
  classification: string;
  rangeText: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Converts Firestore Timestamps to ISO strings */
function normalizeDoc(data: Record<string, unknown>, id: string): Mark {
  const normalized: Record<string, unknown> = { ...data, id };
  if (normalized.createdAt instanceof Timestamp) {
    normalized.createdAt = (normalized.createdAt as Timestamp).toDate().toISOString();
  }
  if (normalized.updatedAt instanceof Timestamp) {
    normalized.updatedAt = (normalized.updatedAt as Timestamp).toDate().toISOString();
  }
  return normalized as unknown as Mark;
}

// ─────────────────────────────────────────────
// CRUD – Standalone Exported Functions
// ─────────────────────────────────────────────

export async function getMarks(): Promise<Mark[]> {
  const colRef = collection(db, COLLECTION);
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(doc => normalizeDoc(doc.data() as Record<string, unknown>, doc.id));
}

export async function getStudentMarks(studentId: string): Promise<Mark[]> {
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, where('studentId', '==', studentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => normalizeDoc(doc.data() as Record<string, unknown>, doc.id));
}

export async function getCourseMarks(courseId: string): Promise<Mark[]> {
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, where('courseId', '==', courseId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => normalizeDoc(doc.data() as Record<string, unknown>, doc.id));
}

export async function addMarks(data: Omit<Mark, 'id'>): Promise<Mark> {
  const docId = `mrk_${data.studentId}_${data.courseId}`;
  const docRef = doc(db, COLLECTION, docId);

  const payload: any = {
    ...data,
    id: docId,
    documentId: docId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, payload, { merge: true });
  const snap = await getDoc(docRef);
  return normalizeDoc(snap.data() as Record<string, unknown>, docId);
}

export async function updateMarks(id: string, data: Partial<Mark>): Promise<Mark> {
  const docRef = doc(db, COLLECTION, id);
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  delete (payload as any).id;

  await updateDoc(docRef, payload);
  const snap = await getDoc(docRef);
  return normalizeDoc(snap.data() as Record<string, unknown>, id);
}

export async function deleteMarks(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

// ─────────────────────────────────────────────
// Realtime Subscriptions
// ─────────────────────────────────────────────

export function subscribeToMarks(callback: (marks: Mark[]) => void): () => void {
  const colRef = collection(db, COLLECTION);
  return onSnapshot(colRef, (snapshot) => {
    const records = snapshot.docs.map(d => normalizeDoc(d.data() as Record<string, unknown>, d.id));
    callback(records);
  }, (err) => {
    console.error('[firebaseMarksService] subscribeToMarks error:', err);
  });
}

export function subscribeToStudentMarks(studentId: string, callback: (marks: Mark[]) => void): () => void {
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, where('studentId', '==', studentId));
  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map(d => normalizeDoc(d.data() as Record<string, unknown>, d.id));
    callback(records);
  }, (err) => {
    console.error('[firebaseMarksService] subscribeToStudentMarks error:', err);
  });
}

// ─────────────────────────────────────────────
// Calculation Engine
// ─────────────────────────────────────────────

export function calculateLanguageAverage(theory: number, practical: number): number {
  const t = typeof theory === 'number' ? theory : Number(theory) || 0;
  const p = typeof practical === 'number' ? practical : Number(practical) || 0;
  const avg = (t + p) / 2;
  return Math.round(avg * 10) / 10;
}

export function calculateOverallAverage(marksList: { theoryMarks?: number; practicalMarks?: number }[]): number {
  if (!marksList || marksList.length === 0) return 0;
  
  // Filter out ungraded courses (both theory and practical are 0)
  const gradedList = marksList.filter(m => {
    const theory = m.theoryMarks !== undefined ? (typeof m.theoryMarks === 'number' ? m.theoryMarks : Number(m.theoryMarks) || 0) : 0;
    const practical = m.practicalMarks !== undefined ? (typeof m.practicalMarks === 'number' ? m.practicalMarks : Number(m.practicalMarks) || 0) : 0;
    return theory > 0 || practical > 0;
  });

  if (gradedList.length === 0) return 0;

  let sum = 0;
  let count = 0;
  gradedList.forEach(m => {
    const theory = m.theoryMarks !== undefined ? (typeof m.theoryMarks === 'number' ? m.theoryMarks : Number(m.theoryMarks) || 0) : 0;
    const practical = m.practicalMarks !== undefined ? (typeof m.practicalMarks === 'number' ? m.practicalMarks : Number(m.practicalMarks) || 0) : 0;
    sum += theory + practical;
    count += 2;
  });
  if (count === 0) return 0;
  const avg = sum / count;
  return Math.round(avg * 10) / 10;
}

export function getClassificationInfo(average: number): ClassificationInfo {
  if (average >= 90) {
    return { grade: 'A+', classification: 'Distinction', rangeText: '90-100%' };
  } else if (average >= 80) {
    return { grade: 'A', classification: 'First Class', rangeText: '80-89%' };
  } else if (average >= 70) {
    return { grade: 'B+', classification: 'Second Class', rangeText: '70-79%' };
  } else if (average >= 60) {
    return { grade: 'B', classification: 'Third Class', rangeText: '60-69%' };
  } else if (average >= 50) {
    return { grade: 'C', classification: 'Pass Class', rangeText: '50-59%' };
  } else {
    return { grade: 'Fail', classification: 'Fail', rangeText: 'Below 50%' };
  }
}

export function calculateGrade(average: number): string {
  return getClassificationInfo(average).grade;
}

export function calculatePassStatus(average: number): 'Pass' | 'Fail' {
  return average >= 50 ? 'Pass' : 'Fail';
}

export async function getStudentResults(studentId: string) {
  const student = await studentService.getById(studentId);
  if (!student) return null;

  const allCourses = await courseService.getAll();
  const studentMarks = await getStudentMarks(studentId);

  // Dynamically identify enrolled programming languages (category: 'Programming')
  const enrolledProgCourses = allCourses.filter(c => 
    c.category === 'Programming' && 
    (student.courseIds?.includes(c.id) || student.enrolledCourses?.includes(c.id))
  );

  const subjects = enrolledProgCourses.map(course => {
    const markRecord = studentMarks.find(m => m.studentId === studentId && m.courseId === course.id);
    const theory = markRecord?.theoryMarks !== undefined ? markRecord.theoryMarks : 0;
    const practical = markRecord?.practicalMarks !== undefined ? markRecord.practicalMarks : 0;
    const average = calculateLanguageAverage(theory, practical);
    const grade = calculateGrade(average);

    return {
      courseId: course.id,
      courseName: course.name,
      courseCode: course.code || '',
      theoryMarks: theory,
      practicalMarks: practical,
      average,
      grade
    };
  });

  const gradedSubjects = subjects.filter(s => s.theoryMarks > 0 || s.practicalMarks > 0);
  const allCompleted = enrolledProgCourses.length > 0 && gradedSubjects.length === enrolledProgCourses.length;

  const overallAverage = allCompleted ? calculateOverallAverage(gradedSubjects) : 0;
  const finalGrade = allCompleted ? calculateGrade(overallAverage) : '—';
  const passStatus = allCompleted ? calculatePassStatus(overallAverage) : 'Pending';

  return {
    student,
    subjects,
    overallAverage,
    grade: finalGrade,
    status: passStatus,
    allCompleted
  };
}

export async function updateStudentMarks(
  studentId: string,
  marksData: Record<string, { theoryMarks: number; practicalMarks: number }>
): Promise<void> {
  const student = await studentService.getById(studentId);
  if (!student) throw new Error('Student not found');

  const allCourses = await courseService.getAll();
  const existingMarks = await getStudentMarks(studentId);

  const enrolledProgCourses = allCourses.filter(c => 
    c.category === 'Programming' && 
    (student.courseIds?.includes(c.id) || student.enrolledCourses?.includes(c.id))
  );

  const tempSubjects = enrolledProgCourses.map(course => {
    const isUpdating = course.id in marksData;
    const theory = isUpdating 
      ? Number(marksData[course.id].theoryMarks) 
      : (existingMarks.find(m => m.courseId === course.id)?.theoryMarks ?? 0);
    const practical = isUpdating 
      ? Number(marksData[course.id].practicalMarks) 
      : (existingMarks.find(m => m.courseId === course.id)?.practicalMarks ?? 0);
    
    return {
      courseId: course.id,
      theoryMarks: theory,
      practicalMarks: practical
    };
  });

  const gradedSubjects = tempSubjects.filter(s => s.theoryMarks > 0 || s.practicalMarks > 0);
  const allCompleted = enrolledProgCourses.length > 0 && gradedSubjects.length === enrolledProgCourses.length;

  const overallAverage = allCompleted ? calculateOverallAverage(tempSubjects) : 0;
  const passStatus = allCompleted ? calculatePassStatus(overallAverage) : 'Pending';

  const batch = writeBatch(db);

  for (const courseId in marksData) {
    const course = enrolledProgCourses.find(c => c.id === courseId);
    if (!course) continue;

    const data = marksData[courseId];
    const theory = Number(data.theoryMarks);
    const practical = Number(data.practicalMarks);
    const languageAverage = calculateLanguageAverage(theory, practical);
    const courseGrade = calculateGrade(languageAverage);

    const docId = `mrk_${studentId}_${courseId}`;
    const docRef = doc(db, COLLECTION, docId);

    const payload: any = {
      id: docId,
      documentId: docId,
      studentId,
      studentName: student.name,
      courseId,
      courseName: course.name,
      theoryMarks: theory,
      practicalMarks: practical,
      languageAverage,
      average: languageAverage,
      overallAverage,
      grade: courseGrade,
      status: passStatus,
      remarks: '',
      updatedAt: serverTimestamp(),
    };

    const existingDoc = existingMarks.find(m => m.courseId === courseId);
    if (existingDoc) {
      delete payload.createdAt;
      batch.update(docRef, payload);
    } else {
      payload.createdAt = serverTimestamp();
      batch.set(docRef, payload);
    }
  }

  // propagate overallAverage & status to other course marks of the same student
  const coursesNotUpdating = enrolledProgCourses.filter(c => !(c.id in marksData));
  for (const course of coursesNotUpdating) {
    const existingDoc = existingMarks.find(m => m.courseId === course.id);
    if (existingDoc) {
      const docRef = doc(db, COLLECTION, existingDoc.id);
      batch.update(docRef, {
        overallAverage,
        status: passStatus,
        updatedAt: serverTimestamp(),
      });
    }
  }

  await batch.commit();
}

// ─────────────────────────────────────────────
// Service Layer Class
// ─────────────────────────────────────────────

class FirebaseMarksService implements IBaseService<Mark> {
  async getAll(): Promise<Mark[]> {
    return getMarks();
  }

  async getById(id: string): Promise<Mark | null> {
    const docRef = doc(db, COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return normalizeDoc(snap.data() as Record<string, unknown>, snap.id);
  }

  async create(data: Omit<Mark, 'id'>): Promise<Mark> {
    return addMarks(data);
  }

  async update(id: string, data: Partial<Mark>): Promise<Mark> {
    return updateMarks(id, data);
  }

  async delete(id: string): Promise<void> {
    return deleteMarks(id);
  }

  async getByStudentId(studentId: string): Promise<Mark[]> {
    return getStudentMarks(studentId);
  }

  subscribeToMarks(callback: (records: Mark[]) => void): () => void {
    return subscribeToMarks(callback);
  }

  subscribeToStudentMarks(studentId: string, callback: (records: Mark[]) => void): () => void {
    return subscribeToStudentMarks(studentId, callback);
  }

  onSnapshot(callback: (records: Mark[]) => void): () => void {
    return subscribeToMarks(callback);
  }
}

export const firebaseMarksService = new FirebaseMarksService();
export const marksService = firebaseMarksService;

export const marksCalculationService = {
  getClassificationInfo,
  calculateLanguageAverage,
  calculateOverallAverage,
  calculateGrade,
  calculatePassStatus,
  getStudentResults,
  updateStudentMarks
};
export default marksService;
