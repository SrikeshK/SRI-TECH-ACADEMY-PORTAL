import { Student, Course, Material, Attendance, Mark, Certificate, Fee, UserProfile, StudentProgress, CourseModule, AcademyFeeRecord } from '../types';
import { buildDefaultFeeRecord, recalculateFeeRecord } from '../services/mock/feeCalculationService';

const STORAGE_KEY = 'sri_tech_academy_db_v3'; // Incremented key version to force refresh state

// Seed Data for Courses (C, C++, Python, Java, DMO, Tally, HTML CSS JS)
const initialCourses: Course[] = [
  {
    id: 'c1',
    name: 'C',
    category: 'Programming',
    code: 'STA-C-01',
    description: 'Master the foundations of programming with C, including syntax, control structures, pointers, and memory management.',
    price: 199,
    duration: '6 Weeks',
    instructor: 'Dr. Srikanth Rao',
    lessonsCount: 15,
    modules: [
      { id: 'm1-1', title: 'Introduction to C', order: 1, isActive: true },
      { id: 'm1-2', title: 'Variables & Data Types', order: 2, isActive: true },
      { id: 'm1-3', title: 'Operators & Expressions', order: 3, isActive: true },
      { id: 'm1-4', title: 'Control Flow & Decision Making', order: 4, isActive: true },
      { id: 'm1-5', title: 'Functions & Recursion', order: 5, isActive: true },
      { id: 'm1-6', title: 'Arrays & Strings', order: 6, isActive: true },
      { id: 'm1-7', title: 'Pointers & File Management', order: 7, isActive: true }
    ],
    syllabus: [
      'Introduction to C',
      'Variables & Data Types',
      'Operators & Expressions',
      'Control Flow & Decision Making',
      'Functions & Recursion',
      'Arrays & Strings',
      'Pointers & File Management'
    ],
    materials: ['mat-c-1'],
    students: ['s103', 's108']
  },
  {
    id: 'c2',
    name: 'C++',
    category: 'Programming',
    code: 'STA-CPP-02',
    description: 'Learn Object-Oriented Programming using C++, covering classes, inheritance, polymorphism, and memory management.',
    price: 249,
    duration: '8 Weeks',
    instructor: 'Prof. Amanda Miller',
    lessonsCount: 18,
    modules: [
      { id: 'm2-1', title: 'Introduction to OOP & C++', order: 1, isActive: true },
      { id: 'm2-2', title: 'Classes & Objects', order: 2, isActive: true },
      { id: 'm2-3', title: 'Constructors & Destructors', order: 3, isActive: true },
      { id: 'm2-4', title: 'Inheritance & Code Reuse', order: 4, isActive: true },
      { id: 'm2-5', title: 'Polymorphism & Virtual Functions', order: 5, isActive: true },
      { id: 'm2-6', title: 'Templates & Exception Handling', order: 6, isActive: true }
    ],
    syllabus: [
      'Introduction to OOP & C++',
      'Classes & Objects',
      'Constructors & Destructors',
      'Inheritance & Code Reuse',
      'Polymorphism & Virtual Functions',
      'Templates & Exception Handling'
    ],
    materials: ['mat-cpp-1'],
    students: ['s102', 's103']
  },
  {
    id: 'c3',
    name: 'Python',
    category: 'Programming',
    code: 'STA-PY-03',
    description: 'From zero to hero in Python. Cover variables, lists, dicts, OOP, and build a complete mini project.',
    price: 299,
    duration: '10 Weeks',
    instructor: 'Dr. Srikanth Rao',
    lessonsCount: 22,
    modules: [
      { id: 'm3-1', title: 'Introduction', order: 1, isActive: true },
      { id: 'm3-2', title: 'Variables', order: 2, isActive: true },
      { id: 'm3-3', title: 'Data Types', order: 3, isActive: true },
      { id: 'm3-4', title: 'Operators', order: 4, isActive: true },
      { id: 'm3-5', title: 'Conditional Statements', order: 5, isActive: true },
      { id: 'm3-6', title: 'Loops', order: 6, isActive: true },
      { id: 'm3-7', title: 'Functions', order: 7, isActive: true },
      { id: 'm3-8', title: 'Arrays', order: 8, isActive: true },
      { id: 'm3-9', title: 'Lists', order: 9, isActive: true },
      { id: 'm3-10', title: 'Dictionaries', order: 10, isActive: true },
      { id: 'm3-11', title: 'Files', order: 11, isActive: true },
      { id: 'm3-12', title: 'Object Oriented Programming', order: 12, isActive: true },
      { id: 'm3-13', title: 'Mini Project', order: 13, isActive: true }
    ],
    syllabus: [
      'Introduction',
      'Variables',
      'Data Types',
      'Operators',
      'Conditional Statements',
      'Loops',
      'Functions',
      'Arrays',
      'Lists',
      'Dictionaries',
      'Files',
      'Object Oriented Programming',
      'Mini Project'
    ],
    materials: ['mat-py-1', 'mat-py-2'],
    students: ['s101', 's102', 's106']
  },
  {
    id: 'c4',
    name: 'Java',
    category: 'Programming',
    code: 'STA-JAVA-04',
    description: 'Comprehensive Java training covering JVM architecture, OOP, exceptions, multithreading, and database connectivity.',
    price: 349,
    duration: '12 Weeks',
    instructor: 'Prof. Amanda Miller',
    lessonsCount: 24,
    modules: [
      { id: 'm4-1', title: 'Introduction to Java & JVM', order: 1, isActive: true },
      { id: 'm4-2', title: 'Variables & Operators', order: 2, isActive: true },
      { id: 'm4-3', title: 'OOP Concepts & Classes', order: 3, isActive: true },
      { id: 'm4-4', title: 'Exception Handling', order: 4, isActive: true },
      { id: 'm4-5', title: 'Collections Framework', order: 5, isActive: true },
      { id: 'm4-6', title: 'Multithreading', order: 6, isActive: true },
      { id: 'm4-7', title: 'JDBC & DB Connectivity', order: 7, isActive: true },
      { id: 'm4-8', title: 'Java Mini Project', order: 8, isActive: true }
    ],
    syllabus: [
      'Introduction to Java & JVM',
      'Variables & Operators',
      'OOP Concepts & Classes',
      'Exception Handling',
      'Collections Framework',
      'Multithreading',
      'JDBC & DB Connectivity',
      'Java Mini Project'
    ],
    materials: ['mat-java-1'],
    students: ['s101', 's107']
  },
  {
    id: 'c5',
    name: 'DMO',
    category: 'Other',
    code: 'STA-DMO-05',
    description: 'Diploma in Microsoft Office course covering Word, Excel, PowerPoint, Access, Outlook, and computing basics.',
    price: 199,
    duration: '6 Weeks',
    instructor: 'Sarah Jenkins',
    lessonsCount: 12,
    modules: [
      { id: 'm5-1', title: 'MS Word (Document Creation & Styling)', order: 1, isActive: true },
      { id: 'm5-2', title: 'MS Excel (Spreadsheets & Formulas)', order: 2, isActive: true },
      { id: 'm5-3', title: 'MS PowerPoint (Presentations & Graphics)', order: 3, isActive: true },
      { id: 'm5-4', title: 'MS Outlook & Email Management', order: 4, isActive: true },
      { id: 'm5-5', title: 'MS Access & Database Basics', order: 5, isActive: true },
      { id: 'm5-6', title: 'Internet, Windows & Cybersecurity Basics', order: 6, isActive: true }
    ],
    syllabus: [
      'MS Word (Document Creation & Styling)',
      'MS Excel (Spreadsheets & Formulas)',
      'MS PowerPoint (Presentations & Graphics)',
      'MS Outlook & Email Management',
      'MS Access & Database Basics',
      'Internet, Windows & Cybersecurity Basics'
    ],
    materials: ['mat-dmo-1'],
    students: ['s105', 's109']
  },
  {
    id: 'c6',
    name: 'Tally',
    category: 'Other',
    code: 'STA-TALLY-06',
    description: 'Become an expert in accounting and taxation using Tally ERP 9, including GST compliance and voucher entry.',
    price: 149,
    duration: '4 Weeks',
    instructor: 'Sarah Jenkins',
    lessonsCount: 10,
    modules: [
      { id: 'm6-1', title: 'Accounting Basics & Ledgers', order: 1, isActive: true },
      { id: 'm6-2', title: 'Tally ERP 9 Interface', order: 2, isActive: true },
      { id: 'm6-3', title: 'Voucher Entries', order: 3, isActive: true },
      { id: 'm6-4', title: 'GST Taxation Compliance', order: 4, isActive: true },
      { id: 'm6-5', title: 'Balance Sheet & P&L', order: 5, isActive: true },
      { id: 'm6-6', title: 'Auditing & Reporting', order: 6, isActive: true }
    ],
    syllabus: [
      'Accounting Basics & Ledgers',
      'Tally ERP 9 Interface',
      'Voucher Entries',
      'GST Taxation Compliance',
      'Balance Sheet & P&L',
      'Auditing & Reporting'
    ],
    materials: ['mat-tally-1'],
    students: ['s105', 's110']
  },
  {
    id: 'c7',
    name: 'HTML CSS JS',
    category: 'Other',
    code: 'STA-WD-07',
    description: 'Build modern, responsive, and interactive websites using HTML5, CSS3, and modern JavaScript (ES6+).',
    price: 299,
    duration: '8 Weeks',
    instructor: 'Sarah Jenkins',
    lessonsCount: 20,
    modules: [
      { id: 'm7-1', title: 'HTML5 Structure & Semantics', order: 1, isActive: true },
      { id: 'm7-2', title: 'CSS3 Layouts, Flexbox & Grid', order: 2, isActive: true },
      { id: 'm7-3', title: 'Responsive Web Design & Media Queries', order: 3, isActive: true },
      { id: 'm7-4', title: 'JavaScript Basics & Data Structures', order: 4, isActive: true },
      { id: 'm7-5', title: 'DOM Manipulation & Event Handling', order: 5, isActive: true },
      { id: 'm7-6', title: 'Fetch API, JSON & Async Programming', order: 6, isActive: true }
    ],
    syllabus: [
      'HTML5 Structure & Semantics',
      'CSS3 Layouts, Flexbox & Grid',
      'Responsive Web Design & Media Queries',
      'JavaScript Basics & Data Structures',
      'DOM Manipulation & Event Handling',
      'Fetch API, JSON & Async Programming'
    ],
    materials: ['mat-wd-1'],
    students: ['s104', 's106']
  }
];

