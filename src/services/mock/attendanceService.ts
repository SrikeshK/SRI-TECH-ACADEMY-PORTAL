import { Attendance } from '../../types';
import { mockDb } from '../../firebase/mockDb';
import { IBaseService } from '../types';

class MockAttendanceService implements IBaseService<Attendance> {
  async getAll(): Promise<Attendance[]> {
    return mockDb.getAttendance();
  }

  async getById(id: string): Promise<Attendance | null> {
    const records = await this.getAll();
    return records.find(a => a.id === id) || null;
  }

  async create(data: Omit<Attendance, 'id'>): Promise<Attendance> {
    const newRecord: Attendance = {
      ...data,
      id: `att_${Date.now()}`,
    };
    mockDb.saveAttendance([newRecord]);
    return newRecord;
  }

  async update(id: string, data: Partial<Attendance>): Promise<Attendance> {
    const records = await this.getAll();
    const existing = records.find(a => a.id === id);
    if (!existing) throw new Error('Attendance record not found');
    const updated = { ...existing, ...data };
    mockDb.saveAttendance([updated]);
    return updated;
  }

  async delete(id: string): Promise<void> {
    console.warn('Attendance delete: ', id, 'removed locally');
  }

  async getByStudentId(studentId: string): Promise<Attendance[]> {
    const records = await this.getAll();
    return records.filter(a => a.studentId === studentId);
  }

  /** Save a batch of attendance records for a single date/course session */
  async saveMultiple(records: Attendance[]): Promise<Attendance[]> {
    mockDb.saveAttendance(records);
    return records;
  }

  /** Get all attendance records for a specific date */
  async getByDate(date: string): Promise<Attendance[]> {
    const records = await this.getAll();
    return records.filter(a => a.date === date);
  }
}

export const attendanceService = new MockAttendanceService();

