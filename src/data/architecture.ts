/**
 * SRI TECH ACADEMY PORTAL - DATA ARCHITECTURE DOCUMENTATION
 *
 * This document describes the relationships and data flow within the portal.
 *
 * RELATIONAL OVERVIEW:
 *
 * 1. AdminUser
 *    - The superuser who manages the portal.
 *    - Has authority to create Courses, upload Materials, and manage Students.
 *
 * 2. Student
 *    - The primary entity of the system.
 *    - One-to-Many with Attendance (A student has many attendance records).
 *    - One-to-Many with Marks (A student has many mark entries across different subjects/courses).
 *    - One-to-Many with Fees (A student has a fee record, typically one per enrollment or period).
 *    - One-to-Many with Certificates (A student can earn multiple certificates).
 *    - Many-to-Many with Courses (A student can enroll in multiple courses, and a course has many students).
 *
 * 3. Course
 *    - Categorized into 'Programming' (C, C++, Python, Java) and 'Other' (DMO, Tally, HTML CSS JS).
 *    - Contains a list of modules.
 *    - One-to-Many with Materials (A course has many study materials).
 *    - Acts as a grouping entity for Marks and Attendance.
 *
 * 4. Mark
 *    - Linked to both Student and Course.
 *    - Tracks 'theoryMarks' and 'practicalMarks'.
 *    - 'average' is automatically calculated as (theory + practical) / 2.
 *
 * 5. Attendance
 *    - Linked to Student and Course.
 *    - Tracks daily presence/absence.
 *
 * 6. Material
 *    - Linked to Course.
 *    - Uploaded by Admin.
 *    - Stores file metadata and URLs.
 *
 * 7. Fee
 *    - Linked to Student.
 *    - Tracks total, paid, and balance amounts.
 *
 * 8. Certificate
 *    - Linked to Student and Course.
 *    - Tracks status (Issued/Pending) and issuance date.
 *
 * SERVICE LAYER PATTERN:
 *
 * The architecture uses a Repository-like pattern with Services.
 * - IBaseService<T>: Defines standard CRUD operations.
 * - Mock Services: Use local in-memory arrays populated from mockData.ts.
 * - Firebase Services: Future implementation of Firestore data fetching.
 *
 * Switch between Mock and Firebase by updating the exports in src/services/index.ts.
 */

export const ARCHITECTURE_VERSION = '1.0.0';
