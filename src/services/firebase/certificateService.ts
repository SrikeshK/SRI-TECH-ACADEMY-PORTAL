/**
 * Firebase Certificate Service
 * Handles all Firestore CRUD and subscriptions for the `certificates` collection,
 * utilizing a link-based metadata resource system.
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
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Certificate } from '../../types';
import { IBaseService } from '../types';

const COLLECTION = 'certificates';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Normalize Firestore Timestamps to ISO strings and map backward compatibility fields */
function normalizeDoc(data: Record<string, any>, id: string): Certificate {
  const normalized: Record<string, any> = { ...data, id, certificateId: id };

  // Handle timestamps
  if (normalized.createdAt instanceof Timestamp) {
    normalized.createdAt = normalized.createdAt.toDate().toISOString();
  }
  if (normalized.updatedAt instanceof Timestamp) {
    normalized.updatedAt = normalized.updatedAt.toDate().toISOString();
  }

  // Backward compatibility fields mapping
  if (!normalized.certificateCode && normalized.certificateNumber) {
    normalized.certificateCode = normalized.certificateNumber;
  }
  if (!normalized.certificateNumber && normalized.certificateCode) {
    normalized.certificateNumber = normalized.certificateCode;
  }
  if (!normalized.certificateUrl && normalized.downloadUrl) {
    normalized.certificateUrl = normalized.downloadUrl;
  }
  if (!normalized.downloadUrl && normalized.certificateUrl) {
    normalized.downloadUrl = normalized.certificateUrl;
  }
  if (!normalized.remarks && normalized.description) {
    normalized.remarks = normalized.description;
  }
  if (!normalized.description && normalized.remarks) {
    normalized.description = normalized.remarks;
  }
  if (!normalized.certificateFileName) {
    normalized.certificateFileName = normalized.certificateTitle || normalized.certificateNumber || 'certificate';
  }

  return normalized as Certificate;
}

// ─────────────────────────────────────────────
// Error Mapping Helper
// ─────────────────────────────────────────────

function mapFirebaseError(err: any): Error {
  const message = err.message || '';
  const code = err.code || '';
  
  if (code === 'permission-denied' || message.includes('permission-denied')) {
    return new Error('Access denied. You do not have permission to perform this action.');
  }
  if (code === 'unavailable' || message.includes('network') || message.includes('failed-precondition')) {
    return new Error('Network connection issue. Please check your internet connection.');
  }
  if (code === 'not-found' || message.includes('not-found')) {
    return new Error('The requested certificate document was not found.');
  }
  return err instanceof Error ? err : new Error(message || 'An unexpected error occurred.');
}

// ─────────────────────────────────────────────
// CRUD Operations
// ─────────────────────────────────────────────

export async function getCertificates(): Promise<Certificate[]> {
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'desc'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
  } catch (err: any) {
    console.warn('[certificateService] getCertificates error ordering, falling back to unordered:', err);
    try {
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
    } catch (innerErr: any) {
      throw mapFirebaseError(innerErr);
    }
  }
}

export async function getStudentCertificates(studentId: string): Promise<Certificate[]> {
  if (!studentId) return [];
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, where('studentId', '==', studentId), orderBy('createdAt', 'desc'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
  } catch (err: any) {
    console.warn('[certificateService] getStudentCertificates error ordering, falling back to unordered:', err);
    try {
      const qFallback = query(colRef, where('studentId', '==', studentId));
      const snapshot = await getDocs(qFallback);
      return snapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
    } catch (innerErr: any) {
      throw mapFirebaseError(innerErr);
    }
  }
}

