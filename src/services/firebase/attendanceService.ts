/**
 * Firebase Attendance Service – Phase 4 Migration
 * =====================================================
 * Handles all Firestore CRUD for the `attendance` collection.
 * Provides realtime subscriptions via onSnapshot().
 * All attendance calculations are performed here in the service
 * layer and never inside UI components.
 *
 * Firestore Document Structure:
 * attendance/{documentId}
 *   - studentId:   string
 *   - courseId:    string (optional)
 *   - date:        string (YYYY-MM-DD)
 *   - status:      'Present' | 'Absent' | 'Late' | 'Leave'
 *   - markedBy:    string (admin UID)
 *   - remarks:     string (optional)
 *   - studentName: string (denormalized for quick reads)
 *   - batch:       string (denormalized)
 *   - createdAt:   Timestamp
 *   - updatedAt:   Timestamp
 */

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
  writeBatch,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Attendance } from '../../types';
import { IBaseService } from '../types';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const COLLECTION = 'attendance';

// ─────────────────────────────────────────────
// Types – Calculation Results
// ─────────────────────────────────────────────

export interface AttendanceStats {
  totalClasses: number;
  classesAttended: number;   // Present + Late count as attended
  presentCount: number;
  lateCount: number;
  absentCount: number;
  leaveCount: number;
  attendancePercentage: number; // Present ÷ Total × 100
  attendedPercentage: number;   // (Present + Late) ÷ Total × 100
}

export interface MonthlyAttendance {
  month: string;             // e.g., "2025-06"
  monthLabel: string;        // e.g., "Jun 2025"
  total: number;
  present: number;
  late: number;
  absent: number;
  leave: number;
  percentage: number;
}

export interface AttendanceFilters {
  studentId?: string;
  courseId?: string;
  date?: string;
  month?: string;            // YYYY-MM format
  status?: 'Present' | 'Absent' | 'Late' | 'Leave';
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Converts Firestore Timestamps to ISO strings */
function normalizeDoc(data: Record<string, unknown>, id: string): Attendance {
  const normalized: Record<string, unknown> = { ...data, id };
  if (normalized.createdAt instanceof Timestamp) {
    normalized.createdAt = (normalized.createdAt as Timestamp).toDate().toISOString();
  }
  if (normalized.updatedAt instanceof Timestamp) {
    normalized.updatedAt = (normalized.updatedAt as Timestamp).toDate().toISOString();
  }
  return normalized as unknown as Attendance;
}

/** Build a deterministic document ID for a student+date+course combination */
function buildDocId(studentId: string, date: string, courseId?: string): string {
  const coursePart = courseId && courseId !== 'all' ? `_${courseId}` : '';
  return `att_${studentId}_${date}${coursePart}`;
}

// ─────────────────────────────────────────────
// CRUD – Standalone Exported Functions
// ─────────────────────────────────────────────

/** Fetch all attendance records (optionally filtered) */
export async function getAttendance(filters?: AttendanceFilters): Promise<Attendance[]> {
  const colRef = collection(db, COLLECTION);
  const constraints: QueryConstraint[] = [orderBy('date', 'desc')];

  if (filters?.studentId) {
    constraints.push(where('studentId', '==', filters.studentId));
  }
  if (filters?.courseId) {
    constraints.push(where('courseId', '==', filters.courseId));
  }
  if (filters?.date) {
    constraints.push(where('date', '==', filters.date));
  }
  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  }

  try {
    const q = query(colRef, ...constraints);
    const snapshot = await getDocs(q);
    let records = snapshot.docs.map((d) =>
      normalizeDoc(d.data() as Record<string, unknown>, d.id)
    );

    // Month filter applied client-side (avoids composite index requirement)
    if (filters?.month) {
      records = records.filter((r) => r.date?.startsWith(filters.month!));
    }

    return records;
  } catch {
    // Fallback: no ordering, client-side filter
    const snapshot = await getDocs(colRef);
    let records = snapshot.docs.map((d) =>
      normalizeDoc(d.data() as Record<string, unknown>, d.id)
    );
    if (filters?.studentId) records = records.filter((r) => r.studentId === filters.studentId);
    if (filters?.courseId) records = records.filter((r) => r.courseId === filters.courseId);
    if (filters?.date) records = records.filter((r) => r.date === filters.date);
    if (filters?.month) records = records.filter((r) => r.date?.startsWith(filters.month!));
    if (filters?.status) records = records.filter((r) => r.status === filters.status);
    return records;
  }
}

