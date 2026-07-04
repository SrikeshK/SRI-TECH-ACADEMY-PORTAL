/**
 * Firebase Fee Service – Phase 7 Migration
 * Handles all Firestore CRUD, subscriptions, and calculations for the `fees` collection.
 */
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Student, Course, Fee, AcademyFeeRecord, PaymentEntry, DiscountType, PaymentStatus } from '../../types';
import { IBaseService } from '../types';
import { getStudentById } from './studentService';
import { getCourseById } from './courseService';
import { feeCalculationService } from '../mock/feeCalculationService';

const COLLECTION = 'fees';

// ─────────────────────────────────────────────
// Document Structure Interface
// ─────────────────────────────────────────────
export interface FirestoreFeeDoc {
  documentId: string;
  studentId: string;
  studentName: string;
  registerNumber: string;
  courseIds: string[];
  courseNames: string[];
  totalFee: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  finalFee: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  paymentHistory: {
    id: string;
    date: string;
    amount: number;
    receivedBy: string;
    remarks: string;
  }[];
  remarks: string;
  createdAt: any;
  updatedAt: any;
}

// ─────────────────────────────────────────────
// Normalization and Mapping Helpers
// ─────────────────────────────────────────────

/** Normalize Firestore Timestamps to ISO strings */
function normalizeFeeDoc(data: Record<string, any>, id: string): FirestoreFeeDoc {
  const normalized = { ...data, documentId: id, id } as any;

  if (normalized.createdAt instanceof Timestamp) {
    normalized.createdAt = normalized.createdAt.toDate().toISOString();
  }
  if (normalized.updatedAt instanceof Timestamp) {
    normalized.updatedAt = normalized.updatedAt.toDate().toISOString();
  }

  // Ensure paymentHistory is always an array
  if (!Array.isArray(normalized.paymentHistory)) {
    normalized.paymentHistory = [];
  }

  return normalized as FirestoreFeeDoc;
}

/** Map FirestoreFeeDoc to AcademyFeeRecord */
export function mapToAcademyFeeRecord(doc: FirestoreFeeDoc): AcademyFeeRecord {
  return {
    id: doc.documentId,
    studentId: doc.studentId,
    totalBillAmount: doc.totalFee,
    discountType: doc.discountType,
    discountValue: doc.discountValue,
    discountedAmount: doc.discountAmount,
    finalPayableAmount: doc.finalFee,
    paidAmount: doc.paidAmount,
    remainingAmount: doc.remainingAmount,
    paymentStatus: doc.paymentStatus,
    payments: (doc.paymentHistory || []).map(p => ({
      id: p.id,
      amount: p.amount,
      date: p.date,
      remarks: p.remarks
    })),
    remarks: doc.remarks,
    createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : new Date().toISOString(),
    updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : new Date().toISOString(),
  };
}

/** Map FirestoreFeeDoc to Legacy Fee record */
export function mapToLegacyFee(doc: FirestoreFeeDoc): Fee {
  return {
    id: doc.documentId,
    studentId: doc.studentId,
    studentName: doc.studentName,
    amount: doc.finalFee,
    dueDate: new Date().toISOString().split('T')[0], // placeholder
    paidDate: doc.paymentHistory && doc.paymentHistory.length > 0 
      ? doc.paymentHistory[doc.paymentHistory.length - 1].date 
      : undefined,
    status: doc.paymentStatus === 'Paid' ? 'Paid' : doc.paymentStatus === 'Pending' ? 'Pending' : 'Overdue',
    remarks: doc.remarks,
    totalAmount: doc.finalFee,
    paidAmount: doc.paidAmount,
    balanceAmount: doc.remainingAmount,
  };
}

// ─────────────────────────────────────────────
// Dynamic Recalculation Engine
// ─────────────────────────────────────────────

export function calculateFee(courseIds: string[]): number {
  return feeCalculationService.calculateCourseFee(courseIds);
}

export function calculateDiscount(totalFee: number, discountType: DiscountType, discountValue: number): number {
  return feeCalculationService.calculateDiscount(totalFee, discountType, discountValue);
}

export function calculateRemaining(finalFee: number, paidAmount: number): number {
  return Math.max(finalFee - paidAmount, 0);
}

export function calculatePaymentStatus(remainingAmount: number, finalFee: number, paidAmount: number): PaymentStatus {
  if (finalFee === 0) return 'Paid';
  if (paidAmount === 0) return 'Pending';
  if (remainingAmount <= 0) return 'Paid';
  return 'Partially Paid';
}

