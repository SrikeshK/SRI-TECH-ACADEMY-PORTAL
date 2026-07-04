/**
 * Firebase Material Service – Phase 6 Migration
 * Handles all Firestore CRUD and subscriptions for the `materials` collection,
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
import { Material } from '../../types';
import { IBaseService } from '../types';
import { getCourseById } from './courseService';

const COLLECTION = 'materials';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Normalize Firestore Timestamps to ISO strings and map backward compatibility fields */
function normalizeDoc(data: Record<string, any>, id: string): Material {
  const normalized: Record<string, any> = { ...data, id, documentId: id };

  // Handle timestamps
  if (normalized.createdAt instanceof Timestamp) {
    normalized.createdAt = normalized.createdAt.toDate().toISOString();
  }
  if (normalized.updatedAt instanceof Timestamp) {
    normalized.updatedAt = normalized.updatedAt.toDate().toISOString();
  }

  // Backward compatibility fields mapping
  if (!normalized.type && normalized.fileType) {
    normalized.type = normalized.fileType;
  }
  if (!normalized.fileType && normalized.type) {
    normalized.fileType = normalized.type;
  }
  if (!normalized.fileUrl && normalized.downloadUrl) {
    normalized.fileUrl = normalized.downloadUrl;
  }
  if (!normalized.downloadUrl && normalized.fileUrl) {
    normalized.downloadUrl = normalized.fileUrl;
  }
  if (!normalized.uploadedAt && normalized.createdAt) {
    normalized.uploadedAt = normalized.createdAt;
  }
  if (!normalized.uploadDate && normalized.createdAt) {
    normalized.uploadDate = normalized.createdAt;
  }

  return normalized as Material;
}

// ─────────────────────────────────────────────
// CRUD Operations
// ─────────────────────────────────────────────

export async function getMaterials(): Promise<Material[]> {
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'desc'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
  } catch (err) {
    console.warn('[materialService] getMaterials error ordering, falling back to unordered:', err);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
  }
}

export async function getMaterialsByCourse(courseId: string): Promise<Material[]> {
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, where('courseId', '==', courseId), orderBy('createdAt', 'desc'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
  } catch (err) {
    console.warn('[materialService] getMaterialsByCourse error ordering, falling back to unordered:', err);
    const qFallback = query(colRef, where('courseId', '==', courseId));
    const snapshot = await getDocs(qFallback);
    return snapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
  }
}

export async function getStudentMaterials(courseIds: string[]): Promise<Material[]> {
  if (!courseIds || courseIds.length === 0) return [];

  const colRef = collection(db, COLLECTION);
  try {
    // Firestore 'in' query supports up to 30 items
    const chunks: string[][] = [];
    for (let i = 0; i < courseIds.length; i += 10) {
      chunks.push(courseIds.slice(i, i + 10));
    }

    const allDocs: any[] = [];
    for (const chunk of chunks) {
      const q = query(colRef, where('courseId', 'in', chunk), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      allDocs.push(...snapshot.docs);
    }

    return allDocs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
  } catch (err) {
    console.warn('[materialService] getStudentMaterials error chunk querying, falling back to all filter:', err);
    const snapshot = await getDocs(colRef);
    const materials = snapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
    return materials
      .filter((m) => courseIds.includes(m.courseId))
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
  }
}

export async function createMaterial(data: Omit<Material, 'id'>): Promise<Material> {
  const colRef = collection(db, COLLECTION);

  // Look up courseName and moduleName if not explicitly supplied
  let courseName = data.courseName || '';
  let moduleName = data.moduleName || '';
  if (data.courseId && (!courseName || !moduleName)) {
    const course = await getCourseById(data.courseId);
    if (course) {
      courseName = course.name;
      if (data.moduleId) {
        const mod = course.modules?.find((m: any) => m.id === data.moduleId);
        if (mod) {
          moduleName = mod.title;
        }
      } else {
        moduleName = 'General';
      }
    }
  }

  const payload = {
    title: data.title || '',
    description: data.description || '',
    courseId: data.courseId || '',
    courseName,
    moduleId: data.moduleId || '',
    moduleName: moduleName || 'General',
    fileType: data.fileType || data.type || 'PDF',
    downloadUrl: data.downloadUrl || data.fileUrl || '',
    uploadedBy: data.uploadedBy || 'System Admin',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: data.status || 'Active'
  };

  const docRef = await addDoc(colRef, payload);
  await updateDoc(docRef, { documentId: docRef.id });

  const snap = await getDoc(docRef);
  return normalizeDoc(snap.data() as Record<string, any>, docRef.id);
}

export async function updateMaterial(id: string, data: Partial<Material>): Promise<Material> {
  const docRef = doc(db, COLLECTION, id);

  // Update course/module metadata if they were updated
  let courseName = data.courseName;
  let moduleName = data.moduleName;
  if (data.courseId) {
    const course = await getCourseById(data.courseId);
    if (course) {
      courseName = course.name;
      if (data.moduleId) {
        const mod = course.modules?.find((m: any) => m.id === data.moduleId);
        if (mod) {
          moduleName = mod.title;
        }
      } else {
        moduleName = 'General';
      }
    }
  }

  const payload: Record<string, any> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (courseName !== undefined) payload.courseName = courseName;
  if (moduleName !== undefined) payload.moduleName = moduleName;
  if (data.type) payload.fileType = data.type;
  if (data.fileUrl) payload.downloadUrl = data.fileUrl;

  // Clean payload keys that shouldn't be attributes in Firestore
  delete payload.id;
  delete payload.type;
  delete payload.fileUrl;
  delete payload.uploadedAt;
  delete payload.uploadDate;

  await updateDoc(docRef, payload);

  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error(`Material ${id} not found after update`);
  return normalizeDoc(snap.data() as Record<string, any>, snap.id);
}

export async function deleteMaterial(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

// ─────────────────────────────────────────────
// Realtime Subscriptions
// ─────────────────────────────────────────────

export function subscribeToMaterials(callback: (materials: Material[]) => void): () => void {
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const materials = snapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
      callback(materials);
    },
    (error) => {
      console.warn('[materialService] subscribeToMaterials order error, falling back to unordered:', error);
      return onSnapshot(colRef, (fallbackSnapshot) => {
        const materials = fallbackSnapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
        materials.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        callback(materials);
      });
    }
  );
}

