import { Mark } from '../../types';
import { mockDb } from '../../firebase/mockDb';
import { IBaseService } from '../types';

// Standalone functions for Mock service
export async function getMarks(): Promise<Mark[]> {
  return mockDb.getMarks();
}

export async function getStudentMarks(studentId: string): Promise<Mark[]> {
  const marks = await getMarks();
  return marks.filter(m => m.studentId === studentId);
}

export async function getCourseMarks(courseId: string): Promise<Mark[]> {
  const marks = await getMarks();
  return marks.filter(m => m.courseId === courseId);
}

export async function addMarks(data: Omit<Mark, 'id'>): Promise<Mark> {
  const newMark: Mark = {
    ...data,
    id: `mark_${Date.now()}`,
  };
  return mockDb.saveMark(newMark);
}

export async function updateMarks(id: string, data: Partial<Mark>): Promise<Mark> {
  const marks = await getMarks();
  const existing = marks.find(m => m.id === id);
  if (!existing) throw new Error('Mark not found');
  const updated = { ...existing, ...data };
  return mockDb.saveMark(updated);
}

export async function deleteMarks(id: string): Promise<void> {
  mockDb.deleteMark(id);
}

export function subscribeToMarks(callback: (records: Mark[]) => void): () => void {
  let active = true;
  getMarks().then(data => {
    if (active) callback(data);
  });
  return () => { active = false; };
}

export function subscribeToStudentMarks(studentId: string, callback: (records: Mark[]) => void): () => void {
  let active = true;
  getStudentMarks(studentId).then(data => {
    if (active) callback(data);
  });
  return () => { active = false; };
}

class MockMarksService implements IBaseService<Mark> {
  async getAll(): Promise<Mark[]> {
    return getMarks();
  }

  async getById(id: string): Promise<Mark | null> {
    const marks = await this.getAll();
    return marks.find(m => m.id === id) || null;
  }

  async create(data: Omit<Mark, 'id'>): Promise<Mark> {
    return addMarks(data);
  }

  async update(id: string, data: Partial<Mark>): Promise<Mark> {
    return updateMarks(id, data);
  }

  async delete(id: string): Promise<void> {
    return deleteMarks(id);
  }

  async getByStudentId(studentId: string): Promise<Mark[]> {
    return getStudentMarks(studentId);
  }

  subscribeToMarks(callback: (records: Mark[]) => void): () => void {
    return subscribeToMarks(callback);
  }

  subscribeToStudentMarks(studentId: string, callback: (records: Mark[]) => void): () => void {
    return subscribeToStudentMarks(studentId, callback);
  }

  onSnapshot(callback: (records: Mark[]) => void): () => void {
    return subscribeToMarks(callback);
  }
}

export const mockMarksService = new MockMarksService();
export const marksService = mockMarksService;
export default marksService;
