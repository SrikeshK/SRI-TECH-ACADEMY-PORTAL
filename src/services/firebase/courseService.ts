/**
 * Firebase Course Service – Phase 3 Migration
 * Handles all Firestore CRUD for the `courses` collection,
 * including module management and realtime subscriptions.
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
  orderBy,
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
  // Ensure modules always an array
  if (!Array.isArray(normalized.modules)) {
    normalized.modules = [];
  }
  // Ensure materials always an array
  if (!Array.isArray(normalized.materials)) {
    normalized.materials = [];
  }
  return normalized as unknown as Course;
}

// ─────────────────────────────────────────────
// CRUD – Standalone Exported Functions
// ─────────────────────────────────────────────

export async function getAllCourses(): Promise<Course[]> {
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'asc'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, unknown>, d.id));
  } catch {
    // Fallback without ordering if index not built
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, unknown>, d.id));
  }
}

export async function getCourseById(id: string): Promise<Course | null> {
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
  // Remove the id field if accidentally present
  delete (payload as Record<string, unknown>)['id'];

  const docRef = await addDoc(colRef, payload);
  // Write the auto-generated Firestore ID back into the document
  await updateDoc(docRef, { id: docRef.id });

  const snap = await getDoc(docRef);
  return normalizeDoc(snap.data() as Record<string, unknown>, docRef.id);
}

export async function updateCourse(id: string, data: Partial<Course>): Promise<Course> {
  const docRef = doc(db, COLLECTION, id);
  const updatePayload = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  delete (updatePayload as Record<string, unknown>)['id'];

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
  data: Partial<CourseModule>
): Promise<Course> {
  const docRef = doc(db, COLLECTION, courseId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error(`Course ${courseId} not found.`);

  const course = normalizeDoc(snap.data() as Record<string, unknown>, snap.id);
  const modules: CourseModule[] = course.modules ?? [];

  const updatedModules = modules.map((m) =>
    m.id === moduleId ? { ...m, ...data, id: m.id } : m
  );

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
    .map((m, index) => ({ ...m, order: index + 1 }));

  await updateDoc(docRef, {
    modules: updatedModules,
    updatedAt: serverTimestamp(),
  });

  const updated = await getDoc(docRef);
  return normalizeDoc(updated.data() as Record<string, unknown>, updated.id);
}

/**
 * Reorder modules by providing an array of module IDs in the desired order.
 * The function will reconstruct the modules array with updated `order` values.
 */
export async function reorderModules(courseId: string, orderedModules: CourseModule[]): Promise<Course> {
  const docRef = doc(db, COLLECTION, courseId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error(`Course ${courseId} not found.`);

  // Reassign order based on new position
  const updatedModules = orderedModules.map((m, index) => ({ ...m, order: index + 1 }));

  await updateDoc(docRef, {
    modules: updatedModules,
    updatedAt: serverTimestamp(),
  });

  const updated = await getDoc(docRef);
  return normalizeDoc(updated.data() as Record<string, unknown>, updated.id);
}

// ─────────────────────────────────────────────
// Realtime Subscription
// ─────────────────────────────────────────────

/**
 * Subscribe to all courses in realtime.
 * Returns an unsubscribe function to be called on component unmount.
 */
export function subscribeToAllCourses(callback: (courses: Course[]) => void): () => void {
  const colRef = collection(db, COLLECTION);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const courses = snapshot.docs.map((d) =>
        normalizeDoc(d.data() as Record<string, unknown>, d.id)
      );
      callback(courses);
    },
    (error) => {
      console.error('[courseService] onSnapshot error:', error);
    }
  );
}

// ─────────────────────────────────────────────
// Seed Helper
// ─────────────────────────────────────────────

/**
 * Seeds the mock courses into Firestore if the collection is empty.
 * Call once from the browser console or an admin setup page:
 *   import { seedCoursesToFirestore } from './services/firebase/courseService';
 *   seedCoursesToFirestore();
 */
let courseSeedingPromise: Promise<void> | null = null;

export async function seedCoursesToFirestore(): Promise<void> {
  if (courseSeedingPromise) {
    return courseSeedingPromise;
  }

  courseSeedingPromise = (async () => {
    const colRef = collection(db, COLLECTION);
    const existing = await getDocs(colRef);
    
    const { mockDb } = await import('../../firebase/mockDb');
    const mockCourses = mockDb.getCourses();
    const existingCourses = existing.docs.map((d) => normalizeDoc(d.data() as Record<string, unknown>, d.id));
    
    const codes = existingCourses.map((c) => c.code);
    const hasDuplicates = new Set(codes).size !== codes.length;

    if (!existing.empty && !hasDuplicates) {
      console.log('[seedCoursesToFirestore] Courses already exist in Firestore. Skipping seed.');
      return;
    }

    if (hasDuplicates) {
      console.log('[seedCoursesToFirestore] Duplicate courses detected. Cleaning up collection...');
      for (const docSnap of existing.docs) {
        await deleteDoc(doc(db, COLLECTION, docSnap.id));
      }
    }

    for (const course of mockCourses) {
      const { id: _id, ...rest } = course;
      const payload = {
        ...rest,
        fee: rest.price ?? 0,
        status: 'Active',
        modules: rest.modules ?? [],
        materials: rest.materials ?? [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(colRef, payload);
      await updateDoc(docRef, { id: docRef.id });
    }

    console.log(`[seedCoursesToFirestore] Seeded ${mockCourses.length} courses to Firestore.`);
  })();

  try {
    await courseSeedingPromise;
  } finally {
    courseSeedingPromise = null;
  }
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