export function subscribeToStudentMaterials(courseIds: string[], callback: (materials: Material[]) => void): () => void {
  if (!courseIds || courseIds.length === 0) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, COLLECTION);

  // Firestore 'in' query allows up to 30 courseIds
  if (courseIds.length <= 10) {
    const q = query(colRef, where('courseId', 'in', courseIds), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const materials = snapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
        callback(materials);
      },
      (error) => {
        console.warn('[materialService] subscribeToStudentMaterials order error, falling back to unordered:', error);
        const qFallback = query(colRef, where('courseId', 'in', courseIds));
        return onSnapshot(qFallback, (fallbackSnapshot) => {
          const materials = fallbackSnapshot.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));
          materials.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });
          callback(materials);
        });
      }
    );
  } else {
    // If >10 courses, subscribe to all and filter in memory to manage simple clean unsubscribe
    return onSnapshot(colRef, (snapshot) => {
      const materials = snapshot.docs
        .map((d) => normalizeDoc(d.data() as Record<string, any>, d.id))
        .filter((m) => courseIds.includes(m.courseId));
      materials.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      callback(materials);
    });
  }
}

// ─────────────────────────────────────────────
// Bulk Delete Utility
// ─────────────────────────────────────────────

export async function deleteAllMaterials(): Promise<void> {
  const colRef = collection(db, COLLECTION);
  const snapshot = await getDocs(colRef);
  const deletions = snapshot.docs.map((d) => deleteDoc(doc(db, COLLECTION, d.id)));
  await Promise.all(deletions);
  console.log(`[deleteAllMaterials] Deleted ${snapshot.docs.length} materials from Firestore.`);
}

// ─────────────────────────────────────────────
// Seeding Helper
// ─────────────────────────────────────────────

let materialSeedingPromise: Promise<void> | null = null;

export async function seedMaterialsToFirestore(): Promise<void> {
  if (materialSeedingPromise) {
    return materialSeedingPromise;
  }

  materialSeedingPromise = (async () => {
    const colRef = collection(db, COLLECTION);
    const existing = await getDocs(colRef);

    const { mockDb } = await import('../../firebase/mockDb');
    const mockMaterials = mockDb.getMaterials();
    const existingMaterials = existing.docs.map((d) => normalizeDoc(d.data() as Record<string, any>, d.id));

    const materialKeys = existingMaterials.map((m) => `${m.title}_${m.courseId}`);
    const hasDuplicates = new Set(materialKeys).size !== materialKeys.length;

    if (!existing.empty && !hasDuplicates) {
      console.log('[seedMaterialsToFirestore] Materials already exist in Firestore. Skipping seed.');
      return;
    }

    if (hasDuplicates) {
      console.log('[seedMaterialsToFirestore] Duplicate materials detected. Cleaning up collection...');
      for (const docSnap of existing.docs) {
        await deleteDoc(doc(db, COLLECTION, docSnap.id));
      }
    }

    for (const material of mockMaterials) {
      const { id: _id, ...rest } = material;

      const payload = {
        title: rest.title || '',
        description: rest.description || '',
        courseId: rest.courseId || '',
        courseName: '',
        moduleId: rest.moduleId || '',
        moduleName: 'General',
        fileType: rest.type || rest.fileType || 'PDF',
        downloadUrl: rest.downloadUrl || rest.fileUrl || '',
        uploadedBy: rest.uploadedBy || 'System Admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'Active'
      };

      if (payload.courseId) {
        const course = await getCourseById(payload.courseId);
        if (course) {
          payload.courseName = course.name;
          if (payload.moduleId) {
            const mod = course.modules?.find((m: any) => m.id === payload.moduleId);
            if (mod) {
              payload.moduleName = mod.title;
            }
          }
        }
      }

      const docRef = await addDoc(colRef, payload);
      await updateDoc(docRef, { documentId: docRef.id });
    }

    console.log(`[seedMaterialsToFirestore] Seeded ${mockMaterials.length} materials to Firestore.`);
  })();

  try {
    await materialSeedingPromise;
  } finally {
    materialSeedingPromise = null;
  }
}

// ─────────────────────────────────────────────
// Service Instance Exports (implements IBaseService<Material>)
// ─────────────────────────────────────────────

class FirebaseMaterialService implements IBaseService<Material> {
  async getAll(): Promise<Material[]> {
    return getMaterials();
  }

  async getById(id: string): Promise<Material | null> {
    const docRef = doc(db, COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return normalizeDoc(snap.data() as Record<string, any>, snap.id);
  }

  async create(data: Omit<Material, 'id'>): Promise<Material> {
    return createMaterial(data);
  }

  async update(id: string, data: Partial<Material>): Promise<Material> {
    return updateMaterial(id, data);
  }

  async delete(id: string): Promise<void> {
    return deleteMaterial(id);
  }

  onSnapshot(callback: (materials: Material[]) => void): () => void {
    return subscribeToMaterials(callback);
  }
}

export const materialService = new FirebaseMaterialService();
