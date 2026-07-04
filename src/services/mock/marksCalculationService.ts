import { Mark, Student, Course } from '../../types';
import { mockDb } from '../../firebase/mockDb';
import { studentService as mockStudentService } from './studentService';
import { studentService as firebaseStudentService } from '../firebase/studentService';
import { USE_FIREBASE } from '../config';

const studentService = USE_FIREBASE ? firebaseStudentService : mockStudentService;
import { courseService } from './courseService';

export interface ClassificationInfo {
  grade: string;
  classification: string;
  rangeText: string;
}

class MarksCalculationService {
  getClassificationInfo(average: number): ClassificationInfo {
    if (average >= 80) {
      return { grade: 'A+', classification: 'Distinction', rangeText: '80-100%' };
    } else if (average >= 60) {
      return { grade: 'A', classification: 'First Class', rangeText: '60-79%' };
    } else if (average >= 50) {
      return { grade: 'B', classification: 'Second Class', rangeText: '50-59%' };
    } else if (average >= 40) {
      return { grade: 'C', classification: 'Third Class', rangeText: '40-49%' };
    } else {
      return { grade: 'F', classification: 'Fail', rangeText: 'Below 40%' };
    }
  }

  calculateLanguageAverage(theory: number, practical: number): number {
    const avg = (theory + practical) / 2;
    return Math.round(avg * 10) / 10; // 1 decimal place
  }

  calculateOverallAverage(marksList: { theoryMarks?: number; practicalMarks?: number }[]): number {
    if (!marksList || marksList.length === 0) return 0;
    
    let sum = 0;
    let count = 0;

    marksList.forEach(m => {
      const theory = m.theoryMarks !== undefined ? m.theoryMarks : 0;
      const practical = m.practicalMarks !== undefined ? m.practicalMarks : 0;
      sum += theory + practical;
      count += 2;
    });

    if (count === 0) return 0;
    const avg = sum / count;
    return Math.round(avg * 10) / 10; // 1 decimal place
  }

  calculateGrade(average: number): string {
    return this.getClassificationInfo(average).grade;
  }

  calculatePassStatus(average: number): 'Pass' | 'Fail' {
    return average >= 40 ? 'Pass' : 'Fail';
  }

  async getStudentResults(studentId: string) {
    const student = await studentService.getById(studentId);
    if (!student) return null;

    const allCourses = await courseService.getAll();
    const allMarks = mockDb.getMarks();

    // Dynamically identify enrolled programming languages (category: 'Programming')
    const enrolledProgCourses = allCourses.filter(c => 
      c.category === 'Programming' && 
      (student.courseIds?.includes(c.id) || student.enrolledCourses?.includes(c.id))
    );

    const subjects = enrolledProgCourses.map(course => {
      // Find mark record for this course
      const markRecord = allMarks.find(m => m.studentId === studentId && m.courseId === course.id);
      
      const theory = markRecord?.theoryMarks !== undefined ? markRecord.theoryMarks : 0;
      const practical = markRecord?.practicalMarks !== undefined ? markRecord.practicalMarks : 0;
      const average = this.calculateLanguageAverage(theory, practical);
      const grade = this.calculateGrade(average);

      return {
        courseId: course.id,
        courseName: course.name,
        courseCode: course.code || '',
        theoryMarks: theory,
        practicalMarks: practical,
        average,
        grade
      };
    });

    // Construct mock Mark items to feed into overall average engine
    const tempMarks: Mark[] = subjects.map(s => ({
      id: `temp_${s.courseId}`,
      studentId,
      courseId: s.courseId,
      theoryMarks: s.theoryMarks,
      practicalMarks: s.practicalMarks
    }));

    const overallAverage = this.calculateOverallAverage(tempMarks);
    const finalGrade = this.calculateGrade(overallAverage);
    const passStatus = this.calculatePassStatus(overallAverage);

    return {
      student,
      subjects,
      overallAverage,
      grade: finalGrade,
      status: passStatus
    };
  }

  async updateStudentMarks(
    studentId: string,
    marksData: Record<string, { theoryMarks: number; practicalMarks: number }>
  ): Promise<void> {
    const student = await studentService.getById(studentId);
    if (!student) throw new Error('Student not found');

    const allMarks = mockDb.getMarks();

    for (const courseId in marksData) {
      const data = marksData[courseId];
      const theory = Number(data.theoryMarks);
      const practical = Number(data.practicalMarks);
      const average = this.calculateLanguageAverage(theory, practical);
      const grade = this.calculateGrade(average);

      // Find or create mark record
      let existingMark = allMarks.find(m => m.studentId === studentId && m.courseId === courseId);
      
      const updatedMark: Mark = {
        id: existingMark ? existingMark.id : `mrk_${studentId}_${courseId}`,
        studentId,
        studentName: student.name,
        courseId,
        theoryMarks: theory,
        practicalMarks: practical,
        average,
        grade
      };

      mockDb.saveMark(updatedMark);
    }
  }
}


export const marksCalculationService = new MarksCalculationService();
export default marksCalculationService;
