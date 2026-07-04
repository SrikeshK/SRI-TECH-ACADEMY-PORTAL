import { Certificate } from '../../types';
import { mockDb } from '../../firebase/mockDb';
import { databaseService } from '../../firebase/service';
import { IBaseService } from '../types';

class MockCertificateService implements IBaseService<Certificate> {
  async getAll(): Promise<Certificate[]> {
    return mockDb.getCertificates();
  }

  async getById(id: string): Promise<Certificate | null> {
    const certs = await this.getAll();
    return certs.find(c => c.id === id) || null;
  }

  async create(data: Omit<Certificate, 'id'>): Promise<Certificate> {
    const newCert: Certificate = {
      ...data,
      id: `cert_${Date.now()}`,
    };
    return mockDb.saveCertificate(newCert);
  }

  async update(id: string, data: Partial<Certificate>): Promise<Certificate> {
    const certs = await this.getAll();
    const existing = certs.find(c => c.id === id);
    if (!existing) throw new Error('Certificate not found');
    const updated = { ...existing, ...data };
    return mockDb.saveCertificate(updated);
  }

  async delete(id: string): Promise<void> {
    await databaseService.deleteCertificate(id);
  }

  async getByStudentId(studentId: string): Promise<Certificate[]> {
    const certs = await this.getAll();
    return certs.filter(c => c.studentId === studentId);
  }
}

export const certificateService = new MockCertificateService();