// Seed Data for Students
const initialStudents: Student[] = [
  {
    id: 's101',
    name: 'Sri Karan',
    email: 'karan@sritech.com',
    rollNo: 'STA-2026-001',
    registerNumber: 'STA-2026-001',
    batch: 'Python & Java Developer - Batch A',
    phone: '+91 98765 43210',
    courseIds: ['c3', 'c4'],
    enrolledCourses: ['c3', 'c4'],
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: 's102',
    name: 'Jane Doe',
    email: 'jane@sritech.com',
    rollNo: 'STA-2026-002',
    registerNumber: 'STA-2026-002',
    batch: 'Programming Batch B',
    phone: '+1 (555) 123-4567',
    courseIds: ['c2', 'c3'],
    enrolledCourses: ['c2', 'c3'],
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: 's103',
    name: 'Rohit Sharma',
    email: 'rohit@sritech.com',
    rollNo: 'STA-2026-003',
    registerNumber: 'STA-2026-003',
    batch: 'C & C++ Masterclass',
    phone: '+91 88888 77777',
    courseIds: ['c1', 'c2'],
    enrolledCourses: ['c1', 'c2'],
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: 's104',
    name: 'Alice Cooper',
    email: 'alice@sritech.com',
    rollNo: 'STA-2026-004',
    registerNumber: 'STA-2026-004',
    batch: 'Web Development Batch A',
    phone: '+1 (555) 987-6543',
    courseIds: ['c7'],
    enrolledCourses: ['c7'],
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: 's105',
    name: 'Suresh Kumar',
    email: 'suresh@sritech.com',
    rollNo: 'STA-2026-005',
    registerNumber: 'STA-2026-005',
    batch: 'Business Administration',
    phone: '+91 99999 88888',
    courseIds: ['c5', 'c6'],
    enrolledCourses: ['c5', 'c6'],
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: 's106',
    name: 'Priya Patel',
    email: 'priya@sritech.com',
    rollNo: 'STA-2026-006',
    registerNumber: 'STA-2026-006',
    batch: 'Python & Web Development',
    phone: '+91 77777 66666',
    courseIds: ['c3', 'c7'],
    enrolledCourses: ['c3', 'c7'],
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: 's107',
    name: 'Amit Patel',
    email: 'amit@sritech.com',
    rollNo: 'STA-2026-007',
    registerNumber: 'STA-2026-007',
    batch: 'Java Batch C',
    phone: '+91 88888 99999',
    courseIds: ['c4'],
    enrolledCourses: ['c4'],
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: 's108',
    name: 'John Smith',
    email: 'john@sritech.com',
    rollNo: 'STA-2026-088',
    registerNumber: 'STA-2026-088',
    batch: 'C Foundations',
    phone: '+1 (555) 444-3333',
    courseIds: ['c1'],
    enrolledCourses: ['c1'],
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: 's109',
    name: 'Vikram Singh',
    email: 'vikram@sritech.com',
    rollNo: 'STA-2026-009',
    registerNumber: 'STA-2026-009',
    batch: 'Microsoft Office Batch',
    phone: '+91 66666 55555',
    courseIds: ['c5'],
    enrolledCourses: ['c5'],
    status: 'Inactive',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: 's110',
    name: 'Meera Nair',
    email: 'meera@sritech.com',
    rollNo: 'STA-2026-010',
    registerNumber: 'STA-2026-010',
    batch: 'Accounting Specialist',
    phone: '+91 99900 88811',
    courseIds: ['c6'],
    enrolledCourses: ['c6'],
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&q=80&w=200'
  }
];