export async function getCertificateById(id: string): Promise<Certificate | null> {
  try {
    const docRef = doc(db, COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return normalizeDoc(snap.data() as Record<string, any>, snap.id);
  } catch (err: any) {
    throw mapFirebaseError(err);
  }
}

export async function createCertificate(data: Omit<Certificate, 'id'>): Promise<Certificate> {
  const colRef = collection(db, COLLECTION);

  // Normalize legacy fields/mappings
  const studentName = data.studentName || 'Unknown Student';
  const registerNumber = data.registerNumber || '';
  const courseName = data.courseName || '';
  const certificateTitle = data.certificateTitle || data.courseName || '';
  const certificateNumber = data.certificateNumber || data.certificateCode || '';
  const description = data.description || data.remarks || '';
  const certificateType = data.certificateType || 'Course Completion';
  const downloadUrl = data.downloadUrl || data.certificateUrl || '';
  const uploadedBy = data.uploadedBy || 'System Admin';
  const status = data.status || 'Approved';

  // 1. Data Validation: Certificate Title is not empty
  if (!certificateTitle || certificateTitle.trim() === '') {
    throw new Error('Certificate Title is required and cannot be empty.');
  }

  // 2. Data Validation: Download URL is not empty for Issued or Approved certificates
  if ((status === 'Approved' || status === 'Issued') && (!downloadUrl || downloadUrl.trim() === '')) {
    throw new Error('Download URL is required and cannot be empty for issued or approved certificates.');
  }

  // 3. Data Validation: Download URL format validation if provided
  if (downloadUrl && downloadUrl.trim() !== '') {
    try {
      new URL(downloadUrl);
    } catch (_) {
      throw new Error('Invalid certificate download link URL format.');
    }
  }

  try {
    // 4. Data Validation: Student exists
    if (!data.studentId) {
      throw new Error('Student ID is required.');
    }
    const studentDocRef = doc(db, 'students', data.studentId);
    const studentSnap = await getDoc(studentDocRef);
    if (!studentSnap.exists()) {
      throw new Error('The selected student does not exist in the database.');
    }

    // 5. Data Validation: Course exists (handles comma-separated lists of courses)
    if (!data.courseId) {
      throw new Error('Course ID is required.');
    }
    const courseIdsList = data.courseId.split(',').map(s => s.trim()).filter(Boolean);
    if (courseIdsList.length === 0) {
      throw new Error('At least one Course ID is required.');
    }
    for (const cid of courseIdsList) {
      const courseDocRef = doc(db, 'courses', cid);
      const courseSnap = await getDoc(courseDocRef);
      if (!courseSnap.exists()) {
        throw new Error(`The selected course (ID: ${cid}) does not exist in the database.`);
      }
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('does not exist') || err.message.includes('required') || err.message.includes('invalid') || err.message.includes('format'))) {
      throw err;
    }
    throw mapFirebaseError(err);
  }

  const payload = {
    studentId: data.studentId || '',
    studentName,
    registerNumber,
    courseId: data.courseId || '',
    courseName,
    certificateTitle,
    certificateNumber,
    issueDate: data.issueDate || new Date().toISOString().split('T')[0],
    description,
    certificateType,
    downloadUrl,
    uploadedBy,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(colRef, payload);
    await updateDoc(docRef, { certificateId: docRef.id });

    const snap = await getDoc(docRef);
    return normalizeDoc(snap.data() as Record<string, any>, docRef.id);
  } catch (err: any) {
    throw mapFirebaseError(err);
  }
}

