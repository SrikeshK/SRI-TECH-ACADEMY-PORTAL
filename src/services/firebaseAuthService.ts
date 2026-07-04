/**
 * firebaseAuthService.ts
 * ─────────────────────────────────────────────────────────────
 * SRI TECH ACADEMY PORTAL – Phase 2: Firebase Authentication
 *
 * Replaces the old hybrid mock/firebase auth.
 * All auth is now fully Firebase-backed:
 *   • signInWithEmailAndPassword  (login)
 *   • signOut                      (logout)
 *   • createUserWithEmailAndPassword (register – for admin seeding)
 *   • onAuthStateChanged           (session restore – handled in AuthContext)
 *   • Firestore users/{uid}        (role + profile lookup)
 * ─────────────────────────────────────────────────────────────
 */

import { deleteApp, initializeApp } from 'firebase/app';
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User,
  getAuth,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../firebase/config';
import { UserProfile } from '../types';

// ─── Firestore Collection Name ───────────────────────────────
const USERS_COLLECTION = 'users';

// ─── Friendly Error Messages ──────────────────────────────────
const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  'auth/user-not-found':         'No account found with this email address.',
  'auth/wrong-password':         'Incorrect password. Please try again.',
  'auth/invalid-email':          'Please enter a valid email address.',
  'auth/invalid-credential':     'Invalid email or password. Please check your credentials.',
  'auth/user-disabled':          'This account has been disabled. Contact the administrator.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  'auth/too-many-requests':      'Too many failed attempts. Please wait a moment and try again.',
  'auth/email-already-in-use':   'An account with this email already exists.',
  'auth/weak-password':          'Password must be at least 6 characters.',
  'auth/operation-not-allowed':  'Email/Password login is not enabled. Contact the administrator.',
};

/**
 * Maps a Firebase Auth error code to a user-friendly message.
 */
export function getFirebaseErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  return FIREBASE_ERROR_MESSAGES[code] ?? 'Login failed. Please check your credentials and try again.';
}

// ─── User Profile Helpers ─────────────────────────────────────

/**
 * Fetches the Firestore user profile document for a given Firebase UID.
 * Returns null if the document does not exist.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    console.warn(`[firebaseAuthService] No Firestore profile found for uid: ${uid}`);
    return null;
  }

  const data = snapshot.data();
  return {
    id:        uid,
    name:      data.name  ?? 'Unknown User',
    email:     data.email ?? '',
    role:      data.role  ?? 'student',
    studentId: data.studentId,
    batch:     data.batch,
    phone:     data.phone,
    avatar:    data.avatar,
    status:    data.status,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
  } as UserProfile;
}

/**
 * Returns the Firestore profile for the currently authenticated Firebase user.
 * Returns null if no user is signed in or if no Firestore doc exists.
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  return getUserProfile(firebaseUser.uid);
}

// ─── Core Auth Operations ─────────────────────────────────────

/**
 * Sign in with email and password.
 * After successful Firebase Auth, loads the Firestore user profile.
 * Throws a user-friendly error string on failure.
 */
export async function login(email: string, password: string): Promise<UserProfile> {
  let userCredential;
  try {
    userCredential = await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    throw new Error(getFirebaseErrorMessage(err));
  }

  const profile = await getUserProfile(userCredential.user.uid);
  if (!profile) {
    // Firebase Auth succeeded but no Firestore profile — sign out and report
    await signOut(auth);
    throw new Error('Account profile not found. Please contact the administrator.');
  }

  return profile;
}

/**
 * Sign out the current user from Firebase Authentication.
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/**
 * Register a new Firebase Auth user and create their Firestore profile document.
 * Used by admin seeding utilities — NOT exposed in the UI login flow.
 */
export async function register(
  email: string,
  password: string,
  profileData: {
    name: string;
    role: 'admin' | 'student';
    studentId?: string;
    batch?: string;
    phone?: string;
  }
): Promise<UserProfile> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  const firestoreDoc = {
    uid,
    name:      profileData.name,
    email,
    role:      profileData.role,
    studentId: profileData.studentId ?? null,
    batch:     profileData.batch     ?? null,
    phone:     profileData.phone     ?? null,
    status:    'active',
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, USERS_COLLECTION, uid), firestoreDoc);

  return {
    id:        uid,
    name:      profileData.name,
    email,
    role:      profileData.role,
    studentId: profileData.studentId,
    batch:     profileData.batch,
    phone:     profileData.phone,
    status:    'active',
  };
}