/** Compute and update all derived mathematical attributes of a Firestore fee payload */
export function recalculateFirestoreDoc(doc: Omit<FirestoreFeeDoc, 'documentId' | 'createdAt' | 'updatedAt'>): Omit<FirestoreFeeDoc, 'documentId' | 'createdAt' | 'updatedAt'> {
  const totalFee = calculateFee(doc.courseIds);
  const discountAmount = calculateDiscount(totalFee, doc.discountType, doc.discountValue);
  const finalFee = Math.max(totalFee - discountAmount, 0);
  const paidAmount = doc.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = calculateRemaining(finalFee, paidAmount);
  const paymentStatus = calculatePaymentStatus(remainingAmount, finalFee, paidAmount);

  return {
    ...doc,
    totalFee,
    discountAmount,
    finalFee,
    paidAmount,
    remainingAmount,
    paymentStatus,
  };
}

// ─────────────────────────────────────────────
// CRUD Standalone Functions
// ─────────────────────────────────────────────

export async function getFees(): Promise<FirestoreFeeDoc[]> {
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'desc'));
  try {
    const snap = await getDocs(q);
    return snap.docs.map(d => normalizeFeeDoc(d.data(), d.id));
  } catch (err) {
    console.warn('[firebaseFeeService] getFees ordering error, falling back to unordered:', err);
    const snap = await getDocs(colRef);
    return snap.docs.map(d => normalizeFeeDoc(d.data(), d.id));
  }
}