// Seed Data for Student Progress
const initialStudentProgress: StudentProgress[] = [
  { id: 'sp-1', studentId: 's101', courseId: 'c3', completedModuleIds: ['m3-1', 'm3-2', 'm3-3', 'm3-4', 'm3-5', 'm3-6', 'm3-7', 'm3-8'] }, // 8 / 13 = 61.5%
  { id: 'sp-2', studentId: 's101', courseId: 'c4', completedModuleIds: ['m4-1', 'm4-2', 'm4-3', 'm4-4'] }, // 4 / 8 = 50%
  { id: 'sp-3', studentId: 's102', courseId: 'c3', completedModuleIds: ['m3-1', 'm3-2', 'm3-3', 'm3-4', 'm3-5', 'm3-6', 'm3-7', 'm3-8', 'm3-9', 'm3-10', 'm3-11', 'm3-12', 'm3-13'] }, // 13 / 13 = 100%
  { id: 'sp-4', studentId: 's102', courseId: 'c2', completedModuleIds: ['m2-1', 'm2-2', 'm2-3'] }, // 3 / 6 = 50%
  { id: 'sp-5', studentId: 's103', courseId: 'c1', completedModuleIds: ['m1-1', 'm1-2', 'm1-3', 'm1-4', 'm1-5'] }, // 5 / 7 = 71.4%
  { id: 'sp-6', studentId: 's103', courseId: 'c2', completedModuleIds: [] }, // 0%
  { id: 'sp-7', studentId: 's104', courseId: 'c7', completedModuleIds: ['m7-1', 'm7-2', 'm7-3', 'm7-4'] }, // 4 / 6 = 66.7%
  { id: 'sp-8', studentId: 's105', courseId: 'c5', completedModuleIds: ['m5-1', 'm5-2', 'm5-3'] }, // 3 / 6 = 50%
  { id: 'sp-9', studentId: 's105', courseId: 'c6', completedModuleIds: ['m6-1', 'm6-2'] }, // 2 / 6 = 33.3%
  { id: 'sp-10', studentId: 's106', courseId: 'c3', completedModuleIds: ['m3-1', 'm3-2', 'm3-3', 'm3-4', 'm3-5', 'm3-6', 'm3-7', 'm3-8', 'm3-9', 'm3-10'] }, // 10 / 13 = 76.9%
  { id: 'sp-11', studentId: 's106', courseId: 'c7', completedModuleIds: ['m7-1', 'm7-2', 'm7-3', 'm7-4', 'm7-5', 'm7-6'] }, // 6 / 6 = 100%
  { id: 'sp-12', studentId: 's107', courseId: 'c4', completedModuleIds: ['m4-1', 'm4-2'] }, // 2 / 8 = 25%
  { id: 'sp-13', studentId: 's108', courseId: 'c1', completedModuleIds: ['m1-1', 'm1-2', 'm1-3', 'm1-4', 'm1-5', 'm1-6', 'm1-7'] }, // 100%
  { id: 'sp-14', studentId: 's109', courseId: 'c5', completedModuleIds: ['m5-1'] }, // 1 / 6 = 16.7%
  { id: 'sp-15', studentId: 's110', courseId: 'c6', completedModuleIds: ['m6-1', 'm6-2', 'm6-3', 'm6-4', 'm6-5'] } // 5 / 6 = 83.3%
];

