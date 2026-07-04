import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword, 
  UserCredential 
} from "firebase/auth";
import { auth } from "./config";

/**
 * Log in a user with email and password.
 * @param email User's email
 * @param password User's password
 * @returns Promise containing the UserCredential
 */
export async function loginUser(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Log out the currently authenticated user.
 * @returns Promise that resolves when the user is logged out
 */
export async function logoutUser(): Promise<void> {
  return signOut(auth);
}

/**
 * Register a new user with email and password.
 * @param email User's email
 * @param password User's password
 * @returns Promise containing the UserCredential
 */
export async function registerUser(email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}