export async function updateCertificate(id: string, data: Partial<Certificate>): Promise<Certificate> {
  const docRef = doc(db, COLLECTION, id);

  try {
    const currentSnap = await getDoc(docRef);
    if (!currentSnap.exists()) {
      throw new Error('The requested certificate document was not found.');
    }

    const currentData = currentSnap.data();
    
    // 1. Data Validation: Certificate Title is not empty (if provided)
    if (data.certificateTitle !== undefined && (!data.certificateTitle || data.certificateTitle.trim() === '')) {
      throw new Error('Certificate Title is required and cannot be empty.');
    }

    // 2. Data Validation: Download URL is not empty for Issued/Approved status
    const status = data.status || currentData.status;
    const downloadUrl = data.downloadUrl !== undefined ? data.downloadUrl : (data.certificateUrl !== undefined ? data.certificateUrl : currentData.downloadUrl);
    if ((status === 'Approved' || status === 'Issued') && (!downloadUrl || downloadUrl.trim() === '')) {
      throw new Error('Download URL is required and cannot be empty for issued or approved certificates.');
    }

    // 3. Data Validation: Download URL format validation (if provided)
    if (downloadUrl && downloadUrl.trim() !== '') {
      try {
        new URL(downloadUrl);
      } catch (_) {
        throw new Error('Invalid certificate download link URL format.');
      }
    }

    // 4. Data Validation: Student exists (if provided)
    if (data.studentId !== undefined) {
      if (!data.studentId) {
        throw new Error('Student ID is required.');
      }
      const studentDocRef = doc(db, 'students', data.studentId);
      const studentSnap = await getDoc(studentDocRef);
      if (!studentSnap.exists()) {
        throw new Error('The selected student does not exist in the database.');
      }
    }

    // 5. Data Validation: Course exists (if provided)
    if (data.courseId !== undefined) {
      if (!data.courseId) {
        throw new Error('Course ID is required.');
      }
      const courseIdsList = data.courseId.split(',').map(s => s.trim()).filter(Boolean);
      if (courseIdsList.length === 0) {
        throw new Error('At least one Course ID is required.');
      }
      for (const cid of courseIdsList) {
        const courseDocRef = doc(db, 'courses', cid);
        const courseSnap = await getDoc(courseDocRef);
        if (!courseSnap.exists()) {
          throw new Error(`The selected course (ID: ${cid}) does not exist in the database.`);
        }
      }
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('does not exist') || err.message.includes('required') || err.message.includes('invalid') || err.message.includes('format') || err.message.includes('not found'))) {
      throw err;
    }
    throw mapFirebaseError(err);
  }

  const payload: Record<string, any> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  // Map legacy fields if passed
  if (data.certificateCode) payload.certificateNumber = data.certificateCode;
  if (data.certificateUrl) payload.downloadUrl = data.certificateUrl;
  if (data.remarks) payload.description = data.remarks;

  // Clean payload keys that shouldn't be attributes in Firestore
  delete payload.id;
  delete payload.certificateId;
  delete payload.certificateCode;
  delete payload.certificateUrl;
  delete payload.remarks;
  delete payload.certificateFileName;

  try {
    await updateDoc(docRef, payload);

    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error(`Certificate ${id} not found after update`);
    return normalizeDoc(snap.data() as Record<string, any>, snap.id);
  } catch (err: any) {
    throw mapFirebaseError(err);
  }
}

export async function deleteCertificate(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err: any) {
    throw mapFirebaseError(err);
  }
}

// ─────────────────────────────────────────────
// Realtime Subscriptions
// ─────────────────────────────────────────────

export function subscribeToCertificates(callback: (certificates: Certificate[]) => void): () => void {
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const certificates = snapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
      callback(certificates);
    },
    (error) => {
      console.warn('[certificateService] subscribeToCertificates order error, falling back to unordered:', error);
      return onSnapshot(colRef, (fallbackSnapshot) => {
        const certificates = fallbackSnapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
        certificates.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        callback(certificates);
      });
    }
  );
}

export function subscribeToStudentCertificates(studentId: string, callback: (certificates: Certificate[]) => void): () => void {
  if (!studentId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, where('studentId', '==', studentId), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const certificates = snapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
      callback(certificates);
    },
    (error) => {
      console.warn('[certificateService] subscribeToStudentCertificates order error, falling back to unordered:', error);
      const qFallback = query(colRef, where('studentId', '==', studentId));
      return onSnapshot(qFallback, (fallbackSnapshot) => {
        const certificates = fallbackSnapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
        certificates.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        callback(certificates);
      });
    }
  );
}

class FirebaseCertificateService implements IBaseService<Certificate> {
  async getAll(): Promise<Certificate[]> {
    return getCertificates();
  }
  async getById(id: string): Promise<Certificate | null> {
    return getCertificateById(id);
  }
  async create(data: Omit<Certificate, 'id'>): Promise<Certificate> {
    return createCertificate(data);
  }
  async update(id: string, data: Partial<Certificate>): Promise<Certificate> {
    return updateCertificate(id, data);
  }
  async delete(id: string): Promise<void> {
    return deleteCertificate(id);
  }
  async getByStudentId(studentId: string): Promise<Certificate[]> {
    return getStudentCertificates(studentId);
  }
  onSnapshot(callback: (data: Certificate[]) => void): () => void {
    return subscribeToCertificates(callback);
  }
}

export const certificateService = new FirebaseCertificateService();
