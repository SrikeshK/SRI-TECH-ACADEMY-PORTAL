/**
 * adminSetup.ts
 * ─────────────────────────────────────────────────────────────
 * SRI TECH ACADEMY PORTAL – One-Time Account Seeding Utility
 *
 * USE: Run this ONCE from the browser console to create the
 *      required Firebase Auth accounts and Firestore user
 *      profile documents.
 *
 * HOW TO USE:
 *   1. Open the app in the browser while logged out.
 *   2. Open the browser DevTools console.
 *   3. Run:  import('/src/utils/adminSetup.ts').then(m => m.seedAccounts())
 *      OR call window.__seedAccounts() if you expose it.
 *   4. Watch the console for success/error messages.
 *   5. After seeding, log in normally.
 *
 * ACCOUNTS CREATED:
 *   • admin@sritech.com  / admin123   → role: admin
 *   • karan@sritech.com  / student123 → role: student
 *
 * NOTE: If accounts already exist, the registration step will fail
 *       gracefully and only the Firestore profile check will run.
 * ─────────────────────────────────────────────────────────────
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

interface AccountSeedConfig {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'student';
  studentId?: string;
  batch?: string;
}

const ACCOUNTS_TO_SEED: AccountSeedConfig[] = [
  {
    email:    'admin@sritech.com',
    password: 'admin123',
    name:     'Admin User',
    role:     'admin',
  },
  {
    email:     'karan@sritech.com',
    password:  'student123',
    name:      'Karan Student',
    role:      'student',
    studentId: 'STA-001',
    batch:     'Batch 2024',
  },
];

async function ensureUserExists(config: AccountSeedConfig): Promise<void> {
  let uid: string;

  // Step 1: Try to create the Firebase Auth account
  try {
    const credential = await createUserWithEmailAndPassword(auth, config.email, config.password);
    uid = credential.user.uid;
    console.log(`[adminSetup] ✅ Created Firebase Auth account: ${config.email} (uid: ${uid})`);
  } catch (createErr: any) {
    if (createErr.code === 'auth/email-already-in-use') {
      // Account exists — sign in to get the uid
      console.log(`[adminSetup] ℹ️  Account exists: ${config.email}, fetching uid...`);
      const credential = await signInWithEmailAndPassword(auth, config.email, config.password);
      uid = credential.user.uid;
      console.log(`[adminSetup] ✅ Got existing uid: ${uid}`);
      await signOut(auth);
    } else {
      throw createErr;
    }
  }

  // Step 2: Ensure Firestore profile document exists
  const docRef = doc(db, 'users', uid);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    console.log(`[adminSetup] ℹ️  Firestore profile already exists for ${config.email}. Skipping.`);
    return;
  }

  await setDoc(docRef, {
    uid,
    name:      config.name,
    email:     config.email,
    role:      config.role,
    studentId: config.studentId ?? null,
    batch:     config.batch     ?? null,
    phone:     null,
    status:    'active',
    createdAt: serverTimestamp(),
  });

  console.log(`[adminSetup] ✅ Created Firestore profile for ${config.email} (role: ${config.role})`);
}

/**
 * Seeds all required accounts.
 * Call this from the browser console once:
 *   import('/src/utils/adminSetup.ts').then(m => m.seedAccounts())
 */
export async function seedAccounts(): Promise<void> {
  console.log('[adminSetup] Starting account seeding...');
  console.log(`[adminSetup] Seeding ${ACCOUNTS_TO_SEED.length} account(s)...`);

  for (const account of ACCOUNTS_TO_SEED) {
    try {
      await ensureUserExists(account);
    } catch (err) {
      console.error(`[adminSetup] ❌ Failed to seed account ${account.email}:`, err);
    }
  }

  // Sign out after seeding (since we signed in during the process)
  if (auth.currentUser) {
    await signOut(auth);
  }

  console.log('[adminSetup] ✅ Account seeding complete. You can now log in normally.');
  console.log('[adminSetup] Accounts available:');
  ACCOUNTS_TO_SEED.forEach(a => {
    console.log(`  • ${a.email} / ${a.password}  (role: ${a.role})`);
  });
}

// Expose on window for easy console access
if (typeof window !== 'undefined') {
  (window as any).__seedAccounts = seedAccounts;
}
