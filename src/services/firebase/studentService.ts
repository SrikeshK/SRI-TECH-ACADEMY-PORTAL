import { Student } from '../../types';
import { IBaseService } from '../types';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase/config';

const COLLECTION_NAME = 'students';

// Standalone Firestore CRUD functions
export async function getAllStudents(): Promise<Student[]> {
  const colRef = collection(db, COLLECTION_NAME);
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(doc => ({
    ...(doc.data() as Omit<Student, 'id'>),
    id: doc.id
  } as Student));
}

export async function getStudentById(id: string): Promise<Student | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return {
      ...(docSnap.data() as Omit<Student, 'id'>),
      id: docSnap.id
    } as Student;
  }
  return null;
}

export async function createStudent(data: Omit<Student, 'id'>): Promise<Student> {
  // Check Firebase Auth state before attempting Firestore write
  const auth = getAuth();
  const currentUser = auth.currentUser;
  console.log('[studentService] createStudent called. Firebase Auth user:', currentUser?.email ?? 'NOT AUTHENTICATED');
  
  if (!currentUser) {
    throw new Error('Not authenticated with Firebase. Please log out and log in again to refresh your session.');
  }

  const colRef = collection(db, COLLECTION_NAME);
  // Normalize: ensure both courseIds and enrolledCourses are always set
  const enrolledCourses = (data as any).enrolledCourses as string[] | undefined;
  const courseIds = data.courseIds?.length ? data.courseIds : (enrolledCourses ?? []);
  const studentData = {
    ...data,
    courseIds,
    enrolledCourses: enrolledCourses ?? courseIds,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const docRef = await addDoc(colRef, studentData);
  const id = docRef.id;
  
  // Save the ID field inside the document structure
  await updateDoc(docRef, { id });
  
  return {
    ...studentData,
    id
  } as Student;
}

export async function updateStudent(id: string, data: Partial<Student>): Promise<Student> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const updateData = {
    ...data,
    updatedAt: new Date().toISOString()
  };
  delete (updateData as any).id;
  await updateDoc(docRef, updateData);
  
  const updatedSnap = await getDoc(docRef);
  if (!updatedSnap.exists()) {
    throw new Error('Student not found after update');
  }
  return {
    ...(updatedSnap.data() as Omit<Student, 'id'>),
    id: updatedSnap.id
  } as Student;
}

export async function deleteStudent(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

export function subscribeToStudents(callback: (students: Student[]) => void): () => void {
  const colRef = collection(db, COLLECTION_NAME);
  return onSnapshot(colRef, (snapshot) => {
    const studentsList = snapshot.docs.map(doc => ({
      ...(doc.data() as Omit<Student, 'id'>),
      id: doc.id
    } as Student));
    callback(studentsList);
  }, (error) => {
    console.error("Error in students real-time subscription:", error);
  });
}

class FirebaseStudentService implements IBaseService<Student> {
  async getAll(): Promise<Student[]> {
    return getAllStudents();
  }

  async getById(id: string): Promise<Student | null> {
    return getStudentById(id);
  }

  async create(data: Omit<Student, 'id'>): Promise<Student> {
    return createStudent(data);
  }

  async update(id: string, data: Partial<Student>): Promise<Student> {
    return updateStudent(id, data);
  }

  async delete(id: string): Promise<void> {
    return deleteStudent(id);
  }

  onSnapshot(callback: (students: Student[]) => void): () => void {
    return subscribeToStudents(callback);
  }
}

export const studentService = new FirebaseStudentService();
