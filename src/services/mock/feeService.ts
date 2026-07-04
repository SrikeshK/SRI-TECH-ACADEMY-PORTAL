import { Fee, AcademyFeeRecord } from '../../types';
import { mockDb } from '../../firebase/mockDb';
import { IBaseService } from '../types';

class MockFeeService implements IBaseService<Fee> {
  async getAll(): Promise<Fee[]> {
    return mockDb.getFees();
  }

  async getById(id: string): Promise<Fee | null> {
    const fees = await this.getAll();
    return fees.find(f => f.id === id) || null;
  }

  async create(data: Omit<Fee, 'id'>): Promise<Fee> {
    const newFee: Fee = {
      ...data,
      id: `fee_${Date.now()}`,
    };
    return mockDb.saveFee(newFee);
  }

  async update(id: string, data: Partial<Fee>): Promise<Fee> {
    const fees = await this.getAll();
    const existing = fees.find(f => f.id === id);
    if (!existing) throw new Error('Fee record not found');
    const updated = { ...existing, ...data };
    return mockDb.saveFee(updated);
  }

  async delete(id: string): Promise<void> {
    console.warn('Fee delete not implemented in mockDb:', id);
  }

  async getByStudentId(studentId: string): Promise<Fee | null> {
    const fees = await this.getAll();
    return fees.find(f => f.studentId === studentId) || null;
  }

  async getAllByStudentId(studentId: string): Promise<Fee[]> {
    const fees = await this.getAll();
    return fees.filter(f => f.studentId === studentId);
  }

  // ---- Academy Fee Records (new refactored system) ----
  async getAllAcademyFees(): Promise<AcademyFeeRecord[]> {
    return mockDb.getAcademyFees();
  }

  async getAcademyFeeByStudentId(studentId: string): Promise<AcademyFeeRecord | null> {
    const records = mockDb.getAcademyFees();
    return records.find(r => r.studentId === studentId) || null;
  }

  async saveAcademyFee(record: AcademyFeeRecord): Promise<AcademyFeeRecord> {
    return mockDb.saveAcademyFee(record);
  }

  async ensureAcademyFeeExists(studentId: string, courseIds: string[]): Promise<AcademyFeeRecord> {
    return mockDb.ensureAcademyFeeExists(studentId, courseIds);
  }

  onSnapshot(callback: (records: AcademyFeeRecord[]) => void): () => void {
    let active = true;
    this.getAllAcademyFees().then(data => {
      if (active) callback(data);
    });
    return () => { active = false; };
  }

  onSnapshotStudent(studentId: string, callback: (record: AcademyFeeRecord | null) => void): () => void {
    let active = true;
    this.getAcademyFeeByStudentId(studentId).then(rec => {
      if (active) callback(rec);
    });
    return () => { active = false; };
  }
}

export const feeService = new MockFeeService();
