import { Material } from '../../types';
import { mockDb } from '../../firebase/mockDb';
import { IBaseService } from '../types';

class MockMaterialService implements IBaseService<Material> {
  async getAll(): Promise<Material[]> {
    return mockDb.getMaterials();
  }

  async getById(id: string): Promise<Material | null> {
    const materials = await this.getAll();
    return materials.find(m => m.id === id) || null;
  }

  async create(data: Omit<Material, 'id'>): Promise<Material> {
    const newMaterial: Material = {
      ...data,
      id: `mat_${Date.now()}`,
    };
    return mockDb.saveMaterial(newMaterial);
  }

  async update(id: string, data: Partial<Material>): Promise<Material> {
    const materials = await this.getAll();
    const existing = materials.find(m => m.id === id);
    if (!existing) throw new Error('Material not found');
    const updated = { ...existing, ...data };
    return mockDb.saveMaterial(updated);
  }

  async delete(id: string): Promise<void> {
    mockDb.deleteMaterial(id);
  }

  async getByCourseId(courseId: string): Promise<Material[]> {
    const materials = await this.getAll();
    return materials.filter(m => m.courseId === courseId);
  }
}

export const materialService = new MockMaterialService();