/** Fetch all attendance records for a specific student */
export async function getAttendanceByStudent(studentId: string): Promise<Attendance[]> {
  return getAttendance({ studentId });
}

/** Fetch all attendance records for a specific course */
export async function getAttendanceByCourse(courseId: string): Promise<Attendance[]> {
  return getAttendance({ courseId });
}

/** Mark (create or update) a single attendance record */
export async function markAttendance(data: Omit<Attendance, 'id'>): Promise<Attendance> {
  const docId = buildDocId(data.studentId, data.date, data.courseId);
  const docRef = doc(db, COLLECTION, docId);

  const payload = {
    ...data,
    id: docId,
    updatedAt: serverTimestamp(),
  };

  // Check if doc already exists
  const existing = await getDoc(docRef);
  if (existing.exists()) {
    await updateDoc(docRef, {
      status: data.status,
      markedBy: data.markedBy ?? null,
      remarks: data.remarks ?? null,
      studentName: data.studentName ?? null,
      batch: data.batch ?? null,
      courseId: data.courseId ?? null,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(docRef, {
      ...payload,
      createdAt: serverTimestamp(),
    });
  }

  const snap = await getDoc(docRef);
  return normalizeDoc(snap.data() as Record<string, unknown>, docRef.id);
}

/** Update an existing attendance record */
export async function updateAttendance(
  id: string,
  data: Partial<Attendance>
): Promise<Attendance> {
  const docRef = doc(db, COLLECTION, id);
  const updatePayload: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  delete updatePayload['id'];

  await updateDoc(docRef, updatePayload);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error(`Attendance record ${id} not found after update.`);
  return normalizeDoc(snap.data() as Record<string, unknown>, snap.id);
}

/** Delete an attendance record by document ID */
export async function deleteAttendance(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Batch save multiple attendance records for a single session.
 * Uses deterministic document IDs (studentId + date + courseId) to
 * upsert records — safe to call multiple times for the same session.
 */
export async function saveMultipleAttendance(records: Attendance[]): Promise<Attendance[]> {
  const batch = writeBatch(db);
  const now = serverTimestamp();

  for (const record of records) {
    const docId = buildDocId(record.studentId, record.date, record.courseId);
    const docRef = doc(db, COLLECTION, docId);
    batch.set(
      docRef,
      {
        id: docId,
        studentId: record.studentId,
        courseId: record.courseId ?? null,
        date: record.date,
        status: record.status,
        markedBy: record.markedBy ?? null,
        remarks: record.remarks ?? null,
        studentName: record.studentName ?? null,
        batch: record.batch ?? null,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }   // merge:true acts as upsert
    );
  }

  await batch.commit();

  // Return records with their deterministic IDs
  return records.map((r) => ({
    ...r,
    id: buildDocId(r.studentId, r.date, r.courseId),
  }));
}

// ─────────────────────────────────────────────
// Realtime Subscriptions
// ─────────────────────────────────────────────

/**
 * Subscribe to all attendance records in realtime.
 * Returns an unsubscribe function for cleanup on unmount.
 */
export function subscribeToAttendance(
  callback: (records: Attendance[]) => void,
  filters?: AttendanceFilters
): () => void {
  const colRef = collection(db, COLLECTION);
  const constraints: QueryConstraint[] = [];

  if (filters?.studentId) {
    constraints.push(where('studentId', '==', filters.studentId));
  }
  if (filters?.courseId && filters.courseId !== 'all') {
    constraints.push(where('courseId', '==', filters.courseId));
  }
  if (filters?.date) {
    constraints.push(where('date', '==', filters.date));
  }
  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  }

  const q = constraints.length > 0 ? query(colRef, ...constraints) : query(colRef);

  return onSnapshot(
    q,
    (snapshot) => {
      let records = snapshot.docs.map((d) =>
        normalizeDoc(d.data() as Record<string, unknown>, d.id)
      );
      // Client-side month filter
      if (filters?.month) {
        records = records.filter((r) => r.date?.startsWith(filters.month!));
      }
      callback(records);
    },
    (error) => {
      console.error('[attendanceService] onSnapshot error:', error);
    }
  );
}

/**
 * Subscribe to attendance records for a specific student.
 * Ideal for the Student Attendance portal page.
 */
export function subscribeToStudentAttendance(
  studentId: string,
  callback: (records: Attendance[]) => void
): () => void {
  return subscribeToAttendance(callback, { studentId });
}

// ─────────────────────────────────────────────
// Attendance Calculations (Service Layer)
// ─────────────────────────────────────────────

/**
 * Calculate attendance statistics for a set of attendance records.
 * Formula: Attendance% = Present ÷ Total × 100
 * All calculations happen here, never in UI components.
 */
export function calculateAttendanceStats(records: Attendance[]): AttendanceStats {
  const totalClasses = records.length;
  const presentCount = records.filter((r) => r.status === 'Present').length;
  const lateCount    = records.filter((r) => r.status === 'Late').length;
  const absentCount  = records.filter((r) => r.status === 'Absent').length;
  const leaveCount   = records.filter((r) => r.status === 'Leave').length;
  const classesAttended = presentCount + lateCount;

  const attendancePercentage =
    totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;
  const attendedPercentage =
    totalClasses > 0 ? Math.round((classesAttended / totalClasses) * 100) : 0;

  return {
    totalClasses,
    classesAttended,
    presentCount,
    lateCount,
    absentCount,
    leaveCount,
    attendancePercentage,
    attendedPercentage,
  };
}

/**
 * Group attendance records by month and compute per-month statistics.
 * Returns months sorted chronologically (oldest first).
 */
export function calculateMonthlyAttendance(records: Attendance[]): MonthlyAttendance[] {
  const monthMap: Map<string, Attendance[]> = new Map();

  for (const record of records) {
    if (!record.date) continue;
    const month = record.date.slice(0, 7); // "YYYY-MM"
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month)!.push(record);
  }

  const results: MonthlyAttendance[] = [];

  for (const [month, monthRecords] of monthMap) {
    const total   = monthRecords.length;
    const present = monthRecords.filter((r) => r.status === 'Present').length;
    const late    = monthRecords.filter((r) => r.status === 'Late').length;
    const absent  = monthRecords.filter((r) => r.status === 'Absent').length;
    const leave   = monthRecords.filter((r) => r.status === 'Leave').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    const [year, mo] = month.split('-');
    const monthLabel = new Date(Number(year), Number(mo) - 1, 1).toLocaleString('en-US', {
      month: 'short',
      year: 'numeric',
    });

    results.push({ month, monthLabel, total, present, late, absent, leave, percentage });
  }

  return results.sort((a, b) => a.month.localeCompare(b.month));
}

// ─────────────────────────────────────────────
// Service Class (implements IBaseService<Attendance>)
// ─────────────────────────────────────────────

class FirebaseAttendanceService implements IBaseService<Attendance> {
  async getAll(): Promise<Attendance[]> {
    return getAttendance();
  }

  async getById(id: string): Promise<Attendance | null> {
    const docRef = doc(db, COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return normalizeDoc(snap.data() as Record<string, unknown>, snap.id);
  }

  async create(data: Omit<Attendance, 'id'>): Promise<Attendance> {
    return markAttendance(data);
  }

  async update(id: string, data: Partial<Attendance>): Promise<Attendance> {
    return updateAttendance(id, data);
  }

  async delete(id: string): Promise<void> {
    return deleteAttendance(id);
  }

  async getByStudentId(studentId: string): Promise<Attendance[]> {
    return getAttendanceByStudent(studentId);
  }

  async saveMultiple(records: Attendance[]): Promise<Attendance[]> {
    return saveMultipleAttendance(records);
  }

  async getByDate(date: string): Promise<Attendance[]> {
    return getAttendance({ date });
  }

  /** Realtime subscription – returns unsubscribe fn */
  onSnapshot(callback: (records: Attendance[]) => void): () => void {
    return subscribeToAttendance(callback);
  }
}

export const attendanceService = new FirebaseAttendanceService();
