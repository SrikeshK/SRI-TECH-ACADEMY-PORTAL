import { Course, Mark, Student, StudentAcademicProgression, StudentCourseProgressionItem, CourseProgressStatus, StudentOverallStatus, ClassSchedule } from '../types';

/**
 * Central Course Priority Configuration
 * 1. C
 * 2. C++
 * 3. Python
 * 4. Java
 */
export const COURSE_PRIORITY: Record<string, number> = {
  c: 1,
  'c++': 2,
  cpp: 2,
  python: 3,
  py: 3,
  java: 4,
};

/**
 * Returns numeric priority rank for any course based on name, code, or ID.
 */
export function getCoursePriority(course: { name?: string; code?: string; id?: string }): number {
  const name = (course.name || '').toLowerCase().trim();
  const code = (course.code || '').toLowerCase().trim();
  const id = (course.id || '').toLowerCase().trim();

  if (name === 'c' || code.includes('sta-c-') || id === 'c1') return 1;
  if (name === 'c++' || name.includes('cpp') || code.includes('sta-cpp-') || id === 'c2') return 2;
  if (name.includes('python') || code.includes('sta-py-') || id === 'c3') return 3;
  if (name.includes('java') || code.includes('sta-java-') || id === 'c4') return 4;

  return 999;
}

/**
 * Sorts an array of courses according to academy priority: C -> C++ -> Python -> Java.
 * Keeps non-core courses at the end sorted alphabetically.
 */
export function sortEnrolledCoursesByPriority<T extends { name?: string; code?: string; id?: string }>(courses: T[]): T[] {
  return [...courses].sort((a, b) => {
    const pA = getCoursePriority(a);
    const pB = getCoursePriority(b);
    if (pA !== pB) return pA - pB;
    return (a.name || '').localeCompare(b.name || '');
  });
}

/**
 * Determines whether a course is completed according to existing marks data.
 * A course is completed when marks are entered and a valid average is calculated.
 */
export function isCourseCompleted(mark?: Mark | null): boolean {
  if (!mark) return false;
  
  // If average is recorded and > 0
  if (mark.average !== undefined && mark.average !== null && mark.average > 0) {
    return true;
  }
  if (mark.languageAverage !== undefined && mark.languageAverage !== null && mark.languageAverage > 0) {
    return true;
  }

  // If theory and/or practical marks are entered (> 0)
  const theory = mark.theoryMarks !== undefined ? Number(mark.theoryMarks) || 0 : 0;
  const practical = mark.practicalMarks !== undefined ? Number(mark.practicalMarks) || 0 : 0;
  if (theory > 0 || practical > 0) {
    return true;
  }

  return false;
}

/**
 * Computes full academic progression for a given student.
 * 
 * Rules:
 * 1. Filter ONLY enrolled courses for the student.
 * 2. Sort ONLY those enrolled courses using C -> C++ -> Python -> Java.
 * 3. Courses with marks entered & valid average = COMPLETED.
 * 4. The FIRST enrolled course in priority order that is NOT completed = CURRENT.
 * 5. All subsequent courses = UPCOMING.
 * 6. If all enrolled courses are completed = overallStatus 'COMPLETED', else 'CURRENT'.
 */
export function computeStudentAcademicProgression(
  student: Student,
  allCourses: Course[],
  allMarks: Mark[]
): StudentAcademicProgression {
  const enrolledIds = student.courseIds?.length
    ? student.courseIds
    : (student.enrolledCourses ?? []);

  // 1. Resolve matching course records
  const enrolledCourseRecords = allCourses.filter(c => enrolledIds.includes(c.id));

  // 2. Sort only the enrolled courses by priority
  const sortedCourses = sortEnrolledCoursesByPriority(enrolledCourseRecords);

  // 3. Match marks for this student
  const studentMarks = allMarks.filter(m => m.studentId === student.id);

  let currentFound = false;
  let completedCount = 0;

  const progressionItems: StudentCourseProgressionItem[] = sortedCourses.map(course => {
    const mark = studentMarks.find(m => m.courseId === course.id);
    const completed = isCourseCompleted(mark);
    const avg = mark?.average ?? mark?.languageAverage ?? (
      mark?.theoryMarks !== undefined && mark?.practicalMarks !== undefined
        ? Math.round(((Number(mark.theoryMarks) + Number(mark.practicalMarks)) / 2) * 10) / 10
        : undefined
    );

    let status: CourseProgressStatus;

    if (completed) {
      status = 'COMPLETED';
      completedCount++;
    } else if (!currentFound) {
      status = 'CURRENT';
      currentFound = true;
    } else {
      status = 'UPCOMING';
    }

    return {
      courseId: course.id,
      courseName: course.name,
      courseCode: course.code,
      status,
      averageMarks: avg,
      grade: mark?.grade,
      isGraded: completed,
    };
  });

  const totalEnrolledCount = sortedCourses.length;
  const isAllCompleted = totalEnrolledCount > 0 && completedCount === totalEnrolledCount;
  const overallStatus: StudentOverallStatus = isAllCompleted || totalEnrolledCount === 0 ? 'COMPLETED' : 'CURRENT';
  const currentCourse = progressionItems.find(item => item.status === 'CURRENT') || null;

  const rawSchedule = student.classSchedule as string | undefined;
  let classSchedule: ClassSchedule = 'not_set';
  if (rawSchedule === 'weekday' || rawSchedule === 'weekend') {
    classSchedule = rawSchedule;
  }

  return {
    studentId: student.id,
    studentName: student.name,
    registerNumber: student.registerNumber || student.rollNo || 'N/A',
    classSchedule,
    enrolledCourses: progressionItems,
    currentCourse,
    overallStatus,
    completedCoursesCount: completedCount,
    totalEnrolledCount,
  };
}
