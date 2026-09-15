/**
 * Firebase Course Service
 * Handles all Firestore CRUD for the `courses` collection,
 * including module management and realtime subscriptions.
 * Single source of truth: Firestore database.
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
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Course, CourseModule } from '../../types';
import { IBaseService } from '../types';

const COLLECTION = 'courses';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Convert Firestore Timestamps to ISO strings for safe usage in React state */
function normalizeDoc(data: Record<string, unknown>, id: string): Course {
  const normalized: Record<string, unknown> = { ...data, id };
  if (normalized.createdAt instanceof Timestamp) {
    normalized.createdAt = (normalized.createdAt as Timestamp).toDate().toISOString();
  }
  if (normalized.updatedAt instanceof Timestamp) {
    normalized.updatedAt = (normalized.updatedAt as Timestamp).toDate().toISOString();
  }
  // Ensure modules is always an array
  if (!Array.isArray(normalized.modules)) {
    normalized.modules = [];
  }
  // Ensure materials is always an array
  if (!Array.isArray(normalized.materials)) {
    normalized.materials = [];
  }
  // Ensure syllabus is always an array (for backwards compat)
  if (!Array.isArray(normalized.syllabus)) {
    normalized.syllabus = normalized.modules ? (normalized.modules as CourseModule[]).map(m => m.title) : [];
  }
  return normalized as unknown as Course;
}

/** Sort courses deterministically by code or name or id */
function sortCourses(list: Course[]): Course[] {
  return [...list].sort((a, b) => {
    const codeA = a.code || a.id;
    const codeB = b.code || b.id;
    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
  });
}

// ─────────────────────────────────────────────
// CRUD – Standalone Exported Functions
// ─────────────────────────────────────────────

export async function getAllCourses(): Promise<Course[]> {
  const colRef = collection(db, COLLECTION);
  const snapshot = await getDocs(colRef);
  const list = snapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, unknown>, d.id));
  return sortCourses(list);
}

