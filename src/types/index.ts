// ============================================================
// SRI TECH ACADEMY PORTAL – UNIFIED TYPE SYSTEM
// Single source of truth for all data models.
// ============================================================

// ------ Auth / User ------

export type UserRole = 'admin' | 'student';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  // Student-specific
  studentId?: string;
  batch?: string;
  phone?: string;
  avatar?: string;
  // Firestore metadata
  status?: 'active' | 'inactive';
  createdAt?: string;
}

/** @deprecated Use UserProfile with role='admin' instead */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  photo?: string;
}

// ------ Student ------

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
  avatar?: string;
  // Registration / Roll
  registerNumber?: string;
  rollNo?: string;
  // Enrollment
  batch?: string;
  courseIds: string[];      // Primary: used by mockDb (new courses format)
  enrolledCourses?: string[]; // Alias kept for backward compat
  status: 'Active' | 'Inactive';
  createdAt?: string;
}

// ------ Course ------

export type CourseCategory = 'Programming' | 'Other';

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  order: number;
  isActive: boolean;
  // Firestore-ready: 'active' | 'disabled' mirrors isActive, kept for future progress tracking
  status?: 'active' | 'disabled';
}

export interface Course {
  id: string;
  name: string;
  category?: CourseCategory;
  // New-style course fields (mockDb)
  code?: string;
  description?: string;
  syllabus?: string[];
  price?: number;
  fee?: number;            // Firestore alias for price
  duration?: string;
  instructor?: string;
  lessonsCount?: number;
  // Old-style course fields (mockData / progress tracking)
  modules?: CourseModule[];
  materials?: string[];    // Array of Material IDs
  students?: string[];     // Array of Student IDs
  // Firestore metadata
  status?: 'Active' | 'Archived';
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentProgress {
  id: string;
  studentId: string;
  courseId: string;
  completedModuleIds: string[];
}

// ------ Attendance ------

export interface Attendance {
  id: string;
  studentId: string;
  courseId?: string;
  date: string;            // ISO date string YYYY-MM-DD
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
  // Firestore fields
  markedBy?: string;       // UID of admin who marked attendance
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  // Denormalized convenience fields (used by pages)
  studentName?: string;
  batch?: string;
}

// ------ Marks ------

export interface Subject {
  id: string;
  name: string;
  courseId: string;
}

export interface Mark {
  id: string;
  studentId: string;
  courseId: string;
  // New-style fields (mockDb / admin pages)
  subject?: string;
  examName?: string;
  marksObtained?: number;
  maxMarks?: number;
  grade?: string;
  // Old-style fields (mockData)
  subjectId?: string;
  theoryMarks?: number;
  practicalMarks?: number;
  average?: number;
  // Denormalized
  studentName?: string;

  // Firestore fields (Phase 5 Migration)
  documentId?: string;
  courseName?: string;
  languageAverage?: number;
  overallAverage?: number;
  status?: 'Pass' | 'Fail' | string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentOverallGrade {
  studentId: string;
  overallAverage: number;
  marks: Mark[];
}

// ------ Materials ------

export interface Material {
  id: string;
  documentId?: string;
  title: string;
  description?: string;
  courseId: string;
  courseName?: string;
  moduleId?: string;
  moduleName?: string;
  fileType?: string;
  downloadUrl?: string;
  uploadedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;

  // Compatibility fields for backward compatibility
  type?: 'PDF' | 'PPT' | 'DOC' | 'DOCX' | 'ZIP' | 'Video' | 'External Resource' | 'Other' | 'pdf' | 'ppt' | 'doc' | 'docx' | 'zip' | 'video' | 'link' | string;
  fileUrl?: string;
  uploadedAt?: string;
  uploadDate?: string;
}

// ------ Fee ------

export interface Fee {
  id: string;
  studentId: string;
  // New-style fields (mockDb / admin pages)
  studentName?: string;
  amount?: number;
  dueDate?: string;
  paidDate?: string;
  status?: 'Paid' | 'Pending' | 'Overdue';
  invoiceNo?: string;
  remarks?: string;
  // Old-style fields (mockData)
  totalAmount?: number;
  paidAmount?: number;
  balanceAmount?: number;
  lastPaymentDate?: string;
}

// ------ Academy Fee (Refactored Fee Management) ------

export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Pending';
export type DiscountType = 'none' | 'fixed' | 'percentage';

export interface PaymentEntry {
  id: string;
  amount: number;
  date: string;          // ISO date string YYYY-MM-DD
  remarks?: string;
  receivedBy?: string;
}

export interface AcademyFeeRecord {
  id: string;                     // fee_<studentId>
  studentId: string;
  // Computed by feeCalculationService — persisted for quick reads
  totalBillAmount: number;        // Raw course fee before discount
  discountType: DiscountType;
  discountValue: number;          // ₹ amount or % value
  discountedAmount: number;       // Amount saved (₹)
  finalPayableAmount: number;     // totalBillAmount - discountedAmount
  paidAmount: number;             // Running sum of all PaymentEntry amounts
  remainingAmount: number;        // finalPayableAmount - paidAmount
  paymentStatus: PaymentStatus;
  payments: PaymentEntry[];       // Full chronological payment history
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

// ------ Certificate ------

export interface Certificate {
  id: string;
  certificateId?: string;
  studentId: string;
  studentName?: string;
  registerNumber?: string;
  courseId: string;
  courseName?: string;
  certificateTitle?: string;
  certificateNumber?: string;
  issueDate?: string;
  description?: string;
  certificateType?: 'Course Completion' | 'Internship' | 'Workshop' | 'Seminar' | 'Hackathon' | 'Participation' | 'Achievement' | 'Other' | string;
  downloadUrl?: string;
  uploadedBy?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Issued';
  createdAt?: string;
  updatedAt?: string;

  // Compatibility fields for legacy pages/logic:
  certificateCode?: string;
  verificationHash?: string;
  remarks?: string;
  certificateFileName?: string;
  certificateUrl?: string;
}