export async function getStudentFees(studentId: string): Promise<FirestoreFeeDoc | null> {
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, where('studentId', '==', studentId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return normalizeFeeDoc(snap.docs[0].data(), snap.docs[0].id);
}

export async function recordPayment(
  studentId: string,
  amount: number,
  remarks: string = '',
  receivedBy: string = 'System Admin'
): Promise<FirestoreFeeDoc> {
  const feeDoc = await getStudentFees(studentId);
  if (!feeDoc) {
    throw new Error(`Fee record not found for student ID: ${studentId}`);
  }

  const newPayment = {
    id: `pay_${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    amount,
    receivedBy,
    remarks
  };

  const updatedHistory = [...(feeDoc.paymentHistory || []), newPayment];
  const colRef = doc(db, COLLECTION, feeDoc.documentId);

  const updatedPayload = recalculateFirestoreDoc({
    studentId: feeDoc.studentId,
    studentName: feeDoc.studentName,
    registerNumber: feeDoc.registerNumber,
    courseIds: feeDoc.courseIds,
    courseNames: feeDoc.courseNames,
    totalFee: feeDoc.totalFee,
    discountType: feeDoc.discountType,
    discountValue: feeDoc.discountValue,
    discountAmount: feeDoc.discountAmount,
    finalFee: feeDoc.finalFee,
    paidAmount: feeDoc.paidAmount,
    remainingAmount: feeDoc.remainingAmount,
    paymentStatus: feeDoc.paymentStatus,
    paymentHistory: updatedHistory,
    remarks: feeDoc.remarks || '',
  });

  await updateDoc(colRef, {
    ...updatedPayload,
    updatedAt: serverTimestamp()
  });

  const updatedSnap = await getDoc(colRef);
  return normalizeFeeDoc(updatedSnap.data()!, colRef.id);
}

export async function updatePayment(
  studentId: string,
  paymentId: string,
  updatedPayment: Partial<PaymentEntry & { receivedBy?: string }>
): Promise<FirestoreFeeDoc> {
  const feeDoc = await getStudentFees(studentId);
  if (!feeDoc) {
    throw new Error(`Fee record not found for student ID: ${studentId}`);
  }

  const updatedHistory = feeDoc.paymentHistory.map(p => {
    if (p.id === paymentId) {
      return {
        ...p,
        amount: updatedPayment.amount !== undefined ? updatedPayment.amount : p.amount,
        date: updatedPayment.date !== undefined ? updatedPayment.date : p.date,
        remarks: updatedPayment.remarks !== undefined ? updatedPayment.remarks : p.remarks,
        receivedBy: updatedPayment.receivedBy !== undefined ? updatedPayment.receivedBy : p.receivedBy,
      };
    }
    return p;
  });

  const colRef = doc(db, COLLECTION, feeDoc.documentId);
  const updatedPayload = recalculateFirestoreDoc({
    studentId: feeDoc.studentId,
    studentName: feeDoc.studentName,
    registerNumber: feeDoc.registerNumber,
    courseIds: feeDoc.courseIds,
    courseNames: feeDoc.courseNames,
    totalFee: feeDoc.totalFee,
    discountType: feeDoc.discountType,
    discountValue: feeDoc.discountValue,
    discountAmount: feeDoc.discountAmount,
    finalFee: feeDoc.finalFee,
    paidAmount: feeDoc.paidAmount,
    remainingAmount: feeDoc.remainingAmount,
    paymentStatus: feeDoc.paymentStatus,
    paymentHistory: updatedHistory,
    remarks: feeDoc.remarks || '',
  });

  await updateDoc(colRef, {
    ...updatedPayload,
    updatedAt: serverTimestamp()
  });

  const updatedSnap = await getDoc(colRef);
  return normalizeFeeDoc(updatedSnap.data()!, colRef.id);
}

export async function deletePayment(studentId: string, paymentId: string): Promise<FirestoreFeeDoc> {
  const feeDoc = await getStudentFees(studentId);
  if (!feeDoc) {
    throw new Error(`Fee record not found for student ID: ${studentId}`);
  }

  const updatedHistory = feeDoc.paymentHistory.filter(p => p.id !== paymentId);

  const colRef = doc(db, COLLECTION, feeDoc.documentId);
  const updatedPayload = recalculateFirestoreDoc({
    studentId: feeDoc.studentId,
    studentName: feeDoc.studentName,
    registerNumber: feeDoc.registerNumber,
    courseIds: feeDoc.courseIds,
    courseNames: feeDoc.courseNames,
    totalFee: feeDoc.totalFee,
    discountType: feeDoc.discountType,
    discountValue: feeDoc.discountValue,
    discountAmount: feeDoc.discountAmount,
    finalFee: feeDoc.finalFee,
    paidAmount: feeDoc.paidAmount,
    remainingAmount: feeDoc.remainingAmount,
    paymentStatus: feeDoc.paymentStatus,
    paymentHistory: updatedHistory,
    remarks: feeDoc.remarks || '',
  });

  await updateDoc(colRef, {
    ...updatedPayload,
    updatedAt: serverTimestamp()
  });

  const updatedSnap = await getDoc(colRef);
  return normalizeFeeDoc(updatedSnap.data()!, colRef.id);
}

// ─────────────────────────────────────────────
// Real-time Subscriptions
// ─────────────────────────────────────────────

export function subscribeToFees(callback: (fees: FirestoreFeeDoc[]) => void): () => void {
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map(d => normalizeFeeDoc(d.data(), d.id)));
    },
    (err) => {
      console.warn('[firebaseFeeService] subscribeToFees ordering error, falling back to unordered:', err);
      return onSnapshot(colRef, (snapFallback) => {
        const list = snapFallback.docs.map(d => normalizeFeeDoc(d.data(), d.id));
        list.sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
        callback(list);
      });
    }
  );
}

export function subscribeToStudentFees(studentId: string, callback: (fee: FirestoreFeeDoc | null) => void): () => void {
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, where('studentId', '==', studentId));
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      callback(null);
    } else {
      callback(normalizeFeeDoc(snap.docs[0].data(), snap.docs[0].id));
    }
  });
}

// ─────────────────────────────────────────────
// Compatibility Service Adapter (implements IBaseService<Fee>)
// ─────────────────────────────────────────────

class FirebaseFeeService implements IBaseService<Fee> {
  // Legacy single Fee actions
  async getAll(): Promise<Fee[]> {
    const list = await getFees();
    return list.map(mapToLegacyFee);
  }

  async getById(id: string): Promise<Fee | null> {
    const docRef = doc(db, COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return mapToLegacyFee(normalizeFeeDoc(snap.data(), snap.id));
  }

  async getByStudentId(studentId: string): Promise<Fee | null> {
    const doc = await getStudentFees(studentId);
    if (!doc) return null;
    return mapToLegacyFee(doc);
  }

  async getAllByStudentId(studentId: string): Promise<Fee[]> {
    const doc = await getStudentFees(studentId);
    if (!doc) return [];
    return [mapToLegacyFee(doc)];
  }

  async create(data: Omit<Fee, 'id'>): Promise<Fee> {
    throw new Error('Please use ensureAcademyFeeExists() for initialization.');
  }

  async update(id: string, data: Partial<Fee>): Promise<Fee> {
    const docRef = doc(db, COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Fee record not found.');
    const current = normalizeFeeDoc(snap.data(), snap.id);

    const payload: Partial<FirestoreFeeDoc> = {};
    if (data.remarks !== undefined) payload.remarks = data.remarks;
    if (data.amount !== undefined) payload.finalFee = data.amount;

    await updateDoc(docRef, {
      ...payload,
      updatedAt: serverTimestamp()
    });

    const updatedSnap = await getDoc(docRef);
    return mapToLegacyFee(normalizeFeeDoc(updatedSnap.data()!, docRef.id));
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  }

  // AcademyFeeRecord actions (for refactored system)
  async getAllAcademyFees(): Promise<AcademyFeeRecord[]> {
    const list = await getFees();
    return list.map(mapToAcademyFeeRecord);
  }

  async getAcademyFeeByStudentId(studentId: string): Promise<AcademyFeeRecord | null> {
    const fDoc = await getStudentFees(studentId);
    if (!fDoc) return null;
    return mapToAcademyFeeRecord(fDoc);
  }

  async saveAcademyFee(record: AcademyFeeRecord): Promise<AcademyFeeRecord> {
    const student = await getStudentById(record.studentId);
    const studentName = student?.name || 'Unknown Student';
    const registerNumber = student?.registerNumber || student?.rollNo || '';

    const courseIds = student?.courseIds || student?.enrolledCourses || [];
    const courseNames: string[] = [];
    for (const cId of courseIds) {
      const course = await getCourseById(cId);
      if (course) {
        courseNames.push(course.name);
      } else {
        courseNames.push(cId);
      }
    }

    const payload = recalculateFirestoreDoc({
      studentId: record.studentId,
      studentName,
      registerNumber,
      courseIds,
      courseNames,
      totalFee: record.totalBillAmount,
      discountType: record.discountType,
      discountValue: record.discountValue,
      discountAmount: record.discountedAmount,
      finalFee: record.finalPayableAmount,
      paidAmount: record.paidAmount,
      remainingAmount: record.remainingAmount,
      paymentStatus: record.paymentStatus,
      paymentHistory: record.payments.map(p => ({
        id: p.id,
        date: p.date,
        amount: p.amount,
        receivedBy: (p as any).receivedBy || 'System Admin',
        remarks: p.remarks || ''
      })),
      remarks: record.remarks || '',
    });

    const docRef = doc(db, COLLECTION, record.id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, {
        ...payload,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create record
      const colRef = collection(db, COLLECTION);
      const newDocRef = doc(colRef, record.id);
      // Wait, we need to set the document since we specified record.id
      const { setDoc } = await import('firebase/firestore');
      await setDoc(newDocRef, {
        ...payload,
        documentId: record.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    const updatedSnap = await getDoc(docRef);
    return mapToAcademyFeeRecord(normalizeFeeDoc(updatedSnap.data()!, docRef.id));
  }

  async ensureAcademyFeeExists(studentId: string, courseIds: string[]): Promise<AcademyFeeRecord> {
    const existing = await this.getAcademyFeeByStudentId(studentId);
    if (existing) return existing;

    const student = await getStudentById(studentId);
    const studentName = student?.name || 'Unknown Student';
    const registerNumber = student?.registerNumber || student?.rollNo || '';

    const courseNames: string[] = [];
    for (const cId of courseIds) {
      const course = await getCourseById(cId);
      if (course) {
        courseNames.push(course.name);
      } else {
        courseNames.push(cId);
      }
    }

    const totalFee = calculateFee(courseIds);
    const finalFee = totalFee;
    const remainingAmount = totalFee;

    const docData: Omit<FirestoreFeeDoc, 'documentId'> = {
      studentId,
      studentName,
      registerNumber,
      courseIds,
      courseNames,
      totalFee,
      discountType: 'none',
      discountValue: 0,
      discountAmount: 0,
      finalFee,
      paidAmount: 0,
      remainingAmount,
      paymentStatus: 'Pending',
      paymentHistory: [],
      remarks: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const colRef = collection(db, COLLECTION);
    // Custom document ID as `fee_${studentId}` to stay clean and matches database structure
    const docId = `fee_${studentId}`;
    const docRef = doc(colRef, docId);
    
    // Set document using docId
    const { documentId: _d, ...docPayload } = docData as any;
    await updateDoc(docRef, {
      ...docPayload,
      documentId: docId
    }).catch(async (err) => {
      // If it doesn't exist yet, we do setDoc or write
      const { setDoc } = await import('firebase/firestore');
      await setDoc(docRef, {
        ...docPayload,
        documentId: docId
      });
    });

    const snap = await getDoc(docRef);
    return mapToAcademyFeeRecord(normalizeFeeDoc(snap.data()!, docRef.id));
  }

  onSnapshot(callback: (records: AcademyFeeRecord[]) => void): () => void {
    return subscribeToFees((list) => {
      callback(list.map(mapToAcademyFeeRecord));
    });
  }

  onSnapshotStudent(studentId: string, callback: (record: AcademyFeeRecord | null) => void): () => void {
    return subscribeToStudentFees(studentId, (doc) => {
      callback(doc ? mapToAcademyFeeRecord(doc) : null);
    });
  }
}

export const feeService = new FirebaseFeeService();