export async function getCourseById(id: string): Promise<Course | null> {
  if (!id) return null;
  const docRef = doc(db, COLLECTION, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return normalizeDoc(snap.data() as Record<string, unknown>, snap.id);
}

export async function createCourse(data: Omit<Course, 'id'>): Promise<Course> {
  const colRef = collection(db, COLLECTION);
  const payload = {
    ...data,
    modules: data.modules ?? [],
    materials: data.materials ?? [],
    status: data.status ?? 'Active',
    fee: data.fee ?? data.price ?? 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  delete (payload as Record<string, unknown>)['id'];

  const docRef = await addDoc(colRef, payload);
  await updateDoc(docRef, { id: docRef.id });

  const snap = await getDoc(docRef);
  return normalizeDoc(snap.data() as Record<string, unknown>, docRef.id);
}

export async function updateCourse(id: string, data: Partial<Course>): Promise<Course> {
  const docRef = doc(db, COLLECTION, id);
  const updatePayload: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  delete updatePayload['id'];

  await updateDoc(docRef, updatePayload);

  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error(`Course ${id} not found after update.`);
  return normalizeDoc(snap.data() as Record<string, unknown>, snap.id);
}

export async function deleteCourse(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

// ─────────────────────────────────────────────
// Module Management Functions
// ─────────────────────────────────────────────

export async function addModule(
  courseId: string,
  moduleData: Omit<CourseModule, 'id' | 'order'>
): Promise<Course> {
  const docRef = doc(db, COLLECTION, courseId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error(`Course ${courseId} not found.`);

  const course = normalizeDoc(snap.data() as Record<string, unknown>, snap.id);
  const modules: CourseModule[] = course.modules ?? [];

  const newModule: CourseModule = {
    id: `m-${Date.now()}`,
    title: moduleData.title,
    description: moduleData.description,
    isActive: moduleData.isActive ?? true,
    status: moduleData.status ?? 'active',
    order: modules.length + 1,
  };

  const updatedModules = [...modules, newModule];

  await updateDoc(docRef, {
    modules: updatedModules,
    updatedAt: serverTimestamp(),
  });

  const updated = await getDoc(docRef);
  return normalizeDoc(updated.data() as Record<string, unknown>, updated.id);
}

export async function updateModule(
  courseId: string,
  moduleId: string,
  updates: Partial<CourseModule>
): Promise<Course> {
  const docRef = doc(db, COLLECTION, courseId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error(`Course ${courseId} not found.`);

  const course = normalizeDoc(snap.data() as Record<string, unknown>, snap.id);
  const modules: CourseModule[] = course.modules ?? [];

  const updatedModules = modules.map((m) => {
    if (m.id === moduleId) {
      return { ...m, ...updates };
    }
    return m;
  });

  await updateDoc(docRef, {
    modules: updatedModules,
    updatedAt: serverTimestamp(),
  });

  const updated = await getDoc(docRef);
  return normalizeDoc(updated.data() as Record<string, unknown>, updated.id);
}

export async function deleteModule(courseId: string, moduleId: string): Promise<Course> {
  const docRef = doc(db, COLLECTION, courseId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error(`Course ${courseId} not found.`);

  const course = normalizeDoc(snap.data() as Record<string, unknown>, snap.id);
  const modules: CourseModule[] = course.modules ?? [];

  const updatedModules = modules
    .filter((m) => m.id !== moduleId)
    .map((m, idx) => ({ ...m, order: idx + 1 }));

  await updateDoc(docRef, {
    modules: updatedModules,
    updatedAt: serverTimestamp(),
  });

  const updated = await getDoc(docRef);
  return normalizeDoc(updated.data() as Record<string, unknown>, updated.id);
}

export async function reorderModules(courseId: string, moduleIds: string[]): Promise<Course> {
  const docRef = doc(db, COLLECTION, courseId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error(`Course ${courseId} not found.`);

  const course = normalizeDoc(snap.data() as Record<string, unknown>, snap.id);
  const modules: CourseModule[] = course.modules ?? [];

  const moduleMap = new Map<string, CourseModule>();
  modules.forEach((m) => moduleMap.set(m.id, m));

  const reordered: CourseModule[] = [];
  moduleIds.forEach((id, idx) => {
    const m = moduleMap.get(id);
    if (m) {
      reordered.push({ ...m, order: idx + 1 });
    }
  });

  let currentOrder = reordered.length + 1;
  modules.forEach((m) => {
    if (!moduleIds.includes(m.id)) {
      reordered.push({ ...m, order: currentOrder });
      currentOrder++;
    }
  });

  await updateDoc(docRef, {
    modules: reordered,
    updatedAt: serverTimestamp(),
  });

  const updated = await getDoc(docRef);
  return normalizeDoc(updated.data() as Record<string, unknown>, updated.id);
}

// ─────────────────────────────────────────────
// Realtime Subscription
// ─────────────────────────────────────────────

export function subscribeToAllCourses(callback: (courses: Course[]) => void): () => void {
  const colRef = collection(db, COLLECTION);
  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs.map((d) => normalizeDoc(d.data() as Record<string, unknown>, d.id));
      callback(sortCourses(list));
    },
    (err) => {
      console.error('[subscribeToAllCourses] Firestore listener error:', err);
    }
  );
}

// ─────────────────────────────────────────────
// Safe Seeding Helper (Only when collection is completely empty)
// ─────────────────────────────────────────────

export async function seedCoursesToFirestore(): Promise<void> {
  const colRef = collection(db, COLLECTION);
  const existing = await getDocs(colRef);
  if (!existing.empty) {
    console.log('[seedCoursesToFirestore] Courses already exist in Firestore. Skipping seed.');
    return;
  }

  const { mockDb } = await import('../../firebase/mockDb');
  const mockCourses = mockDb.getCourses();

  for (const course of mockCourses) {
    const { id, ...rest } = course;
    const payload = {
      ...rest,
      id,
      fee: rest.price ?? 0,
      status: 'Active',
      modules: rest.modules ?? [],
      materials: rest.materials ?? [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, COLLECTION, id), payload);
  }
  console.log(`[seedCoursesToFirestore] Seeded initial ${mockCourses.length} courses to empty Firestore collection.`);
}

// ─────────────────────────────────────────────
// Service Class (implements IBaseService<Course>)
// ─────────────────────────────────────────────

class FirebaseCourseService implements IBaseService<Course> {
  async getAll(): Promise<Course[]> {
    return getAllCourses();
  }

  async getById(id: string): Promise<Course | null> {
    return getCourseById(id);
  }

  async create(data: Omit<Course, 'id'>): Promise<Course> {
    return createCourse(data);
  }

  async update(id: string, data: Partial<Course>): Promise<Course> {
    return updateCourse(id, data);
  }

  async delete(id: string): Promise<void> {
    return deleteCourse(id);
  }

  onSnapshot(callback: (courses: Course[]) => void): () => void {
    return subscribeToAllCourses(callback);
  }
}

export const courseService = new FirebaseCourseService();
