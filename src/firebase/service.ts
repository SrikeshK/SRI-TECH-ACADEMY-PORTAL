/**
 * firebase/service.ts
 * ─────────────────────────────────────────────────────────────
 * SRI TECH ACADEMY PORTAL – Phase 2: Firebase Auth Migration
 *
 * authService now delegates fully to firebaseAuthService.
 * No mock fallbacks. No localStorage credential storage.
 * databaseService (mock data) is unchanged – Phase 2 is auth only.
 * ─────────────────────────────────────────────────────────────
 */

import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { mockDb } from './mockDb';
import { Student, Course, Material, Attendance, Mark, Certificate, Fee, UserProfile } from '../types';
import {
  login as firebaseLogin,
  logout as firebaseLogout,
  getUserProfile,
  updateUserProfile,
  getCurrentUserProfile,
} from '../services/firebaseAuthService';
import { USE_FIREBASE_MATERIALS, USE_FIREBASE_CERTIFICATES } from '../services/config';
import { materialService as firebaseMaterialService } from '../services/firebase/materialService';
import { certificateService as firebaseCertificateService } from '../services/firebase/certificateService';

// Environment variables configuration check
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const isFirebaseConfigured = !!firebaseConfig.apiKey;

let app: any;
let auth: any = null;
let db: any = null;
let storage: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth    = getAuth(app);
    db      = getFirestore(app);
    storage = getStorage(app);
    console.log('[service.ts] Firebase initialized successfully.');
  } catch (error) {
    console.error('[service.ts] Firebase initialization failed:', error);
  }
} else {
  console.warn('[service.ts] Firebase not configured. Auth will fail.');
}

// ─── Auth Service ─────────────────────────────────────────────
// Thin wrapper – all logic lives in firebaseAuthService.ts.

export const authService = {
  isMock: false,

  async login(email: string, password: string): Promise<UserProfile> {
    return firebaseLogin(email, password);
  },

  getCurrentUser(): UserProfile | null {
    // Synchronous check – auth.currentUser may not be populated on first load.
    // The AuthContext onAuthStateChanged listener is the authoritative session source.
    return null;
  },

  async getCurrentUserAsync(): Promise<UserProfile | null> {
    return getCurrentUserProfile();
  },

  logout(): void {
    firebaseLogout().catch((err) =>
      console.error('[authService] logout error:', err)
    );
  },

  async updateProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    await updateUserProfile(id, updates);
    const updated = await getUserProfile(id);
    if (!updated) throw new Error('Profile not found after update.');
    return updated;
  },

  // Kept for API compatibility – not used in Phase 2.
  async updatePassword(_id: string, _newPasswordHash: string): Promise<boolean> {
    console.warn('[authService] updatePassword is not implemented in Phase 2.');
    return false;
  },
};



export const databaseService = {
  // --- Courses ---
  async getCourses(): Promise<Course[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockDb.getCourses();
  },

  async saveCourse(course: Course): Promise<Course> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDb.saveCourse(course);
  },

  async deleteCourse(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDb.deleteCourse(id);
  },

  // --- Students ---
  async getStudents(): Promise<Student[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockDb.getStudents();
  },

  async saveStudent(student: Student): Promise<Student> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDb.saveStudent(student);
  },

  async deleteStudent(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDb.deleteStudent(id);
  },

  // --- Materials ---
  async getMaterials(): Promise<Material[]> {
    if (USE_FIREBASE_MATERIALS) {
      return firebaseMaterialService.getAll();
    }
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockDb.getMaterials();
  },

  async saveMaterial(material: Material): Promise<Material> {
    if (USE_FIREBASE_MATERIALS) {
      if (!material.id || material.id.startsWith('mat_')) {
        const { id: _id, ...data } = material;
        return firebaseMaterialService.create(data);
      } else {
        return firebaseMaterialService.update(material.id, material);
      }
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDb.saveMaterial(material);
  },

  async deleteMaterial(id: string): Promise<boolean> {
    if (USE_FIREBASE_MATERIALS) {
      await firebaseMaterialService.delete(id);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDb.deleteMaterial(id);
  },

  // --- Attendance ---
  async getAttendance(): Promise<Attendance[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockDb.getAttendance();
  },

  async saveAttendance(records: Attendance[]): Promise<Attendance[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDb.saveAttendance(records);
  },

  // --- Marks ---
  async getMarks(): Promise<Mark[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockDb.getMarks();
  },

  async saveMark(mark: Mark): Promise<Mark> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDb.saveMark(mark);
  },

  async deleteMark(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDb.deleteMark(id);
  },

  // --- Certificates ---
  async getCertificates(): Promise<Certificate[]> {
    if (USE_FIREBASE_CERTIFICATES) {
      return firebaseCertificateService.getAll();
    }
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockDb.getCertificates();
  },

  async saveCertificate(cert: Certificate): Promise<Certificate> {
    if (USE_FIREBASE_CERTIFICATES) {
      if (!cert.id || cert.id.startsWith('cert_')) {
        const { id: _id, ...data } = cert;
        return firebaseCertificateService.create(data);
      } else {
        return firebaseCertificateService.update(cert.id, cert);
      }
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDb.saveCertificate(cert);
  },

  async deleteCertificate(id: string): Promise<boolean> {
    if (USE_FIREBASE_CERTIFICATES) {
      await firebaseCertificateService.delete(id);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDb.deleteCertificate(id);
  },

  // --- Fees ---
  async getFees(): Promise<Fee[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockDb.getFees();
  },

  async saveFee(fee: Fee): Promise<Fee> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDb.saveFee(fee);
  }
};
export { auth, db, storage };
