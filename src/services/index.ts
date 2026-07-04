// Service Layer – Single export point for all data services.
// All pages MUST import from here, never directly from firebase/ or data/.
// Toggle USE_FIREBASE / USE_FIREBASE_COURSES / USE_FIREBASE_ATTENDANCE when ready to wire real Firebase.
import { studentService as mockStudentService } from './mock/studentService';
import { studentService as firebaseStudentService } from './firebase/studentService';
import { courseService as mockCourseService } from './mock/courseService';
import { courseService as firebaseCourseService } from './firebase/courseService';
import { attendanceService as mockAttendanceService } from './mock/attendanceService';
import { attendanceService as firebaseAttendanceService } from './firebase/attendanceService';
import { marksService as mockMarksService } from './mock/marksService';
import { marksService as firebaseMarksService } from './firebase/marksService';
import { marksCalculationService as mockMarksCalculationService } from './mock/marksCalculationService';
import { marksCalculationService as firebaseMarksCalculationService } from './firebase/marksService';
import { USE_FIREBASE, USE_FIREBASE_COURSES, USE_FIREBASE_ATTENDANCE, USE_FIREBASE_MARKS, USE_FIREBASE_MATERIALS, USE_FIREBASE_FEES, USE_FIREBASE_ANALYTICS, USE_FIREBASE_CERTIFICATES } from './config';
import { materialService as mockMaterialService } from './mock/materialService';
import { materialService as firebaseMaterialService } from './firebase/materialService';
import { feeService as mockFeeService } from './mock/feeService';
import { feeService as firebaseFeeService } from './firebase/feeService';
import {
  getMaterials as firebaseGetMaterials,
  getMaterialsByCourse as firebaseGetMaterialsByCourse,
  getStudentMaterials as firebaseGetStudentMaterials,
  createMaterial as firebaseCreateMaterial,
  updateMaterial as firebaseUpdateMaterial,
  deleteMaterial as firebaseDeleteMaterial,
  subscribeToMaterials as firebaseSubscribeToMaterials,
  subscribeToStudentMaterials as firebaseSubscribeToStudentMaterials,
  seedMaterialsToFirestore as firebaseSeedMaterialsToFirestore,
} from './firebase/materialService';
import {
  getCertificates as firebaseGetCertificates,
  getStudentCertificates as firebaseGetStudentCertificates,
  createCertificate as firebaseCreateCertificate,
  updateCertificate as firebaseUpdateCertificate,
  deleteCertificate as firebaseDeleteCertificate,
  getCertificateById as firebaseGetCertificateById,
  subscribeToCertificates as firebaseSubscribeToCertificates,
  subscribeToStudentCertificates as firebaseSubscribeToStudentCertificates,
} from './firebase/certificateService';
import { certificateService as mockCertificateService } from './mock/certificateService';
import { certificateService as firebaseCertificateService } from './firebase/certificateService';
import { Material, AcademyFeeRecord, Certificate } from '../types';

export { USE_FIREBASE, USE_FIREBASE_COURSES, USE_FIREBASE_ATTENDANCE, USE_FIREBASE_MARKS, USE_FIREBASE_MATERIALS, USE_FIREBASE_FEES, USE_FIREBASE_ANALYTICS, USE_FIREBASE_CERTIFICATES };

// ─── Students (Phase 2 – Firebase) ───
export const studentService = USE_FIREBASE ? firebaseStudentService : mockStudentService;

// ─── Courses (Phase 3 – Firebase) ───
export const courseService = USE_FIREBASE_COURSES ? firebaseCourseService : mockCourseService;

// ─── Attendance (Phase 4 – Firebase) ───
export const attendanceService = USE_FIREBASE_ATTENDANCE ? firebaseAttendanceService : mockAttendanceService;

// ─── Marks (Phase 5 – Firebase) ───
export const marksService = USE_FIREBASE_MARKS ? firebaseMarksService : mockMarksService;
export const marksCalculationService = USE_FIREBASE_MARKS ? firebaseMarksCalculationService : mockMarksCalculationService;

// ─── Course standalone functions (Firebase) ───
export {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  addModule,
  updateModule,
  deleteModule,
  reorderModules,
  subscribeToAllCourses,
  seedCoursesToFirestore,
} from './firebase/courseService';

// ─── Attendance standalone functions (Firebase) ───
export {
  getAttendance,
  getAttendanceByStudent,
  getAttendanceByCourse,
  markAttendance,
  updateAttendance,
  deleteAttendance,
  saveMultipleAttendance,
  subscribeToAttendance,
  subscribeToStudentAttendance,
  calculateAttendanceStats,
  calculateMonthlyAttendance,
} from './firebase/attendanceService';

// ─── Marks standalone functions (Firebase) ───
export {
  getMarks,
  getStudentMarks,
  getCourseMarks,
  addMarks,
  updateMarks,
  deleteMarks,
  subscribeToMarks,
  subscribeToStudentMarks,
  calculateLanguageAverage,
  calculateOverallAverage,
  calculateGrade,
  calculatePassStatus,
  getClassificationInfo,
  getStudentResults,
  updateStudentMarks,
} from './firebase/marksService';