// Seed Data for Materials
const initialMaterials: Material[] = [
  { 
    id: 'mat-c-1', 
    title: 'C Programming Slide Deck', 
    courseId: 'c1', 
    moduleId: 'm1-1', 
    type: 'PDF', 
    downloadUrl: 'https://example.com/materials/c_intro.pdf', 
    fileUrl: 'https://example.com/materials/c_intro.pdf',
    fileType: 'pdf',
    createdAt: '2026-06-01T10:00:00Z', 
    uploadedAt: '2026-06-01T10:00:00Z',
    description: 'Covers syntax, operators, structures, and basic compiling.',
    uploadedBy: 'Dr. Srikanth Rao'
  },
  { 
    id: 'mat-cpp-1', 
    title: 'C++ OOP Concepts Guide', 
    courseId: 'c2', 
    moduleId: 'm2-1', 
    type: 'PDF', 
    downloadUrl: 'https://example.com/materials/cpp_oop.pdf', 
    fileUrl: 'https://example.com/materials/cpp_oop.pdf',
    fileType: 'pdf',
    createdAt: '2026-06-02T11:00:00Z', 
    uploadedAt: '2026-06-02T11:00:00Z',
    description: 'Classes, Objects, Inheritance and Virtual Functions detailed manual.',
    uploadedBy: 'Prof. Amanda Miller'
  },
  { 
    id: 'mat-py-1', 
    title: 'Interactive Python Cheat Sheet', 
    courseId: 'c3', 
    moduleId: 'm3-1', 
    type: 'External Resource', 
    downloadUrl: 'https://docs.python.org/3/', 
    fileUrl: 'https://docs.python.org/3/',
    fileType: 'link',
    createdAt: '2026-06-03T12:00:00Z', 
    uploadedAt: '2026-06-03T12:00:00Z',
    description: 'Quick access reference sheet for lists, loops, and objects.',
    uploadedBy: 'Dr. Srikanth Rao'
  },
  { 
    id: 'mat-py-2', 
    title: 'Python Mini Project Starter Files', 
    courseId: 'c3', 
    moduleId: 'm3-13', 
    type: 'ZIP', 
    downloadUrl: 'https://example.com/materials/python_project.zip', 
    fileUrl: 'https://example.com/materials/python_project.zip',
    fileType: 'zip',
    createdAt: '2026-06-04T13:00:00Z', 
    uploadedAt: '2026-06-04T13:00:00Z',
    description: 'Starter boilerplate codebase for Python Capstone project.',
    uploadedBy: 'Dr. Srikanth Rao'
  },
  { 
    id: 'mat-java-1', 
    title: 'Java Multi-threading Handouts', 
    courseId: 'c4', 
    moduleId: 'm4-6', 
    type: 'PDF', 
    downloadUrl: 'https://example.com/materials/java_multithread.pdf', 
    fileUrl: 'https://example.com/materials/java_multithread.pdf',
    fileType: 'pdf',
    createdAt: '2026-06-05T14:00:00Z', 
    uploadedAt: '2026-06-05T14:00:00Z',
    description: 'Concurrency utilities, threads, and synchronization notes.',
    uploadedBy: 'Prof. Amanda Miller'
  },
  { 
    id: 'mat-dmo-1', 
    title: 'SEO Starter Guide', 
    courseId: 'c5', 
    moduleId: 'm5-1', 
    type: 'External Resource', 
    downloadUrl: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide', 
    fileUrl: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
    fileType: 'link',
    createdAt: '2026-06-06T15:00:00Z', 
    uploadedAt: '2026-06-06T15:00:00Z',
    description: 'Google search optimization basics.',
    uploadedBy: 'Sarah Jenkins'
  },
  { 
    id: 'mat-tally-1', 
    title: 'GST Accounting Vouchers (PDF)', 
    courseId: 'c6', 
    moduleId: 'm6-3', 
    type: 'PDF', 
    downloadUrl: 'https://example.com/materials/tally_gst.pdf', 
    fileUrl: 'https://example.com/materials/tally_gst.pdf',
    fileType: 'pdf',
    createdAt: '2026-06-07T16:00:00Z', 
    uploadedAt: '2026-06-07T16:00:00Z',
    description: 'Sample taxation ledger sheets for Tally ERP entry.',
    uploadedBy: 'Sarah Jenkins'
  },
  { 
    id: 'mat-wd-1', 
    title: 'HTML CSS JS Cheat Sheet Pack', 
    courseId: 'c7', 
    moduleId: 'm7-1', 
    type: 'PDF', 
    downloadUrl: 'https://example.com/materials/web_cheatsheet.pdf', 
    fileUrl: 'https://example.com/materials/web_cheatsheet.pdf',
    fileType: 'pdf',
    createdAt: '2026-06-08T17:00:00Z', 
    uploadedAt: '2026-06-08T17:00:00Z',
    description: 'A collection of references for grid layouts and JS DOM syntax.',
    uploadedBy: 'Sarah Jenkins'
  }
];

