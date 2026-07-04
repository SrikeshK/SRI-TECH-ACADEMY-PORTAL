import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  DocumentData,
  WithFieldValue,
  UpdateData
} from "firebase/firestore";
import { db } from "./config";

/**
 * Fetch all documents in a collection.
 * @param collectionName Name of the Firestore collection
 * @returns Array of documents with their IDs
 */
export async function getCollection<T = DocumentData>(collectionName: string): Promise<(T & { id: string })[]> {
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as (T & { id: string })[];
}

/**
 * Fetch a document by its ID.
 * @param collectionName Name of the Firestore collection
 * @param id Document ID
 * @returns The document data with ID, or null if not found
 */
export async function getDocumentById<T = DocumentData>(
  collectionName: string,
  id: string
): Promise<(T & { id: string }) | null> {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as (T & { id: string });
  }
  return null;
}

/**
 * Add a new document to a collection.
 * @param collectionName Name of the Firestore collection
 * @param data Data to write
 * @returns The auto-generated document ID
 */
export async function addDocument<T extends WithFieldValue<DocumentData>>(
  collectionName: string,
  data: T
): Promise<string> {
  const colRef = collection(db, collectionName);
  const docRef = await addDoc(colRef, data);
  return docRef.id;
}

/**
 * Update an existing document.
 * @param collectionName Name of the Firestore collection
 * @param id Document ID
 * @param data Partial data to update
 */
export async function updateDocument<T extends UpdateData<DocumentData>>(
  collectionName: string,
  id: string,
  data: T
): Promise<void> {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, data);
}

/**
 * Delete a document from a collection.
 * @param collectionName Name of the Firestore collection
 * @param id Document ID
 */
export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
}
