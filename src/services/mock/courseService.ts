import { Course } from '../../types';
import { mockDb } from '../../firebase/mockDb';
import { IBaseService } from '../types';

class MockCourseService implements IBaseService<Course> {
  async getAll(): Promise<Course[]> {
    return mockDb.getCourses();
  }

  async getById(id: string): Promise<Course | null> {
    return mockDb.getCourse(id) || null;
  }

  async create(data: Omit<Course, 'id'>): Promise<Course> {
    const newCourse: Course = {
      ...data,
      id: `c${Date.now()}`,
    };
    return mockDb.saveCourse(newCourse);
  }

  async update(id: string, data: Partial<Course>): Promise<Course> {
    const existing = mockDb.getCourse(id);
    if (!existing) throw new Error('Course not found');
    const updated = { ...existing, ...data };
    return mockDb.saveCourse(updated);
  }

  async delete(id: string): Promise<void> {
    mockDb.deleteCourse(id);
  }
}

export const courseService = new MockCourseService();