// Seed Data for Attendance
const initialAttendance: Attendance[] = [
  { id: 'att-1', studentId: 's101', studentName: 'Sri Karan', date: '2026-06-01', status: 'Present', batch: 'Python & Java Developer - Batch A' },
  { id: 'att-2', studentId: 's101', studentName: 'Sri Karan', date: '2026-06-02', status: 'Present', batch: 'Python & Java Developer - Batch A' },
  { id: 'att-3', studentId: 's102', studentName: 'Jane Doe', date: '2026-06-01', status: 'Present', batch: 'Programming Batch B' },
  { id: 'att-4', studentId: 's102', studentName: 'Jane Doe', date: '2026-06-02', status: 'Absent', batch: 'Programming Batch B' }
];

// Seed Data for Marks
const initialMarks: Mark[] = [
  // Sri Karan (s101) - Python (c3) & Java (c4)
  { id: 'mrk-1', studentId: 's101', studentName: 'Sri Karan', courseId: 'c3', theoryMarks: 91, practicalMarks: 70, average: 80.5, grade: 'A' },
  { id: 'mrk-2', studentId: 's101', studentName: 'Sri Karan', courseId: 'c4', theoryMarks: 85, practicalMarks: 85, average: 85.0, grade: 'A' },
  
  // Jane Doe (s102) - C++ (c2) & Python (c3)
  { id: 'mrk-3', studentId: 's102', studentName: 'Jane Doe', courseId: 'c2', theoryMarks: 78, practicalMarks: 82, average: 80.0, grade: 'A' },
  { id: 'mrk-4', studentId: 's102', studentName: 'Jane Doe', courseId: 'c3', theoryMarks: 95, practicalMarks: 93, average: 94.0, grade: 'A+' },
  
  // Rohit Sharma (s103) - C (c1) & C++ (c2)
  { id: 'mrk-5', studentId: 's103', studentName: 'Rohit Sharma', courseId: 'c1', theoryMarks: 65, practicalMarks: 75, average: 70.0, grade: 'B+' },
  { id: 'mrk-6', studentId: 's103', studentName: 'Rohit Sharma', courseId: 'c2', theoryMarks: 45, practicalMarks: 53, average: 49.0, grade: 'Fail' },
  
  // Priya Patel (s106) - Python (c3)
  { id: 'mrk-7', studentId: 's106', studentName: 'Priya Patel', courseId: 'c3', theoryMarks: 88, practicalMarks: 92, average: 90.0, grade: 'A+' },
  
  // Amit Patel (s107) - Java (c4)
  { id: 'mrk-8', studentId: 's107', studentName: 'Amit Patel', courseId: 'c4', theoryMarks: 72, practicalMarks: 68, average: 70.0, grade: 'B+' },
  
  // John Smith (s108) - C (c1)
  { id: 'mrk-9', studentId: 's108', studentName: 'John Smith', courseId: 'c1', theoryMarks: 92, practicalMarks: 96, average: 94.0, grade: 'A+' }
];

// Seed Data for Certificates
const initialCertificates: Certificate[] = [
  { id: 'crt-1', studentId: 's102', studentName: 'Jane Doe', courseId: 'c3', courseName: 'Python', issueDate: '2026-06-12', certificateCode: 'STA-2026-9918', status: 'Approved' },
  { id: 'crt-2', studentId: 's106', studentName: 'Priya Patel', courseId: 'c7', courseName: 'HTML CSS JS', issueDate: '2026-06-13', certificateCode: 'STA-2026-9920', status: 'Pending' }
];

// Seed Data for Fees (legacy — preserved for backward compatibility)
const initialFees: Fee[] = [
  { id: 'fee-1', studentId: 's101', studentName: 'Sri Karan', amount: 299, dueDate: '2026-06-10', paidDate: '2026-06-09', status: 'Paid', invoiceNo: 'INV-2026-001', remarks: 'Paid via Card' },
  { id: 'fee-2', studentId: 's102', studentName: 'Jane Doe', amount: 249, dueDate: '2026-06-15', status: 'Pending', invoiceNo: 'INV-2026-002' },
  { id: 'fee-3', studentId: 's103', studentName: 'Rohit Sharma', amount: 199, dueDate: '2026-06-05', status: 'Overdue', invoiceNo: 'INV-2026-003' }
];

