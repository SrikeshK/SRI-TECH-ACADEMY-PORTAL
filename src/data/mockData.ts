import { Student, Course, Material, Mark, Attendance, Fee, Certificate, AdminUser, StudentProgress } from '../types';

export const mockAdmins: AdminUser[] = [
  { id: 'admin1', name: 'Admin User', email: 'admin@sritech.com', role: 'admin' }
];

export const mockCourses: Course[] = [
  {
    id: 'c1',
    name: 'C',
    category: 'Programming',
    modules: [
      { id: 'm1-1', title: 'Introduction', order: 1, isActive: true },
      { id: 'm1-2', title: 'Variables & Data Types', order: 2, isActive: true },
      { id: 'm1-3', title: 'Operators', order: 3, isActive: true },
      { id: 'm1-4', title: 'Control Flow', order: 4, isActive: true },
      { id: 'm1-5', title: 'Functions', order: 5, isActive: true },
      { id: 'm1-6', title: 'Arrays', order: 6, isActive: true },
      { id: 'm1-7', title: 'Pointers', order: 7, isActive: true },
    ],
    materials: ['m1'],
    students: ['s1', 's2']
  },
  {
    id: 'c2',
    name: 'C++',
    category: 'Programming',
    modules: [
      { id: 'm2-1', title: 'Introduction to OOP', order: 1, isActive: true },
      { id: 'm2-2', title: 'Classes & Objects', order: 2, isActive: true },
      { id: 'm2-3', title: 'Inheritance', order: 3, isActive: true },
      { id: 'm2-4', title: 'Polymorphism', order: 4, isActive: true },
    ],
    materials: ['m2'],
    students: ['s3', 's4']
  },
  {
    id: 'c3',
    name: 'Python',
    category: 'Programming',
    modules: [
      { id: 'm3-1', title: 'Introduction', order: 1, isActive: true },
      { id: 'm3-2', title: 'Variables', order: 2, isActive: true },
      { id: 'm3-3', title: 'Data Types', order: 3, isActive: true },
      { id: 'm3-4', title: 'Operators', order: 4, isActive: true },
      { id: 'm3-5', title: 'Loops', order: 5, isActive: true },
      { id: 'm3-6', title: 'Functions', order: 6, isActive: true },
      { id: 'm3-7', title: 'Lists', order: 7, isActive: true },
      { id: 'm3-8', title: 'Dictionaries', order: 8, isActive: true },
      { id: 'm3-9', title: 'Files', order: 9, isActive: true },
      { id: 'm3-10', title: 'OOP', order: 10, isActive: true },
      { id: 'm3-11', title: 'Mini Project', order: 11, isActive: true },
    ],
    materials: ['m3'],
    students: ['s1', 's3', 's5']
  },
  {
    id: 'c4',
    name: 'Java',
    category: 'Programming',
    modules: [
      { id: 'm4-1', title: 'Introduction', order: 1, isActive: true },
      { id: 'm4-2', title: 'JVM Architecture', order: 2, isActive: true },
      { id: 'm4-3', title: 'OOP Concepts', order: 3, isActive: true },
      { id: 'm4-4', title: 'Multithreading', order: 4, isActive: true },
    ],
    materials: ['m4'],
    students: ['s1']
  },
  {
    id: 'c5',
    name: 'DMO',
    category: 'Other',
    modules: [
      { id: 'm5-1', title: 'SEO', order: 1, isActive: true },
      { id: 'm5-2', title: 'SEM', order: 2, isActive: true },
      { id: 'm5-3', title: 'Social Media Marketing', order: 3, isActive: true },
    ],
    materials: ['m5'],
    students: ['s6']
  },
  {
    id: 'c6',
    name: 'Tally',
    category: 'Other',
    modules: [
      { id: 'm6-1', title: 'Accounting Basics', order: 1, isActive: true },
      { id: 'm6-2', title: 'Tally ERP 9', order: 2, isActive: true },
      { id: 'm6-3', title: 'GST', order: 3, isActive: true },
    ],
    materials: ['m6'],
    students: ['s7']
  },
  {
    id: 'c7',
    name: 'HTML CSS JS',
    category: 'Other',
    modules: [
      { id: 'm7-1', title: 'HTML5', order: 1, isActive: true },
      { id: 'm7-2', title: 'CSS3', order: 2, isActive: true },
      { id: 'm7-3', title: 'JavaScript Basics', order: 3, isActive: true },
      { id: 'm7-4', title: 'DOM Manipulation', order: 4, isActive: true },
    ],
    materials: ['m7'],
    students: ['s8']
  },
];

export const mockStudents: Student[] = Array.from({ length: 20 }, (_, i) => ({
  id: `s${i + 1}`,
  name: `Student ${i + 1}`,
  registerNumber: `REG2024${(i + 1).toString().padStart(3, '0')}`,
  email: `student${i + 1}@example.com`,
  phone: `98765432${(i + 1).toString().padStart(2, '0')}`,
  photo: 'https://via.placeholder.com/150',
  enrolledCourses: i === 0 ? ['c1', 'c3', 'c4'] : i === 5 ? ['c5'] : i === 2 ? ['c2', 'c3'] : ['c7'],
  courseIds: i === 0 ? ['c1', 'c3', 'c4'] : i === 5 ? ['c5'] : i === 2 ? ['c2', 'c3'] : ['c7'],
  status: 'Active',
  createdAt: new Date().toISOString(),
}));

export const mockStudentProgress: StudentProgress[] = [
  { id: 'sp1', studentId: 's1', courseId: 'c1', completedModuleIds: ['m1-1', 'm1-2'] },
  { id: 'sp2', studentId: 's1', courseId: 'c3', completedModuleIds: ['m3-1', 'm3-2', 'm3-3'] },
  { id: 'sp3', studentId: 's3', courseId: 'c3', completedModuleIds: ['m3-1', 'm3-2', 'm3-3', 'm3-4', 'm3-5'] },
];

export const mockMaterials: Material[] = [
  { id: 'm1', title: 'C Programming Guide', courseId: 'c1', fileType: 'PDF', uploadDate: '2024-01-01', uploadedBy: 'admin1', fileUrl: '#' },
  { id: 'm2', title: 'C++ OOP Concepts', courseId: 'c2', fileType: 'PDF', uploadDate: '2024-01-05', uploadedBy: 'admin1', fileUrl: '#' },
];

export const mockMarks: Mark[] = [
  { id: 'mk1', studentId: 's1', courseId: 'c1', subjectId: 'C Basics', theoryMarks: 80, practicalMarks: 90, average: 85 },
  { id: 'mk2', studentId: 's1', courseId: 'c3', subjectId: 'Python Intro', theoryMarks: 70, practicalMarks: 80, average: 75 },
  { id: 'mk3', studentId: 's6', courseId: 'c5', subjectId: 'SEO', theoryMarks: 85, practicalMarks: 85, average: 85 },
];

export const mockAttendance: Attendance[] = [
  { id: 'a1', studentId: 's1', courseId: 'c1', date: '2024-03-01', status: 'Present' },
  { id: 'a2', studentId: 's1', courseId: 'c1', date: '2024-03-02', status: 'Absent' },
];

export const mockFees: Fee[] = [
  { id: 'f1', studentId: 's1', totalAmount: 5000, paidAmount: 2000, balanceAmount: 3000 },
];

export const mockCertificates: Certificate[] = [
  { id: 'cert1', studentId: 's1', courseId: 'c1', status: 'Issued', issueDate: '2024-02-28' },
];
