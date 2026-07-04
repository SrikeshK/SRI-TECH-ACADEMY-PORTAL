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
  setDoc,
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

  // Add any modules that weren't in the list at the end
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
  const q = query(colRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => normalizeDoc(d.data() as Record<string, unknown>, d.id)));
    },
    () => {
      // Fallback if ordering query fails
      return onSnapshot(colRef, (snapFallback) => {
        const list = snapFallback.docs.map((d) =>
          normalizeDoc(d.data() as Record<string, unknown>, d.id)
        );
        // Sort in memory by name
        list.sort((a, b) => a.name.localeCompare(b.name));
        callback(list);
      });
    }
  );
}

// ─────────────────────────────────────────────
// Seed Helper
// ─────────────────────────────────────────────

/**
 * Seeds the mock courses into Firestore if the collection is empty.
 * Uses exact c1-c7 document IDs to ensure correct mappings and pricing calculations.
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

    // Check if courses already exist with legacy c1-c7 document IDs
    const allLegacyIdsExist = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'].every(id => 
      existing.docs.some(d => d.id === id)
    );

    if (allLegacyIdsExist && !hasDuplicates && existing.size === 7) {
      console.log('[seedCoursesToFirestore] Courses already exist in Firestore with legacy IDs. Skipping seed.');
      return;
    }

    console.log('[seedCoursesToFirestore] Correcting and cleaning up courses collection...');
    for (const docSnap of existing.docs) {
      await deleteDoc(doc(db, COLLECTION, docSnap.id));
    }

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
      await setDoc(doc(db, COLLECTION, id), payload);
    }

    console.log(`[seedCoursesToFirestore] Seeded ${mockCourses.length} courses to Firestore with legacy document IDs.`);
  })();

  try {
    await courseSeedingPromise;
  } finally {
    courseSeedingPromise = null;
  }
}

// ─────────────────────────────────────────────
// Auto Database Self-Healing Migration
// ─────────────────────────────────────────────

const NAME_TO_LEGACY_ID: Record<string, string> = {
  'C': 'c1',
  'C++': 'c2',
  'Python': 'c3',
  'Java': 'c4',
  'DMO': 'c5',
  'Tally': 'c6',
  'HTML CSS JS': 'c7',
};

const CODE_TO_LEGACY_ID: Record<string, string> = {
  'STA-C-01': 'c1',
  'STA-CPP-02': 'c2',
  'STA-PY-03': 'c3',
  'STA-JAVA-04': 'c4',
  'STA-DMO-05': 'c5',
  'STA-TALLY-06': 'c6',
  'STA-WD-07': 'c7',
};

export async function runCourseMigration(): Promise<void> {
  const colRef = collection(db, COLLECTION);
  const snap = await getDocs(colRef);
  
  const hasNonLegacyDocs = snap.docs.some(d => !['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'].includes(d.id));
  const hasAllLegacyDocs = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'].every(id => 
    snap.docs.some(d => d.id === id)
  );

  if (!hasNonLegacyDocs && hasAllLegacyDocs && snap.size === 7) {
    return;
  }

  console.log('[Migration] Starting course and reference ID migration...');
  const oldToNewIdMap: Record<string, string> = {};

  snap.docs.forEach(docSnap => {
    const data = docSnap.data();
    const docId = docSnap.id;
    if (!['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'].includes(docId)) {
      const name = data.name || '';
      const code = data.code || '';
      const legacyId = NAME_TO_LEGACY_ID[name] || CODE_TO_LEGACY_ID[code];
      if (legacyId) {
        oldToNewIdMap[docId] = legacyId;
      }
    }
  });

  const { mockDb } = await import('../../firebase/mockDb');
  const mockCourses = mockDb.getCourses();

  for (const docSnap of snap.docs) {
    if (!['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'].includes(docSnap.id)) {
      await deleteDoc(doc(db, COLLECTION, docSnap.id));
    }
  }

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
    await setDoc(doc(db, COLLECTION, id), payload);
  }

  // Migrate students
  const studentsSnap = await getDocs(collection(db, 'students'));
  for (const studentDoc of studentsSnap.docs) {
    const data = studentDoc.data();
    const courseIds = data.courseIds || [];
    const enrolledCourses = data.enrolledCourses || [];
    
    let changed = false;
    const newCourseIds = courseIds.map((cid: string) => {
      if (oldToNewIdMap[cid]) {
        changed = true;
        return oldToNewIdMap[cid];
      }
      return cid;
    });

    const newEnrolledCourses = enrolledCourses.map((cid: string) => {
      if (oldToNewIdMap[cid]) {
        changed = true;
        return oldToNewIdMap[cid];
      }
      return cid;
    });

    if (changed) {
      await updateDoc(doc(db, 'students', studentDoc.id), {
        courseIds: newCourseIds,
        enrolledCourses: newEnrolledCourses,
        updatedAt: serverTimestamp()
      });
    }
  }

  // Migrate users
  const usersSnap = await getDocs(collection(db, 'users'));
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const courseIds = data.courseIds || [];
    
    let changed = false;
    const newCourseIds = courseIds.map((cid: string) => {
      if (oldToNewIdMap[cid]) {
        changed = true;
        return oldToNewIdMap[cid];
      }
      return cid;
    });

    if (changed) {
      await updateDoc(doc(db, 'users', userDoc.id), {
        courseIds: newCourseIds,
      });
    }
  }

  // Migrate fees
  const { feeCalculationService } = await import('../mock/feeCalculationService');
  const feesSnap = await getDocs(collection(db, 'fees'));
  for (const feeDoc of feesSnap.docs) {
    const data = feeDoc.data();
    const courseIds = data.courseIds || [];
    
    let changed = false;
    const newCourseIds = courseIds.map((cid: string) => {
      if (oldToNewIdMap[cid]) {
        changed = true;
        return oldToNewIdMap[cid];
      }
      return cid;
    });

    if (changed) {
      const courseNames: string[] = [];
      for (const cId of newCourseIds) {
        const matchedCourse = mockCourses.find(c => c.id === cId);
        if (matchedCourse) {
          courseNames.push(matchedCourse.name);
        } else {
          courseNames.push(cId);
        }
      }

      const totalFee = feeCalculationService.calculateCourseFee(newCourseIds);
      const discountAmount = feeCalculationService.calculateDiscount(totalFee, data.discountType || 'none', data.discountValue || 0);
      const finalFee = Math.max(totalFee - discountAmount, 0);
      const paidAmount = (data.paymentHistory || []).reduce((sum: number, p: any) => sum + p.amount, 0);
      const remainingAmount = Math.max(finalFee - paidAmount, 0);
      const paymentStatus = finalFee === 0 ? 'Paid' : paidAmount === 0 ? 'Pending' : remainingAmount <= 0 ? 'Paid' : 'Partially Paid';

      await updateDoc(doc(db, 'fees', feeDoc.id), {
        courseIds: newCourseIds,
        courseNames,
        totalFee,
        discountAmount,
        finalFee,
        paidAmount,
        remainingAmount,
        paymentStatus,
        updatedAt: serverTimestamp()
      });
    }
  }

  // Migrate marks
  const marksSnap = await getDocs(collection(db, 'marks'));
  for (const markDoc of marksSnap.docs) {
    const data = markDoc.data();
    const courseId = data.courseId;
    if (oldToNewIdMap[courseId]) {
      await updateDoc(doc(db, 'marks', markDoc.id), {
        courseId: oldToNewIdMap[courseId]
      });
    }
  }

  // Migrate attendance
  const attendanceSnap = await getDocs(collection(db, 'attendance'));
  for (const attDoc of attendanceSnap.docs) {
    const data = attDoc.data();
    const courseId = data.courseId;
    if (oldToNewIdMap[courseId]) {
      await updateDoc(doc(db, 'attendance', attDoc.id), {
        courseId: oldToNewIdMap[courseId]
      });
    }
  }

  // Migrate materials
  const materialsSnap = await getDocs(collection(db, 'materials'));
  for (const matDoc of materialsSnap.docs) {
    const data = matDoc.data();
    const courseId = data.courseId;
    if (oldToNewIdMap[courseId]) {
      await updateDoc(doc(db, 'materials', matDoc.id), {
        courseId: oldToNewIdMap[courseId]
      });
    }
  }

  // Migrate certificates
  const certificatesSnap = await getDocs(collection(db, 'certificates'));
  for (const certDoc of certificatesSnap.docs) {
    const data = certDoc.data();
    const courseId = data.courseId;
    if (oldToNewIdMap[courseId]) {
      await updateDoc(doc(db, 'certificates', certDoc.id), {
        courseId: oldToNewIdMap[courseId]
      });
    }
  }

  console.log('[Migration] Database migration completed successfully!');
}

// ─────────────────────────────────────────────
// Service Class (implements IBaseService<Course>)
// ─────────────────────────────────────────────

class FirebaseCourseService implements IBaseService<Course> {
  constructor() {
    this.runMigration();
  }

  private async runMigration() {
    try {
      await runCourseMigration();
    } catch (err) {
      console.warn('[FirebaseCourseService] Migration failed/skipped:', err);
    }
  }

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