// Seed Data for Academy Fees (new refactored fee management)
// s101: Python(c3) + Java(c4) → ₹4000 combo
// s102: C++(c2) + Python(c3) → ₹3500 combo
// s103: C(c1) + C++(c2) → ₹1500 + ₹1500 = ₹3000
// s104: HTML CSS JS(c7) → ₹1500 (default)
// s105: DMO(c5) + Tally(c6) → ₹1500 + ₹1500 = ₹3000
// s106: Python(c3) + HTML CSS JS(c7) → ₹2000 + ₹1500 = ₹3500
// s107: Java(c4) → ₹2000
// s108: C(c1) → ₹1500
// s109: DMO(c5) → ₹1500 (Inactive)
// s110: Tally(c6) → ₹1500
const initialAcademyFees: AcademyFeeRecord[] = [
  {
    id: 'afee_s101', studentId: 's101',
    totalBillAmount: 4000, discountType: 'none', discountValue: 0, discountedAmount: 0,
    finalPayableAmount: 4000, paidAmount: 4000, remainingAmount: 0,
    paymentStatus: 'Paid',
    payments: [{ id: 'pay_s101_1', amount: 4000, date: '2026-06-09', remarks: 'Full payment via UPI' }],
    createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-09T00:00:00Z'
  },
  {
    id: 'afee_s102', studentId: 's102',
    totalBillAmount: 3500, discountType: 'none', discountValue: 0, discountedAmount: 0,
    finalPayableAmount: 3500, paidAmount: 2000, remainingAmount: 1500,
    paymentStatus: 'Partially Paid',
    payments: [{ id: 'pay_s102_1', amount: 2000, date: '2026-06-15', remarks: 'First instalment' }],
    createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-15T00:00:00Z'
  },
  {
    id: 'afee_s103', studentId: 's103',
    totalBillAmount: 3000, discountType: 'percentage', discountValue: 10, discountedAmount: 300,
    finalPayableAmount: 2700, paidAmount: 0, remainingAmount: 2700,
    paymentStatus: 'Pending',
    payments: [],
    createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z'
  },
  {
    id: 'afee_s104', studentId: 's104',
    totalBillAmount: 1500, discountType: 'none', discountValue: 0, discountedAmount: 0,
    finalPayableAmount: 1500, paidAmount: 1500, remainingAmount: 0,
    paymentStatus: 'Paid',
    payments: [{ id: 'pay_s104_1', amount: 1500, date: '2026-06-10', remarks: 'Cash payment' }],
    createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-10T00:00:00Z'
  },
  {
    id: 'afee_s105', studentId: 's105',
    totalBillAmount: 3000, discountType: 'fixed', discountValue: 500, discountedAmount: 500,
    finalPayableAmount: 2500, paidAmount: 1000, remainingAmount: 1500,
    paymentStatus: 'Partially Paid',
    payments: [{ id: 'pay_s105_1', amount: 1000, date: '2026-06-12', remarks: 'Partial via NEFT' }],
    createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-12T00:00:00Z'
  },
  {
    id: 'afee_s106', studentId: 's106',
    totalBillAmount: 3500, discountType: 'none', discountValue: 0, discountedAmount: 0,
    finalPayableAmount: 3500, paidAmount: 0, remainingAmount: 3500,
    paymentStatus: 'Pending',
    payments: [],
    createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z'
  },
  {
    id: 'afee_s107', studentId: 's107',
    totalBillAmount: 2000, discountType: 'none', discountValue: 0, discountedAmount: 0,
    finalPayableAmount: 2000, paidAmount: 2000, remainingAmount: 0,
    paymentStatus: 'Paid',
    payments: [{ id: 'pay_s107_1', amount: 2000, date: '2026-06-08', remarks: 'Online transfer' }],
    createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-08T00:00:00Z'
  },
  {
    id: 'afee_s108', studentId: 's108',
    totalBillAmount: 1500, discountType: 'none', discountValue: 0, discountedAmount: 0,
    finalPayableAmount: 1500, paidAmount: 0, remainingAmount: 1500,
    paymentStatus: 'Pending',
    payments: [],
    createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z'
  },
  {
    id: 'afee_s109', studentId: 's109',
    totalBillAmount: 1500, discountType: 'none', discountValue: 0, discountedAmount: 0,
    finalPayableAmount: 1500, paidAmount: 1500, remainingAmount: 0,
    paymentStatus: 'Paid',
    payments: [{ id: 'pay_s109_1', amount: 1500, date: '2026-05-30', remarks: 'Paid before joining' }],
    createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-05-30T00:00:00Z'
  },
  {
    id: 'afee_s110', studentId: 's110',
    totalBillAmount: 1500, discountType: 'none', discountValue: 0, discountedAmount: 0,
    finalPayableAmount: 1500, paidAmount: 750, remainingAmount: 750,
    paymentStatus: 'Partially Paid',
    payments: [{ id: 'pay_s110_1', amount: 750, date: '2026-06-20', remarks: 'Half payment' }],
    createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-20T00:00:00Z'
  }
];

const initialAdminProfile: UserProfile = {
  id: 'admin-1',
  name: 'Admin Director',
  email: 'admin@sritech.com',
  role: 'admin',
  avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200'
};

const initialStudentProfile: UserProfile = {
  id: 's101',
  name: 'Sri Karan',
  email: 'karan@sritech.com',
  role: 'student',
  studentId: 's101',
  batch: 'Python & Java Developer - Batch A',
  phone: '+91 98765 43210',
  avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200'
};

// Database structure interface
interface FullDatabase {
  courses: Course[];
  students: Student[];
  materials: Material[];
  attendance: Attendance[];
  marks: Mark[];
  certificates: Certificate[];
  fees: Fee[];
  academyFees: AcademyFeeRecord[];
  users: Record<string, UserProfile & { passwordHash: string }>;
  studentProgress: StudentProgress[];
}