// ─── Materials (Phase 6 – Firebase) ───
export const materialService = USE_FIREBASE_MATERIALS ? firebaseMaterialService : mockMaterialService;

export async function getMaterials(): Promise<Material[]> {
  return USE_FIREBASE_MATERIALS ? firebaseGetMaterials() : mockMaterialService.getAll();
}

export async function getMaterialsByCourse(courseId: string): Promise<Material[]> {
  return USE_FIREBASE_MATERIALS ? firebaseGetMaterialsByCourse(courseId) : mockMaterialService.getByCourseId(courseId);
}

export async function getStudentMaterials(courseIds: string[]): Promise<Material[]> {
  if (USE_FIREBASE_MATERIALS) {
    return firebaseGetStudentMaterials(courseIds);
  } else {
    const all = await mockMaterialService.getAll();
    return all.filter(m => courseIds.includes(m.courseId));
  }
}

export async function createMaterial(data: Omit<Material, 'id'>): Promise<Material> {
  return USE_FIREBASE_MATERIALS ? firebaseCreateMaterial(data) : mockMaterialService.create(data);
}

export async function updateMaterial(id: string, data: Partial<Material>): Promise<Material> {
  return USE_FIREBASE_MATERIALS ? firebaseUpdateMaterial(id, data) : mockMaterialService.update(id, data);
}

export async function deleteMaterial(id: string): Promise<void> {
  if (USE_FIREBASE_MATERIALS) {
    await firebaseDeleteMaterial(id);
  } else {
    await mockMaterialService.delete(id);
  }
}

export function subscribeToMaterials(callback: (materials: Material[]) => void): () => void {
  if (USE_FIREBASE_MATERIALS) {
    return firebaseSubscribeToMaterials(callback);
  } else {
    let active = true;
    mockMaterialService.getAll().then(data => {
      if (active) callback(data);
    });
    return () => { active = false; };
  }
}

export function subscribeToStudentMaterials(courseIds: string[], callback: (materials: Material[]) => void): () => void {
  if (USE_FIREBASE_MATERIALS) {
    return firebaseSubscribeToStudentMaterials(courseIds, callback);
  } else {
    let active = true;
    mockMaterialService.getAll().then(data => {
      if (active) callback(data.filter(m => courseIds.includes(m.courseId)));
    });
    return () => { active = false; };
  }
}

export async function seedMaterialsToFirestore(): Promise<void> {
  if (USE_FIREBASE_MATERIALS) {
    await firebaseSeedMaterialsToFirestore();
  }
}

// ─── Fees (Phase 7 – Firebase) ───
export const feeService = USE_FIREBASE_FEES ? firebaseFeeService : mockFeeService;

export function subscribeToFees(callback: (records: AcademyFeeRecord[]) => void): () => void {
  if (USE_FIREBASE_FEES) {
    return (firebaseFeeService as any).onSnapshot(callback);
  } else {
    return (mockFeeService as any).onSnapshot(callback);
  }
}

export function subscribeToStudentFees(studentId: string, callback: (record: AcademyFeeRecord | null) => void): () => void {
  if (USE_FIREBASE_FEES) {
    return (firebaseFeeService as any).onSnapshotStudent(studentId, callback);
  } else {
    return (mockFeeService as any).onSnapshotStudent(studentId, callback);
  }
}

export async function getFees(): Promise<AcademyFeeRecord[]> {
  return USE_FIREBASE_FEES ? firebaseFeeService.getAllAcademyFees() : mockFeeService.getAllAcademyFees();
}

export async function getStudentFees(studentId: string): Promise<AcademyFeeRecord | null> {
  return USE_FIREBASE_FEES ? firebaseFeeService.getAcademyFeeByStudentId(studentId) : mockFeeService.getAcademyFeeByStudentId(studentId);
}

export async function recordPayment(studentId: string, amount: number, remarks?: string, receivedBy?: string): Promise<any> {
  if (USE_FIREBASE_FEES) {
    const { recordPayment: fbRecord } = await import('./firebase/feeService');
    return fbRecord(studentId, amount, remarks, receivedBy);
  } else {
    const record = await mockFeeService.getAcademyFeeByStudentId(studentId);
    if (!record) throw new Error('Mock fee record not found');
    const updated = {
      ...record,
      payments: [...record.payments, {
        id: `pay_${Date.now()}`,
        amount,
        date: new Date().toISOString().split('T')[0],
        remarks,
        receivedBy
      }]
    };
    return mockFeeService.saveAcademyFee(updated);
  }
}

