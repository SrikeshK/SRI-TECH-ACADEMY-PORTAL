import { Student } from '../../types';
import { mockDb } from '../../firebase/mockDb';
import { IBaseService } from '../types';
import { sortStudentsByRegisterNumber } from '../../utils/studentOrdering';

class MockStudentService implements IBaseService<Student> {
  async getAll(): Promise<Student[]> {
    return sortStudentsByRegisterNumber(mockDb.getStudents());
  }

  async getById(id: string): Promise<Student | null> {
    return mockDb.getStudent(id) || null;
  }

  async create(data: Omit<Student, 'id'>): Promise<Student> {
    const students = mockDb.getStudents();
    const newStudent: Student = {
      ...data,
      id: `s${Date.now()}`,
    };
    return mockDb.saveStudent(newStudent);
  }

  async update(id: string, data: Partial<Student>): Promise<Student> {
    const existing = mockDb.getStudent(id);
    if (!existing) throw new Error('Student not found');
    const updated = { ...existing, ...data };
    return mockDb.saveStudent(updated);
  }

  async delete(id: string): Promise<void> {
    mockDb.deleteStudent(id);
  }

  onSnapshot(callback: (students: Student[]) => void): () => void {
    callback(sortStudentsByRegisterNumber(mockDb.getStudents()));
    return () => {};
  }
}

export const studentService = new MockStudentService();