const DEFAULT_DB: FullDatabase = {
  courses: initialCourses,
  students: initialStudents,
  materials: initialMaterials,
  attendance: initialAttendance,
  marks: initialMarks,
  certificates: initialCertificates,
  fees: initialFees,
  academyFees: initialAcademyFees,
  studentProgress: initialStudentProgress,
  users: {
    'admin@sritech.com': { ...initialAdminProfile, passwordHash: 'admin123' },
    'karan@sritech.com': { ...initialStudentProfile, passwordHash: 'student123' },
    'jane@sritech.com': {
      id: 's102',
      name: 'Jane Doe',
      email: 'jane@sritech.com',
      role: 'student',
      studentId: 's102',
      batch: 'Programming Batch B',
      phone: '+1 (555) 123-4567',
      passwordHash: 'student123',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200'
    },
    'rohit@sritech.com': {
      id: 's103',
      name: 'Rohit Sharma',
      email: 'rohit@sritech.com',
      role: 'student',
      studentId: 's103',
      batch: 'C & C++ Masterclass',
      phone: '+91 88888 77777',
      passwordHash: 'student123',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
    },
    'alice@sritech.com': {
      id: 's104',
      name: 'Alice Cooper',
      email: 'alice@sritech.com',
      role: 'student',
      studentId: 's104',
      batch: 'Web Development Batch A',
      phone: '+1 (555) 987-6543',
      passwordHash: 'student123',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
    },
    'suresh@sritech.com': {
      id: 's105',
      name: 'Suresh Kumar',
      email: 'suresh@sritech.com',
      role: 'student',
      studentId: 's105',
      batch: 'Business Administration',
      phone: '+91 99999 88888',
      passwordHash: 'student123',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
    },
    'priya@sritech.com': {
      id: 's106',
      name: 'Priya Patel',
      email: 'priya@sritech.com',
      role: 'student',
      studentId: 's106',
      batch: 'Python & Web Development',
      phone: '+91 77777 66666',
      passwordHash: 'student123',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
    },
    'amit@sritech.com': {
      id: 's107',
      name: 'Amit Patel',
      email: 'amit@sritech.com',
      role: 'student',
      studentId: 's107',
      batch: 'Java Batch C',
      phone: '+91 88888 99999',
      passwordHash: 'student123',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200'
    },
    'john@sritech.com': {
      id: 's108',
      name: 'John Smith',
      email: 'john@sritech.com',
      role: 'student',
      studentId: 's108',
      batch: 'C Foundations',
      phone: '+1 (555) 444-3333',
      passwordHash: 'student123',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200'
    },
    'vikram@sritech.com': {
      id: 's109',
      name: 'Vikram Singh',
      email: 'vikram@sritech.com',
      role: 'student',
      studentId: 's109',
      batch: 'Microsoft Office Batch',
      phone: '+91 66666 55555',
      passwordHash: 'student123',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200'
    },
    'meera@sritech.com': {
      id: 's110',
      name: 'Meera Nair',
      email: 'meera@sritech.com',
      role: 'student',
      studentId: 's110',
      batch: 'Accounting Specialist',
      phone: '+91 99900 88811',
      passwordHash: 'student123',
      avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&q=80&w=200'
    }
  }
};