export async function updatePayment(studentId: string, paymentId: string, updatedPayment: any): Promise<any> {
  if (USE_FIREBASE_FEES) {
    const { updatePayment: fbUpdate } = await import('./firebase/feeService');
    return fbUpdate(studentId, paymentId, updatedPayment);
  } else {
    const record = await mockFeeService.getAcademyFeeByStudentId(studentId);
    if (!record) throw new Error('Mock fee record not found');
    const updatedHistory = record.payments.map(p => {
      if (p.id === paymentId) {
        return { ...p, ...updatedPayment };
      }
      return p;
    });
    return mockFeeService.saveAcademyFee({ ...record, payments: updatedHistory });
  }
}

export async function deletePayment(studentId: string, paymentId: string): Promise<any> {
  if (USE_FIREBASE_FEES) {
    const { deletePayment: fbDelete } = await import('./firebase/feeService');
    return fbDelete(studentId, paymentId);
  } else {
    const record = await mockFeeService.getAcademyFeeByStudentId(studentId);
    if (!record) throw new Error('Mock fee record not found');
    const updatedHistory = record.payments.filter(p => p.id !== paymentId);
    return mockFeeService.saveAcademyFee({ ...record, payments: updatedHistory });
  }
}

export {
  calculateFee,
  calculateDiscount,
  calculateRemaining,
  calculatePaymentStatus,
} from './firebase/feeService';

export const certificateService = USE_FIREBASE_CERTIFICATES ? firebaseCertificateService : mockCertificateService;

export async function getCertificates(): Promise<Certificate[]> {
  return USE_FIREBASE_CERTIFICATES ? firebaseGetCertificates() : mockCertificateService.getAll();
}

export async function getStudentCertificates(studentId: string): Promise<Certificate[]> {
  return USE_FIREBASE_CERTIFICATES ? firebaseGetStudentCertificates(studentId) : mockCertificateService.getByStudentId(studentId);
}

export async function createCertificate(data: Omit<Certificate, 'id'>): Promise<Certificate> {
  return USE_FIREBASE_CERTIFICATES ? firebaseCreateCertificate(data) : mockCertificateService.create(data);
}

export async function updateCertificate(id: string, data: Partial<Certificate>): Promise<Certificate> {
  return USE_FIREBASE_CERTIFICATES ? firebaseUpdateCertificate(id, data) : mockCertificateService.update(id, data);
}

export async function deleteCertificate(id: string): Promise<void> {
  if (USE_FIREBASE_CERTIFICATES) {
    await firebaseDeleteCertificate(id);
  } else {
    await mockCertificateService.delete(id);
  }
}

export async function getCertificateById(id: string): Promise<Certificate | null> {
  return USE_FIREBASE_CERTIFICATES ? firebaseGetCertificateById(id) : mockCertificateService.getById(id);
}

export function subscribeToCertificates(callback: (certificates: Certificate[]) => void): () => void {
  if (USE_FIREBASE_CERTIFICATES) {
    return firebaseSubscribeToCertificates(callback);
  } else {
    let active = true;
    mockCertificateService.getAll().then(data => {
      if (active) callback(data);
    });
    return () => { active = false; };
  }
}

export function subscribeToStudentCertificates(studentId: string, callback: (certificates: Certificate[]) => void): () => void {
  if (USE_FIREBASE_CERTIFICATES) {
    return firebaseSubscribeToStudentCertificates(studentId, callback);
  } else {
    let active = true;
    mockCertificateService.getByStudentId(studentId).then(data => {
      if (active) callback(data);
    });
    return () => { active = false; };
  }
}
import { courseProgressService as mockCourseProgressService } from './mock/courseProgressService';
import { courseProgressService as firebaseCourseProgressService } from './firebase/courseProgressService';
export const courseProgressService = USE_FIREBASE_COURSES ? firebaseCourseProgressService : mockCourseProgressService;

export { settingsService } from './firebase/settingsService';
export { feeCalculationService } from './mock/feeCalculationService';

import { dashboardAnalyticsService as mockDashboardAnalyticsService } from './mock/dashboardAnalyticsService';
import { dashboardAnalyticsService as firebaseDashboardAnalyticsService } from './firebase/dashboardAnalyticsService';

export const dashboardAnalyticsService = USE_FIREBASE_ANALYTICS ? firebaseDashboardAnalyticsService : mockDashboardAnalyticsService;

export type {
  DashboardStatistics,
  CourseDistributionItem,
  CourseCombinationItem,
  CertificateStatistics,
  AcademyProgressData,
  DashboardInsights,
} from './firebase/dashboardAnalyticsService';

/**
 * MIGRATION STATUS:
 * ✅ Phase 2 – Students      → Firestore (USE_FIREBASE)
 * ✅ Phase 3 – Courses       → Firestore (USE_FIREBASE_COURSES)
 * ✅ Phase 4 – Attendance    → Firestore (USE_FIREBASE_ATTENDANCE)
 * ✅ Phase 5 – Marks         → Firestore (USE_FIREBASE_MARKS)
 * ✅ Phase 6 – Materials     → Firestore (USE_FIREBASE_MATERIALS)
 * ✅ Phase 7 – Fees          → Firestore (USE_FIREBASE_FEES)
 * ⏳ Phase 8 – Dashboard Analytics Engine (Completed!)
 */