/**
 * Update the Firestore user profile for the given uid.
 * Partial updates — only specified fields are changed.
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<Omit<UserProfile, 'id'>>
): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  // Remove undefined fields before writing
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  );
  await updateDoc(docRef, cleanUpdates);
}

/**
 * Subscribe to Firebase Auth state changes.
 * Returns an unsubscribe function.
 */
export function subscribeToAuthState(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

// ─── Admin: Create Student Account ───────────────────────────

/**
 * Creates a Firebase Authentication account for a new student,
 * then creates two Firestore documents:
 *   1. students/{uid}  – the main student profile document
 *   2. users/{uid}     – the auth profile (role = 'student')
 *
 * The Firebase Auth UID becomes the permanent student identity.
 * Passwords are NEVER stored in Firestore.
 *
 * IMPORTANT: This temporarily signs the admin out and back in
 * because createUserWithEmailAndPassword switches the active session.
 * We use a secondary app pattern via a fresh credential re-auth.
 *
 * @param email          Student's email address
 * @param password       Initial password (min 6 chars)
 * @param studentData    Remaining student profile fields (no id, no createdAt)
 * @returns              The created student object with Firestore id = Firebase UID
 */
export async function createStudentAccount(
  email: string,
  password: string,
  studentData: {
    name: string;
    phone: string;
    registerNumber?: string;
    courseIds: string[];
    enrolledCourses?: string[];
    status: 'Active' | 'Inactive';
    batch?: string;
  }
): Promise<{ uid: string; studentDocId: string }> {
  // Remember the currently signed-in admin
  const adminUser = auth.currentUser;
  if (!adminUser) {
    throw new Error('You must be signed in as an administrator to create student accounts.');
  }

  // Step 1 – Create the Firebase Auth account for the student using a secondary Firebase App.
  // This prevents the admin on the primary app from being signed out.
  const tempAppName = `TempApp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const secondaryApp = initializeApp(firebaseConfig, tempAppName);
  const secondaryAuth = getAuth(secondaryApp);

  let studentCredential;
  try {
    studentCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  } catch (err) {
    await deleteApp(secondaryApp).catch(() => {});
    throw new Error(getFirebaseErrorMessage(err));
  }

  const uid = studentCredential.user.uid;

  const courseIds = studentData.courseIds?.length
    ? studentData.courseIds
    : (studentData.enrolledCourses ?? []);

  // Step 3 – Create the students/{uid} document in Firestore.
  const studentDocData = {
    id:               uid,
    uid:              uid,
    name:             studentData.name,
    email,
    phone:            studentData.phone,
    registerNumber:   studentData.registerNumber ?? '',
    courseIds,
    enrolledCourses:  courseIds,
    status:           studentData.status,
    batch:            studentData.batch ?? '',
    createdAt:        serverTimestamp(),
    updatedAt:        serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'students', uid), studentDocData);
  } catch (firestoreErr) {
    // Firestore write failed – clean up by deleting the Auth account
    await studentCredential.user.delete().catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
    throw new Error('Failed to create student profile in database. Account creation rolled back.');
  }

  // Step 4 – Create the users/{uid} profile document (for AuthContext lookups).
  const userProfileData = {
    uid,
    name:      studentData.name,
    email,
    role:      'student',
    studentId: uid,           // the Firestore student doc ID is the same as UID
    phone:     studentData.phone,
    status:    'active',
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'users', uid), userProfileData);
  } catch (profileErr) {
    // users doc write failed – attempt cleanup
    await studentCredential.user.delete().catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
    throw new Error('Failed to create user profile. Account creation rolled back.');
  }

  // Step 5 – Clean up the secondary Firebase App
  try {
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
  } catch (cleanErr) {
    console.error('Cleanup of secondary Firebase app failed:', cleanErr);
  }

  return { uid, studentDocId: uid };
}

// ─── Student: Change Own Password ────────────────────────────

/**
 * Allows a signed-in student to change their own password.
 * Requires the current password for reauthentication (Firebase security requirement).
 * Throws a user-friendly error string on failure.
 *
 * @param currentPassword  The student's current password (for reauthentication)
 * @param newPassword      The desired new password (min 6 chars)
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('You must be signed in to change your password.');
  }

  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  // Firebase requires recent authentication before sensitive operations.
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  try {
    await reauthenticateWithCredential(user, credential);
  } catch (err) {
    throw new Error('Current password is incorrect. Please try again.');
  }

  try {
    await firebaseUpdatePassword(user, newPassword);
  } catch (err) {
    throw new Error(getFirebaseErrorMessage(err));
  }
}