class MockDb {
  private getDb(): FullDatabase {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      this.saveDb(DEFAULT_DB);
      return DEFAULT_DB;
    }
    try {
      const db = JSON.parse(data);
      // Self-healing check: reset database if course c7 is missing, no studentProgress, or no academyFees
      if (!db.courses || !db.courses.some((c: Course) => c.id === 'c7') || !db.studentProgress || !db.academyFees) {
        this.saveDb(DEFAULT_DB);
        return DEFAULT_DB;
      }
      return db;
    } catch {
      this.saveDb(DEFAULT_DB);
      return DEFAULT_DB;
    }
  }

  private saveDb(db: FullDatabase) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  // --- Auth operations ---
  login(email: string, passwordHash: string): UserProfile | null {
    const db = this.getDb();
    const user = db.users[email.toLowerCase().trim()];
    if (user && user.passwordHash === passwordHash) {
      const { passwordHash: _, ...profile } = user;
      return profile;
    }
    return null;
  }

  updateProfile(id: string, updates: Partial<UserProfile>): UserProfile | null {
    const db = this.getDb();
    let emailFound: string | null = null;
    
    for (const email in db.users) {
      if (db.users[email].id === id) {
        emailFound = email;
        break;
      }
    }

    if (emailFound) {
      const updatedUser = {
        ...db.users[emailFound],
        ...updates
      };
      
      const oldEmailKey = emailFound;
      const newEmailKey = (updates.email || oldEmailKey).toLowerCase().trim();
      
      if (oldEmailKey !== newEmailKey) {
        db.users[newEmailKey] = updatedUser;
        delete db.users[oldEmailKey];
      } else {
        db.users[oldEmailKey] = updatedUser;
      }

      if (updatedUser.role === 'student') {
        const studentId = updatedUser.studentId || '';
        db.students = db.students.map(s => {
          if (s.id === studentId) {
            return {
              ...s,
              name: updates.name || s.name,
              phone: updates.phone || s.phone,
              email: updates.email || s.email
            };
          }
          return s;
        });
      }
      this.saveDb(db);
      const { passwordHash: _, ...profile } = db.users[newEmailKey];
      return profile;
    }
    return null;
  }

  updatePassword(id: string, newPasswordHash: string): boolean {
    const db = this.getDb();
    let emailFound: string | null = null;
    for (const email in db.users) {
      if (db.users[email].id === id) {
        emailFound = email;
        break;
      }
    }
    if (emailFound) {
      db.users[emailFound].passwordHash = newPasswordHash;
      this.saveDb(db);
      return true;
    }
    return false;
  }

  // --- Courses ---
  getCourses(): Course[] {
    return this.getDb().courses;
  }

  getCourse(id: string): Course | undefined {
    return this.getCourses().find(c => c.id === id);
  }

  saveCourse(course: Course): Course {
    const db = this.getDb();
    const idx = db.courses.findIndex(c => c.id === course.id);
    if (idx >= 0) {
      db.courses[idx] = course;
    } else {
      db.courses.push(course);
    }
    this.saveDb(db);
    return course;
  }

  deleteCourse(id: string): boolean {
    const db = this.getDb();
    const originalLength = db.courses.length;
    db.courses = db.courses.filter(c => c.id !== id);
    this.saveDb(db);
    return db.courses.length < originalLength;
  }

  // --- Students ---
  getStudents(): Student[] {
    return this.getDb().students;
  }

  getStudent(id: string): Student | undefined {
    return this.getStudents().find(s => s.id === id);
  }

  saveStudent(student: Student): Student {
    const db = this.getDb();
    const idx = db.students.findIndex(s => s.id === student.id);
    if (idx >= 0) {
      db.students[idx] = student;
    } else {
      db.students.push(student);
      const emailLower = student.email.toLowerCase().trim();
      if (!db.users[emailLower]) {
        db.users[emailLower] = {
          id: student.id,
          name: student.name,
          email: student.email,
          role: 'student',
          studentId: student.id,
          phone: student.phone,
          batch: student.batch,
          passwordHash: 'student123'
        };
      }
    }
    this.saveDb(db);
    return student;
  }

  deleteStudent(id: string): boolean {
    const db = this.getDb();
    const originalLength = db.students.length;
    db.students = db.students.filter(s => s.id !== id);
    let emailFound = '';
    for (const email in db.users) {
      if (db.users[email].studentId === id) {
        emailFound = email;
        break;
      }
    }
    if (emailFound) {
      delete db.users[emailFound];
    }
    this.saveDb(db);
    return db.students.length < originalLength;
  }

  // --- Materials ---
  getMaterials(): Material[] {
    return this.getDb().materials;
  }

  saveMaterial(material: Material): Material {
    const db = this.getDb();
    const idx = db.materials.findIndex(m => m.id === material.id);
    if (idx >= 0) {
      db.materials[idx] = material;
    } else {
      db.materials.push(material);
    }
    this.saveDb(db);
    return material;
  }

  deleteMaterial(id: string): boolean {
    const db = this.getDb();
    const originalLength = db.materials.length;
    db.materials = db.materials.filter(m => m.id !== id);
    this.saveDb(db);
    return db.materials.length < originalLength;
  }

  // --- Attendance ---
  getAttendance(): Attendance[] {
    return this.getDb().attendance;
  }

  saveAttendance(records: Attendance[]): Attendance[] {
    const db = this.getDb();
    records.forEach(rec => {
      const idx = db.attendance.findIndex(a => a.studentId === rec.studentId && a.date === rec.date);
      if (idx >= 0) {
        db.attendance[idx] = rec;
      } else {
        db.attendance.push(rec);
      }
    });
    this.saveDb(db);
    return records;
  }

  // --- Marks ---
  getMarks(): Mark[] {
    return this.getDb().marks;
  }

  saveMark(mark: Mark): Mark {
    const db = this.getDb();
    const idx = db.marks.findIndex(m => m.id === mark.id);
    if (idx >= 0) {
      db.marks[idx] = mark;
    } else {
      db.marks.push(mark);
    }
    this.saveDb(db);
    return mark;
  }

  deleteMark(id: string): boolean {
    const db = this.getDb();
    db.marks = db.marks.filter(m => m.id !== id);
    this.saveDb(db);
    return true;
  }

  // --- Certificates ---
  getCertificates(): Certificate[] {
    return this.getDb().certificates;
  }

  saveCertificate(cert: Certificate): Certificate {
    const db = this.getDb();
    const idx = db.certificates.findIndex(c => c.id === cert.id);
    if (idx >= 0) {
      db.certificates[idx] = cert;
    } else {
      db.certificates.push(cert);
    }
    this.saveDb(db);
    return cert;
  }

  deleteCertificate(id: string): boolean {
    const db = this.getDb();
    const originalLength = db.certificates.length;
    db.certificates = db.certificates.filter(c => c.id !== id);
    this.saveDb(db);
    return db.certificates.length < originalLength;
  }

  // --- Fees (legacy) ---
  getFees(): Fee[] {
    return this.getDb().fees;
  }

  saveFee(fee: Fee): Fee {
    const db = this.getDb();
    const idx = db.fees.findIndex(f => f.id === fee.id);
    if (idx >= 0) {
      db.fees[idx] = fee;
    } else {
      db.fees.push(fee);
    }
    this.saveDb(db);
    return fee;
  }

  // --- Academy Fees (refactored) ---
  getAcademyFees(): AcademyFeeRecord[] {
    return this.getDb().academyFees || [];
  }

  saveAcademyFee(record: AcademyFeeRecord): AcademyFeeRecord {
    const db = this.getDb();
    if (!db.academyFees) db.academyFees = [];
    const idx = db.academyFees.findIndex(f => f.id === record.id);
    // Always recalculate before saving to keep record self-consistent
    const recalculated = recalculateFeeRecord(record);
    if (idx >= 0) {
      db.academyFees[idx] = recalculated;
    } else {
      db.academyFees.push(recalculated);
    }
    this.saveDb(db);
    return recalculated;
  }

  deleteAcademyFee(id: string): boolean {
    const db = this.getDb();
    const original = db.academyFees?.length ?? 0;
    db.academyFees = (db.academyFees || []).filter(f => f.id !== id);
    this.saveDb(db);
    return (db.academyFees.length < original);
  }

  ensureAcademyFeeExists(studentId: string, courseIds: string[]): AcademyFeeRecord {
    const db = this.getDb();
    if (!db.academyFees) db.academyFees = [];
    const existing = db.academyFees.find(f => f.studentId === studentId);
    if (existing) return existing;
    const newRecord = buildDefaultFeeRecord(studentId, courseIds);
    db.academyFees.push(newRecord);
    this.saveDb(db);
    return newRecord;
  }

  // --- Student Progress (Stateful in Local Storage) ---
  getStudentProgress(): StudentProgress[] {
    return this.getDb().studentProgress || [];
  }

  saveStudentProgress(progress: StudentProgress): StudentProgress {
    const db = this.getDb();
    if (!db.studentProgress) {
      db.studentProgress = [];
    }
    const idx = db.studentProgress.findIndex(
      p => p.studentId === progress.studentId && p.courseId === progress.courseId
    );
    if (idx >= 0) {
      db.studentProgress[idx] = progress;
    } else {
      db.studentProgress.push(progress);
    }
    this.saveDb(db);
    return progress;
  }
}

export const mockDb = new MockDb();
export default mockDb;
